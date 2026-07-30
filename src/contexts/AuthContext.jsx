import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const activeToken = localStorage.getItem('token');
    const activeUser = localStorage.getItem('user');

    if (!activeToken || !activeUser) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const parts = activeToken.split('.');
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
          base64 += '=';
        }
        const decoded = JSON.parse(window.atob(base64));
        if (decoded && decoded.exp && (decoded.exp * 1000 < Date.now())) {
          throw new Error('Token expired');
        }
      }

      const parsedUser = JSON.parse(activeUser);
      parsedUser.role = (parsedUser.role || '').toUpperCase();

      setToken(activeToken);
      setUser(parsedUser);
    } catch (error) {
      console.error('Failed to restore auth session:', error.message);
      if (error.message === 'Token expired') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } else {
        try {
          const parsedUser = JSON.parse(activeUser);
          parsedUser.role = (parsedUser.role || '').toUpperCase();
          setToken(activeToken);
          setUser(parsedUser);
        } catch {
          setToken(null);
          setUser(null);
        }
      }
    }
    
    setLoading(false);

    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        if (!e.newValue) {
          setToken(null);
          setUser(null);
          navigate('/login', { replace: true });
        } else if (e.key === 'user') {
          try {
            const parsed = JSON.parse(e.newValue);
            parsed.role = (parsed.role || '').toUpperCase();
            setUser(parsed);
          } catch (err) {
            console.error('Failed to parse user from storage sync:', err);
          }
        } else if (e.key === 'token') {
          setToken(e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = (userData, authToken) => {
    const normalizedUser = {
      ...userData,
      role: (userData.role || '').toUpperCase()
    };

    setUser(normalizedUser);
    setToken(authToken);

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
