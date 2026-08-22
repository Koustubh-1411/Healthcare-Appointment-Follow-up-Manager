import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import TopNav from '../../components/TopNav.jsx';
import { api } from '../../api.js';

export default function FindDoctors() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('specialisation') || '');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(spec) {
    setLoading(true);
    setError('');
    try {
      const data = await api.listDoctors(spec);
      setDoctors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(params.get('specialisation')); }, []); // eslint-disable-line

  return (
    <div>
      <TopNav />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-brand-dark">Find Doctors</h1>
        <p className="text-slate-500 mb-6">Search by specialty, condition, or doctor name to find the right care.</p>

        <div className="flex gap-2 bg-white p-2 rounded-xl shadow mb-8">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Specialty, symptom, or doctor name" className="flex-1 px-4 py-2 outline-none" />
          <button onClick={() => load(query)} className="bg-brand text-white px-6 py-2 rounded-lg font-medium">Search</button>
        </div>

        {loading && <p className="text-slate-500">Loading doctors...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && doctors.length === 0 && <p className="text-slate-500">No doctors found. Try a different search.</p>}

        <div className="space-y-4">
          {doctors.map((d) => (
            <div key={d._id} className="bg-white border rounded-xl p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{d.user.name}</h3>
                <p className="text-brand">{d.specialisation}</p>
                <p className="text-sm text-amber-600 mt-1">★ {Number(d.rating || 0).toFixed(1)} · {d.reviewCount || 0} reviews</p>
                <p className="text-sm text-slate-500 mt-1">
                  Video ${d.videoConsultPrice} · In-Clinic ${d.inClinicPrice}
                </p>
              </div>
              <Link to={`/book/${d.user._id}`} className="bg-brand text-white px-5 py-2.5 rounded-lg font-medium">
                Book Appointment
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
