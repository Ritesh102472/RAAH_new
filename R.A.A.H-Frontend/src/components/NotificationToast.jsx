import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, X, Info, Activity } from 'lucide-react';

export default function NotificationToast({ notifications, clearNotification }) {
  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto overflow-hidden hackathon-glass border p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 relative group ${
              notif.event === 'new_pothole' ? 'border-red-500/40' : 'border-cyan-500/40'
            }`}
          >
            {/* Animated Glow Overlay */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
              notif.event === 'new_pothole' ? 'from-red-600 via-orange-500 to-red-600' : 'from-cyan-600 via-blue-500 to-cyan-600'
            } opacity-50`}></div>

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  notif.event === 'new_pothole' ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-cyan-500/20 text-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                }`}>
                  {notif.event === 'new_pothole' ? <AlertTriangle size={20} /> : <Info size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest leading-tight">
                    {notif.event === 'new_pothole' ? 'New Hazard Detected' : 'Discovery Scan Complete'}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">
                    Real-time AI Update
                  </p>
                </div>
              </div>
              <button
                onClick={() => clearNotification(notif.id)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-start gap-3">
                <div className="text-cyan-400 mt-0.5">
                  {notif.event === 'new_pothole' ? <MapPin size={14} /> : <Activity size={14} />}
                </div>
                <p className="text-xs font-bold text-gray-300 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>

            {notif.event === 'new_pothole' && notif.data?.location && (
              <div className="flex justify-between items-center px-1">
                <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                  LAT: {notif.data.location.lat.toFixed(4)} / LNG: {notif.data.location.lng.toFixed(4)}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Critical</span>
                </div>
              </div>
            )}
            
            {/* Auto-dismiss progress bar */}
            <motion.div 
               initial={{ width: "100%" }}
               animate={{ width: "0%" }}
               transition={{ duration: 6, ease: "linear" }}
               className={`absolute bottom-0 left-0 h-[2px] ${
                 notif.event === 'new_pothole' ? 'bg-red-500/50' : 'bg-cyan-500/50'
               }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
