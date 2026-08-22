import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';
import adminDoctorsImage from '../../assets/admin-doctors.png';

const navItems = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/doctors', label: 'Doctor Mgt' },
  { to: '/admin/analytics', label: 'Analytics' },
];


function formatLeaveDate(date) {
  const [y, m, d] = date.split('-');
  return `${d}-${m}-${y}`;
}

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(null);

  async function load() {
    const [data, requests] = await Promise.all([api.adminDoctors(), api.adminLeaveRequests()]);
    setDoctors(data);
    setLeaveRequests(requests);
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(doctor) {
    const next = !doctor.isActive;
    setStatusLoading(doctor.id);
    setError('');
    try {
      await api.setDoctorStatus(doctor.id, next);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusLoading(null);
    }
  }

  async function reviewLeave(requestId, decision) {
    let rejectionReason = '';
    if (decision === 'rejected') {
      rejectionReason = window.prompt('Why are you rejecting this leave request?', 'Leave request rejected by admin') || 'Leave request rejected by admin';
    }
    setReviewLoading(requestId);
    setError('');
    try {
      await api.reviewLeaveRequest(requestId, decision, rejectionReason);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8">
        <div className="grid grid-cols-[1fr_330px] gap-6 mb-6 items-stretch">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">Doctor Management</h1>
                <p className="text-slate-500">Manage doctors, their specializations, access status, and leave records.</p>
              </div>
              <button onClick={() => navigate('/admin/doctors/new')} className="bg-brand text-white px-5 py-2.5 rounded-lg font-medium">
                + Add New Doctor
              </button>
            </div>
          </div>
          <img src={adminDoctorsImage} alt="Healthcare doctor management" className="w-full h-36 object-cover rounded-2xl shadow-sm" />
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}

        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Leave Requests</h2>
              <p className="text-sm text-slate-500">Review doctor leave requests before they become active.</p>
            </div>
            <span className="text-sm font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              {leaveRequests.filter((r) => r.status === 'pending').length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {leaveRequests.map((r) => (
              <div key={r.id} className="border rounded-xl p-4 bg-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.doctorName}</p>
                      <span className="text-xs text-slate-500">{r.doctorEmail}</span>
                    </div>
                    <p className="text-sm mt-1"><b>Leave date:</b> {formatLeaveDate(r.date)}</p>
                    {r.reason && <p className="text-sm text-slate-600 mt-1"><b>Reason:</b> {r.reason}</p>}
                    {r.status === 'approved' && r.affectedAppointments > 0 && (
                      <p className="text-xs text-slate-500 mt-1">{r.affectedAppointments} appointment(s) cancelled.</p>
                    )}
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">Rejection: {r.rejectionReason}</p>
                    )}
                  </div>

                  {r.status === 'pending' ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={reviewLoading === r.id}
                        onClick={() => reviewLeave(r.id, 'approved')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      >
                        {reviewLoading === r.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={reviewLoading === r.id}
                        onClick={() => reviewLeave(r.id, 'rejected')}
                        className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {leaveRequests.length === 0 && <p className="text-sm text-slate-400">No leave requests found.</p>}
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-light text-left">
                <tr>
                  <th className="px-6 py-3">Doctor Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Specialization</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Leave Taken</th>
                  <th className="px-6 py-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{d.name}</td>
                    <td className="px-6 py-4 text-slate-600">{d.email}</td>
                    <td className="px-6 py-4">{d.specialisation}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        d.status === 'inactive' ? 'bg-red-100 text-red-700' :
                        d.status === 'on_leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {d.status === 'inactive' ? 'Inactive' : d.status === 'on_leave' ? 'On Leave Today' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {d.leaveDays?.length ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {d.leaveDays.map((date) => (
                            <span key={date} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                              {formatLeaveDate(date)}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400">No leave recorded</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(d)}
                        disabled={statusLoading === d.id}
                        aria-label={`${d.isActive ? 'Deactivate' : 'Activate'} ${d.name}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${d.isActive ? 'bg-brand' : 'bg-slate-300'} disabled:opacity-50`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${d.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
                {doctors.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-slate-500">No doctors yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
