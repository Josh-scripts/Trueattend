import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ta_token');
    const saved  = localStorage.getItem('ta_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('ta_token', data.access_token);
    localStorage.setItem('ta_refresh', data.refresh_token);
    localStorage.setItem('ta_user', JSON.stringify(data.user));
    setUser(data.user);
    const role = data.user.role;
    navigate(`/${role}`);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/');
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
