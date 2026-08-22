const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

async function patientRecords(req, res) {
  try {
    const records = await MedicalRecord.find({ patient: req.user.id }).populate('doctor', 'name').sort({ recordDate: -1, createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: 'Failed to load medical records', error: err.message }); }
}

async function doctorPatientRecords(req, res) {
  try {
    const patientId = req.params.patientId;
    const hasAccess = await Appointment.exists({ doctor: req.user.id, patient: patientId });
    if (!hasAccess) return res.status(403).json({ message: 'You have no appointment history with this patient' });
    const records = await MedicalRecord.find({ patient: patientId }).populate('doctor', 'name').sort({ recordDate: -1, createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: 'Failed to load patient records', error: err.message }); }
}

async function createRecord(req, res) {
  try {
    const patientId = req.params.patientId;
    const hasAccess = await Appointment.exists({ doctor: req.user.id, patient: patientId });
    if (!hasAccess) return res.status(403).json({ message: 'You have no appointment history with this patient' });
    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const record = await MedicalRecord.create({ ...req.body, patient: patientId, doctor: req.user.id, recordDate: req.body.recordDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ message: 'Failed to create medical record', error: err.message }); }
}

module.exports = { patientRecords, doctorPatientRecords, createRecord };
