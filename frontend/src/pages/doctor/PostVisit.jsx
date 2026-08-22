import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';

const navItems = [
  { to: '/doctor/overview', label: 'Overview' },
  { to: '/doctor/patients', label: 'My Patients' },
  { to: '/doctor/schedule', label: 'Schedule' },
];

export default function PostVisit() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await api.submitPostVisit(appointmentId, { doctorNotes, prescription });
      navigate('/doctor/patients');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Post-Visit Summary & Prescription</h1>

        <label className="font-medium text-sm block mb-1">Clinical Notes</label>
        <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} rows={5}
          className="w-full border rounded-lg p-3 mb-4" placeholder="Enter SOAP notes..." />

        <label className="font-medium text-sm block mb-1">Prescription</label>
        <textarea value={prescription} onChange={(e) => setPrescription(e.target.value)} rows={3}
          className="w-full border rounded-lg p-3 mb-4" placeholder="e.g. Amoxicillin 500mg, once daily, 7 days" />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button disabled={loading} onClick={handleSubmit} className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium">
          {loading ? 'Generating summary...' : 'Generate Patient Summary'}
        </button>
        <p className="text-xs text-slate-500 mt-2">This uses AI to convert your notes into a patient-friendly summary and emails it to the patient.</p>
      </main>
    </div>
  );
}
