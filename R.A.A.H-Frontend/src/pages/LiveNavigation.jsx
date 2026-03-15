import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, AlertTriangle, Car, RotateCcw, Play, Pause, Search, ChevronRight, Info, Loader, X } from 'lucide-react';
import api from '../services/api';
import L from 'leaflet';

// Constants
const TOMTOM_API_KEY = "0ZWFry5vhviMyKSSL2543tL0y37H4KhJ";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapFocus({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

const LiveNavigation = () => {
  // State for points
  const [startPoint, setStartPoint] = useState({ lat: 21.2514, lng: 81.6296, address: "Raipur, Chhattisgarh" });
  const [endPoint, setEndPoint] = useState(null);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState({ type: '', text: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // State for routing
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State for simulation
  const [simulating, setSimulating] = useState(false);
  const [carPos, setCarPos] = useState(null);
  const [progress, setProgress] = useState(0);
  const [warning, setWarning] = useState(null);
  const [potholes, setPotholes] = useState([]);
  
  const simIntervalRef = useRef(null);

  useEffect(() => {
    // Load existing potholes (still useful for general map display)
    api.get('/map/potholes?limit=200').then(res => setPotholes(res.data.features || []));
    return () => clearInterval(simIntervalRef.current);
  }, []);

  const handleSearch = async (val, type) => {
    setSearchQuery({ type, text: val });
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(val)}.json?key=${TOMTOM_API_KEY}&limit=5&countrySet=IN`);
      const data = await res.json();
      setSuggestions(data.results || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const selectSuggestion = (s) => {
    const pos = { lat: s.position.lat, lng: s.position.lon, address: s.address.freeformAddress };
    if (searchQuery.type === 'start') {
      setStartPoint(pos);
    } else {
      setEndPoint(pos);
      fetchRoute(startPoint, pos);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchQuery({ type: '', text: '' });
  };

  const fetchRoute = async (start, end) => {
    setLoading(true);
    setSimulating(false);
    setCarPos(null);
    setWarning(null);
    try {
      const res = await api.get('/map/route', {
        params: {
          start_lat: start.lat, start_lng: start.lng,
          end_lat: end.lat, end_lng: end.lng
        }
      });
      setRouteData(res.data);
    } catch (err) {
      console.error("Route calculation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = () => {
    if (!routeData?.safest?.geometry?.coordinates) return;
    
    // Reset if already simulating
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    
    setSimulating(true);
    const coords = routeData.safest.geometry.coordinates;
    const hazards = routeData.safest.hazards || [];
    let step = 0;

    const checkDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    simIntervalRef.current = setInterval(() => {
      if (step >= coords.length) {
        setSimulating(false);
        clearInterval(simIntervalRef.current);
        return;
      }

      const [lng, lat] = coords[step];
      setCarPos([lat, lng]);
      setProgress((step / coords.length) * 100);

      const nearby = hazards.find(h => checkDist(lat, lng, h.lat, h.lng) <= 1.5);
      if (nearby && !warning) {
        setWarning({
          severity: nearby.severity,
          distance: checkDist(lat, lng, nearby.lat, nearby.lng).toFixed(2)
        });
        setTimeout(() => setWarning(null), 4000);
      }

      step++;
    }, 120);
  };

  const stopSimulation = () => {
    setSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setCarPos(null);
    setProgress(0);
    setWarning(null);
  };

  const resetMap = () => {
    setStartPoint({ lat: 21.2514, lng: 81.6296, address: "Raipur, Chhattisgarh" });
    setEndPoint(null);
    setRouteData(null);
    stopSimulation();
  };

  const polylineCoords = routeData?.safest?.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
  const riskCoords = routeData?.alternatives?.[0]?.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Search & Stats Side (Google Maps style) */}
      <div className="w-[450px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {/* Search Panel */}
        <div className="hackathon-glass p-6 rounded-3xl border border-white/10 relative z-[2000]">
          <h2 className="text-white font-black text-xl mb-6 flex items-center gap-3 italic">
            <Navigation className="text-cyan-400" /> NAVIGATE SAFELY
          </h2>
          
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <input 
                placeholder="Starting location"
                value={searchQuery.type === 'start' ? searchQuery.text : startPoint.address}
                onChange={(e) => handleSearch(e.target.value, 'start')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white text-sm font-bold focus:border-cyan-500/50 outline-none transition-all"
              />
            </div>

            <div className="flex justify-center -my-2 opacity-30">
              <div className="w-px h-4 bg-white" />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500" size={18} />
              <input 
                placeholder="Where to?"
                value={searchQuery.type === 'end' ? searchQuery.text : endPoint?.address || ''}
                onChange={(e) => handleSearch(e.target.value, 'end')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white text-sm font-bold focus:border-cyan-500/50 outline-none transition-all"
              />
              {endPoint && (
                <button onClick={() => setEndPoint(null)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Autocomplete Results */}
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute left-0 right-0 mt-2 bg-gray-800 border-2 border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[5000]">
                {suggestions.map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left p-4 hover:bg-white/10 border-b border-white/5 flex items-start gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                      <Search className="text-gray-400 group-hover:text-cyan-400" size={16} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-black leading-tight group-hover:text-cyan-300 transition-colors">
                        {s.address.freeformAddress}
                      </p>
                      <p className="text-gray-400 text-[10px] uppercase font-black mt-0.5">
                        {s.type} {s.address.municipality ? `• ${s.address.municipality}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {!simulating ? (
                <button 
                disabled={!endPoint || loading}
                onClick={startSimulation}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!endPoint || loading) ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]'}`}
                >
                {loading ? <Loader className="animate-spin" size={18} /> : "Start Journey"}
                </button>
            ) : (
                <button 
                onClick={stopSimulation}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/50"
                >
                <Pause size={18} fill="currentColor" /> Stop Journey
                </button>
            )}
            <button onClick={resetMap} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Info Panel */}
        {routeData && (
          <div className="flex-1 hackathon-glass p-8 rounded-3xl border border-white/10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">TRAVEL DISTANCE</p>
                <h3 className="text-4xl font-black text-white italic">{(routeData.safest.distance_m / 1000).toFixed(1)} <span className="text-xl not-italic text-gray-400">KM</span></h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">TIME ESTIMATE</p>
                <h3 className="text-3xl font-black text-white">{(routeData.safest.duration_s / 60).toFixed(0)} <span className="text-lg text-gray-400">MINS</span></h3>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pothole Risk Score</p>
                  <p className="text-white font-black text-xl">{routeData.safest.risk_score} PTS</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${routeData.safest.risk_score < 10 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {routeData.safest.risk_score < 10 ? 'Optimal Path' : 'Moderate Path'}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/20 flex items-center justify-center">
                  <Info className="text-cyan-400" size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Navigation Alert</p>
                  <p className="text-gray-500 text-xs leading-relaxed mt-1">Our AI identified {routeData.safest.hazards?.length || 0} potential potholes on this path. Proximity warnings are active.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Content */}
      <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
        <MapContainer center={[startPoint.lat, startPoint.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
          
          <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
            <Popup><span className="font-bold">Origin:</span> {startPoint.address}</Popup>
          </Marker>
          
          {endPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
              <Popup><span className="font-bold">Destination:</span> {endPoint.address}</Popup>
            </Marker>
          )}

          {polylineCoords.length > 0 && (
            <Polyline positions={polylineCoords} color="#22c55e" weight={8} opacity={0.6} lineJoin="round" />
          )}

          {riskCoords.length > 0 && (
            <Polyline positions={riskCoords} color="#ef4444" weight={4} dashArray="10, 15" opacity={0.4} />
          )}

          {carPos && <Marker position={carPos} icon={carIcon} zIndexOffset={1000} />}

          <MapFocus center={carPos || ([startPoint.lat, startPoint.lng])} />
        </MapContainer>

        {/* Simulation Warning Overlay */}
        {warning && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top zoom-in flex flex-col items-center">
            <div className="bg-red-600/90 backdrop-blur-md border-2 border-red-400 rounded-[2rem] px-10 py-6 text-white shadow-[0_0_60px_rgba(220,38,38,0.5)] flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <AlertTriangle size={32} className="animate-pulse" />
                <h4 className="text-2xl font-black italic tracking-tighter">POTHOLE DETECTED AHEAD!</h4>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="bg-black/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase">SEVERITY: {warning.severity}</span>
                <span className="bg-black/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase">DISTANCE: {warning.distance}KM</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gradient-to-b from-red-500 to-transparent" />
          </div>
        )}

        {/* Progress Bar (Visual indicator of simulation) */}
        {simulating && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[60%] hackathon-glass p-1 rounded-full border border-white/20">
            <div className="h-2 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveNavigation;
