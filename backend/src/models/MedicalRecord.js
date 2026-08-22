const mongoose = require('mongoose');
const medicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  recordType: { type: String, enum: ['consultation', 'diagnosis', 'prescription', 'lab', 'note'], default: 'consultation' },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  medications: { type: String, trim: true },
  allergies: { type: String, trim: true },
  bloodGroup: { type: String, trim: true },
  recordDate: { type: String, required: true },
}, { timestamps: true });
medicalRecordSchema.index({ patient: 1, recordDate: -1 });
module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
