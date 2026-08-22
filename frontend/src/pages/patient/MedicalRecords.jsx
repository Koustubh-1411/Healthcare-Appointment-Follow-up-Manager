import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav.jsx';
import { api } from '../../api.js';

export default function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.patientRecords().then(setRecords).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <div><TopNav/><main className="max-w-5xl mx-auto px-6 py-10">
    <h1 className="text-3xl font-bold text-brand-dark">My Medical Records</h1>
    <p className="text-slate-500 mb-7">Your consultation notes, prescriptions and medical history in one place.</p>
    {error && <p className="text-red-600 mb-4">{error}</p>}
    {loading && <p className="text-slate-500">Loading records...</p>}
    {!loading && !records.length && <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">No medical records yet. Completed consultations will appear here.</div>}
    <div className="space-y-4">{records.map(r => <div key={r._id} className="bg-white border rounded-2xl p-6">
      <div className="flex justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-brand font-semibold">{r.recordType}</p><h2 className="font-semibold text-lg mt-1">{r.title}</h2><p className="text-sm text-slate-500">{r.recordDate} · Dr. {r.doctor?.name || 'Care team'}</p></div></div>
      {r.description && <p className="mt-4 text-sm text-slate-700">{r.description}</p>}
      {r.medications && <p className="mt-3 text-sm"><b>Medications:</b> {r.medications}</p>}
      {r.allergies && <p className="mt-2 text-sm"><b>Allergies:</b> {r.allergies}</p>}
      {r.bloodGroup && <p className="mt-2 text-sm"><b>Blood group:</b> {r.bloodGroup}</p>}
    </div>)}</div>
  </main></div>;
}
