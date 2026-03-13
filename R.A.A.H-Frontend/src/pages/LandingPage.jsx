import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Crosshair, Wrench } from 'lucide-react';

export default function LandingPage() {
  // State to control whether the intro video is playing
  const [introPlaying, setIntroPlaying] = useState(true);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-x-hidden font-sans flex flex-col">

      {/* =========================================
          PART 1: THE INTRO SEQUENCE
      ========================================== */}
      <AnimatePresence>
        {introPlaying && (
          <motion.div
            key="intro-sequence"
            initial={{ opacity: 1 }}
            // Calm, dark fade out transition instead of the 'Screen Break' effect
            exit={{ opacity: 0, backgroundColor: "#000" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <video
              autoPlay
              muted
              playsInline
              // Stop to transition when video ends, or at exactly 4.7 seconds
              onTimeUpdate={(e) => {
                if (e.target.currentTime >= 4.7) {
                  setIntroPlaying(false);
                }
              }}
              onEnded={() => setIntroPlaying(false)}
              className="w-full h-full object-cover"
            >
              <source src="/intro-video.mp4" type="video/mp4" />
            </video>

            {/* Intro Logo Overlay - Full Left Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 left-0 w-1/3 md:w-1/4 h-full z-10 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50/90 via-yellow-100/95 to-amber-200/90 backdrop-blur-xl border-r-2 border-amber-300 shadow-[30px_0_60px_rgba(0,0,0,0.8)] px-10"
            >
              <img
                src="/logo.png"
                alt="RAAH Logo"
                className="w-full scale-125 md:scale-150 object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Skip button at the top-right to avoid overflowing */}
            <button
              onClick={() => setIntroPlaying(false)}
              className="absolute top-8 right-8 px-4 py-2 border-2 border-gray-500 bg-transparent hover:bg-gray-800 text-gray-300 uppercase font-black tracking-widest text-xs transition-colors"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================
          PART 2: THE HOMEPAGE (REVEALED AFTER)
      ========================================== */}
      {!introPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-black overflow-y-auto"
        >

          {/* Live Background Video (Drone Shot) */}
          <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-90"
            >
              <source src="/bg-video.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50"></div>
          </div>

          {/* Main Content (Spotlight Logo & UI) */}
          <div className="z-10 w-full max-w-6xl flex flex-col items-center px-4 md:px-8 py-8 md:py-12 min-h-screen justify-center">

            {/* Spotlight Logo - Transparent Background */}
            <motion.img
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              src="/logo.png"
              alt="RAAH Logo"
              className="w-72 md:w-96 lg:w-[32rem] mb-6 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]"
            />

            {/* Hero Hard Metallic Panel - Highly Transparent */}
            <motion.header
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1 }}
              className="bg-black/20 backdrop-blur-sm border-t-2 border-b-2 border-gray-400/50 p-6 md:p-10 text-center w-full shadow-[0_0_30px_rgba(0,0,0,0.5)]"
            >
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 uppercase tracking-tighter bg-gradient-to-b from-white via-gray-300 to-gray-600 text-transparent bg-clip-text drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                The road does not report itself.
              </h2>
              <p className="max-w-3xl mx-auto text-gray-300 mb-8 text-base md:text-lg font-bold uppercase tracking-widest leading-relaxed">
                Autonomous Pothole Intelligence. We process highway surface data at scale to detect, geotag, and automate grievance routing with zero human intervention.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/login" className="w-full sm:w-auto">
                  <button className="w-full bg-gradient-to-b from-gray-200 to-gray-500 hover:from-white hover:to-gray-400 text-black font-black uppercase tracking-widest py-3.5 px-10 transition-all transform hover:scale-[1.02] border-2 border-transparent hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center">
                    Launch Platform
                  </button>
                </Link>
                <Link to="/about" className="w-full sm:w-auto">
                  <button className="w-full bg-black/40 hover:bg-black/60 border-2 border-gray-400 text-gray-300 hover:text-white font-black uppercase tracking-widest py-3.5 px-10 transition-all backdrop-blur-md">
                    System Architecture
                  </button>
                </Link>
              </div>
            </motion.header>

            {/* Feature Cards - Hard edged */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="grid md:grid-cols-3 gap-4 lg:gap-6 w-full mt-8"
            >
              {[
                { icon: <Crosshair size={28} className="text-white drop-shadow-md mb-3" />, title: "VISION AI", desc: "REAL-TIME SURFACE ANOMALY DETECTION & SEVERITY SCORING." },
                { icon: <AlertTriangle size={28} className="text-white drop-shadow-md mb-3" />, title: "AUTOMATED FILING", desc: "API PAYLOADS SENT DIRECTLY TO CHIPS PG PORTALS." },
                { icon: <Wrench size={28} className="text-white drop-shadow-md mb-3" />, title: "CLOSED LOOP", desc: "POST-REPAIR VERIFICATION TO ENSURE ROAD SAFETY." }
              ].map((feature, idx) => (
                <div key={idx} className="bg-black/20 backdrop-blur-sm border border-gray-600/50 p-6 hover:bg-black/40 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-gray-300 group">
                  <div className="transform group-hover:scale-110 transition-transform duration-300 origin-left">
                    {feature.icon}
                  </div>
                  <h4 className="text-lg font-black text-white mb-2 tracking-widest bg-gradient-to-r from-gray-200 to-gray-500 text-transparent bg-clip-text uppercase">{feature.title}</h4>
                  <p className="text-gray-400 font-bold text-xs tracking-widest uppercase leading-snug">{feature.desc}</p>
                </div>
              ))}
            </motion.section>

          </div>
        </motion.div>
      )}

    </div>
  );
}