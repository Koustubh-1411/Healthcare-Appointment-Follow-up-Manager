import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav.jsx';
import { api } from '../../api.js';

function indiaDateString(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function nextDates(n = 6) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    out.push(indiaDateString(day));
  }
  return out;
}

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const dates = nextDates();

  const [consultationType, setConsultationType] = useState('video');
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState([]);
  const [onLeave, setOnLeave] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [step, setStep] = useState('slot'); // 'slot' | 'symptoms' | 'done'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      try {
        const data = await api.getSlots(doctorId, date);
        setSlots(data.slots || []);
        setOnLeave(data.onLeave);
        setSelectedSlot('');
      } catch (err) {
        setError(err.message);
      }
    }
    loadSlots();
  }, [doctorId, date]);

  async function confirmBooking() {
    setLoading(true);
    setError('');
    try {
      await api.bookAppointment({ doctorId, date, startTime: selectedSlot, consultationType, symptoms });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div>
        <TopNav />
        <div className="max-w-lg mx-auto text-center py-24">
          <h1 className="text-2xl font-bold text-brand mb-2">Appointment Confirmed!</h1>
          <p className="text-slate-500 mb-6">You'll receive a confirmation email and calendar invite shortly.</p>
          <button onClick={() => navigate('/appointments')} className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium">
            View My Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-dark mb-6">Book an Appointment</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => setConsultationType('video')}
            className={`p-4 rounded-xl border-2 font-medium ${consultationType === 'video' ? 'border-brand bg-brand-light' : 'border-slate-200'}`}>
            Video Consult
          </button>
          <button onClick={() => setConsultationType('in_clinic')}
            className={`p-4 rounded-xl border-2 font-medium ${consultationType === 'in_clinic' ? 'border-brand bg-brand-light' : 'border-slate-200'}`}>
            In-Clinic
          </button>
        </div>

        <h3 className="font-semibold mb-2">Select Date</h3>
        <div className="flex gap-2 mb-6 flex-wrap">
          {dates.map((d) => (
            <button key={d} onClick={() => setDate(d)}
              className={`px-4 py-2 rounded-lg border text-sm ${date === d ? 'border-brand bg-brand-light text-brand' : 'border-slate-200'}`}>
              {new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>

        {onLeave && <p className="text-amber-600 mb-4">Doctor is on leave this day. Please pick another date.</p>}

        {!onLeave && (
          <>
            <h3 className="font-semibold mb-2">Available Slots</h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {slots.length === 0 && <p className="text-slate-500 col-span-4">No slots available.</p>}
              {slots.map((s) => (
                <button key={s} onClick={() => setSelectedSlot(s)}
                  className={`py-2 rounded-lg border text-sm ${selectedSlot === s ? 'border-brand bg-brand text-white' : 'border-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'slot' && selectedSlot && (
          <button onClick={() => setStep('symptoms')} className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium">
            Continue
          </button>
        )}

        {step === 'symptoms' && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Tell us your symptoms (optional)</h3>
            <p className="text-sm text-slate-500 mb-2">This helps your doctor prepare — an AI pre-visit summary will be generated.</p>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4}
              className="w-full border rounded-lg p-3 mb-4" placeholder="e.g. chest tightness, mild fever for 2 days..." />
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button disabled={loading} onClick={confirmBooking} className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium">
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
