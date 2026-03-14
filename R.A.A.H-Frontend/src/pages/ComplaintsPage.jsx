import React, { useState, useEffect } from 'react';
import { FileText, Wrench, CheckCircle, MapPin, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';

export default function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState('reported');
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rescanLoading, setRescanLoading] = useState(null);

  useEffect(() => {
    fetchComplaints(activeTab);
  }, [activeTab]);

  async function fetchComplaints(status) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/complaints?status=${status}&limit=50`);
      setComplaints(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load complaints:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, type, note = "Action via admin dashboard") {
    setRescanLoading(id);
    try {
      const endpoint = type === 'repair' ? '/admin/mark-repaired' : '/admin/escalate';
      await api.post(endpoint, { complaint_id: id });
      setTimeout(() => fetchComplaints(activeTab), 500);
    } catch (err) {
      console.error(`${type} action failed:`, err);
    } finally {
      setRescanLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-8 relative z-10 w-full text-gray-100">
      {/* Header & Internal Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/10 pb-6 mb-2">
        <div>
          <h2 className="text-3xl font-black text-white tracking-[0.1em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Repair Network</h2>
          <p className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-xs mt-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">Automated Dispatch & Verification</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('reported')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'reported' ? 'bg-blue-900/40 text-cyan-400 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <FileText size={18} className={activeTab === 'reported' ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''} /> Active Tickets
          </button>
          <button onClick={() => setActiveTab('under_repair')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'under_repair' ? 'bg-orange-900/40 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <Wrench size={18} className={activeTab === 'under_repair' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse' : ''} /> Maintenance
          </button>
          <button onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'resolved' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <CheckCircle size={18} className={activeTab === 'resolved' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''} /> Resolved
          </button>
        </div>
      </div>

      {/* Complaints List */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-12 h-12 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex items-center justify-center h-48 hackathon-glass border border-dashed border-white/20 rounded-3xl">
            <p className="text-gray-500 font-bold uppercase tracking-widest">No active protocols in this quadrant.</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint.id} className="hackathon-glass rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_15px_rgba(34,211,238,1)]"></div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-black text-white tracking-[0.2em] bg-white/10 px-4 py-2 rounded-lg border border-white/20 shadow-inner">
                    {complaint.complaint_number}
                  </span>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] border ${complaint.severity === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/50' : complaint.severity === 'medium' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
                    {complaint.severity}
                  </span>
                </div>
                <h3 className="text-white font-black text-xl flex items-center gap-3 tracking-wide">
                  <MapPin size={22} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  {complaint.location}
                </h3>
              </div>
              <div className="flex flex-col gap-3 text-xs text-gray-300 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/10 w-fit shadow-inner">
                  <Clock size={16} className="text-cyan-400" />
                  <span className="text-gray-500">INIT:</span> {complaint.created_at}
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/10 w-fit shadow-inner">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-gray-500">AGENCY:</span>
                  <span className="text-white font-black">{complaint.agency}</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/10 w-fit shadow-inner">
                  <span className="text-gray-500">REPORTS:</span>
                  <span className="text-cyan-400 font-black">{complaint.number_of_reports}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {activeTab !== 'resolved' && (
                  <button
                    onClick={() => handleAction(complaint.id, 'repair')}
                    disabled={rescanLoading === complaint.id}
                    className="bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] text-white font-black tracking-[0.2em] uppercase px-6 py-3.5 rounded-xl text-[10px] transition-all transform hover:scale-105 disabled:opacity-50"
                  >
                    {rescanLoading === complaint.id ? 'Processing...' : 'Mark Repaired'}
                  </button>
                )}
                {activeTab === 'reported' && (
                  <button
                    onClick={() => handleAction(complaint.id, 'escalate')}
                    disabled={rescanLoading === complaint.id}
                    className="bg-red-600/80 hover:bg-red-500 border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] text-white font-black tracking-[0.2em] uppercase px-6 py-3.5 rounded-xl text-[10px] transition-all transform hover:scale-105 disabled:opacity-50"
                  >
                    Escalate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}