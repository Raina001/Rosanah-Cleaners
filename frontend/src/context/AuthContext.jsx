import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rosanah_token');
    const stored = localStorage.getItem('rosanah_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('rosanah_token', data.token);
    localStorage.setItem('rosanah_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  const logout = useCallback(() => {
    localStorage.removeItem('rosanah_token');
    localStorage.removeItem('rosanah_user');
    setUser(null);
  }, []);

  const patchUser = useCallback((partial) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('rosanah_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const setSession = useCallback((token, userData) => {
    localStorage.setItem('rosanah_token', token);
    localStorage.setItem('rosanah_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;

    let timer;
    const TIMEOUT = 30 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        localStorage.setItem('rosanah_logout_reason', 'inactivity');
      }, TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setSession, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
