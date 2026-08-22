const nodemailer = require('nodemailer');

const emailEnabled = String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true';
const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

const transporter = emailEnabled && hasEmailCredentials
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    })
  : null;

/**
 * Sends an email. External email delivery is opt-in. When disabled or not
 * configured, the application continues normally without attempting SMTP.
 */
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    return { success: true, skipped: true, reason: 'Email service is disabled or not configured' };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

function bookingConfirmationEmail(appointment, patientName, doctorName) {
  return {
    subject: 'Appointment Confirmed',
    html: `<p>Hi ${patientName},</p>
      <p>Your appointment with Dr. ${doctorName} on <b>${appointment.date} at ${appointment.startTime}</b> is confirmed.</p>`,
  };
}

function cancellationEmail(appointment, name, reason) {
  return {
    subject: 'Appointment Cancelled',
    html: `<p>Hi ${name},</p>
      <p>Your appointment on <b>${appointment.date} at ${appointment.startTime}</b> has been cancelled. Reason: ${reason}</p>`,
  };
}

function reminderEmail(appointment, patientName, medicationSchedule) {
  return {
    subject: 'Medication Reminder',
    html: `<p>Hi ${patientName},</p><p>Reminder for your medication schedule: ${medicationSchedule}</p>`,
  };
}

module.exports = { sendEmail, bookingConfirmationEmail, cancellationEmail, reminderEmail };
