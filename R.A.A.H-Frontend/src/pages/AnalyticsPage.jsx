import React, { useEffect, useState } from 'react';
import { TrendingUp, Activity, AlertTriangle, CheckCircle, Clock, Map } from 'lucide-react';
import api from '../services/api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [highways, setHighways] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sRes, hRes] = await Promise.all([
          api.get('/analytics/stats'),
          api.get('/analytics/highways'),
        ]);
        setStats(sRes.data);
        setHighways(hRes.data.items || []);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const roadHealth = stats?.road_health_index ?? 68;
  const totalDetections = stats?.total_detections ?? 0;
  const repairRate = stats?.repair_rate ?? 0;
  const avgResolution = stats?.avg_resolution_days ?? 0;

  return (
    <div className="flex flex-col h-full space-y-8 overflow-y-auto pb-8 relative z-10 w-full text-gray-100">
      <div>
        <h2 className="text-3xl font-black text-white mb-8 tracking-[0.1em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">System Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="hackathon-glass p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-white/5">
            <div className="absolute -right-6 -top-6 text-blue-500/10 group-hover:text-blue-500/20 transition-colors duration-500"><Activity size={120} /></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Road Health Index</p>
            <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {loading ? '—' : roadHealth}<span className="text-xl text-gray-500 font-bold">/100</span>
            </p>
            <p className="text-xs text-red-400 mt-4 flex items-center gap-2 font-bold uppercase tracking-wider">
              <TrendingUp size={16} className="rotate-180 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" /> Live score
            </p>
          </div>

          <div className="hackathon-glass p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-white/5">
            <div className="absolute -right-6 -top-6 text-red-500/10 group-hover:text-red-500/20 transition-colors duration-500"><AlertTriangle size={120} /></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Total Detections</p>
            <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {loading ? '—' : totalDetections.toLocaleString()}
            </p>
            <p className="text-xs text-red-400 mt-4 flex items-center gap-2 font-bold uppercase tracking-wider">
              <TrendingUp size={16} className="drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" /> All-time
            </p>
          </div>

          <div className="hackathon-glass p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-white/5">
            <div className="absolute -right-6 -top-6 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors duration-500"><CheckCircle size={120} /></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Overall Repair Rate</p>
            <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {loading ? '—' : repairRate}<span className="text-xl text-gray-500 font-bold">%</span>
            </p>
            <div className="w-full bg-white/10 rounded-full h-2 mt-5 overflow-hidden shadow-inner">
              <div className="bg-emerald-400 h-2 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" style={{ width: `${repairRate}%` }}></div>
            </div>
          </div>

          <div className="hackathon-glass p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] border border-white/5">
            <div className="absolute -right-6 -top-6 text-amber-500/10 group-hover:text-amber-500/20 transition-colors duration-500"><Clock size={120} /></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Avg Resolution Time</p>
            <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {loading ? '—' : avgResolution}<span className="text-xl text-gray-500 font-bold">d</span>
            </p>
            <p className="text-xs text-emerald-400 mt-4 flex items-center gap-2 font-bold uppercase tracking-wider">
              <TrendingUp size={16} className="rotate-180" /> Days to resolve
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 hackathon-glass rounded-3xl p-8 border border-white/5 flex flex-col shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-white text-lg uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
              <Map size={24} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> Pothole Density Heatmap
            </h3>
            <button className="text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-lg text-cyan-400 transition-all">Export</button>
          </div>
          <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center min-h-[350px] shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute top-1/4 left-1/3 w-40 h-40 bg-red-500 rounded-full mix-blend-screen filter blur-[60px] opacity-80 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500 rounded-full mix-blend-screen filter blur-[80px] opacity-60"></div>
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-purple-500 rounded-full mix-blend-screen filter blur-[50px] opacity-70"></div>
            <p className="z-10 text-cyan-400 font-mono text-xs font-bold tracking-[0.3em] border border-cyan-400/30 bg-black/60 backdrop-blur-md px-6 py-3 rounded-lg">
              {loading ? 'LOADING...' : `GEOSPATIAL_HEATMAP_ACTIVE — ${totalDetections} DETECTIONS`}
            </p>
          </div>
        </div>

        <div className="hackathon-glass rounded-3xl p-8 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <h3 className="font-black text-white text-lg uppercase tracking-widest mb-8 drop-shadow-md">Affected Roads</h3>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-10 h-10 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
            </div>
          ) : highways.length === 0 ? (
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs text-center mt-8">No data yet. Upload pothole images to see road breakdown.</p>
          ) : (
            <div className="space-y-8">
              {highways.map((data, index) => (
                <div key={index}>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                    <span className="text-gray-400">{data.name}</span>
                    <span className="text-white">{data.count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden shadow-inner border border-white/5">
                    <div className={`h-full rounded-full ${index === 0 ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]' : index === 1 ? 'bg-gradient-to-r from-orange-600 to-orange-400' : index === 2 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`}
                      style={{ width: data.percentage }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}