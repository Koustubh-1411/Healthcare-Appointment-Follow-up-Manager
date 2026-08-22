const Appointment = require('../models/Appointment');
const ChatMessage = require('../models/ChatMessage');
const SignalMessage = require('../models/SignalMessage');

async function getAppointmentForUser(id, userId) {
  return Appointment.findOne({ _id: id, $or: [{ patient: userId }, { doctor: userId }] });
}
async function getMessages(req, res) {
  try { const appt = await getAppointmentForUser(req.params.appointmentId, req.user.id); if (!appt) return res.status(403).json({ message: 'Forbidden' }); const messages = await ChatMessage.find({ appointment: appt._id }).populate('sender', 'name role').sort({ createdAt: 1 }).limit(300); res.json(messages); }
  catch (err) { res.status(500).json({ message: 'Failed to load chat', error: err.message }); }
}
async function postMessage(req, res) {
  try { const appt = await getAppointmentForUser(req.params.appointmentId, req.user.id); if (!appt) return res.status(403).json({ message: 'Forbidden' }); if (!req.body.text?.trim()) return res.status(400).json({ message: 'Message is required' }); const msg = await ChatMessage.create({ appointment: appt._id, sender: req.user.id, text: req.body.text.trim() }); await msg.populate('sender', 'name role'); res.status(201).json(msg); }
  catch (err) { res.status(500).json({ message: 'Failed to send message', error: err.message }); }
}
async function getSignals(req, res) {
  try { const appt = await getAppointmentForUser(req.params.appointmentId, req.user.id); if (!appt) return res.status(403).json({ message: 'Forbidden' }); const since = req.query.since ? new Date(Number(req.query.since)) : new Date(Date.now() - 5 * 60 * 1000); const signals = await SignalMessage.find({ appointment: appt._id, sender: { $ne: req.user.id }, createdAt: { $gt: since } }).sort({ createdAt: 1 }); res.json(signals); }
  catch (err) { res.status(500).json({ message: 'Failed to load video signals', error: err.message }); }
}
async function postSignal(req, res) {
  try { const appt = await getAppointmentForUser(req.params.appointmentId, req.user.id); if (!appt) return res.status(403).json({ message: 'Forbidden' }); const signal = await SignalMessage.create({ appointment: appt._id, sender: req.user.id, type: req.body.type, payload: req.body.payload }); res.status(201).json(signal); }
  catch (err) { res.status(500).json({ message: 'Failed to send video signal', error: err.message }); }
}
module.exports = { getMessages, postMessage, getSignals, postSignal };
