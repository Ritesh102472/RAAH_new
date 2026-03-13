import React, { useState, useEffect } from 'react';
import { Bell, Shield, User, Monitor, Eye, Save } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [profile, setProfile] = useState({ name: '', phone: '', dob: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/auth/me');
        setProfile({ name: res.data.name, phone: res.data.phone, dob: res.data.dob });
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    loadProfile();
  }, []);

  async function saveProfile() {
    setProfileLoading(true);
    setProfileMsg('');
    try {
      await api.patch('/auth/me', profile);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileMsg('Update failed. Please try again.');
    } finally {
      setProfileLoading(false);
      setTimeout(() => setProfileMsg(''), 3000);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-8 relative z-10 w-full mb-8">
      {/* Profile Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <User className="text-blue-500" size={28} /> Account Preferences
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="p-4 bg-white/80 border border-gray-200 text-gray-800 font-bold rounded-xl focus:outline-none focus:border-blue-400"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              className="p-4 bg-white/80 border border-gray-200 text-gray-800 font-bold rounded-xl focus:outline-none focus:border-blue-400"
            />
            <input
              type="date"
              value={profile.dob}
              onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))}
              className="p-4 bg-white/80 border border-gray-200 text-gray-800 font-bold rounded-xl focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={saveProfile}
              disabled={profileLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
            {profileMsg && <span className="text-sm font-bold text-emerald-600">{profileMsg}</span>}
          </div>
          <div className="flex items-center justify-between p-5 bg-white/50 rounded-xl border border-gray-200/50 shadow-sm transition-transform hover:-translate-y-0.5 mt-2">
            <div>
              <p className="font-bold text-gray-800 text-lg">Role</p>
              <p className="text-gray-500 font-medium mt-1">Your current access level</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-black uppercase tracking-widest text-sm ${user?.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : user?.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {user?.role || 'citizen'}
            </span>
          </div>
          <div className="flex items-center justify-between p-5 bg-white/50 rounded-xl border border-red-100 shadow-sm">
            <div>
              <p className="font-bold text-gray-800 text-lg">Sign Out</p>
              <p className="text-gray-500 font-medium mt-1">End your current session</p>
            </div>
            <button onClick={logout} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold rounded-xl text-sm transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <Monitor className="text-emerald-500" size={28} /> System Preferences
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Push Notifications', desc: 'Receive alerts for new potholes', icon: <Bell className="text-blue-500" size={24} />, bg: 'bg-blue-50 border-blue-100', val: notifications, set: setNotifications },
            { label: 'Dark Mode', desc: 'Toggle application theme', icon: <Eye className="text-amber-500" size={24} />, bg: 'bg-amber-50 border-amber-100', val: darkMode, set: setDarkMode },
            { label: 'Data Sharing', desc: 'Share anonymous usage data', icon: <Shield className="text-purple-500" size={24} />, bg: 'bg-purple-50 border-purple-100', val: dataSharing, set: setDataSharing },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-5 bg-white/50 rounded-xl border border-gray-200/50 shadow-sm transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${item.bg}`}>{item.icon}</div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{item.label}</p>
                  <p className="text-gray-500 font-medium mt-1">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => item.set(!item.val)} className={`w-14 h-7 rounded-full p-1 transition-colors shadow-inner flex items-center ${item.val ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${item.val ? 'translate-x-7' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}