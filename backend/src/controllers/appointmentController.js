const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const { generatePreVisitSummary, generatePostVisitSummary } = require('../services/llmService');
const { sendEmail, bookingConfirmationEmail, cancellationEmail } = require('../services/emailService');
const { createEvent, deleteEvent } = require('../services/calendarService');
const MedicalRecord = require('../models/MedicalRecord');

/**
 * Book a slot. Double-booking is prevented by the unique partial index on
 * Appointment (doctor + date + startTime, status: 'booked'). If two requests
 * race for the same slot, MongoDB rejects the second insert with error code
 * 11000 and we return a clean 409 instead of creating a conflicting record.
 * This is safe under concurrent/simultaneous booking attempts.
 */
async function bookAppointment(req, res) {
  const patientId = req.user.id;
  const { doctorId, date, startTime, symptoms, consultationType } = req.body; // consultationType: 'video' | 'in_clinic'

  try {
    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile) return res.status(404).json({ message: 'Doctor not found' });
    if (profile.leaveDays.includes(date)) {
      return res.status(400).json({ message: 'Doctor is on leave that day' });
    }

    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + profile.slotDurationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const type = consultationType === 'in_clinic' ? 'in_clinic' : 'video';
    const price = type === 'in_clinic' ? profile.inClinicPrice : profile.videoConsultPrice;

    let appointment;
    try {
      appointment = await Appointment.create({
        patient: patientId,
        doctor: doctorId,
        date,
        startTime,
        endTime,
        status: 'booked',
        consultationType: type,
        price,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Someone else booked this exact slot a moment earlier.
        return res.status(409).json({ message: 'This slot was just booked by someone else. Please pick another.' });
      }
      throw err;
    }

    // If symptoms were provided at booking time, generate the pre-visit summary now.
    if (symptoms) {
      appointment.symptoms = symptoms;
      appointment.preVisitSummary = await generatePreVisitSummary(symptoms);
      await appointment.save();
    }

    const patient = await User.findById(patientId);
    const doctor = await User.findById(doctorId);

    // Calendar events for both sides (best-effort — failures don't block booking)
    const patientEventId = await createEvent({
      summary: `Appointment with Dr. ${doctor.name}`,
      description: symptoms || '',
      date, startTime, endTime,
      attendeeEmail: patient.email,
    });
    const doctorEventId = await createEvent({
      summary: `Appointment with ${patient.name}`,
      description: symptoms || '',
      date, startTime, endTime,
      attendeeEmail: doctor.email,
    });
    appointment.patientCalendarEventId = patientEventId || undefined;
    appointment.doctorCalendarEventId = doctorEventId || undefined;

    // Confirmation emails to both sides
    const confEmail = bookingConfirmationEmail(appointment, patient.name, doctor.name);
    const emailResult = await sendEmail({ to: patient.email, ...confEmail });
    appointment.notifications.push({ type: 'confirmation', success: emailResult.success });
    await appointment.save();

    res.status(201).json({ appointment });
  } catch (err) {
    res.status(500).json({ message: 'Booking failed', error: err.message });
  }
}

// Patient submits symptoms for an existing appointment (if not done at booking time)
async function submitSymptoms(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appointment.patient) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    appointment.symptoms = req.body.symptoms;
    appointment.preVisitSummary = await generatePreVisitSummary(req.body.symptoms);
    await appointment.save();
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit symptoms', error: err.message });
  }
}

// Doctor submits post-visit notes + prescription -> generates patient-friendly summary
async function submitPostVisit(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('patient', 'name email');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appointment.doctor) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    const { doctorNotes, prescription } = req.body;
    appointment.doctorNotes = doctorNotes;
    appointment.prescription = prescription;
    appointment.status = 'completed';

    const combinedNotes = `Notes: ${doctorNotes}\nPrescription: ${prescription}`;
    appointment.postVisitSummary = await generatePostVisitSummary(combinedNotes);
    await appointment.save();
    await MedicalRecord.findOneAndUpdate(
      { appointment: appointment._id },
      {
        patient: appointment.patient._id || appointment.patient,
        doctor: req.user.id,
        appointment: appointment._id,
        recordType: 'consultation',
        title: 'Consultation visit',
        description: appointment.postVisitSummary?.summaryText || doctorNotes || '',
        medications: prescription || '',
        recordDate: appointment.date,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const summaryEmail = {
      subject: 'Your Visit Summary',
      html: `<p>Hi ${appointment.patient.name},</p><p>${appointment.postVisitSummary.summaryText}</p>
        <p><b>Medication:</b> ${appointment.postVisitSummary.medicationSchedule}</p>
        <p><b>Follow-up:</b> ${appointment.postVisitSummary.followUpSteps}</p>`,
    };
    await sendEmail({ to: appointment.patient.email, ...summaryEmail });

    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit post-visit notes', error: err.message });
  }
}

async function cancelAppointment(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('patient', 'name email').populate('doctor', 'name email');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner = String(appointment.patient._id) === req.user.id || String(appointment.doctor._id) === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    appointment.status = 'cancelled';
    if (appointment.patientCalendarEventId) await deleteEvent(appointment.patientCalendarEventId);
    if (appointment.doctorCalendarEventId) await deleteEvent(appointment.doctorCalendarEventId);

    const email = cancellationEmail(appointment, appointment.patient.name, req.body.reason || 'Cancelled by request');
    const result = await sendEmail({ to: appointment.patient.email, ...email });
    appointment.notifications.push({ type: 'cancellation', success: result.success });
    await appointment.save();

    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel appointment', error: err.message });
  }
}


async function markNoShow(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role !== 'admin' && String(appointment.doctor) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (appointment.status !== 'booked') return res.status(400).json({ message: 'Only booked appointments can be marked as no-show' });
    appointment.status = 'no_show';
    await appointment.save();
    res.json({ appointment });
  } catch (err) { res.status(500).json({ message: 'Failed to mark no-show', error: err.message }); }
}

async function myAppointments(req, res) {
  try {
    const filter = req.user.role === 'doctor' ? { doctor: req.user.id } : { patient: req.user.id };
    const appointments = await Appointment.find(filter).populate('patient', 'name').populate('doctor', 'name').sort({ date: 1, startTime: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: err.message });
  }
}

module.exports = { bookAppointment, submitSymptoms, submitPostVisit, cancelAppointment, markNoShow, myAppointments };
