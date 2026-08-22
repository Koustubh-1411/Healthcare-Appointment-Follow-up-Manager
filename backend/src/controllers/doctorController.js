const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const LeaveRequest = require('../models/LeaveRequest');
const { sendEmail, cancellationEmail } = require('../services/emailService');
const { deleteEvent } = require('../services/calendarService');
const { generateDailyBriefing, generateClinicalInsight } = require('../services/llmService');

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

// Admin creates a doctor account + profile in one step.
async function createDoctor(req, res) {
  try {
    const { name, email, password, phone, specialisation, workingHours, slotDurationMinutes, videoConsultPrice, inClinicPrice } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const doctorUser = await User.create({ name, email, password, phone, role: 'doctor' });
    const profile = await DoctorProfile.create({
      user: doctorUser._id,
      specialisation,
      workingHours: workingHours || [],
      slotDurationMinutes: slotDurationMinutes || 30,
      videoConsultPrice: Number.isFinite(Number(videoConsultPrice)) ? Number(videoConsultPrice) : 80,
      inClinicPrice: Number.isFinite(Number(inClinicPrice)) ? Number(inClinicPrice) : 120,
    });
    res.status(201).json({ doctor: doctorUser, profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create doctor', error: err.message });
  }
}

// Patients search doctors by specialisation
async function listDoctors(req, res) {
  try {
    const filter = {};
    if (req.query.specialisation) filter.specialisation = new RegExp(req.query.specialisation, 'i');
    const profiles = await DoctorProfile.find(filter).populate('user', 'name email phone isActive');
    res.json(profiles.filter((p) => p.user && p.user.isActive !== false));
  } catch (err) {
    res.status(500).json({ message: 'Failed to list doctors', error: err.message });
  }
}

// Generates available slots for a doctor on a given date, minus already-booked
// slots and minus leave days.
async function getAvailableSlots(req, res) {
  try {
    const { doctorId, date } = req.query; // date = "YYYY-MM-DD"
    const doctorUser = await User.findById(doctorId).select('isActive');
    if (!doctorUser || doctorUser.isActive === false) return res.status(403).json({ message: 'Doctor account is inactive' });
    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile) return res.status(404).json({ message: 'Doctor not found' });

    if (profile.leaveDays.includes(date)) {
      return res.json({ slots: [], onLeave: true });
    }

    const weekday = new Date(date + 'T00:00:00').getDay();
    const workingHour = profile.workingHours.find((w) => w.day === weekday);
    if (!workingHour) return res.json({ slots: [], onLeave: false });

    // Build all possible slots between start and end
    const slots = [];
    const [startH, startM] = workingHour.start.split(':').map(Number);
    const [endH, endM] = workingHour.end.split(':').map(Number);
    let cursor = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (cursor + profile.slotDurationMinutes <= end) {
      const h = String(Math.floor(cursor / 60)).padStart(2, '0');
      const m = String(cursor % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      cursor += profile.slotDurationMinutes;
    }

    const booked = await Appointment.find({ doctor: doctorId, date, status: 'booked' }).select('startTime');
    const bookedSet = new Set(booked.map((b) => b.startTime));
    const available = slots.filter((s) => !bookedSet.has(s));

    res.json({ slots: available, onLeave: false });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute slots', error: err.message });
  }
}

// Doctor requests leave. The request must be approved by an admin before the
// date is added to leaveDays and before any existing bookings are cancelled.
async function requestLeave(req, res) {
  try {
    const { date, reason } = req.body;
    const doctorId = req.user.id;
    if (!date) return res.status(400).json({ message: 'Leave date is required' });

    const today = todayInIndia();
    if (date < today) return res.status(400).json({ message: 'Leave date cannot be in the past' });

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' }).select('name email isActive');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    if (doctor.isActive === false) return res.status(403).json({ message: 'Doctor account is inactive' });

    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    if (profile.leaveDays.includes(date)) {
      return res.status(409).json({ message: 'Leave is already approved for this date' });
    }

    const existing = await LeaveRequest.findOne({
      doctor: doctorId,
      date,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(409).json({
        message: existing.status === 'pending'
          ? 'A leave request for this date is already pending'
          : 'Leave is already approved for this date',
      });
    }

    const request = await LeaveRequest.create({ doctor: doctorId, date, reason: reason || '' });
    res.status(201).json({ message: 'Leave request submitted for admin approval', request });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit leave request', error: err.message });
  }
}

// Doctor can see the status of their own leave requests.
async function myLeaveRequests(req, res) {
  try {
    const requests = await LeaveRequest.find({ doctor: req.user.id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load leave requests', error: err.message });
  }
}

// Powers the "AI Daily Briefing" card on the doctor's Overview page.
async function getDailyBriefing(req, res) {
  try {
    const doctorId = req.user.id;
    const doctor = await User.findById(doctorId);
    const today = todayInIndia();

    const todaysAppointments = await Appointment.find({ doctor: doctorId, date: today, status: 'booked' })
      .populate('patient', 'name')
      .sort({ startTime: 1 });

    const shaped = todaysAppointments.map((a) => ({
      startTime: a.startTime,
      patientName: a.patient.name,
      urgency: a.preVisitSummary?.urgency,
      chiefComplaint: a.preVisitSummary?.chiefComplaint,
      symptoms: a.symptoms,
    }));

    const briefing = await generateDailyBriefing(doctor.name, shaped);
    res.json({
      ...briefing,
      totalAppointments: todaysAppointments.length,
      urgentCount: shaped.filter((a) => a.urgency === 'High').length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate daily briefing', error: err.message });
  }
}

// Powers the "AI Clinical Insight" card on a patient's detail page —
// looks at that patient's past completed visits with this doctor.
async function getPatientClinicalInsight(req, res) {
  try {
    const { patientId } = req.params;
    const pastVisits = await Appointment.find({
      patient: patientId,
      doctor: req.user.id,
      status: 'completed',
    }).sort({ date: -1 }).limit(6);

    const notes = pastVisits
      .map((v) => v.postVisitSummary?.summaryText || v.doctorNotes)
      .filter(Boolean);

    const patient = await User.findById(patientId);
    const insight = await generateClinicalInsight(patient.name, notes);
    res.json(insight);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate clinical insight', error: err.message });
  }
}

module.exports = { createDoctor, listDoctors, getAvailableSlots, requestLeave, myLeaveRequests, getDailyBriefing, getPatientClinicalInsight };
