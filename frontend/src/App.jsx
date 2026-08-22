import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

import FindDoctors from './pages/patient/FindDoctors.jsx';
import BookAppointment from './pages/patient/BookAppointment.jsx';
import MyAppointments from './pages/patient/MyAppointments.jsx';

import DoctorOverview from './pages/doctor/Overview.jsx';
import MyPatients from './pages/doctor/MyPatients.jsx';
import PatientDetail from './pages/doctor/PatientDetail.jsx';
import Schedule from './pages/doctor/Schedule.jsx';
import PostVisit from './pages/doctor/PostVisit.jsx';

import AdminOverview from './pages/admin/Overview.jsx';
import DoctorManagement from './pages/admin/DoctorManagement.jsx';
import AddDoctor from './pages/admin/AddDoctor.jsx';
import PatientRecords from './pages/patient/MedicalRecords.jsx';
import Consultation from './pages/consultation/Consultation.jsx';
import Analytics from './pages/admin/Analytics.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/find-doctors" element={<ProtectedRoute allow={['patient']}><FindDoctors /></ProtectedRoute>} />
      <Route path="/book/:doctorId" element={<ProtectedRoute allow={['patient']}><BookAppointment /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute allow={['patient']}><MyAppointments /></ProtectedRoute>} />
      <Route path="/medical-records" element={<ProtectedRoute allow={['patient']}><PatientRecords /></ProtectedRoute>} />
      <Route path="/consultation/:appointmentId" element={<ProtectedRoute allow={['patient','doctor']}><Consultation /></ProtectedRoute>} />

      <Route path="/doctor/overview" element={<ProtectedRoute allow={['doctor']}><DoctorOverview /></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute allow={['doctor']}><MyPatients /></ProtectedRoute>} />
      <Route path="/doctor/patients/:patientId" element={<ProtectedRoute allow={['doctor']}><PatientDetail /></ProtectedRoute>} />
      <Route path="/doctor/schedule" element={<ProtectedRoute allow={['doctor']}><Schedule /></ProtectedRoute>} />
      <Route path="/doctor/post-visit/:appointmentId" element={<ProtectedRoute allow={['doctor']}><PostVisit /></ProtectedRoute>} />

      <Route path="/admin/overview" element={<ProtectedRoute allow={['admin']}><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/doctors" element={<ProtectedRoute allow={['admin']}><DoctorManagement /></ProtectedRoute>} />
      <Route path="/admin/doctors/new" element={<ProtectedRoute allow={['admin']}><AddDoctor /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allow={['admin']}><Analytics /></ProtectedRoute>} />
    </Routes>
  );
}
