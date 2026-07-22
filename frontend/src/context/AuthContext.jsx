import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('vc_user');
    const token = localStorage.getItem('vc_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('vc_token', data.token);
    localStorage.setItem('vc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, role, investorPreferences = undefined) => {
    const payload = { name, email, password, role };
    if (role === 'investor' && investorPreferences) {
      payload.investorPreferences = investorPreferences;
    }
    const { data } = await authAPI.register(payload);
    localStorage.setItem('vc_token', data.token);
    localStorage.setItem('vc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('vc_token');
    localStorage.removeItem('vc_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data.user);
      localStorage.setItem('vc_user', JSON.stringify(data.user));
    } catch (_) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
