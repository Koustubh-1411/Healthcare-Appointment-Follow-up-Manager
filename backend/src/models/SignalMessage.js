const mongoose = require('mongoose');
const signalMessageSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['offer', 'answer', 'candidate', 'hangup'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 3600 },
});
module.exports = mongoose.model('SignalMessage', signalMessageSchema);
