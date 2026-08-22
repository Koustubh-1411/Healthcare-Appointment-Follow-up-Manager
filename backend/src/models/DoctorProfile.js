const mongoose = require('mongoose');

// Working hours per weekday, e.g. { day: 1, start: "09:00", end: "17:00" } (day: 0=Sun ... 6=Sat)
const workingHourSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialisation: { type: String, required: true },
    workingHours: [workingHourSchema],
    slotDurationMinutes: { type: Number, default: 30 },
    // Specific dates the doctor is on leave, e.g. ["2026-08-25"]
    leaveDays: [{ type: String }],

    // Matches the pricing shown on the doctor's booking screen
    videoConsultPrice: { type: Number, default: 80 },
    inClinicPrice: { type: Number, default: 120 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    clinicName: { type: String },
    clinicAddress: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
