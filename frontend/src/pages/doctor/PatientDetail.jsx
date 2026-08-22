import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';

const navItems = [
  { to: '/doctor/overview', label: 'Overview' },
  { to: '/doctor/patients', label: 'My Patients' },
  { to: '/doctor/schedule', label: 'Schedule' },
];

export default function PatientDetail() {
  const { patientId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [record, setRecord] = useState({ title:'', description:'', medications:'', allergies:'', bloodGroup:'', recordType:'note' });

  useEffect(() => {
    async function load() {
      const [all, insightData, recordData] = await Promise.all([
        api.myAppointments(),
        api.getPatientInsight(patientId),
        api.doctorPatientRecords(patientId),
      ]);
      setAppointments(all.filter((a) => a.patient?._id === patientId).sort((a, b) => b.date.localeCompare(a.date)));
      setInsight(insightData);
      setRecords(recordData);
      setLoading(false);
    }
    load();
  }, [patientId]);


  async function saveRecord() {
    const created = await api.createMedicalRecord(patientId, record);
    setRecords([created, ...records]); setShowRecordForm(false); setRecord({ title:'', description:'', medications:'', allergies:'', bloodGroup:'', recordType:'note' });
  }

  const patientName = appointments[0]?.patient?.name || 'Patient';
  const upcoming = appointments.find((a) => a.status === 'booked');

  return (
    <div className="flex">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8">
        <p className="text-sm text-slate-500 mb-2"><Link to="/doctor/patients" className="text-brand">My Patients</Link> &gt; {patientName}</p>
        <h1 className="text-3xl font-bold mb-6">{patientName}</h1>

        {insight?.hasInsight && (
          <div className="bg-brand-light border-l-4 border-brand rounded-xl p-5 mb-6">
            <p className="text-xs font-semibold text-brand mb-1">AI CLINICAL INSIGHT</p>
            <p className="text-sm text-slate-700">{insight.insightText}</p>
          </div>
        )}

        {upcoming && (
          <Link to={`/doctor/post-visit/${upcoming._id}`} className="inline-block mb-6 bg-brand text-white px-5 py-2.5 rounded-lg font-medium">
            Complete Post-Visit Summary for {upcoming.date}
          </Link>
        )}

        <div className="flex items-center justify-between mb-3 mt-8"><h2 className="font-semibold">Medical Records</h2><button onClick={()=>setShowRecordForm(!showRecordForm)} className="bg-brand text-white px-4 py-2 rounded-lg text-sm">{showRecordForm?'Close':'Add Record'}</button></div>
        {showRecordForm && <div className="bg-white border rounded-xl p-5 mb-5 grid md:grid-cols-2 gap-3"><input className="border rounded-lg p-2" placeholder="Title" value={record.title} onChange={e=>setRecord({...record,title:e.target.value})}/><select className="border rounded-lg p-2" value={record.recordType} onChange={e=>setRecord({...record,recordType:e.target.value})}><option value="note">Note</option><option value="diagnosis">Diagnosis</option><option value="lab">Lab</option><option value="prescription">Prescription</option></select><textarea className="border rounded-lg p-2 md:col-span-2" rows={3} placeholder="Description" value={record.description} onChange={e=>setRecord({...record,description:e.target.value})}/><input className="border rounded-lg p-2" placeholder="Medications" value={record.medications} onChange={e=>setRecord({...record,medications:e.target.value})}/><input className="border rounded-lg p-2" placeholder="Allergies" value={record.allergies} onChange={e=>setRecord({...record,allergies:e.target.value})}/><input className="border rounded-lg p-2" placeholder="Blood group" value={record.bloodGroup} onChange={e=>setRecord({...record,bloodGroup:e.target.value})}/><button onClick={saveRecord} className="bg-brand text-white rounded-lg px-4 py-2">Save Medical Record</button></div>}
        <div className="space-y-3 mb-8">{records.map(r=><div key={r._id} className="bg-slate-50 border rounded-xl p-4"><p className="text-xs text-brand font-semibold uppercase">{r.recordType}</p><p className="font-medium">{r.title}</p><p className="text-sm text-slate-500">{r.recordDate}</p><p className="text-sm mt-2">{r.description}</p>{r.medications&&<p className="text-sm mt-1"><b>Medications:</b> {r.medications}</p>}</div>)}{!records.length&&<p className="text-sm text-slate-400">No medical records yet.</p>}</div>
        <h2 className="font-semibold mb-3">Visit History</h2>
        {loading && <p className="text-slate-500">Loading...</p>}
        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a._id} className="bg-white border rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-1">{a.date} · {a.status}</p>
              {a.symptoms && <p className="text-sm mb-1"><b>Symptoms:</b> {a.symptoms}</p>}
              {a.postVisitSummary?.summaryText && (
                <p className="text-sm text-slate-700 mt-1">{a.postVisitSummary.summaryText}</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
