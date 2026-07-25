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
    const token = localStorage.getItem(tokenKey);
    const userStr = localStorage.getItem(userKey);
    if (!token || !userStr) return null;

    // Validate token is not expired
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(base64));
    if (decoded.exp * 1000 < Date.now()) return null;

    const parsedUser = JSON.parse(userStr);
    parsedUser.role = (parsedUser.role || '').toUpperCase();
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
