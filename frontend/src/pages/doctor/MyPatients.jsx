import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';

const navItems = [
  { to: '/doctor/overview', label: 'Overview' },
  { to: '/doctor/patients', label: 'My Patients' },
  { to: '/doctor/schedule', label: 'Schedule' },
];

export default function MyPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const appts = await api.myAppointments();
      // De-duplicate patients from the appointment list (no separate patients endpoint needed)
      const map = new Map();
      appts.forEach((a) => {
        if (a.patient?._id && !map.has(a.patient._id)) map.set(a.patient._id, a.patient);
      });
      setPatients([...map.values()]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">My Patients</h1>
        {loading && <p className="text-slate-500">Loading...</p>}
        <div className="bg-white border rounded-xl divide-y">
          {patients.map((p) => (
            <Link key={p._id} to={`/doctor/patients/${p._id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand font-semibold">{p.name?.[0]}</div>
                <p className="font-medium">{p.name}</p>
              </div>
              <span className="text-brand text-sm font-medium">View Profile →</span>
            </Link>
          ))}
          {!loading && patients.length === 0 && <p className="text-slate-500 p-6">No patients yet.</p>}
        </div>
      </main>
    </div>
  );
}
