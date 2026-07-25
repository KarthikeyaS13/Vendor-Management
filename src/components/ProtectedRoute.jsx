import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Reads auth state synchronously from localStorage as a fallback.
 * This handles the race condition where navigate() fires before React's
 * setUser() state update has committed to the component tree.
 */
function getStoredAuth(isPortal) {
  try {
    const tokenKey = isPortal ? 'token' : 'adminToken';
    const userKey = isPortal ? 'user' : 'adminUser';
    
    let token = localStorage.getItem(tokenKey);
    let userStr = localStorage.getItem(userKey);

    // Fallback: if primary keys are empty, check alternate keys
    if (!token || !userStr) {
      token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      userStr = localStorage.getItem('user') || localStorage.getItem('adminUser');
    }

    if (!token || !userStr) return null;

    const parsedUser = JSON.parse(userStr);
    parsedUser.role = (parsedUser.role || '').toUpperCase();

    // Check token expiration safely if possible
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
          base64 += '=';
        }
        const decoded = JSON.parse(window.atob(base64));
        if (decoded && decoded.exp && (decoded.exp * 1000 < Date.now())) {
          return null; // Token is expired
        }
      }
    } catch (e) {
      // If JWT decoding fails, fallback to using stored user object unless explicitly expired
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/portal');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading application...</div>
      </div>
    );
  }

  // Primary: use React context state.
  // Fallback: read localStorage directly to handle the race condition where
  // navigate() fires before setUser()'s async state update has committed.
  const effectiveUser = user || getStoredAuth(isPortal);

  if (!effectiveUser) {
    if (isPortal) {
      return <Navigate to="/portal-login" state={{ from: location }} replace />;
    }
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    // Treat 'ADMIN' and 'admin' interchangeably for legacy reasons
    const normalizedRoles = allowedRoles.map(r => r.toUpperCase());
    const userRole = (effectiveUser.role || '').toUpperCase();

    if (!normalizedRoles.includes(userRole)) {
      if (isPortal) {
        return <Navigate to="/portal-login" replace />;
      }
      return <Navigate to="/admin-login" replace />;
    }
  }

  return <Outlet />;
}
