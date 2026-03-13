import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'signup', 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (activeTab === 'signup') {
        const res = await api.post('/auth/register', { name, dob, email, phone, password });
        login(res.data);
        navigate('/dashboard');
      } else {
        // login or admin tab — both use same endpoint
        const res = await api.post('/auth/login', { email, password });
        if (activeTab === 'admin' && !['admin', 'superadmin'].includes(res.data.role)) {
          setError('Access Denied: You do not have admin privileges.');
          return;
        }
        login(res.data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen font-sans flex flex-col items-center justify-center p-4 overflow-hidden bg-black">

      {/* Live Video Background with Kesari (Peach/Reddish) Gradient Overlay */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-80"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        {/* Kesari/Peach/Reddish gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff4b2b]/30 via-[#fca048]/20 to-black/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      </div>

      {/* Decorative Sharp Overlay Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-10 left-10 w-32 h-32 border-t-2 border-l-2 border-[#ff416c] mix-blend-screen shadow-[0_0_15px_rgba(255,65,108,0.5)]"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 border-b-2 border-r-2 border-[#fca048] mix-blend-screen shadow-[0_0_15px_rgba(252,160,72,0.5)]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg bg-black/40 backdrop-blur-xl border border-white/20 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10"
      >
        <div className="text-center mb-10">
          {/* Identical Logo to Homepage (No Filters) */}
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            src="/logo.png"
            alt="RAAH Logo"
            className="w-72 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
          />
          <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-clip-text text-transparent bg-gradient-to-r from-[#ff4b2b] to-[#fca048]">
            R.A.A.H. Portal
          </h2>
          <p className="text-gray-300 font-bold tracking-[0.2em] uppercase text-xs mt-3">Authentication Gateway</p>
        </div>

        {/* Sharp Tabs */}
        <div className="flex mb-8 border-b border-gray-600">
          {['login', 'signup', 'admin'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 pb-3 font-black uppercase tracking-widest text-sm transition-all duration-300 ${activeTab === tab
                  ? 'text-white border-b-2 border-[#ff416c] drop-shadow-[0_0_8px_rgba(255,65,108,0.8)]'
                  : 'text-gray-400 hover:text-white'
                }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Signup extra fields */}
          {activeTab === 'signup' && (
            <>
              <div className="relative group">
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full p-4 bg-white/10 border border-gray-500/50 text-white placeholder-gray-400 focus:outline-none focus:border-[#fca048] focus:bg-white/20 transition-all font-bold tracking-wide shadow-inner" style={{ borderRadius: '0' }} />
              </div>
              <div className="relative group">
                <input type="date" placeholder="Date of Birth" value={dob} onChange={e => setDob(e.target.value)} required
                  className="w-full p-4 bg-white/10 border border-gray-500/50 text-white placeholder-gray-400 focus:outline-none focus:border-[#fca048] focus:bg-white/20 transition-all font-bold tracking-wide shadow-inner" style={{ borderRadius: '0' }} />
              </div>
              <div className="relative group">
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required
                  className="w-full p-4 bg-white/10 border border-gray-500/50 text-white placeholder-gray-400 focus:outline-none focus:border-[#fca048] focus:bg-white/20 transition-all font-bold tracking-wide shadow-inner" style={{ borderRadius: '0' }} />
              </div>
            </>
          )}

          <div className="relative group">
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full p-4 bg-white/10 border border-gray-500/50 text-white placeholder-gray-400 focus:outline-none focus:border-[#fca048] focus:bg-white/20 transition-all font-bold tracking-wide shadow-inner"
              style={{ borderRadius: '0' }} />
          </div>
          <div className="relative group">
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full p-4 bg-white/10 border border-gray-500/50 text-white placeholder-gray-400 focus:outline-none focus:border-[#fca048] focus:bg-white/20 transition-all font-bold tracking-wide shadow-inner"
              style={{ borderRadius: '0' }} />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-[#ff4b2b] font-bold text-sm tracking-wide border border-[#ff4b2b]/30 bg-[#ff4b2b]/10 px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#ff4b2b] to-[#ff416c] hover:from-[#ff416c] hover:to-[#ff4b2b] text-white font-black uppercase tracking-[0.2em] py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,65,108,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '0' }}
          >
            {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : activeTab === 'signup' ? 'Create Account' : 'Admin Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-600/50 pt-6">
          <Link to="/" className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center gap-2">
            <span className="text-lg leading-none">&larr;</span> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}