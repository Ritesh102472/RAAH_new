import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, MapPin, AlertCircle, Clock, Wrench } from 'lucide-react';
import api from '../services/api';
import { useWebSocketContext } from '../context/WebSocketContext';

export default function MyComplaintsPage() {
  const [activeTab, setActiveTab] = useState('active'); // active vs resolved
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    fetchMyComplaints(activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Listen for global new_pothole events to update the list live
    const unsubscribe = subscribe((message) => {
      if (message.event === 'new_pothole') {
        fetchMyComplaints(activeTab);
      }
    });
    return unsubscribe;
  }, [subscribe, activeTab]);

  async function fetchMyComplaints(status) {
    setLoading(true);
    try {
      const res = await api.get(`/citizen/my-complaints?status=${status}&limit=50`);
      setComplaints(res.data.items || []);
    } catch (err) {
      console.error('Failed to load my complaints:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-8 relative z-10 w-full text-gray-100 animate-slide-up">
      {/* Header & Internal Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/10 pb-6 mb-2">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-[0.1em] uppercase drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">Your Reports</h2>
          <p className="text-cyan-600 font-bold uppercase tracking-[0.2em] text-xs mt-2">Track Pothole Repair Status</p>
        </div>
        <div className="flex gap-4 bg-white/40 p-1.5 rounded-xl border border-white/50 shadow-inner">
          <button onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'active' ? 'bg-cyan-600 text-white shadow-[0_4px_15px_rgba(8,145,178,0.4)]' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}>
            <FileText size={16} /> Track Active
          </button>
          <button onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'resolved' ? 'bg-emerald-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.4)]' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}>
            <CheckCircle size={16} /> Resolved
          </button>
        </div>
      </div>

      {/* Complaints List */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-10">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex items-center justify-center h-48 hackathon-glass border border-dashed border-gray-400/30 rounded-3xl">
            <p className="text-gray-500 font-bold uppercase tracking-widest">No reports found in this category.</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint.id} className="hackathon-glass bg-white/40 rounded-3xl p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white/60 relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1.5 h-full opacity-80 transition-opacity duration-300 
                ${complaint.status === 'resolved' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]'}`}
              ></div>
              
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
                {/* Thumbnail */}
                <div className="w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden shadow-inner border border-white/50 shrink-0 bg-gray-200">
                  {complaint.image_url ? (
                    <img src={complaint.image_url} alt="Reported Pothole" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-black text-gray-700 tracking-[0.2em] bg-white/60 px-3 py-1.5 rounded-lg border border-white shadow-sm">
                      {complaint.complaint_number}
                    </span>
                    
                    {/* Dynamic Status Badge */}
                    {complaint.status === 'resolved' ? (
                      <span className="text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
                        <CheckCircle size={12} /> Fixed & Verified
                      </span>
                    ) : complaint.status === 'escalated' ? (
                      <span className="text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] bg-red-100 text-red-700 border border-red-300 flex items-center gap-1.5">
                        <AlertCircle size={12} /> Priority Escalated
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] bg-cyan-100 text-cyan-700 border border-cyan-300 flex items-center gap-1.5">
                        <Wrench size={12} /> In Repair Queue
                      </span>
                    )}

                    <span className={`text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] border ${complaint.severity === 'high' ? 'bg-red-50 text-red-600 border-red-200' : complaint.severity === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}`}>
                      {complaint.severity} Risk
                    </span>
                  </div>
                  <h3 className="text-gray-800 font-black text-lg sm:text-xl flex items-center gap-2">
                    <MapPin size={20} className="text-cyan-600 shrink-0" />
                    <span className="truncate max-w-lg">{complaint.location}</span>
                  </h3>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs text-gray-600 font-bold uppercase tracking-wider shrink-0 min-w-[220px]">
                <div className="flex items-center gap-3 bg-white/60 px-4 py-3 rounded-xl border border-white shadow-sm">
                  <Clock size={16} className="text-cyan-600" />
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[9px] leading-tight">REPORTED ON</span>
                    <span className="text-gray-800">{complaint.created_at}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/60 px-4 py-3 rounded-xl border border-white shadow-sm">
                  <Wrench size={16} className="text-orange-500" />
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[9px] leading-tight">ASSIGNED TO</span>
                    <span className="text-gray-800 truncate max-w-[150px]" title={complaint.agency}>{complaint.agency}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
