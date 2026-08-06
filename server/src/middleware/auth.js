import jwt from 'jsonwebtoken';
import { ROLE_CONFIG } from '../config/roles.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_admin_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid user in token' });
    }

    const userRoleConfig = ROLE_CONFIG[user.role];

    // Tenant context is required unless user is a platform admin
    if (!userRoleConfig?.isPlatformAdmin && !user.tenantId) {
      return res.status(401).json({ error: 'Missing tenant context in token' });
    }

    // Standardize req.user for tenant-aware application
    req.user = {
      ...user,
      id: user.userId || user.id, // Support legacy id if present, or userId
      tenantId: user.tenantId,
      role: user.role,
      email: user.email || user.username
    };
    next();
  });
};

export const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: No user role found' });
    }

    const userRoleConfig = ROLE_CONFIG[req.user.role];

    if (!userRoleConfig) {
      return res.status(403).json({ error: 'Forbidden: Invalid role' });
    }

    // SUPER_ADMIN or any role with isPlatformAdmin flag has all permissions
    if (userRoleConfig.isPlatformAdmin) {
      return next();
    }

    if (!requiredPermission) {
      return next(); // If no specific permission required, just being authenticated is enough
    }

    const requiredPermissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    const hasPermission = requiredPermissions.some(permission => 
      userRoleConfig.permissions && userRoleConfig.permissions.includes(permission)
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ error: `Forbidden: Missing required permission: ${requiredPermissions.join(' or ')}` });
  };
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied: Super Admin privileges required.' });
  }
  next();
};
