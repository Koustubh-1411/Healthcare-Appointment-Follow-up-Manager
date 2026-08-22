import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';

const navItems = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/doctors', label: 'Doctor Mgt' },
];

const DAYS = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' },
];

const defaultHours = Object.fromEntries(
  DAYS.map(({ day }) => [day, { enabled: day >= 1 && day <= 5, start: '09:00', end: '17:00' }])
);

const emptyForm = {
  name: '', email: '', password: '', phone: '', specialisation: '',
  videoConsultPrice: 80, inClinicPrice: 120, slotDurationMinutes: 30,
};

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function previewSlots(start, end, duration) {
  const total = minutesBetween(start, end);
  if (total <= 0 || !duration) return [];
  const [sh, sm] = start.split(':').map(Number);
  const first = sh * 60 + sm;
  const out = [];
  for (let cursor = first; cursor + duration <= first + total; cursor += duration) {
    const h = String(Math.floor(cursor / 60)).padStart(2, '0');
    const m = String(cursor % 60).padStart(2, '0');
    out.push(`${h}:${m}`);
  }
  return out;
}

export default function AddDoctor() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const enabledDays = useMemo(() => DAYS.filter(({ day }) => hours[day].enabled), [hours]);

  function updateDay(day, patch) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function applyMondayToWeekdays() {
    const monday = hours[1];
    setHours((prev) => ({
      ...prev,
      1: { ...monday, enabled: true },
      2: { ...monday, enabled: true },
      3: { ...monday, enabled: true },
      4: { ...monday, enabled: true },
      5: { ...monday, enabled: true },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (enabledDays.length === 0) {
      setError('Select at least one working day.');
      return;
    }

    for (const { day, name } of DAYS) {
      const h = hours[day];
      if (!h.enabled) continue;
      if (minutesBetween(h.start, h.end) <= 0) {
        setError(`${name}: end time must be after start time.`);
        return;
      }
    }

    setLoading(true);
    try {
      const workingHours = DAYS
        .filter(({ day }) => hours[day].enabled)
        .map(({ day }) => ({ day, start: hours[day].start, end: hours[day].end }));

      await api.createDoctor({
        ...form,
        videoConsultPrice: Number(form.videoConsultPrice),
        inClinicPrice: Number(form.inClinicPrice),
        slotDurationMinutes: Number(form.slotDurationMinutes),
        workingHours,
      });

      setSuccess('Doctor account created successfully with the selected weekly availability.');
      setTimeout(() => navigate('/admin/doctors'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/admin/doctors')} className="text-brand font-medium mb-5 hover:underline">
            ← Back to Doctor Management
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Add New Doctor</h1>
            <p className="text-slate-500 mt-1">Create the doctor account and configure their available appointment slots for every day of the week.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-5">Doctor Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm font-medium">Full name
                  <input required className="mt-2 w-full border rounded-lg px-3 py-2.5" placeholder="Dr. Shiv Shaker"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Email
                  <input required type="email" className="mt-2 w-full border rounded-lg px-3 py-2.5" placeholder="doctor@example.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Temporary password
                  <input required type="password" className="mt-2 w-full border rounded-lg px-3 py-2.5" placeholder="Temporary password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Phone number
                  <input className="mt-2 w-full border rounded-lg px-3 py-2.5" placeholder="Optional"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Specialisation
                  <input required className="mt-2 w-full border rounded-lg px-3 py-2.5" placeholder="e.g. Cardiology"
                    value={form.specialisation} onChange={(e) => setForm({ ...form, specialisation: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Slot duration
                  <select className="mt-2 w-full border rounded-lg px-3 py-2.5"
                    value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}>
                    {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Video consultation price
                  <input type="number" min="0" className="mt-2 w-full border rounded-lg px-3 py-2.5"
                    value={form.videoConsultPrice} onChange={(e) => setForm({ ...form, videoConsultPrice: e.target.value })} />
                </label>
                <label className="text-sm font-medium">In-clinic price
                  <input type="number" min="0" className="mt-2 w-full border rounded-lg px-3 py-2.5"
                    value={form.inClinicPrice} onChange={(e) => setForm({ ...form, inClinicPrice: e.target.value })} />
                </label>
              </div>
            </section>

            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold">Weekly Availability & Slot Timing</h2>
                  <p className="text-sm text-slate-500 mt-1">Choose the working hours for each day. Patients will only see generated slots inside these timings.</p>
                </div>
                <button type="button" onClick={applyMondayToWeekdays} className="border border-brand text-brand px-4 py-2 rounded-lg font-medium">
                  Copy Monday → Mon–Fri
                </button>
              </div>

              <div className="space-y-3">
                {DAYS.map(({ day, name }) => {
                  const h = hours[day];
                  const slots = h.enabled ? previewSlots(h.start, h.end, Number(form.slotDurationMinutes)) : [];
                  return (
                    <div key={day} className={`border rounded-xl p-4 ${h.enabled ? 'bg-slate-50' : 'bg-white'}`}>
                      <div className="grid lg:grid-cols-[170px_150px_150px_1fr] gap-4 items-center">
                        <label className="flex items-center gap-3 font-semibold">
                          <input type="checkbox" checked={h.enabled} onChange={(e) => updateDay(day, { enabled: e.target.checked })} className="w-4 h-4 accent-emerald-700" />
                          {name}
                        </label>
                        <label className="text-sm text-slate-600">Start time
                          <input type="time" disabled={!h.enabled} value={h.start} onChange={(e) => updateDay(day, { start: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100" />
                        </label>
                        <label className="text-sm text-slate-600">End time
                          <input type="time" disabled={!h.enabled} value={h.end} onChange={(e) => updateDay(day, { end: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100" />
                        </label>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Available slots ({slots.length})</p>
                          {h.enabled ? (
                            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                              {slots.map((slot) => <span key={slot} className="text-xs bg-brand-light text-brand px-2 py-1 rounded-md">{slot}</span>)}
                            </div>
                          ) : <span className="text-sm text-slate-400">Day off</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 p-4 rounded-xl bg-brand-light border border-brand/10">
                <p className="text-sm"><b>How it works:</b> if Monday is 09:00–17:00 and slot duration is 30 minutes, patients will see 09:00, 09:30, 10:00 … 16:30, minus already booked slots.</p>
              </div>
            </section>

            {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4">{error}</div>}
            {success && <div className="bg-green-50 border border-green-100 text-green-700 rounded-xl p-4">{success}</div>}

            <div className="flex justify-end gap-3 pb-8">
              <button type="button" onClick={() => navigate('/admin/doctors')} className="border px-6 py-3 rounded-lg font-medium">Cancel</button>
              <button disabled={loading} className="bg-brand text-white px-7 py-3 rounded-lg font-medium disabled:opacity-50">
                {loading ? 'Creating Doctor...' : 'Create Doctor & Save Availability'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
