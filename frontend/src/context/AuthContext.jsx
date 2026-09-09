import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

// status: 'checking' | 'authenticated' | 'unauthenticated'
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    api.checkSession()
      .then((ok) => setStatus(ok ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const login = async (municipalCode, password) => {
    await api.login(municipalCode, password);
    setStatus('authenticated');
  };

  const logout = async () => {
    await api.logout();
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
