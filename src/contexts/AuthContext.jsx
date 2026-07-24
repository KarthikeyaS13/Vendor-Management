import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const isPortal = window.location.pathname.startsWith('/portal');
    const tokenKey = isPortal ? 'token' : 'adminToken';
    const userKey = isPortal ? 'user' : 'adminUser';

    // Strictly use the specific token for the portal
    const activeToken = localStorage.getItem(tokenKey);
    const activeUser = localStorage.getItem(userKey);

    if (!activeToken || !activeUser) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const base64Url = activeToken.split('.')[1];
      if (!base64Url) throw new Error('Invalid token format');
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(window.atob(base64));
      
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      const parsedUser = JSON.parse(activeUser);
      parsedUser.role = (parsedUser.role || '').toUpperCase();

      setToken(activeToken);
      setUser(parsedUser);
    } catch (error) {
      console.error('Failed to restore auth session:', error.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setToken(null);
      setUser(null);
    }
    
    setLoading(false);

    const handleStorageChange = (e) => {
      const isPortal = window.location.pathname.startsWith('/portal');
      const tokenKey = isPortal ? 'token' : 'adminToken';
      const userKey = isPortal ? 'user' : 'adminUser';

      if (e.key === tokenKey || e.key === userKey) {
        if (!e.newValue) {
          setToken(null);
          setUser(null);
          if (isPortal) {
            navigate('/portal-login', { replace: true });
          } else {
            navigate('/admin-login', { replace: true });
          }
        } else if (e.key === userKey) {
          try {
            const parsed = JSON.parse(e.newValue);
            parsed.role = (parsed.role || '').toUpperCase();
            setUser(parsed);
          } catch (err) {
            console.error('Failed to parse user from storage sync:', err);
          }
        } else if (e.key === tokenKey) {
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
    const normalizedUser = {
      ...userData,
      role: (userData.role || '').toUpperCase()
    };

    setUser(normalizedUser);
    setToken(authToken);

    const isVendor = normalizedUser.role === 'VENDOR';
    if (isVendor) {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('token', authToken);
      // Use setTimeout to ensure React flushes the context state update before navigating,
      // preventing the ProtectedRoute from instantly bouncing us back to login.
      setTimeout(() => navigate('/portal/dashboard', { replace: true }), 0);
    } else {
      localStorage.setItem('adminUser', JSON.stringify(normalizedUser));
      localStorage.setItem('adminToken', authToken);
      setTimeout(() => navigate('/dashboard', { replace: true }), 0);
    }
  };

  const logout = () => {
    const isVendor = user?.role === 'VENDOR' || window.location.pathname.startsWith('/portal');
    
    setUser(null);
    setToken(null);

    if (isVendor) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/portal-login');
    } else {
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminToken');
      navigate('/admin-login');
    }
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
