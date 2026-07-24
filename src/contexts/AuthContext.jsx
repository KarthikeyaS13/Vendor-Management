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
        // Decode JWT to check expiration
        const base64Url = storedToken.split('.')[1];
        if (!base64Url) throw new Error('Invalid token format');
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(window.atob(base64));
        
        if (decoded.exp * 1000 < Date.now()) {
          throw new Error('Token expired');
        }

        const parsedUser = JSON.parse(storedUser);
        parsedUser.role = (parsedUser.role || '').toUpperCase();

        // Enforce Portal Isolation
        const path = window.location.pathname;
        if (path === '/portal-login' && parsedUser.role !== 'VENDOR') {
          throw new Error('Admin session not allowed on Vendor Login');
        }
        if (path === '/admin-login' && parsedUser.role === 'VENDOR') {
          throw new Error('Vendor session not allowed on Admin Login');
        }

        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to restore auth session:', error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setLoading(false);

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        if (!e.newValue) {
          setToken(null);
          setUser(null);
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
    // Clear any previous authentication state
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');

    // Enforce canonical role format
    userData.role = (userData.role || '').toUpperCase();

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    
    // Navigation is deliberately omitted here. 
    // React Router DOM v6 has race conditions when navigate() is called 
    // synchronously alongside a context state update. 
    // Instead, components like InvoiceLogin.jsx and AdminLogin.jsx 
    // use a useEffect to listen for user state changes and navigate securely.
  };

  const logout = () => {
    const isVendor = user?.role === 'VENDOR';
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');

    navigate(isVendor ? '/portal-login' : '/admin-login');
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
