import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../lib/permissions';

/**
 * Reads auth state synchronously from localStorage as a fallback.
 * This handles the race condition where navigate() fires before React's
 * setUser() state update has committed to the component tree.
 */
function getStoredAuth() {
  try {
    let token = localStorage.getItem('token');
    let userStr = localStorage.getItem('user');

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

export default function ProtectedRoute({ allowedRoles = [], permission }) {
  const { user, loading } = useAuth();
  const location = useLocation();

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
  const effectiveUser = user || getStoredAuth();

  if (!effectiveUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Fallback support for legacy allowedRoles
  if (allowedRoles.length > 0) {
    const normalizedRoles = allowedRoles.map(r => r.toUpperCase());
    const userRole = (effectiveUser.role || '').toUpperCase();
    if (!normalizedRoles.includes(userRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  // Permission-based routing
  if (permission && !hasPermission(effectiveUser, permission)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
