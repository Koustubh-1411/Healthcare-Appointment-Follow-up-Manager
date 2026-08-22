const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendEmail, reminderEmail } = require('./emailService');

/**
 * Runs once a day. Finds appointments completed in the last 24h that have a
 * medication schedule and sends a reminder. Retries failed sends up to 3
 * times (tracked via the notifications array) so a single email outage
 * doesn't silently drop a reminder.
 */
function startReminderJob() {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running medication reminder job...');
    const since = new Date();
    since.setDate(since.getDate() - 1);

    const appointments = await Appointment.find({
      status: 'completed',
      updatedAt: { $gte: since },
      'postVisitSummary.medicationSchedule': { $exists: true, $ne: '' },
    }).populate('patient', 'name email');

    for (const appt of appointments) {
      const failedAttempts = appt.notifications.filter((n) => n.type === 'reminder' && !n.success).length;
      if (failedAttempts >= 3) continue; // give up after 3 retries

      const email = reminderEmail(appt, appt.patient.name, appt.postVisitSummary.medicationSchedule);
      const result = await sendEmail({ to: appt.patient.email, ...email });
      appt.notifications.push({ type: 'reminder', success: result.success });
      await appt.save();
    }
  });
  console.log('Medication reminder cron job scheduled (daily 09:00)');
}

module.exports = startReminderJob;
