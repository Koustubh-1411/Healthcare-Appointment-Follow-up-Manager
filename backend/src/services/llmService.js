const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_ENABLED = String(process.env.GEMINI_ENABLED || 'false').toLowerCase() === 'true';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const genAI = GEMINI_ENABLED && process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: GEMINI_MODEL }) : null;

function isQuotaOrAvailabilityError(err) {
  const message = String(err?.message || '').toLowerCase();
  return message.includes('429') || message.includes('quota') || message.includes('503') || message.includes('high demand') || message.includes('unavailable');
}

// Tries to pull a JSON object out of the model's text response,
// since models sometimes wrap JSON in markdown fences or extra text.
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in LLM response');
  return JSON.parse(match[0]);
}

/**
 * Pre-visit summary: urgency, chief complaint, 3 suggested questions.
 * NEVER throws — on any failure it returns a safe fallback object so the
 * booking flow can continue even if the LLM is down.
 */
async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}

Respond ONLY with valid JSON in this exact shape, no markdown, no extra text:
{"urgency": "Low|Medium|High", "chiefComplaint": "string", "suggestedQuestions": ["q1", "q2", "q3"]}`;

  try {
    if (!model) throw new Error('Gemini AI is disabled or not configured');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);
    return {
      urgency: parsed.urgency || 'Medium',
      chiefComplaint: parsed.chiefComplaint || symptoms.slice(0, 120),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      raw: text,
      llmFailed: false,
    };
  } catch (err) {
    if (!isQuotaOrAvailabilityError(err) && model) console.warn('LLM pre-visit summary unavailable; using fallback:', err.message);
    // Graceful fallback — doctor still sees the raw symptoms and can proceed manually.
    return {
      urgency: 'Medium',
      chiefComplaint: symptoms.slice(0, 120),
      suggestedQuestions: [],
      raw: `LLM unavailable. Raw symptoms: ${symptoms}`,
      llmFailed: true,
    };
  }
}

/**
 * Post-visit summary: patient-friendly summary + medication schedule + follow-up.
 * Also never throws.
 */
async function generatePostVisitSummary(clinicalNotes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${clinicalNotes}

Respond ONLY with valid JSON in this exact shape, no markdown, no extra text:
{"summaryText": "string", "medicationSchedule": "string", "followUpSteps": "string"}`;

  try {
    if (!model) throw new Error('Gemini AI is disabled or not configured');
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);
    return {
      summaryText: parsed.summaryText || clinicalNotes,
      medicationSchedule: parsed.medicationSchedule || 'Not specified',
      followUpSteps: parsed.followUpSteps || 'Please follow up as advised by your doctor.',
      llmFailed: false,
    };
  } catch (err) {
    if (!isQuotaOrAvailabilityError(err) && model) console.warn('LLM post-visit summary unavailable; using fallback:', err.message);
    return {
      summaryText: clinicalNotes,
      medicationSchedule: 'Could not be auto-generated. Please check your prescription.',
      followUpSteps: 'Please follow up as advised by your doctor.',
      llmFailed: true,
    };
  }
}

/**
 * Doctor dashboard "AI Daily Briefing" — summarises today's schedule and
 * flags the highest-priority patient. Takes an array of today's appointments
 * (with patient name + urgency + chief complaint already populated).
 * Never throws — falls back to a plain-text summary built from the data
 * itself if the LLM is unavailable.
 */
async function generateDailyBriefing(doctorName, appointmentsToday) {
  if (!appointmentsToday.length) {
    return {
      briefingText: `Good morning, Dr. ${doctorName}. You have 0 appointment(s) today.`,
      keyInsights: [],
      llmFailed: false,
    };
  }

  const scheduleText = appointmentsToday
    .map((a) => `${a.startTime} - ${a.patientName}: urgency ${a.urgency || 'unknown'}, complaint: ${a.chiefComplaint || a.symptoms || 'none noted'}`)
    .join('\n');

  const prompt = `You are an assistant summarising a doctor's day. Doctor: ${doctorName}. Today's appointments:\n${scheduleText}\n
Write a short 2-3 sentence morning briefing, in second person, greeting the doctor, mentioning the total number of appointments and calling out the single highest-urgency patient by name with a brief reason.
Respond ONLY with valid JSON, no markdown: {"briefingText": "string", "keyInsights": ["short bullet 1", "short bullet 2"]}`;

  try {
    if (!model) throw new Error('Gemini AI is disabled or not configured');
    const result = await model.generateContent(prompt);
    const parsed = extractJSON(result.response.text());
    return {
      briefingText: parsed.briefingText,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      llmFailed: false,
    };
  } catch (err) {
    if (!isQuotaOrAvailabilityError(err) && model) console.warn('LLM daily briefing unavailable; using fallback:', err.message);
    const highPriority = appointmentsToday.find((a) => a.urgency === 'High');
    return {
      briefingText: `Good morning, Dr. ${doctorName}. You have ${appointmentsToday.length} appointment(s) today.${
        highPriority ? ` ${highPriority.patientName} is flagged High priority.` : ''
      }`,
      keyInsights: [],
      llmFailed: true,
    };
  }
}

/**
 * Patient page "AI Clinical Insight" — looks across a patient's past visit
 * summaries/notes to flag a recurring pattern (e.g. repeated joint pain).
 * Takes an array of past visit notes/summaries (strings) for one patient.
 * Never throws — returns null insight on failure rather than breaking the page.
 */
async function generateClinicalInsight(patientName, pastVisitNotes) {
  if (!pastVisitNotes || pastVisitNotes.length < 2) {
    // Not enough history to detect a pattern — this is a normal case, not a failure.
    return { hasInsight: false, insightText: null, llmFailed: false };
  }

  const notesText = pastVisitNotes.map((n, i) => `Visit ${i + 1}: ${n}`).join('\n');
  const prompt = `Review these past clinical visit notes for patient ${patientName} and identify any recurring symptom or condition pattern worth flagging to the doctor. Notes:\n${notesText}\n
Respond ONLY with valid JSON, no markdown: {"hasInsight": true|false, "insightText": "one sentence pattern + one sentence recommendation, or null if nothing notable"}`;

  try {
    if (!model) throw new Error('Gemini AI is disabled or not configured');
    const result = await model.generateContent(prompt);
    const parsed = extractJSON(result.response.text());
    return { hasInsight: !!parsed.hasInsight, insightText: parsed.insightText || null, llmFailed: false };
  } catch (err) {
    if (!isQuotaOrAvailabilityError(err) && model) console.warn('LLM clinical insight unavailable; using fallback:', err.message);
    return { hasInsight: false, insightText: null, llmFailed: true };
  }
}

module.exports = {
  generatePreVisitSummary,
  generatePostVisitSummary,
  generateDailyBriefing,
  generateClinicalInsight,
};
