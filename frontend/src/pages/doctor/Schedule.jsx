import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import appointmentHelp from '../../assets/appointment-help.png';

const navItems = [
  { to: '/doctor/overview', label: 'Overview' },
  { to: '/doctor/patients', label: 'My Patients' },
  { to: '/doctor/schedule', label: 'Schedule' },
];

export default function Schedule() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);

  async function loadRequests() {
    try {
      const data = await api.myLeaveRequests();
      setRequests(data);
    } catch (err) {
      // Keep the request form usable even if history cannot be loaded.
    }
  }

  React.useEffect(() => { loadRequests(); }, []);

  async function requestLeave() {
    if (!date || loading) return;
    setLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      const res = await api.markLeave({ date, reason });
      setSuccess(true);
      setMessage(res.message || `Leave request submitted for ${date}.`);
      setDate('');
      setReason('');
      await loadRequests();
    } catch (err) {
      setSuccess(false);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar items={navItems} />

      <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_430px] gap-10 items-start">
          <section>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Schedule & Leave Management
            </h1>
            <p className="text-slate-500 mb-8 max-w-2xl">
              Submit a leave request to the clinic admin. The leave becomes active
              only after the admin approves it. Approved leave can cancel existing bookings.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl">
              <label className="font-medium text-sm block mb-2" htmlFor="leave-date">
                Leave Date
              </label>
              <input
                id="leave-date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 mb-5 w-full focus:outline-none focus:ring-2 focus:ring-brand/30"
              />

              <label className="font-medium text-sm block mb-2" htmlFor="leave-reason">
                Reason (optional)
              </label>
              <textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Personal work, medical appointment..."
                className="border border-slate-300 rounded-lg px-3 py-2.5 mb-5 w-full min-h-24 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />

              <button
                type="button"
                disabled={loading || !date || user?.role !== 'doctor'}
                onClick={requestLeave}
                className="bg-brand text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Leave Request'}
              </button>

              {message && (
                <p
                  className={`mt-5 text-sm p-4 rounded-lg ${
                    success
                      ? 'bg-green-50 text-green-800 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
                >
                  {message}
                </p>
              )}

              <div className="mt-8">
                <h2 className="font-semibold text-lg mb-3">My Leave Requests</h2>
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r._id} className="border rounded-xl p-4 bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{r.date}</p>
                          {r.reason && <p className="text-sm text-slate-500 mt-1">{r.reason}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          r.status === 'approved' ? 'bg-green-100 text-green-700' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                      {r.status === 'rejected' && r.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">Admin: {r.rejectionReason}</p>
                      )}
                      {r.status === 'approved' && r.affectedAppointments > 0 && (
                        <p className="text-xs text-slate-500 mt-2">{r.affectedAppointments} appointment(s) were cancelled.</p>
                      )}
                    </div>
                  ))}
                  {requests.length === 0 && <p className="text-sm text-slate-400">No leave requests yet.</p>}
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-brand-light">
            <img
              src={appointmentHelp}
              alt="Healthcare appointment support"
              className="w-full h-[300px] object-cover"
            />
            <div className="p-5">
              <h2 className="font-semibold text-lg">Plan your day with confidence</h2>
              <p className="text-sm text-slate-600 mt-1">
                Mark your unavailable dates early so patients can see the correct
                appointment availability.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
