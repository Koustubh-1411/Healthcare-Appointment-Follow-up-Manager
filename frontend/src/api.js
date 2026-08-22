const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Thin fetch wrapper: attaches the JWT automatically and throws a
// readable error (using the backend's { message } field) on failure.
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),

  listDoctors: (specialisation) => request(`/doctors${specialisation ? `?specialisation=${encodeURIComponent(specialisation)}` : ''}`, { auth: false }),
  getSlots: (doctorId, date) => request(`/doctors/slots?doctorId=${doctorId}&date=${date}`, { auth: false }),
  createDoctor: (payload) => request('/doctors', { method: 'POST', body: payload }),
  markLeave: (payload) => request('/doctors/leave', { method: 'POST', body: payload }),
  myLeaveRequests: () => request('/doctors/me/leave-requests'),
  getDailyBriefing: () => request('/doctors/me/daily-briefing'),
  getPatientInsight: (patientId) => request(`/doctors/me/patients/${patientId}/insight`),

  bookAppointment: (payload) => request('/appointments', { method: 'POST', body: payload }),
  myAppointments: () => request('/appointments/mine'),
  submitSymptoms: (id, symptoms) => request(`/appointments/${id}/symptoms`, { method: 'PUT', body: { symptoms } }),
  submitPostVisit: (id, payload) => request(`/appointments/${id}/post-visit`, { method: 'PUT', body: payload }),
  cancelAppointment: (id, reason) => request(`/appointments/${id}/cancel`, { method: 'PUT', body: { reason } }),
  markNoShow: (id) => request(`/appointments/${id}/no-show`, { method: 'PUT' }),

  adminOverview: () => request('/admin/overview'),
  adminDoctors: () => request('/admin/doctors'),
  setDoctorStatus: (doctorId, isActive) => request(`/admin/doctors/${doctorId}/status`, { method: 'PATCH', body: { isActive } }),
  adminLeaveRequests: () => request('/admin/leave-requests'),
  reviewLeaveRequest: (requestId, decision, rejectionReason = '') => request(`/admin/leave-requests/${requestId}`, { method: 'PATCH', body: { decision, rejectionReason } }),
  adminAnalytics: () => request('/admin/analytics'),
  patientRecords: () => request('/medical-records/mine'),
  doctorPatientRecords: (patientId) => request(`/medical-records/patient/${patientId}`),
  createMedicalRecord: (patientId, payload) => request(`/medical-records/patient/${patientId}`, { method: 'POST', body: payload }),
  submitReview: (payload) => request('/reviews', { method: 'POST', body: payload }),
  doctorReviews: (doctorId) => request(`/reviews/doctor/${doctorId}`, { auth: false }),
  reviewStatus: (appointmentId) => request(`/reviews/appointment/${appointmentId}/status`),
  chatMessages: (appointmentId) => request(`/consultations/${appointmentId}/messages`),
  sendChatMessage: (appointmentId, text) => request(`/consultations/${appointmentId}/messages`, { method: 'POST', body: { text } }),
  getSignals: (appointmentId, since) => request(`/consultations/${appointmentId}/signals?since=${since}`),
  sendSignal: (appointmentId, type, payload) => request(`/consultations/${appointmentId}/signals`, { method: 'POST', body: { type, payload } }),
};
