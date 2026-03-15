import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Activity, ScrollText, Crosshair, AlertTriangle, Upload, CheckCircle, LayoutDashboard, X, Globe, MapPin, Hash, Info, Search, Navigation, MapPinned, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../services/api';
import { useWebSocketContext } from '../context/WebSocketContext';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function LiveMonitoringPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedPotholeId, setSelectedPotholeId] = useState(null);
  const [potholeDetail, setPotholeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [pendingFile, setPendingFile] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationMode, setLocationMode] = useState('gps'); // 'gps' or 'manual'
  const [manualAddress, setManualAddress] = useState('');
  const [debouncedManualAddress, setDebouncedManualAddress] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng, name }
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedManualAddress(manualAddress);
    }, 300);
    return () => clearTimeout(timer);
  }, [manualAddress]);

  useEffect(() => {
    if (debouncedManualAddress.trim().length > 1) {
      const fetchSuggestions = async () => {
        setSearchLoading(true);
        try {
          const res = await api.get(`/map/geocode/search?q=${encodeURIComponent(debouncedManualAddress)}`);
          setSearchResults(res.data || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Fetch suggestions failed:', err);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [debouncedManualAddress]);

  const { isLive, subscribe } = useWebSocketContext();

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

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadResult(null);
    setUploadError('');
    setSearchResults([]);
    setManualAddress('');
    setSelectedLocation(null);
    setLocationMode('gps');
    setShowLocationModal(true);
  }

  async function handleUseGPS() {
    setGpsLoading(true);
    try {
      if (!navigator.geolocation) {
        setUploadError('Geolocation is not supported by this browser.');
        setShowLocationModal(false);
        return;
      }
      const coords = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => {
            console.warn('Geolocation error:', err.message, '(code:', err.code, ')');
            resolve(null);
          },
          { timeout: 30000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      });
      if (!coords) {
        setUploadError('Could not get your location. Try entering it manually.');
        setLocationMode('manual');
        setGpsLoading(false);
        return;
      }
      setShowLocationModal(false);
      await performUpload(coords.latitude, coords.longitude);
    } finally {
      setGpsLoading(false);
    }
  }

  async function handleSelectResult(result) {
    const loc = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name
    };
    setSelectedLocation(loc);
    setManualAddress(result.display_name);
    setShowSuggestions(false);
  }

  async function handleSelectLocation() {
    if (!selectedLocation) {
      if (searchResults.length > 0) {
        handleSelectResult(searchResults[0]);
      } else {
        await searchAddress();
      }
      return;
    }
    setShowLocationModal(false);
    await performUpload(selectedLocation.lat, selectedLocation.lng, manualAddress);
  }

  async function searchAddress() {
    if (!manualAddress.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.get(`/map/geocode/search?q=${encodeURIComponent(manualAddress)}`);
      const data = res.data;
      setSearchResults(data);
      if (data && data.length > 0) {
        handleSelectResult(data[0]);
      }
    } catch (err) {
      console.error('Address search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function performUpload(lat, lng, address = null) {
    if (!pendingFile) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      if (address) {
        formData.append('address', address);
      }

      const res = await api.post('/citizen/upload', formData);

      if (res.data.status === 'location_required') {
        setUploadError(res.data.message || 'Location could not be determined.');
        return;
      }
      if (res.data.status === 'no_pothole_detected') {
        setUploadError(res.data.message || 'No potholes detected in this image.');
        return;
      }

      setUploadResult(res.data);
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }


  async function handleCardClick(potholeId) {
    setSelectedPotholeId(potholeId);
    setDetailLoading(true);
    try {
      const res = await api.get(`/citizen/potholes/${potholeId}`);
      setPotholeDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch pothole details:', err);
    } finally {
      setDetailLoading(false);
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

        {/* Real-time Status */}
        <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isLive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isLive ? 'Live Stream Active' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex-1 hackathon-glass rounded-3xl p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/5">

        {/* TAB 1: LIVE DETECTION */}
        {activeTab === 'live' && (
          <div className="h-full flex flex-col md:flex-row gap-8">
            <div
              className={`flex-1 bg-black/60 rounded-2xl border border-cyan-500/30 relative overflow-hidden flex flex-col items-center ${uploadResult ? 'justify-start pt-8' : 'justify-center'} group shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] cursor-pointer hover:border-cyan-400/60 transition-all`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileSelected} />
              {(uploading || (!uploadResult && !uploadError)) && (
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] animate-scan opacity-80 z-50" />
              )}
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
                  <p className="text-cyan-400 font-mono text-sm tracking-widest font-bold animate-pulse">PROCESSING...</p>
                </div>
              ) : uploadResult ? (
                <div className="flex flex-col items-center justify-start gap-8 z-10 w-full h-full p-4 pb-20 overflow-y-auto custom-scrollbar">
                  {/* Tight wrapper that matches the physical image area */}
                  <div className="relative inline-block max-w-full flex-shrink-0">
                    {uploadResult.is_video ? (
                      <video
                        src={`${API_BASE}${uploadResult.file_url}`}
                        controls
                        className="max-h-[60vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                        onLoadedMetadata={(e) => {
                          setImageSize({
                            width: e.target.videoWidth,
                            height: e.target.videoHeight
                          });
                        }}
                        onTimeUpdate={(e) => setVideoCurrentTime(e.target.currentTime)}
                      />
                    ) : (
                      <img
                        ref={imageRef}
                        src={`${API_BASE}${uploadResult.file_url}`}
                        alt="Pothole detection"
                        className="max-h-[60vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                        onLoad={(e) => {
                          setImageSize({
                            width: e.target.naturalWidth,
                            height: e.target.naturalHeight
                          });
                        }}
                      />
                    )}

                    {/* SVG Overlay — Now pinned precisely to the image boundaries */}
                    {!uploadResult.is_video && imageSize.width > 0 && (
                      <svg
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                        preserveAspectRatio="none"
                      >
                        {uploadResult.potholes?.map((p, i) => {
                          const [x, y, w, h] = p.bbox || [0, 0, 0, 0];
                          const labelText = `Pothole ${p.confidence.toFixed(2)}`;
                          const fontSize = Math.max(10, imageSize.width / 50);
                          const paddingX = 6;
                          const paddingY = 4;
                          const labelWidth = labelText.length * (fontSize * 0.6) + (paddingX * 2);
                          const labelHeight = fontSize + (paddingY * 2);

                          return (
                            <g key={i}>
                              <rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={Math.max(2, imageSize.width / 400)}
                                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                              />
                              <rect
                                x={x}
                                y={y - labelHeight}
                                width={labelWidth}
                                height={labelHeight}
                                fill="#3b82f6"
                              />
                              <text
                                x={x + paddingX}
                                y={y - paddingY / 2}
                                fill="white"
                                fontSize={fontSize}
                                fontWeight="black"
                                fontFamily="Inter, sans-serif"
                                dominantBaseline="text-after-edge"
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm mb-4 flex-shrink-0">
                    <p className="text-emerald-400 font-black uppercase tracking-[0.2em] flex items-center gap-3 text-sm">
                      <CheckCircle size={20} /> Detection Complete
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadResult(null); setImageSize({ width: 0, height: 0 }); }}
                        className="text-[10px] text-gray-400 hover:text-white uppercase tracking-[0.2em] font-black border border-white/20 px-8 py-3 rounded-xl transition-all hover:bg-white/5 active:scale-95"
                      >
                        Scan Another
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/dashboard'); }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 uppercase tracking-[0.2em] font-black border border-cyan-400/30 px-8 py-3 rounded-xl flex items-center gap-2 transition-all hover:bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.1)] active:scale-95"
                      >
                        <LayoutDashboard size={14} /> View Dashboard
                      </button>
                    </div>
                  </div>
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
              {!uploadResult && !uploading && (
                <div className="absolute bottom-6 left-6 font-mono text-sm tracking-[0.2em] font-bold text-emerald-400 bg-black/80 border border-emerald-500/30 px-4 py-2 rounded-lg">
                  AI_SCANNER_ACTIVE <span className="animate-pulse">_</span>
                </div>
              )}
            </div>

            {/* Sidebar: recent detections */}
            <div className="w-full md:w-96 flex flex-col gap-6">
              <h3 className="font-black text-white uppercase tracking-[0.1em] border-b border-white/10 pb-4 flex items-center gap-3">
                <Activity size={20} className="text-red-500" /> Live Detections
              </h3>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {uploadResult?.potholes?.length > 0 ? (
                  uploadResult.potholes.map((p, i) => (
                    <div
                      key={i}
                      onClick={() => handleCardClick(p.pothole_id)}
                      className="bg-white/5 p-5 rounded-xl border border-white/10 border-l-4 border-l-red-500 cursor-pointer hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95 group/card"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-mono font-bold text-gray-400">ID: PTH-{p.pothole_id?.toString().padStart(4, '0')}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest border ${severityColor(p.severity)}`}>{p.severity}</span>
                      </div>
                      <p className="text-sm font-bold text-white uppercase tracking-wider">{uploadResult.road || 'Road detected'}</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          Conf: {Math.round(p.confidence * 100)}%
                        </p>
                        <Info size={14} className="text-gray-600 group-hover/card:text-cyan-400 transition-colors" />
                      </div>
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
                      <tr key={p.id} className="hover:bg-white/5 transition-colors group" onClick={() => handleCardClick(p.id)}>
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

      {/* Pothole Details Modal */}
      <AnimatePresence>
        {selectedPotholeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
            onClick={() => setSelectedPotholeId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg hackathon-glass rounded-3xl border border-white/20 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
                      Pothole Details
                    </h2>
                    <p className="text-cyan-400 font-mono text-xs font-bold tracking-[0.3em] uppercase">
                      PTH_ANALYTICS_V1.0
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPotholeId(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Retrieving AI Geodata...</p>
                  </div>
                ) : potholeDetail ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Hash size={10} className="text-cyan-500" /> Pothole ID
                        </p>
                        <p className="text-lg font-black text-white">{potholeDetail.id}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Activity size={10} className="text-red-500" /> Severity
                        </p>
                        <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded border ${severityColor(potholeDetail.severity)}`}>
                          {potholeDetail.severity}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                          <MapPin size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Geolocation Data</p>
                            <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              <Globe size={10} className="text-cyan-400" />
                              <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">
                                {potholeDetail.location_source === 'image_exif' ? 'Image Metadata GPS' : 'Citizen Device GPS'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-white mb-2 leading-relaxed">{potholeDetail.address}</p>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Latitude</p>
                              <p className="text-xs font-mono text-cyan-400">{potholeDetail.latitude?.toFixed(6)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Longitude</p>
                              <p className="text-xs font-mono text-cyan-400">{potholeDetail.longitude?.toFixed(6)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-y-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Road</p>
                          <p className="text-xs font-bold text-white uppercase">{potholeDetail.road}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">City</p>
                          <p className="text-xs font-bold text-white uppercase">{potholeDetail.city}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">State</p>
                          <p className="text-xs font-bold text-white uppercase">{potholeDetail.state}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Country</p>
                          <p className="text-xs font-bold text-white uppercase">{potholeDetail.country}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AI Confidence</p>
                          <p className="text-lg font-black text-emerald-400">{Math.round((potholeDetail.confidence || 0) * 100)}%</p>
                        </div>
                      </div>
                      <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(potholeDetail.confidence || 0) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-red-400 font-bold text-xs tracking-widest uppercase">Error loading details</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Location Selection Modal */}
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60"
            onClick={() => { setShowLocationModal(false); setPendingFile(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md hackathon-glass rounded-3xl border border-white/20 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                      Set Location
                    </h2>
                    <p className="text-gray-400 text-xs font-bold tracking-wide">
                      Choose how to provide the pothole location
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowLocationModal(false); setPendingFile(null); }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setLocationMode('gps')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      locationMode === 'gps'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Navigation size={14} /> Use GPS
                  </button>
                  <button
                    onClick={() => setLocationMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      locationMode === 'manual'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <MapPinned size={14} /> Enter Manually
                  </button>
                </div>

                {/* GPS Mode */}
                {locationMode === 'gps' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                      <Navigation size={28} className="text-cyan-400" />
                    </div>
                    <p className="text-gray-400 text-xs text-center font-bold tracking-wide max-w-xs">
                      We'll use your browser's GPS to tag the pothole location automatically.
                    </p>
                    <button
                      onClick={handleUseGPS}
                      disabled={gpsLoading}
                      className="mt-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {gpsLoading ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-t-white border-r-white/30 border-b-white/30 border-l-transparent animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <Navigation size={14} /> Detect My Location
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Manual Mode */}
                {locationMode === 'manual' && (
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => {
                              setManualAddress(e.target.value);
                              if (e.target.value.length > 1) setShowSuggestions(true);
                            }}
                            onFocus={() => { if (manualAddress.length > 1) setShowSuggestions(true); }}
                            onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
                            placeholder="Search address, city, or landmark..."
                            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all"
                          />
                          {searchLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 rounded-full border-2 border-t-cyan-500 border-r-cyan-500/30 border-b-cyan-500/30 border-l-transparent animate-spin" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={searchAddress}
                          disabled={searchLoading || !manualAddress.trim()}
                          className="px-6 py-3 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-40 font-black text-xs uppercase tracking-widest"
                        >
                          Search
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      <AnimatePresence>
                        {showSuggestions && searchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 z-[110] bg-[#0a0a0b] border border-white/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden"
                          >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {searchResults.map((result, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSelectResult(result)}
                                  className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 border-b border-white/5 last:border-0 transition-all group"
                                >
                                  <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                                    {result.display_name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5 truncate uppercase tracking-tighter">
                                    {result.display_name.split(',').slice(1).join(',').trim()}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Map Preview */}
                    <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-white/10 group bg-black/40">
                      {selectedLocation ? (
                        <MapContainer
                          center={[selectedLocation.lat, selectedLocation.lng]}
                          zoom={14}
                          className="h-full w-full"
                          zoomControl={false}
                        >
                          <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          />
                          <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                          <MapRecenter center={[selectedLocation.lat, selectedLocation.lng]} />
                        </MapContainer>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
                          <MapPinned size={32} />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a location to preview map</p>
                        </div>
                      )}
                      
                      {selectedLocation && (
                        <div className="absolute bottom-3 left-3 right-3 z-[100] bg-black/80 backdrop-blur-md border border-cyan-500/30 p-2 rounded-lg pointer-events-none">
                          <p className="text-[9px] font-mono text-cyan-400 truncate uppercase tracking-widest">
                            {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Button */}
                    <button
                      onClick={handleSelectLocation}
                      disabled={!selectedLocation && !manualAddress.trim()}
                      className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                        selectedLocation
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                          : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {selectedLocation ? (
                        <>
                          <Check size={16} /> Confirm Location & Report
                        </>
                      ) : (
                        'Enter Location to Continue'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}