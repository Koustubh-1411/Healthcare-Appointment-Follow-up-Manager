import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Top navbar used on patient-facing pages, matching the HealthTrust design.
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
      <Link to="/" className="text-brand font-bold text-xl">HealthTrust</Link>
      {user ? (
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link to="/find-doctors">Find Doctors</Link>
          <Link to="/appointments">Appointments</Link>
          <Link to="/medical-records">Medical Records</Link>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-red-600"
          >
            Log Out
          </button>
          <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand font-semibold">
            {user.name?.[0]}
          </div>
        </nav>
      ) : (
        <nav className="flex items-center gap-4">
          <Link to="/login" className="text-brand font-medium">Log In</Link>
          <Link to="/register" className="bg-brand text-white px-4 py-2 rounded-lg font-medium">Register</Link>
        </nav>
      )}
    </header>
  );
}
