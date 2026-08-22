import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';
import heroDoctor from '../../assets/hero-doctor.png';

const navItems = [
  { to: '/doctor/overview', label: 'Overview' },
  { to: '/doctor/patients', label: 'My Patients' },
  { to: '/doctor/schedule', label: 'Schedule' },
];

const urgencyColor = {
  High: 'border-red-400 bg-red-50',
  Medium: 'border-amber-400 bg-amber-50',
  Low: 'border-green-400 bg-green-50',
};

export default function DoctorOverview() {
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [appts, brief] = await Promise.all([
          api.myAppointments(),
          api.getDailyBriefing(),
        ]);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const booked = appts.filter((a) => a.status === 'booked');
        setAppointments(booked);
        setTodayAppointments(booked.filter((a) => a.date === today));
        setBriefing(brief);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar items={navItems} />

      <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
            <section>
              <h1 className="text-3xl font-bold">Today's Overview</h1>
              <p className="text-slate-500 mb-8">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                · {todayAppointments.length} appointments today
              </p>

              <h2 className="font-semibold mb-4">Today's Schedule</h2>
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              {loading && <p className="text-slate-500">Loading...</p>}

              <div className="space-y-4">
                {todayAppointments.map((a) => (
                  <div
                    key={a._id}
                    className={`border-l-4 rounded-xl p-5 bg-white shadow-sm ${
                      urgencyColor[a.preVisitSummary?.urgency] || 'border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      {a.startTime}{' '}
                      {a.preVisitSummary?.urgency
                        ? `· ${a.preVisitSummary.urgency} Priority`
                        : ''}
                    </p>
                    <h3 className="font-semibold">{a.patient?.name}</h3>
                    <p className="text-sm text-slate-600">
                      {a.preVisitSummary?.chiefComplaint ||
                        a.symptoms ||
                        'No symptoms submitted yet'}
                    </p>
                    <div className="mt-3 flex gap-3">{a.consultationType==='video'&&<a href={`/consultation/${a._id}`} className="text-brand text-sm font-semibold">Join Video Consult →</a>}<button onClick={async()=>{if(confirm('Mark this appointment as no-show?')){await api.markNoShow(a._id);window.location.reload();}}} className="text-red-600 text-sm font-medium">Mark No-show</button></div>
                  </div>
                ))}
                {!loading && !error && todayAppointments.length === 0 && (
                  <p className="text-slate-500">No appointments today.</p>
                )}
              </div>

              {!loading && appointments.length > todayAppointments.length && (
                <div className="mt-10">
                  <h2 className="font-semibold mb-4">Upcoming Appointments</h2>
                  <div className="space-y-3">
                    {appointments.filter((a) => !todayAppointments.some((t) => t._id === a._id)).map((a) => (
                      <div key={a._id} className="border rounded-xl p-4 bg-white shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{a.patient?.name || 'Patient'}</p>
                          <p className="text-sm text-slate-500">{a.date} · {a.startTime} · {a.consultationType === 'video' ? 'Video Consult' : 'In-Clinic'}</p>
                          <p className="text-sm text-slate-600 mt-1">{a.preVisitSummary?.chiefComplaint || a.symptoms || 'No symptoms submitted yet'}</p>
                        </div>
                        <div className="flex items-center gap-3"><span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">Booked</span>{a.consultationType==='video'&&<a href={`/consultation/${a._id}`} className="text-sm text-brand font-semibold">Join →</a>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white">
                <img
                  src={heroDoctor}
                  alt="Doctor consulting with a patient"
                  className="w-full h-56 object-cover"
                />
              </div>

              <div className="bg-brand-light rounded-xl p-5">
                <h2 className="font-semibold mb-3">AI Daily Briefing</h2>
                {!briefing ? (
                  <p className="text-slate-500 text-sm">Loading briefing...</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 italic">
                      "{briefing.briefingText}"
                    </p>
                    {briefing.keyInsights?.length > 0 && (
                      <ul className="mt-3 text-sm space-y-1 list-disc list-inside text-slate-600">
                        {briefing.keyInsights.map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-brand">
                    {briefing?.totalAppointments ?? todayAppointments.length}
                  </p>
                  <p className="text-xs text-slate-500">Total Appts</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {briefing?.urgentCount ?? todayAppointments.filter((a) => a.preVisitSummary?.urgency === 'High').length}
                  </p>
                  <p className="text-xs text-slate-500">Urgent</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
