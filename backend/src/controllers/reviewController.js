const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');

async function submitReview(req, res) {
  try {
    const { appointmentId, rating, review } = req.body;
    const appt = await Appointment.findById(appointmentId);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appt.patient) !== req.user.id) return res.status(403).json({ message: 'Only the patient can review this appointment' });
    if (appt.status !== 'completed') return res.status(400).json({ message: 'Review is available after the appointment is completed' });
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    const existing = await Review.findOne({ appointment: appt._id });
    if (existing) return res.status(409).json({ message: 'You already reviewed this appointment' });
    const created = await Review.create({ doctor: appt.doctor, patient: req.user.id, appointment: appt._id, rating: Number(rating), review: review || '' });
    const stats = await Review.aggregate([{ $match: { doctor: appt.doctor } }, { $group: { _id: '$doctor', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    await DoctorProfile.findOneAndUpdate({ user: appt.doctor }, { rating: stats[0]?.avg || 0, reviewCount: stats[0]?.count || 0 });
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ message: 'Failed to submit review', error: err.message }); }
}

async function listDoctorReviews(req, res) {
  try {
    const reviews = await Review.find({ doctor: req.params.doctorId }).populate('patient', 'name').sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: 'Failed to load reviews', error: err.message }); }
}

async function reviewStatusForAppointment(req, res) {
  try { res.json({ reviewed: !!(await Review.exists({ appointment: req.params.appointmentId, patient: req.user.id })) }); }
  catch (err) { res.status(500).json({ message: 'Failed to check review status' }); }
}

module.exports = { submitReview, listDoctorReviews, reviewStatusForAppointment };
