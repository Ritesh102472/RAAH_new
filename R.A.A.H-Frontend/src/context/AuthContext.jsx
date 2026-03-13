import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('raah_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => localStorage.getItem('raah_token') || null);

  const login = useCallback((tokenData) => {
    const userData = {
      id: tokenData.user_id,
      name: tokenData.name,
      role: tokenData.role,
    };
    localStorage.setItem('raah_token', tokenData.access_token);
    localStorage.setItem('raah_user', JSON.stringify(userData));
    setToken(tokenData.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('raah_token');
    localStorage.removeItem('raah_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === 'admin' || user?.role === 'superadmin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
