import React from 'react';
import { Info, Users, Award, Target, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="relative min-h-screen font-sans flex flex-col items-center justify-start p-4 overflow-x-hidden overflow-y-auto bg-black">

      {/* Live Video Background – identical to LoginPage */}
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
        {/* Kesari/Peach gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff4b2b]/30 via-[#fca048]/20 to-black/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      </div>

      {/* Decorative corner accents – identical to LoginPage */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-10 left-10 w-32 h-32 border-t-2 border-l-2 border-[#ff416c] mix-blend-screen shadow-[0_0_15px_rgba(255,65,108,0.5)]"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 border-b-2 border-r-2 border-[#fca048] mix-blend-screen shadow-[0_0_15px_rgba(252,160,72,0.5)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl py-10 flex flex-col gap-8">

        {/* Top Nav Buttons */}
        <div className="flex justify-between items-center">
          <Link to="/">
            <button className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/20 hover:border-[#fca048] text-white font-black px-6 py-2.5 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              <span className="uppercase tracking-widest text-xs">← Back to Home</span>
            </button>
          </Link>
          <Link to="/dashboard">
            <button className="flex items-center gap-2 bg-gradient-to-r from-[#ff4b2b] to-[#ff416c] hover:from-[#ff416c] hover:to-[#ff4b2b] text-white font-black px-6 py-2.5 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,65,108,0.5)]">
              <span className="uppercase tracking-widest text-xs">Go to Dashboard →</span>
            </button>
          </Link>
        </div>

        {/* Hero Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center flex flex-col items-center gap-4"
        >
          <img src="/logo.png" alt="RAAH Logo" className="w-56 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
          <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-clip-text text-transparent bg-gradient-to-r from-[#ff4b2b] to-[#fca048]">
            System Architecture
          </h2>
          <p className="text-gray-300 font-bold tracking-[0.2em] uppercase text-xs">Road Anomaly Analysis &amp; Healthcare</p>
        </motion.div>

        {/* The Problem Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4 flex items-center gap-3 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            <Info className="text-[#fca048]" size={22} />
            The Problem: "The road does not report itself"
          </h3>
          <p className="text-gray-300 leading-relaxed text-base mb-4">
            Large potholes on state and national highways cause accidents and vehicle damage daily.
            Currently, detection depends on manual inspection rounds or citizen complaints — slow, incomplete, and reactive.
            By the time a complaint is filed, reviewed, and routed, the damage is already done.
          </p>
          <div className="border-l-4 border-[#ff416c] pl-4 bg-black/30 p-4">
            <h4 className="text-base font-black text-white mb-2 uppercase tracking-widest">The R.A.A.H Solution</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              R.A.A.H processes road surface data at scale. It detects potholes, geolocates them, classifies by severity,
              and initiates complaints through government grievance channels with <strong className="text-white">zero human intervention</strong>.
              It then tracks resolution to ensure reports don't get lost in a queue.
            </p>
          </div>
        </motion.div>

        {/* CHIPS Alignment */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
            <Target className="text-[#ff416c]" size={22} />
            CHIPS PS-02 Alignment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { num: '01', title: 'Computer Vision', desc: 'Pothole segmentation at road patch scale using automated CV pipelines.' },
              { num: '02', title: 'Geo & Severity', desc: 'Precise geotagging and severity scoring to distinguish potholes from minor cracks.' },
              { num: '03', title: 'Loop Closure', desc: 'Re-detecting the same location post-complaint to verify repair and re-escalate if needed.' },
              { num: '04', title: 'Risk Assessment', desc: 'Priority heat maps ranking complaint urgency by accident risk, not just physical size.' },
            ].map((item) => (
              <div key={item.num} className="bg-black/30 border border-white/10 p-5 hover:border-[#fca048]/50 transition-all duration-300">
                <div className="text-xs font-black text-[#fca048] tracking-[0.3em] mb-1">{item.num}</div>
                <h4 className="font-black text-white text-sm uppercase tracking-widest mb-2">{item.title}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Architecture + Hackathon - side by side */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Architecture */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
              <Layers className="text-[#fca048]" size={22} />
              Architecture
            </h3>
            <ul className="space-y-4">
              {[
                { label: 'Frontend Dashboard', detail: 'React, Vite, Tailwind CSS, Lucide Icons' },
                { label: 'AI / Machine Learning', detail: 'Computer Vision Pipeline (YOLO/Custom) for segmentation' },
                { label: 'Backend & Automation', detail: 'API Webhooks for Govt Portal Integration (PG Portal equivalent)' },
              ].map((item) => (
                <li key={item.label} className="flex flex-col border-b border-white/10 pb-3">
                  <span className="font-black text-white text-sm uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs text-gray-400 mt-1">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Hackathon Info */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <Award className="text-[#fca048]" size={22} />
                AIML Hackathon
              </h3>
              <div className="bg-black/30 border border-white/10 p-5 mb-6 space-y-2">
                <p className="text-gray-300 text-sm font-bold uppercase tracking-widest">Agency: <span className="text-white">CHIPS</span></p>
                <p className="text-gray-300 text-sm font-bold uppercase tracking-widest">Domain: <span className="text-white">Road Safety: AI + Remote Sensing</span></p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2 uppercase tracking-widest">
                <Users size={16} className="text-[#ff416c]" /> The Team
              </h4>
              <p className="text-xs text-gray-400 italic">Built with passion over 36 hours.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}