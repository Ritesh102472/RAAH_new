import React, { useEffect, useState } from 'react';
import { TrendingUp, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useWebSocketContext } from '../context/WebSocketContext';

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const [statsRes, weeklyRes] = await Promise.all([
        api.get(`/analytics/stats?t=${t}`),
        api.get(`/analytics/weekly?t=${t}`),
      ]);
      setStats(statsRes.data);
      setWeekly(weeklyRes.data.days || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds as fallback
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const { isLive, subscribe } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      console.log('📩 Dashboard event:', message);
      if (message.event === 'new_pothole' || message.event === 'discovery_complete') {
        fetchData();
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const maxCount = weekly.reduce((max, d) => Math.max(max, d.count), 1);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="grid grid-cols-3 gap-8 relative z-10 w-full h-full">
      {isAdmin ? (
        <>
          <div className="h-36 bg-black/40 backdrop-blur-3xl rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.02] border border-red-500/30 relative overflow-hidden group shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            <p className="text-red-400 font-black text-[10px] mb-2 uppercase tracking-[0.3em]">Critical Alerts</p>
            <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              {loading ? '—' : (stats?.active_potholes ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="h-36 bg-black/40 backdrop-blur-3xl rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.02] border border-orange-500/30 relative overflow-hidden group shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            <p className="text-orange-400 font-black text-[10px] mb-2 uppercase tracking-[0.3em]">Repairs In Progress</p>
            <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">
              {loading ? '—' : (stats?.repairs_pending ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="h-36 bg-black/40 backdrop-blur-3xl rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.02] border border-emerald-500/30 relative overflow-hidden group shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
            <p className="text-emerald-400 font-black text-[10px] mb-2 uppercase tracking-[0.3em]">Resolution Rate</p>
            <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              {loading ? '—' : `${stats?.repair_rate ?? 0}%`}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="h-36 hackathon-glass rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-white/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <p className="text-gray-600 font-bold text-xs mb-2 uppercase tracking-[0.2em]">Total Scans</p>
            <p className="text-4xl font-black text-gray-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
              {loading ? '—' : (stats?.total_scans ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="h-36 hackathon-glass rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-white/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <p className="text-gray-600 font-bold text-xs mb-2 uppercase tracking-[0.2em]">Active Potholes</p>
            <p className="text-4xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(239,68,68,0.2)]">
              {loading ? '—' : (stats?.active_potholes ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="h-36 hackathon-glass rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-white/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <p className="text-gray-600 font-bold text-xs mb-2 uppercase tracking-[0.2em]">Repairs Pending</p>
            <p className="text-4xl font-black text-emerald-600 drop-shadow-[0_2px_4px_rgba(16,185,129,0.2)]">
              {loading ? '—' : (stats?.repairs_pending ?? 0).toLocaleString()}
            </p>
          </div>
        </>
      )}

      {/* Weekly Detection Chart */}
      <div className="col-span-3 h-[28rem] hackathon-glass rounded-3xl flex flex-col p-8 relative overflow-hidden group border border-white/40">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-xl"></div>
        <div className="flex justify-between items-center mb-6 z-10">
          <h3 className="font-black text-gray-700 uppercase tracking-[0.2em] text-sm flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-600" /> 7-Day Detection Trend
            {isLive && (
              <span className="flex items-center gap-1.5 ml-4 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                <span className="text-[8px] font-black text-red-500 tracking-tighter uppercase">Live Monitoring</span>
              </span>
            )}
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-cyan-400 transition-all disabled:opacity-50"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">
              Last update: {lastUpdated || '—'}
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Repair Rate: {loading ? '—' : `${stats?.repair_rate ?? 0}%`}
            </span>
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-t-cyan-500 border-r-blue-600 border-b-purple-600 border-l-transparent animate-spin"></div>
          </div>
        ) : weekly.length > 0 ? (
          <div className="flex-1 flex items-end gap-3 z-10 px-2">
            {weekly.map((day, i) => {
              const pct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const isToday = i === weekly.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar">
                  <span className="text-xs font-black text-gray-600 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                    {day.count}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-gradient-to-t from-blue-700 to-blue-500'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  ></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-cyan-700 text-sm font-bold tracking-[0.3em] uppercase animate-pulse">
              No detection data yet. Upload your first pothole image!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}