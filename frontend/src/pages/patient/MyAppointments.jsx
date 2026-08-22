import React, { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav.jsx';
import { api } from '../../api.js';

const statusColor = { booked: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-amber-100 text-amber-700' };

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reviewed, setReviewed] = useState({});

  async function load() {
    setLoading(true);
    const data = await api.myAppointments();
    setAppointments(data);
    const completed = data.filter(a => a.status === 'completed');
    const statuses = {};
    await Promise.all(completed.map(async a => { try { statuses[a._id] = (await api.reviewStatus(a._id)).reviewed; } catch {} }));
    setReviewed(statuses);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submitReview(id) {
    await api.submitReview({ appointmentId: id, rating, review });
    setReviewed({ ...reviewed, [id]: true });
    setReviewing(null); setReview(''); setRating(5);
  }

  async function cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    await api.cancelAppointment(id, 'Cancelled by patient');
    load();
  }

  return (
    <div>
      <TopNav />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-dark mb-6">My Appointments</h1>
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && appointments.length === 0 && <p className="text-slate-500">No appointments yet.</p>}

        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a._id} className="bg-white border rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">Dr. {a.doctor?.name}</h3>
                  <p className="text-slate-500 text-sm">{a.date} at {a.startTime} · {a.consultationType === 'video' ? 'Video Consult' : 'In-Clinic'}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusColor[a.status]}`}>{a.status}</span>
              </div>

              {a.preVisitSummary?.urgency && (
                <div className="mt-3 bg-brand-light rounded-lg p-3 text-sm">
                  <p><b>Urgency:</b> {a.preVisitSummary.urgency}</p>
                  <p><b>Chief complaint:</b> {a.preVisitSummary.chiefComplaint}</p>
                </div>
              )}

              {a.postVisitSummary?.summaryText && (
                <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Visit Summary</p>
                  <p>{a.postVisitSummary.summaryText}</p>
                  <p className="mt-1"><b>Medication:</b> {a.postVisitSummary.medicationSchedule}</p>
                </div>
              )}

              {a.status === 'booked' && (
                <button onClick={() => cancel(a._id)} className="mt-3 text-red-600 text-sm font-medium">Cancel appointment</button>
              )}

              {a.status === 'booked' && a.consultationType === 'video' && (
                <a href={`/consultation/${a._id}`} className="inline-block mt-3 ml-4 text-brand text-sm font-semibold">Join Video Consult →</a>
              )}

              {a.status === 'completed' && !reviewed[a._id] && (
                reviewing === a._id ? (
                  <div className="mt-4 border-t pt-4"><p className="font-medium mb-2">Rate your consultation</p><div className="flex gap-1 mb-3">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={`text-2xl ${n<=rating?'text-amber-400':'text-slate-300'}`}>★</button>)}</div><textarea value={review} onChange={e=>setReview(e.target.value)} className="w-full border rounded-lg p-3 mb-3" rows={3} placeholder="Share your experience (optional)"/><button onClick={()=>submitReview(a._id)} className="bg-brand text-white px-4 py-2 rounded-lg">Submit Review</button></div>
                ) : <button onClick={()=>setReviewing(a._id)} className="mt-3 text-brand text-sm font-semibold">Rate & Review Doctor</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
