/**
 * One-time helper script to get your GOOGLE_REFRESH_TOKEN.
 * Run with: node scripts/get-google-refresh-token.js
 * Fill GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env before running.
 */
require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // for a simple copy-paste flow, no local server needed
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent', // forces a refresh_token to be issued even if you've authorized before
});

console.log('\n1. Open this URL in your browser and log in with the Google account you want the calendar events created on:\n');
console.log(authUrl);
console.log('\n2. After allowing access, Google will show you a code on the page. Copy it.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('3. Paste that code here and press Enter: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\nSuccess! Add this line to your .env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error('Failed to get token:', err.message);
  }
  rl.close();
});
