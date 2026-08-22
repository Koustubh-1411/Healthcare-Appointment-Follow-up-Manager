const mongoose = require('mongoose');
const chatMessageSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });
chatMessageSchema.index({ appointment: 1, createdAt: 1 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
