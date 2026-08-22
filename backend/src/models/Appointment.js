const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no_show'],
      default: 'booked',
    },

    // Matches the "Video Consult" vs "In-Clinic" choice shown on the booking screen
    consultationType: { type: String, enum: ['video', 'in_clinic'], default: 'video' },
    price: { type: Number },

    // Pre-visit
    symptoms: { type: String },
    preVisitSummary: {
      urgency: { type: String, enum: ['Low', 'Medium', 'High'] },
      chiefComplaint: { type: String },
      suggestedQuestions: [{ type: String }],
      raw: { type: String }, // raw LLM output, kept for audit if parsing fails
    },

    // Post-visit
    doctorNotes: { type: String },
    prescription: { type: String },
    postVisitSummary: {
      summaryText: { type: String },
      medicationSchedule: { type: String },
      followUpSteps: { type: String },
    },

    // Integrations
    patientCalendarEventId: { type: String },
    doctorCalendarEventId: { type: String },
    notifications: [
      {
        type: { type: String }, // 'confirmation' | 'reminder' | 'cancellation' | 'leave_conflict'
        sentAt: { type: Date, default: Date.now },
        success: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

// CRITICAL: prevents double-booking at the database level.
// Only one *booked* appointment can exist for a given doctor/date/startTime.
// Cancelled appointments are excluded so the slot frees up again.
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: 'booked' } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
