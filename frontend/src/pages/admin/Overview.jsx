import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';
import adminOverviewImage from '../../assets/admin-overview.png';

const navItems = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/doctors', label: 'Doctor Mgt' },
  { to: '/admin/analytics', label: 'Analytics' },
];

export default function AdminOverview() {
  const [data, setData] = useState(null);

  useEffect(() => { api.adminOverview().then(setData); }, []);

  const maxCount = data ? Math.max(1, ...data.bookingVolume7Days.map((d) => d.count)) : 1;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={navItems} />
      <main className="flex-1 p-8">
        <div className="grid grid-cols-[1fr_330px] gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">System Overview</h1>
            <p className="text-slate-500">Live system metrics and health alerts.</p><a href="/admin/analytics" className="inline-block mt-3 text-brand font-semibold text-sm">Open Analytics →</a>
          </div>
          <img src={adminOverviewImage} alt="Healthcare administration" className="w-full h-32 object-cover rounded-2xl shadow-sm" />
        </div>

        {!data ? <p className="text-slate-500">Loading...</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white border rounded-xl p-5">
                <p className="text-xs text-slate-500">Total Doctors</p>
                <p className="text-3xl font-bold">{data.totalDoctors}</p>
              </div>
              <div className="bg-white border rounded-xl p-5">
                <p className="text-xs text-slate-500">Total Patients</p>
                <p className="text-3xl font-bold">{data.totalPatients}</p>
              </div>
              <div className="bg-white border rounded-xl p-5">
                <p className="text-xs text-slate-500">Today's Bookings</p>
                <p className="text-3xl font-bold">{data.todaysBookings}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-xs text-amber-700">Pending Leave Requests</p>
                <p className="text-3xl font-bold text-amber-700">{data.pendingLeaveRequests}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-xs text-red-600">System Alerts</p>
                <p className="text-3xl font-bold text-red-700">{data.systemAlerts.total}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-6">
                <h2 className="font-semibold mb-4">System Health</h2>
                <div className="bg-slate-50 rounded-lg p-4 mb-2">
                  <p className="font-medium text-sm">Failed Notifications</p>
                  <p className="text-xs text-slate-500">{data.systemAlerts.failedNotifications} appointment(s) had a failed email send.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-medium text-sm">LLM Fallbacks</p>
                  <p className="text-xs text-slate-500">{data.systemAlerts.llmFallbacks} appointment(s) used a fallback summary (AI unavailable).</p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Booking Volume (7 Days)</h2>
                <div className="flex items-end gap-3 h-40">
                  {data.bookingVolume7Days.map((d) => (
                    <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-brand rounded-t" style={{ height: `${(d.count / maxCount) * 100}%` }} />
                      <p className="text-[10px] text-slate-500">{d._id.slice(5)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
