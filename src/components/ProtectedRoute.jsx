import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading application...</div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname.startsWith('/portal')) {
      return <Navigate to="/portal-login" state={{ from: location }} replace />;
    }
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    // Treat 'ADMIN' and 'admin' interchangeably for legacy reasons
    const normalizedRoles = allowedRoles.map(r => r.toUpperCase());
    const userRole = (user.role || '').toUpperCase();
    
    if (!normalizedRoles.includes(userRole)) {
      if (location.pathname.startsWith('/portal')) {
        return <Navigate to="/portal-login" replace />;
      }
      return <Navigate to="/admin-login" replace />;
    }
  }

  return <Outlet />;
}
