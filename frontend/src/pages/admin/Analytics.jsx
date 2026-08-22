import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import { api } from '../../api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const navItems=[{to:'/admin/overview',label:'Overview'},{to:'/admin/doctors',label:'Doctor Mgt'},{to:'/admin/analytics',label:'Analytics'}];
export default function Analytics(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{api.adminAnalytics().then(setData).catch(e=>setError(e.message));},[]);
 const status=data?[{name:'Booked',value:data.booked},{name:'Completed',value:data.completed},{name:'Cancelled',value:data.cancelled}]:[];
 return <div className="flex min-h-screen bg-slate-50"><Sidebar items={navItems}/><main className="flex-1 p-8"><div className="max-w-7xl mx-auto"><h1 className="text-3xl font-bold">Admin Analytics</h1><p className="text-slate-500 mb-7">Revenue, appointment outcomes and top specialisations.</p>{error&&<p className="text-red-600 mb-4">{error}</p>}{!data?<p>Loading...</p>:<>
 <div className="grid md:grid-cols-4 gap-4 mb-7">{[['Revenue',`₹${data.revenue.toLocaleString()}`],['Appointments',data.totalAppointments],['No-show rate',`${data.noShowRate}%`],['Completed',data.completed]].map(([l,v])=><div key={l} className="bg-white border rounded-2xl p-5"><p className="text-xs text-slate-500">{l}</p><p className="text-3xl font-bold mt-1">{v}</p></div>)}</div>
 <div className="grid lg:grid-cols-2 gap-6"><div className="bg-white border rounded-2xl p-6"><h2 className="font-semibold mb-4">Top Specialisations</h2><ResponsiveContainer width="100%" height={320}><BarChart data={data.topSpecialisations} layout="vertical"><XAxis type="number"/><YAxis dataKey="specialisation" type="category" width={100}/><Tooltip/><Bar dataKey="appointments" name="Appointments"/></BarChart></ResponsiveContainer></div>
 <div className="bg-white border rounded-2xl p-6"><h2 className="font-semibold mb-4">Appointment Outcomes</h2><ResponsiveContainer width="100%" height={320}><PieChart><Pie data={status} dataKey="value" nameKey="name" outerRadius={100} label>{status.map((_,i)=><Cell key={i}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div></div>
 </>}</div></main></div>;
}
