import React from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import heroDoctor from '../assets/hero-doctor.png';
import cardiology from '../assets/cardiology.png';
import dermatology from '../assets/dermatology.png';
import neurology from '../assets/neurology.png';
import dentistry from '../assets/dentistry.png';
import pediatrics from '../assets/pediatrics.png';
import appointmentHelp from '../assets/appointment-help.png';
import familyHealth from '../assets/family-health.png';

const specialties = [
  { name: 'Cardiology', image: cardiology },
  { name: 'Dermatology', image: dermatology },
  { name: 'Neurology', image: neurology },
  { name: 'Dentistry', image: dentistry },
  { name: 'Pediatrics', image: pediatrics },
];

export default function Landing() {
  return (
    <div>
      <TopNav />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-light to-white px-8 py-14 lg:py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 items-center gap-8 overflow-hidden rounded-2xl">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-slate-900">Find the right doctor, right now.</h1>
            <p className="text-slate-600 mt-4 max-w-xl mx-auto lg:mx-0">
              Book appointments instantly with top-rated medical professionals. Trusted care, simplified.
            </p>
            <div className="mt-8 max-w-2xl mx-auto lg:mx-0 flex gap-2 bg-white p-2 rounded-xl shadow">
              <input className="flex-1 px-4 py-2 outline-none" placeholder="Condition, procedure, doctor..." />
              <Link to="/find-doctors" className="bg-brand text-white px-6 py-2 rounded-lg font-medium">Search</Link>
            </div>
          </div>
          <div className="hidden lg:block h-72 rounded-2xl overflow-hidden shadow-sm">
            <img src={heroDoctor} alt="Doctor consulting a patient" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="px-8 py-16 text-center">
        <h2 className="text-2xl font-semibold mb-8">Top Specialties</h2>
        <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
          {specialties.map((s) => (
            <Link
              key={s.name}
              to={`/find-doctors?specialisation=${s.name}`}
              className="w-44 sm:w-48 border rounded-xl overflow-hidden bg-white hover:shadow-lg hover:-translate-y-1 transition text-slate-700 font-medium"
            >
              <img src={s.image} alt={`${s.name} care`} className="w-full h-24 object-cover" />
              <div className="px-4 py-4">{s.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Appointment help */}
      <section className="bg-brand-light px-8 py-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 items-center gap-8 overflow-hidden rounded-2xl">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-semibold mb-4">Need Help with an Appointment?</h2>
            <p className="text-slate-600 max-w-md mx-auto md:mx-0">
              Our support team is here to help you book the right appointment.
            </p>
            <Link to="/find-doctors" className="inline-block mt-6 bg-brand text-white px-6 py-3 rounded-lg font-medium">
              Book Appointment
            </Link>
          </div>
          <img
            src={appointmentHelp}
            alt="Patient receiving appointment assistance"
            className="w-full h-48 md:h-52 object-cover rounded-2xl"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 py-12 bg-white">
        <div className="max-w-6xl mx-auto bg-brand-light rounded-2xl overflow-hidden grid md:grid-cols-2 items-center">
          <div className="hidden md:block h-52">
            <img src={familyHealth} alt="Family taking care of their health" className="w-full h-full object-cover" />
          </div>
          <div className="text-center py-8 px-6">
            <h2 className="text-2xl font-semibold mb-4">Ready to take control of your health?</h2>
            <p className="text-slate-600 mb-6">Join HealthTrust today and connect with trusted doctors.</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link to="/register" className="bg-brand text-white px-6 py-3 rounded-lg font-medium">Create a Free Account</Link>
              <Link to="/login" className="border border-brand text-brand px-6 py-3 rounded-lg font-medium">Are you a doctor?</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
