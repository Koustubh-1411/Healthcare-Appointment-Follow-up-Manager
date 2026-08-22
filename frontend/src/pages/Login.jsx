import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import heroDoctor from '../assets/hero-doctor.png';

const roleHomes = { patient: '/', doctor: '/doctor/overview', admin: '/admin/overview' };

export default function Login() {
  const [tab, setTab] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      if (data.user.role !== tab) {
        setError(`This account is registered as ${data.user.role}, not ${tab}. Switch tabs above.`);
        setLoading(false);
        return;
      }
      login(data.token, data.user);
      navigate(roleHomes[data.user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-brand mb-1">HealthTrust</h1>
          <h2 className="text-xl font-semibold mt-6">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">
            Please log in to your account to continue.
          </p>

          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            {['patient', 'doctor', 'admin'].map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => {
                  setTab(r);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium capitalize ${
                  tab === r ? 'bg-white shadow text-brand' : 'text-slate-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in to HealthTrust'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to HealthTrust?{' '}
            <Link to="/register" className="text-brand font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block relative overflow-hidden bg-brand-dark min-h-screen">
        <img
          src={heroDoctor}
          alt="Doctor consulting with a patient"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/90 via-brand-dark/45 to-transparent" />
        <div className="relative z-10 h-full flex items-end p-10 lg:p-14">
          <div className="max-w-md text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80 mb-3">
              HealthTrust
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
              Quality care, you can trust.
            </h2>
            <p className="mt-3 text-white/85 text-base leading-relaxed">
              Connect with trusted healthcare professionals and manage your care
              with confidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
