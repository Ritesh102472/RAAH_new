import React, { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Search, Loader, UserCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const currentAdminStr = localStorage.getItem('raah_user');
  const currentAdmin = currentAdminStr ? JSON.parse(currentAdminStr) : null;

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.items) setUsers(res.data.items);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await api.patch(`/admin/users/${userId}/role?role=${newRole}`);
      await loadUsers();
    } catch (err) {
      alert("Error updating role: " + (err.response?.data?.detail || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId, name) => {
    if (userId === currentAdmin?.id) {
       alert("You cannot delete your own account.");
       return;
    }
    if (!window.confirm(`Are you absolutely sure you want to remove user "${name}" from the R.A.A.H system?`)) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      await loadUsers();
    } catch (err) {
      alert("Error removing user: " + (err.response?.data?.detail || err.message));
    }
  };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
            <Users size={28} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">User Management Console</h2>
            <p className="text-sm text-gray-400">Manage registered users, roles, and access permissions</p>
          </div>
        </div>
        <div className="bg-blue-900/40 border border-blue-500/30 px-6 py-2 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
           <span className="text-sm font-black text-white">{users.length}</span>
           <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Users Enrolled</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="hackathon-glass rounded-2xl border border-white/5 p-4">
        <div className="relative flex items-center">
          <Search size={20} className="absolute left-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search users by name, email or ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="hackathon-glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex-grow min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader className="animate-spin text-blue-500" size={32} />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Retrieving Database...</span>
          </div>
        ) : (
          <div className="overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-white/10 pb-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Full Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Contact Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Access Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Activity</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Enrolled</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length > 0 ? filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-black text-blue-400 text-xs">#{u.id}</td>
                    <td className="px-6 py-4 font-bold text-sm text-white">{u.name}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-300 font-medium">{u.email}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          value={u.role} 
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id || u.role === 'superadmin' || u.id === currentAdmin?.id}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-black tracking-widest uppercase outline-none transition-all disabled:opacity-50
                            ${u.role === 'superadmin' ? 'bg-amber-900/40 border-amber-500/50 text-amber-400' : 
                              u.role === 'admin' ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' : 
                              'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}
                        >
                          <option value="citizen">Citizen</option>
                          <option value="admin">Admin</option>
                          {u.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                        </select>
                        {updatingId === u.id && <Loader className="animate-spin text-white" size={12} />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-400">
                          {u.report_count} Reports
                       </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500">{u.created_at}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={u.id === currentAdmin?.id || u.role === 'superadmin'}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center space-y-2 opacity-40">
                         <AlertCircle size={40} className="text-gray-500" />
                         <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                            {search ? 'No personnel found matching criteria' : 'System database is currently empty'}
                         </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
