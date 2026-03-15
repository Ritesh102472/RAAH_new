import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, Map, Eye, EyeOff, Loader, MapPin, Users, TrendingUp, AlertTriangle, Filter, Cloud, Car, Info, Cpu } from 'lucide-react';
import api from '../services/api';

const { Overlay } = LayersControl;

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#3b82f6',
};

const RISK_COLORS = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#3b82f6',
};

const GeospatialIntel = () => {
  const [mapData, setMapData] = useState({ potholes: [], reports: [], predictions: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: 'all', status: 'all' });
  const [analyzedPoint, setAnalyzedPoint] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const userStr = localStorage.getItem('raah_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/map-data');
        if (res.data) setMapData(res.data);
      } catch (err) {
        console.error("Map data load error:", err);
        // Fallback for citizens who might not have access to full admin map data
        try {
          const predRes = await api.get('/predictions');
          setMapData(prev => ({ ...prev, predictions: predRes.data.features.map(f => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            ...f.properties
          })) }));
        } catch (e) {
          console.error("Prediction load fallback error:", e);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setAnalyzing(true);
        setAnalyzedPoint({ lat, lng, loading: true });
        
        try {
          const res = await api.get(`/predictions/analyze?lat=${lat}&lng=${lng}`);
          setAnalyzedPoint({ ...res.data, loading: false });
        } catch (err) {
          console.error("Point analysis failed:", err);
          setAnalyzedPoint(null);
        } finally {
          setAnalyzing(false);
        }
      }
    });
    return null;
  };

  const filteredPotholes = mapData.potholes.filter(p => {
    if (filter.severity !== 'all' && p.severity !== filter.severity) return false;
    if (filter.status !== 'all' && p.status !== filter.status) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader className="animate-spin text-cyan-400" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
            <Cpu size={28} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Geospatial Intel</h2>
            <p className="text-sm text-gray-400">Pothole formation risk analysis based on real-time weather & traffic data</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{user?.role === 'admin' ? 'Strategic Intelligence' : 'Citizen Intel'}</span>
          </div>
          {analyzing && (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
              <Loader size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Running Point Analysis...</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<MapPin size={20} className="text-red-500" />} value={mapData.potholes.length} label="Potholes Detected" />
        <StatCard icon={<Users size={20} className="text-blue-500" />} value={mapData.reports.length} label="Citizen Reports" />
        <StatCard icon={<TrendingUp size={20} className="text-purple-500" />} value={mapData.predictions.length} label="Risk Predictions" />
        <StatCard icon={<AlertTriangle size={20} className="text-red-500" />} value={mapData.potholes.filter(p => p.severity === 'high').length} label="High Severity" />
      </div>

      {/* Filter Bar */}
      <div className="hackathon-glass rounded-2xl border border-white/5 p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="font-black text-[10px] uppercase tracking-widest text-cyan-400">Filters:</span>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase text-gray-400">Severity:</label>
          <select 
            value={filter.severity} 
            onChange={e => setFilter(prev => ({ ...prev, severity: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-cyan-400/50 transition-colors"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase text-gray-400">Status:</label>
          <select 
            value={filter.status} 
            onChange={e => setFilter(prev => ({ ...prev, status: e.target.value }))}
             className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-cyan-400/50 transition-colors"
          >
            <option value="all">All</option>
            <option value="reported">Reported</option>
            <option value="under_repair">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        <div className="ml-auto flex flex-wrap gap-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
          <LegendItem color="#ef4444" label="High Severity" />
          <LegendItem color="#f97316" label="Medium" />
          <LegendItem color="#3b82f6" label="Low" />
          <LegendItem color="#3b82f6" label="Citizen Report" shape="diamond" />
          <LegendItem color="#8b5cf6" label="Risk Prediction" shape="ring" />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl min-h-[500px]">
        <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold text-gray-300 pointer-events-none">
          <Info size={14} className="inline mr-2 text-cyan-400" />
          CLICK ANY POINT ON MAP TO ANALYZE POTHOLE RISK
        </div>
        <MapContainer center={[21.2514, 81.6296]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <MapClickHandler />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street Map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>

            <Overlay checked name="🔴 Pothole Detections">
              <LayerGroup>
                {filteredPotholes.map(p => (
                  <CircleMarker 
                    key={`ph-${p.id}`} 
                    center={[p.lat, p.lng]} 
                    pathOptions={{ 
                      color: SEVERITY_COLORS[p.severity] || '#718096', 
                      fillColor: SEVERITY_COLORS[p.severity] || '#718096', 
                      fillOpacity: 0.7, 
                      weight: 2,
                    }} 
                    radius={p.severity === 'high' ? 12 : p.severity === 'medium' ? 9 : 7}
                  >
                    <Popup className="hackathon-leaflet-popup">
                      <div className="p-1 min-w-[200px]">
                        <div className="bg-blue-900/40 border-b border-white/10 p-2 -m-2 mb-3 rounded-t-lg">
                          <strong className="text-cyan-400 text-xs tracking-widest uppercase">Pothole #{p.id}</strong>
                          {p.traffic_intensity !== undefined && (
                            <>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-400">Traffic:</span>
                                <span className="font-medium text-white">{(p.traffic_intensity * 100).toFixed(0)}% load</span>
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-400">Rain/Temp:</span>
                                <span className="font-medium text-white">{p.rainfall_mm}mm / {p.temperature_c}°C</span>
                              </div>
                            </>
                          )}
                        </div>
                        <table className="w-full text-[11px] font-bold">
                          <tbody>
                            <tr><td className="text-gray-400 py-1">Severity</td><td className={`uppercase ${p.severity === 'high' ? 'text-red-400' : p.severity === 'medium' ? 'text-orange-400' : 'text-cyan-400'}`}>{p.severity}</td></tr>
                            <tr><td className="text-gray-400 py-1">Confidence</td><td className="text-emerald-400">{p.confidence ? `${(p.confidence * 100).toFixed(1)}%` : '—'}</td></tr>
                            <tr><td className="text-gray-400 py-1">Road</td><td className="text-white">{p.road || '—'}</td></tr>
                            <tr><td className="text-gray-400 py-1">Status</td><td className="text-cyan-400 uppercase">{p.status?.replace('_', ' ')}</td></tr>
                            <tr><td className="text-gray-400 py-1">Detected</td><td className="text-gray-300">{p.date || '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="🔵 Citizen Reports">
              <LayerGroup>
                {mapData.reports.map(r => (
                  <CircleMarker 
                    key={`rp-${r.id}`} 
                    center={[r.lat || 21.25, r.lng || 81.63]} 
                    pathOptions={{ color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.6, weight: 2 }} 
                    radius={7}
                  >
                    <Popup className="hackathon-leaflet-popup">
                      <div className="p-1 min-w-[180px]">
                         <div className="bg-blue-600/20 border-b border-white/10 p-2 -m-2 mb-3 rounded-t-lg">
                          <strong className="text-blue-400 text-xs tracking-widest uppercase">Citizen Report #{r.id}</strong>
                        </div>
                        <table className="w-full text-[11px] font-bold">
                          <tbody>
                            <tr><td className="text-gray-400 py-1">Reporter</td><td className="text-white">{r.user_name}</td></tr>
                            <tr><td className="text-gray-400 py-1">Source</td><td className="text-blue-400 uppercase">{r.source}</td></tr>
                            <tr><td className="text-gray-400 py-1">Filed</td><td className="text-gray-300">{r.date || '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="🟣 Risk Predictions (PVI)">
              <LayerGroup>
                {mapData.predictions.map(p => (
                  <CircleMarker 
                    key={`pr-${p.id}`} 
                    center={[p.lat, p.lng]} 
                    pathOptions={{ 
                      color: RISK_COLORS[p.risk_level] || '#8b5cf6', 
                      fillColor: RISK_COLORS[p.risk_level] || '#8b5cf6', 
                      fillOpacity: 0.25, 
                      weight: 1, 
                      dashArray: '4 4' 
                    }} 
                    radius={Math.max(15, p.pvi_score * 0.6)}
                  >
                    <Popup className="hackathon-leaflet-popup">
                      <div className="p-1 min-w-[200px]">
                        <div className="bg-purple-900/40 border-b border-white/10 p-2 -m-2 mb-3 rounded-t-lg">
                          <strong className="text-purple-400 text-xs tracking-widest uppercase">Risk Prediction #{p.id}</strong>
                        </div>
                        <table className="w-full text-[11px] font-bold">
                          <tbody>
                            <tr><td className="text-gray-400 py-1">PVI Score</td><td className="text-purple-400 text-lg uppercase font-black">{p.pvi_score}/100</td></tr>
                            <tr><td className="text-gray-400 py-1">Risk</td><td className="text-white uppercase">{p.risk_level}</td></tr>
                            <tr><td className="text-gray-400 py-1">Road Type</td><td className="text-gray-300">{p.road_type || '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
            </Overlay>

            {analyzedPoint && !analyzedPoint.loading && (
              <Overlay checked name="🎯 Current Point Intel">
                <LayerGroup>
                   <CircleMarker
                    center={[analyzedPoint.lat, analyzedPoint.lng]}
                    pathOptions={{
                      color: RISK_COLORS[analyzedPoint.risk_level] || '#fff',
                      fillColor: RISK_COLORS[analyzedPoint.risk_level] || '#fff',
                      fillOpacity: 0.9,
                      weight: 4,
                      className: 'animate-pulse'
                    }}
                    radius={15}
                  >
                    <Popup className="hackathon-leaflet-popup" position={[analyzedPoint.lat, analyzedPoint.lng]}>
                      <div className="p-1 min-w-[220px]">
                        <div className={`border-b border-white/10 p-2 -m-2 mb-3 rounded-t-lg flex items-center justify-between`} style={{ backgroundColor: `${RISK_COLORS[analyzedPoint.risk_level]}40` }}>
                          <strong className="text-white text-xs tracking-widest uppercase">Point Intelligence</strong>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white`} style={{ backgroundColor: RISK_COLORS[analyzedPoint.risk_level] }}>
                            {analyzedPoint.risk_level} Risk
                          </span>
                        </div>
                        
                        <div className="space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                              <TrendingUp size={12} className="text-purple-400" /> PVI Score
                            </div>
                            <span className="text-white font-black text-sm">{analyzedPoint.pvi_score}/100</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                              <Cloud size={12} className="text-cyan-400" /> Weather
                            </div>
                            <span className="text-white font-black text-[10px]">{analyzedPoint.rainfall_mm}mm / {analyzedPoint.temperature_c}°C</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                              <Car size={12} className="text-orange-400" /> Traffic
                            </div>
                            <span className="text-white font-black text-[10px]">{(analyzedPoint.traffic_intensity * 100).toFixed(0)}% Intensity</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-gray-500 italic text-center">
                          Analysis based on real-time geospatial parameters
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </LayerGroup>
              </Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label }) => (
  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all">
    <div className="p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
      {icon}
    </div>
    <div>
      <span className="block text-2xl font-black text-white leading-none">{value}</span>
      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</span>
    </div>
  </div>
);

const LegendItem = ({ color, label, shape = 'dot' }) => (
  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
    <span 
      className={`block rounded-full ${shape === 'diamond' ? 'rotate-45 rounded-sm' : ''} ${shape === 'ring' ? 'bg-transparent border-2' : ''}`} 
      style={{ 
        width: '10px', 
        height: '10px', 
        backgroundColor: shape === 'ring' ? 'transparent' : color, 
        borderColor: color 
      }} 
    />
    {label}
  </div>
);

export default GeospatialIntel;
