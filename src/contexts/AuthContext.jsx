import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user from storage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setLoading(false);

    // Cross-tab synchronization has been removed to allow testing multiple roles in different tabs.
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      if (window.location.pathname.startsWith('/portal')) {
        navigate('/portal-login', { replace: true });
      } else {
        navigate('/admin-login', { replace: true });
      }
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);

    if (userData.role === 'admin' || userData.role === 'ADMIN') {
      navigate('/dashboard', { replace: true });
    } else if (userData.role === 'VENDOR') {
      navigate('/portal/dashboard', { replace: true });
    } else {
      // Default fallback for other staff roles for now
      navigate('/dashboard', { replace: true });
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Also remove the old admin variables just in case
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');

    navigate('/'); // Optionally you can determine if they were a vendor and redirect to /portal-login
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
