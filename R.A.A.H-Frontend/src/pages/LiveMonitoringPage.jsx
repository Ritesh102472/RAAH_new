import React, { useState, useEffect, useRef } from 'react';
import { Camera, Activity, ScrollText, Crosshair, AlertTriangle, Upload, CheckCircle } from 'lucide-react';
import api, { API_BASE } from '../services/api';

export default function LiveMonitoringPage() {
  const [activeTab, setActiveTab] = useState('live');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res = await api.get('/map/potholes?limit=20');
      setLogs(res.data.features || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Try to get location
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              formData.append('lat', pos.coords.latitude);
              formData.append('lng', pos.coords.longitude);
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }
      const res = await api.post('/citizen/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data);
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const severityColor = (sev) => {
    if (sev === 'high') return 'text-red-400 border-red-500/50 bg-red-500/10';
    if (sev === 'medium') return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
    return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10';
  };

  return (
    <div className="flex flex-col h-full space-y-8 relative z-10 w-full text-gray-100">
      {/* Top Header & Internal Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6 mb-2">
        <h2 className="text-3xl font-black text-white tracking-[0.1em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Live Monitoring</h2>
        <div className="flex gap-4">
          {[
            { key: 'live', icon: <Activity size={18} />, label: 'Live Detection' },
            { key: 'cameras', icon: <Camera size={18} />, label: 'Camera Feeds' },
            { key: 'logs', icon: <ScrollText size={18} />, label: 'Detection Logs' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all font-bold uppercase tracking-widest text-xs shadow-sm ${activeTab === tab.key ? 'bg-blue-900/40 text-cyan-400 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 hackathon-glass rounded-3xl p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/5">

        {/* TAB 1: LIVE DETECTION */}
        {activeTab === 'live' && (
          <div className="h-full flex flex-col md:flex-row gap-8">
            <div
              className="flex-1 bg-black/60 rounded-2xl border border-cyan-500/30 relative overflow-hidden flex flex-col items-center justify-center group shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] cursor-pointer hover:border-cyan-400/60 transition-all"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
              <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] animate-scan opacity-80" />
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
                  <p className="text-cyan-400 font-mono text-sm tracking-widest font-bold animate-pulse">PROCESSING...</p>
                </div>
              ) : uploadResult ? (
                <div className="flex flex-col items-center gap-4 z-10 text-center px-8">
                  <CheckCircle size={48} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
                  <p className="text-emerald-400 font-black uppercase tracking-widest">Detection Complete</p>
                  <p className="text-white font-bold text-sm">{uploadResult.total_detected} pothole(s) detected</p>
                  {uploadResult.road && <p className="text-cyan-400 font-mono text-xs">{uploadResult.road}</p>}
                  {uploadResult.potholes?.map((p, i) => (
                    <div key={i} className={`text-xs font-black px-4 py-2 rounded border tracking-widest uppercase ${severityColor(p.severity)}`}>
                      {p.severity} — {Math.round(p.confidence * 100)}% confidence {p.merged ? '· MERGED' : '· NEW'}
                    </div>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); setUploadResult(null); }} className="text-xs text-gray-400 hover:text-white mt-2 uppercase tracking-widest font-bold border border-white/20 px-4 py-2 rounded-lg">
                    Scan Another
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 z-10">
                  <Upload size={48} className="text-gray-600 group-hover:text-cyan-400 transition-colors duration-500 opacity-60" />
                  <p className="text-gray-500 group-hover:text-cyan-400 font-mono text-sm tracking-widest font-bold transition-colors">
                    CLICK TO UPLOAD IMAGE OR VIDEO
                  </p>
                  {uploadError && <p className="text-red-400 font-bold text-xs tracking-widest">{uploadError}</p>}
                </div>
              )}
              <div className="absolute bottom-6 left-6 font-mono text-sm tracking-[0.2em] font-bold text-emerald-400 bg-black/80 border border-emerald-500/30 px-4 py-2 rounded-lg">
                AI_SCANNER_ACTIVE <span className="animate-pulse">_</span>
              </div>
            </div>

            {/* Sidebar: recent detections */}
            <div className="w-full md:w-96 flex flex-col gap-6">
              <h3 className="font-black text-white uppercase tracking-[0.1em] border-b border-white/10 pb-4 flex items-center gap-3">
                <Activity size={20} className="text-red-500" /> Live Detections
              </h3>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {uploadResult?.potholes?.length > 0 ? (
                  uploadResult.potholes.map((p, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-xl border border-white/10 border-l-4 border-l-red-500">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-mono font-bold text-gray-400">ID: PTH-{p.pothole_id?.toString().padStart(4, '0')}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest border ${severityColor(p.severity)}`}>{p.severity}</span>
                      </div>
                      <p className="text-sm font-bold text-white uppercase tracking-wider">{uploadResult.road || 'Road detected'}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        Conf: {Math.round(p.confidence * 100)}%
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 font-bold text-xs uppercase tracking-widest text-center mt-8">Upload an image to see live detections</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMERA FEEDS */}
        {activeTab === 'cameras' && (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((cam) => (
              <div key={cam} className="bg-black/60 rounded-2xl border border-white/10 flex flex-col justify-between p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden relative group hover:border-cyan-500/50 transition-colors duration-500">
                <div className="flex justify-between text-xs text-cyan-400 font-mono font-bold tracking-[0.2em] mb-2 z-10 bg-black/80 border border-cyan-500/30 px-3 py-1.5 rounded-lg w-fit">
                  <span>CAM_0{cam}</span>
                </div>
                <div className="absolute top-5 right-5 z-10">
                  <span className="text-red-500 flex items-center gap-2 text-xs font-black tracking-widest bg-black/80 px-3 py-1.5 rounded-lg border border-red-500/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> REC
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-black tracking-[0.5em] text-xl group-hover:text-gray-600 transition-colors duration-700 mx-8 text-center">
                  NO SIGNAL DETECTED
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: DETECTION LOGS */}
        {activeTab === 'logs' && (
          <div className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-black/40 custom-scrollbar">
            {logsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-12 h-12 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-[10px] text-gray-400 uppercase tracking-[0.2em] bg-white/5 border-b border-white/10 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-5 font-black">Date</th>
                    <th className="px-6 py-5 font-black">Anomaly ID</th>
                    <th className="px-6 py-5 font-black">Location</th>
                    <th className="px-6 py-5 font-black">Severity</th>
                    <th className="px-6 py-5 font-black text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600 font-bold uppercase tracking-widest">No detections yet. Upload your first pothole image.</td></tr>
                  ) : logs.map((f) => {
                    const p = f.properties;
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5 font-mono font-bold text-gray-500 group-hover:text-gray-300">{p.created_at}</td>
                        <td className="px-6 py-5 font-bold text-white tracking-widest">{p.pothole_id}</td>
                        <td className="px-6 py-5 font-mono text-xs tracking-wider">{p.road_name}</td>
                        <td className="px-6 py-5">
                          <span className={`font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border px-3 py-1 rounded w-fit ${severityColor(p.severity)}`}>
                            <AlertTriangle size={12} /> {p.severity}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-cyan-400">{Math.round((p.confidence || 0) * 100)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}