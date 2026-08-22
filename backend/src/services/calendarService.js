const { google } = require('googleapis');

const calendarEnabled = String(process.env.GOOGLE_CALENDAR_ENABLED || 'false').toLowerCase() === 'true';
const hasCalendarCredentials = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REDIRECT_URI &&
  process.env.GOOGLE_REFRESH_TOKEN
);

function getOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

function calendarReady() {
  return calendarEnabled && hasCalendarCredentials;
}

/**
 * Creates a calendar event. Calendar integration is opt-in and best-effort.
 * If disabled/unconfigured, booking continues without a calendar event.
 */
async function createEvent({ summary, description, date, startTime, endTime, attendeeEmail }) {
  if (!calendarReady()) return null;

  try {
    const calendar = google.calendar({ version: 'v3', auth: getOAuthClient() });
    const event = {
      summary,
      description,
      start: { dateTime: `${date}T${startTime}:00`, timeZone: 'Asia/Kolkata' },
      end: { dateTime: `${date}T${endTime}:00`, timeZone: 'Asia/Kolkata' },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    };
    const res = await calendar.events.insert({ calendarId: 'primary', resource: event });
    return res.data.id;
  } catch (err) {
    console.error('Calendar event creation failed:', err.message);
    return null;
  }
}

async function updateEvent(eventId, updates) {
  if (!calendarReady() || !eventId) return true;
  try {
    const calendar = google.calendar({ version: 'v3', auth: getOAuthClient() });
    await calendar.events.patch({ calendarId: 'primary', eventId, resource: updates });
    return true;
  } catch (err) {
    console.error('Calendar event update failed:', err.message);
    return false;
  }
}

async function deleteEvent(eventId) {
  if (!calendarReady() || !eventId) return true;
  try {
    const calendar = google.calendar({ version: 'v3', auth: getOAuthClient() });
    await calendar.events.delete({ calendarId: 'primary', eventId });
    return true;
  } catch (err) {
    console.error('Calendar event deletion failed:', err.message);
    return false;
  }
}

module.exports = { createEvent, updateEvent, deleteEvent };
