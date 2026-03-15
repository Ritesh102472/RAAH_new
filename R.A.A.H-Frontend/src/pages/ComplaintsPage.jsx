import React, { useState, useEffect } from 'react';
import { FileText, Wrench, CheckCircle, MapPin, AlertCircle, Clock, Users, Image as ImageIcon, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState('reported');
  const [complaints, setComplaints] = useState([]);
  const [citizenGroups, setCitizenGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groupLoading, setGroupLoading] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [expandedCitizenId, setExpandedCitizenId] = useState(null);

  useEffect(() => {
    if (activeTab === 'citizens') {
      fetchCitizenGroups();
    } else {
      fetchComplaints(activeTab);
    }
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

  async function fetchCitizenGroups() {
    setGroupLoading(true);
    try {
      const res = await api.get('/admin/citizens-reports');
      setCitizenGroups(res.data || []);
    } catch (err) {
      console.error('Failed to load citizen groups:', err);
      setCitizenGroups([]);
    } finally {
      setGroupLoading(false);
    }
  }

  async function handleAction(id, type, note = "Action via admin dashboard") {
    setRescanLoading(id);
    try {
      let endpoint;
      if (type === 'repair') endpoint = '/admin/mark-repaired';
      else if (type === 'escalate') endpoint = '/admin/escalate';
      else if (type === 'rescan') endpoint = '/admin/rescan';

      const res = await api.post(endpoint, { complaint_id: id });
      
      if (type === 'rescan' && res.data.status === 'success') {
        const c = complaints.find(c => c.id === id);
        setVerificationResult({
          data: res.data,
          location: c ? c.location : "Unknown Coordinates"
        });
      }

      // Only refresh the list if we aren't opening a modal
      if (type !== 'rescan') {
        setTimeout(() => {
          if (activeTab === 'citizens') fetchCitizenGroups();
          else fetchComplaints(activeTab);
        }, 500);
      }
    } catch (err) {
      console.error(`${type} action failed:`, err);
      alert(`${type} failed: ` + (err.response?.data?.detail || err.message));
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
        <div className="flex gap-4 flex-wrap">
          <button onClick={() => setActiveTab('reported')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'reported' ? 'bg-blue-900/40 text-cyan-400 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <FileText size={18} /> Active Tickets
          </button>
          <button onClick={() => setActiveTab('under_repair')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'under_repair' ? 'bg-orange-900/40 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <Wrench size={18} /> Maintenance
          </button>
          <button onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'resolved' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <CheckCircle size={18} /> Resolved
          </button>
          <button onClick={() => setActiveTab('citizens')}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold transition-all uppercase tracking-widest text-xs shadow-sm ${activeTab === 'citizens' ? 'bg-purple-900/40 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
            <Users size={18} /> Citizen View
          </button>
        </div>
      </div>

      {/* Complaints List / Citizen Groups */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {loading || groupLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-12 h-12 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
          </div>
        ) : activeTab === 'citizens' ? (
          citizenGroups.length === 0 ? (
            <div className="flex items-center justify-center h-48 hackathon-glass border border-dashed border-white/20 rounded-3xl">
              <p className="text-gray-500 font-bold uppercase tracking-widest">No citizen profiles decrypted.</p>
            </div>
          ) : (
            citizenGroups.map((group) => {
              const isExpanded = expandedCitizenId === group.citizen_id;
              
              return (
                <div key={group.citizen_id} className={`hackathon-glass rounded-3xl border border-white/5 transition-all duration-500 overflow-hidden ${isExpanded ? 'p-8 ring-1 ring-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'p-4 hover:border-purple-500/30'}`}>
                  <button 
                    onClick={() => setExpandedCitizenId(isExpanded ? null : group.citizen_id)}
                    className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group/citizen"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border border-white/10'}`}>
                        <Users size={24} className={isExpanded ? 'text-purple-400' : 'text-gray-400'} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-black tracking-widest uppercase transition-colors ${isExpanded ? 'text-white' : 'text-gray-400 group-hover/citizen:text-purple-300'}`}>{group.name}</h3>
                        <p className="text-gray-500 text-xs font-mono">{group.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="bg-black/60 px-6 py-3 rounded-xl border border-white/10 shadow-inner min-w-[140px] text-center">
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-1">Total Reports</span>
                        <span className="text-purple-400 font-black text-lg">{group.total_reports}</span>
                      </div>
                      <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-90 text-purple-400' : 'text-gray-600'}`}>
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </button>

                  <div className={`grid grid-cols-1 gap-4 transition-all duration-500 ease-in-out ${isExpanded ? 'mt-8 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    {group.complaints.map((c) => (
                      <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group/item">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black group-hover/item:border-cyan-400/50 transition-colors">
                          {c.image_url ? (
                            <img src={c.image_url} alt="Pothole" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-700">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-400/30 uppercase tracking-widest">{c.complaint_number}</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${c.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                              {c.status}
                            </span>
                          </div>
                          <p className="text-white font-bold text-sm leading-tight">{c.location}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 text-[9px] font-bold block mb-1 uppercase">Reports</span>
                          <span className="text-white font-black text-xs">{c.number_of_reports}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )
        ) : complaints.length === 0 ? (
          <div className="flex items-center justify-center h-48 hackathon-glass border border-dashed border-white/20 rounded-3xl">
            <p className="text-gray-500 font-bold uppercase tracking-widest">No active protocols in this quadrant.</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint.id} className="hackathon-glass rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_15px_rgba(34,211,238,1)]"></div>
              
              <div className="flex items-center gap-6 flex-1 min-w-0">
                {/* Visual Data Point */}
                <div className="hidden sm:block w-32 h-32 rounded-2xl overflow-hidden border border-white/10 bg-black relative shadow-[0_0_15px_rgba(0,0,0,0.5)] flex-shrink-0 group-hover:border-cyan-400/40 transition-colors duration-500">
                  {complaint.image_url ? (
                    <img src={complaint.image_url} alt="Pothole" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-800">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/5 pointer-events-none"></div>
                </div>

                <div className="space-y-4 flex-1 min-w-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-xs font-black text-white tracking-[0.2em] bg-white/10 px-4 py-2 rounded-lg border border-white/20 shadow-inner">
                      {complaint.complaint_number}
                    </span>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] border ${complaint.severity === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/50' : complaint.severity === 'medium' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
                      {complaint.severity}
                    </span>
                    <div className="flex items-center gap-2 bg-purple-900/10 border border-purple-500/20 px-3 py-1.5 rounded-lg text-purple-400 text-[10px] font-black tracking-widest uppercase">
                      <Users size={12} /> {complaint.citizen_name}
                    </div>
                  </div>
                  <h3 className="text-white font-black text-xl flex items-start gap-3 tracking-wide leading-relaxed">
                    <MapPin size={22} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] mt-1 flex-shrink-0" />
                    {complaint.location}
                  </h3>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-[10px] text-gray-300 font-bold uppercase tracking-wider min-w-[180px] flex-shrink-0">
                <div className="flex items-center justify-between bg-black/40 px-4 py-2 rounded-lg border border-white/10 shadow-inner group-hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-cyan-400" />
                    <span className="text-gray-500">INIT:</span>
                  </div>
                  <span className="text-white tracking-widest">{complaint.created_at}</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 px-4 py-2 rounded-lg border border-white/10 shadow-inner group-hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-gray-500">REPORTS:</span>
                  </div>
                  <span className="text-cyan-400 font-black text-sm">{complaint.number_of_reports}</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 px-4 py-2 rounded-lg border border-white/10 shadow-inner group-hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-purple-400" />
                    <span className="text-gray-500">REPORTERS:</span>
                  </div>
                  <span className="text-purple-400 font-black text-sm">{complaint.unique_reporters_count || 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
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
                  <>
                    <button
                      onClick={() => handleAction(complaint.id, 'rescan')}
                      disabled={rescanLoading === complaint.id}
                      className="bg-cyan-600/80 hover:bg-cyan-500 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)] text-white font-black tracking-[0.2em] uppercase px-6 py-3.5 rounded-xl text-[10px] transition-all transform hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                    >
                      <AlertCircle size={14} className={rescanLoading === complaint.id ? 'animate-spin' : ''} />
                      {rescanLoading === complaint.id ? 'Verifying...' : 'AI Verify'}
                    </button>
                    <button
                      onClick={() => handleAction(complaint.id, 'escalate')}
                      disabled={rescanLoading === complaint.id}
                      className="bg-red-600/80 hover:bg-red-500 border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] text-white font-black tracking-[0.2em] uppercase px-6 py-3.5 rounded-xl text-[10px] transition-all transform hover:scale-105 disabled:opacity-50"
                    >
                      Escalate
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Verification Modal */}
      {verificationResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-scale-in">
          <div className="hackathon-glass bg-gray-900 border border-cyan-400/30 rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            <h2 className="text-2xl font-black text-white tracking-widest flex items-center gap-3 mb-6">
              <AlertCircle className="text-cyan-400" />
              AI VISION: REPAIR ANALYSIS
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="bg-black/60 border border-white/10 rounded-xl p-4">
                  <span className="text-gray-400 font-bold block mb-1 text-xs tracking-widest uppercase">Target Coordinates</span>
                  <span className="text-cyan-400 font-mono text-sm">{verificationResult.location || "Unknown"}</span>
                </div>
                <div className="bg-black/60 border border-white/10 rounded-xl p-4">
                  <span className="text-gray-400 font-bold block mb-1 text-xs tracking-widest uppercase">Capture Time</span>
                  <span className="text-white font-mono text-sm">
                    {verificationResult.data?.captured_at 
                      ? new Date(verificationResult.data.captured_at).toLocaleString() 
                      : "Live Feed"}
                  </span>
                </div>
                <div className="bg-black/60 border border-white/10 rounded-xl p-4">
                  <span className="text-gray-400 font-bold block mb-1 text-xs tracking-widest uppercase">Analysis Status</span>
                  <div className={`font-black flex items-center gap-2 ${verificationResult.data?.detection_result === 'cleared' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {verificationResult.data?.detection_result === 'cleared' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {verificationResult.data?.detection_result === 'cleared' ? 'NO ANOMALY DETECTED' : 'POTHOLE PERSISTS'}
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black min-h-[220px] flex items-center justify-center group shadow-inner">
                {verificationResult.data?.image_url ? (
                  <>
                    <img 
                      src={verificationResult.data.image_url} 
                      alt="Verification Source" 
                      className="w-full h-full object-cover opacity-90 mix-blend-screen"
                    />
                    <div className="absolute inset-0 border-2 border-cyan-400/40 shadow-[inset_0_0_30px_rgba(34,211,238,0.3)] pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_3px_rgba(34,211,238,0.9)] animate-scan"></div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <span className="text-gray-500 font-bold tracking-widest uppercase text-xs block mb-2">Image Data Unavailable</span>
                    <Wrench size={24} className="text-gray-600 mx-auto" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 flex items-center gap-2 py-1.5 rounded text-[9px] font-black tracking-widest text-cyan-400 border border-cyan-400/30">
                  <Clock size={10} /> LIVE FEED
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 mb-8">
              <p className="text-blue-100 font-mono text-sm leading-relaxed flex items-center gap-2">
                <span className="text-cyan-400 font-bold">» SYSTEM LOG:</span> 
                {verificationResult.data?.message}
              </p>
              {verificationResult.data?.is_fallback && (
                <p className="text-amber-400 font-mono text-xs mt-3 flex items-center gap-2 bg-amber-900/30 w-fit px-3 py-1 rounded">
                  <AlertCircle size={12} /> Used original detection image (fallback mode).
                </p>
              )}
            </div>

            <div className="flex justify-end relative z-10">
              <button 
                onClick={() => setVerificationResult(null)}
                className="bg-white hover:bg-cyan-50 text-black font-black tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105 uppercase px-10 py-4 rounded-xl text-sm"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}