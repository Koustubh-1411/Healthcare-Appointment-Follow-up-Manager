const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });
reviewSchema.index({ doctor: 1, createdAt: -1 });
module.exports = mongoose.model('Review', reviewSchema);
