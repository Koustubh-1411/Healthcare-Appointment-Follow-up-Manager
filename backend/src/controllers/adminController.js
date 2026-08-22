const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const LeaveRequest = require('../models/LeaveRequest');
const { sendEmail, cancellationEmail } = require('../services/emailService');
const { deleteEvent } = require('../services/calendarService');

// Powers the Admin "System Overview" dashboard: doctor/patient counts,
// today's bookings, and system alerts (failed notifications, slow LLM calls).
async function getSystemOverview(req, res) {
  try {
    const [totalDoctors, totalPatients, pendingLeaveRequests] = await Promise.all([
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'patient' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const todaysBookings = await Appointment.countDocuments({ date: today, status: { $ne: 'cancelled' } });

    // "System Alerts": count of appointments whose most recent notification
    // attempt failed, and count of appointments where the LLM fell back
    // (i.e. real usage signals, not fake data).
    const failedNotificationAppointments = await Appointment.aggregate([
      { $unwind: '$notifications' },
      { $match: { 'notifications.success': false } },
      { $group: { _id: '$_id' } },
    ]);

    const llmFallbackCount = await Appointment.countDocuments({
      $or: [{ 'preVisitSummary.raw': /LLM unavailable/i }],
    });

    // Booking volume for the last 7 days, for the bar chart on the dashboard.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const bookingVolume = await Appointment.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalDoctors,
      totalPatients,
      pendingLeaveRequests,
      todaysBookings,
      systemAlerts: {
        failedNotifications: failedNotificationAppointments.length,
        llmFallbacks: llmFallbackCount,
        total: failedNotificationAppointments.length + llmFallbackCount,
      },
      bookingVolume7Days: bookingVolume,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load system overview', error: err.message });
  }
}

// Powers Admin > Doctor Mgt table: name, specialisation, access status,
// and every leave date recorded for the doctor.
async function listDoctorsForAdmin(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const profiles = await DoctorProfile.find()
      .populate('user', 'name email phone isActive')
      .sort({ createdAt: -1 });

    const shaped = profiles
      .filter((p) => p.user)
      .map((p) => {
        const leaveDays = [...new Set(p.leaveDays || [])].sort();
        const status = p.user.isActive === false
          ? 'inactive'
          : (leaveDays.includes(today) ? 'on_leave' : 'active');
        return {
          id: p.user._id,
          name: p.user.name,
          email: p.user.email,
          phone: p.user.phone,
          specialisation: p.specialisation,
          status,
          isActive: p.user.isActive !== false,
          leaveDays,
          workingHours: (p.workingHours || []).map((h) => ({ day: h.day, start: h.start, end: h.end })),
          slotDurationMinutes: p.slotDurationMinutes || 30,
        };
      });
    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list doctors', error: err.message });
  }
}

// Admin can enable/disable a doctor account at any time.
async function setDoctorStatus(req, res) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const doctor = await User.findOneAndUpdate(
      { _id: req.params.doctorId, role: 'doctor' },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select('name email isActive');

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: `Doctor ${isActive ? 'activated' : 'deactivated'}`, doctor });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update doctor status', error: err.message });
  }
}

// Admin reviews all doctor leave requests. Pending requests are returned first.
async function listLeaveRequests(req, res) {
  try {
    const requests = await LeaveRequest.find()
      .populate('doctor', 'name email isActive')
      .populate('reviewedBy', 'name')
      .sort({ status: 1, createdAt: -1 });

    res.json(requests.map((r) => ({
      id: r._id,
      doctorId: r.doctor?._id,
      doctorName: r.doctor?.name || 'Unknown doctor',
      doctorEmail: r.doctor?.email || '',
      doctorIsActive: r.doctor?.isActive !== false,
      date: r.date,
      reason: r.reason || '',
      status: r.status,
      rejectionReason: r.rejectionReason || '',
      affectedAppointments: r.affectedAppointments || 0,
      reviewedBy: r.reviewedBy?.name || '',
      reviewedAt: r.reviewedAt || null,
      createdAt: r.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load leave requests', error: err.message });
  }
}

// Approving a request makes the date an actual leave day and cancels any
// existing booked appointments on that date. Rejecting only records the decision.
async function reviewLeaveRequest(req, res) {
  try {
    const { decision, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approved or rejected' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.requestId);
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    if (leaveRequest.status !== 'pending') {
      return res.status(409).json({ message: `Leave request is already ${leaveRequest.status}` });
    }

    const doctor = await User.findOne({ _id: leaveRequest.doctor, role: 'doctor' }).select('name email isActive');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    leaveRequest.status = decision;
    leaveRequest.reviewedBy = req.user.id;
    leaveRequest.reviewedAt = new Date();

    if (decision === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason || 'Leave request rejected by admin';
      leaveRequest.affectedAppointments = 0;
      await leaveRequest.save();
      return res.json({ message: 'Leave request rejected', request: leaveRequest });
    }

    const profile = await DoctorProfile.findOne({ user: leaveRequest.doctor });
    if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

    if (!profile.leaveDays.includes(leaveRequest.date)) {
      profile.leaveDays.push(leaveRequest.date);
      await profile.save();
    }

    const affected = await Appointment.find({
      doctor: leaveRequest.doctor,
      date: leaveRequest.date,
      status: 'booked',
    })
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    for (const appt of affected) {
      appt.status = 'cancelled';
      if (appt.patientCalendarEventId) await deleteEvent(appt.patientCalendarEventId);
      if (appt.doctorCalendarEventId) await deleteEvent(appt.doctorCalendarEventId);

      if (appt.patient?.email) {
        const patientEmail = cancellationEmail(appt, appt.patient.name, 'Doctor leave was approved for that day');
        const result = await sendEmail({ to: appt.patient.email, ...patientEmail });
        appt.notifications.push({ type: 'leave_conflict', success: result.success });
      }
      await appt.save();
    }

    leaveRequest.affectedAppointments = affected.length;
    await leaveRequest.save();

    res.json({
      message: `Leave approved${affected.length ? ` and ${affected.length} appointment(s) cancelled` : ''}`,
      request: leaveRequest,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to review leave request', error: err.message });
  }
}



async function getAnalytics(req, res) {
  try {
    const [revenue, statuses, topSpecialisations, noShowCount, totalAppointments] = await Promise.all([
      Appointment.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, revenue: { $sum: { $ifNull: ['$price', 0] } }, count: { $sum: 1 } } }]),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $lookup: { from: 'doctorprofiles', localField: 'doctor', foreignField: 'user', as: 'profile' } },
        { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
        { $group: { _id: { $ifNull: ['$profile.specialisation', 'Unknown'] }, appointments: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$price', 0] } } } },
        { $sort: { appointments: -1 } }, { $limit: 8 },
      ]),
      Appointment.countDocuments({ status: 'no_show' }),
      Appointment.countDocuments(),
    ]);
    const statusMap = Object.fromEntries(statuses.map(x => [x._id, x.count]));
    res.json({
      revenue: revenue[0]?.revenue || 0,
      totalAppointments,
      completed: statusMap.completed || 0,
      booked: statusMap.booked || 0,
      cancelled: statusMap.cancelled || 0,
      noShow: noShowCount,
      noShowRate: totalAppointments ? Number((noShowCount / totalAppointments * 100).toFixed(1)) : 0,
      topSpecialisations: topSpecialisations.map(x => ({ specialisation: x._id, appointments: x.appointments, revenue: x.revenue })),
    });
  } catch (err) { res.status(500).json({ message: 'Failed to load analytics', error: err.message }); }
}

module.exports = { getSystemOverview, listDoctorsForAdmin, setDoctorStatus, listLeaveRequests, reviewLeaveRequest, getAnalytics };
