import { ROLE_CONFIG } from '../config/roles.js';

export function hasPermission(user, requiredPermission) {
  if (!user || !user.role) return false;

  const userRoleConfig = ROLE_CONFIG[user.role.toUpperCase()];
  if (!userRoleConfig) return false;

  if (userRoleConfig.isPlatformAdmin) return true;

  if (!requiredPermission) return true;

  const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  return permissions.some(permission => 
    userRoleConfig.permissions && userRoleConfig.permissions.includes(permission)
  );
}

export function canAccess(user, permission) {
  return hasPermission(user, permission);
}

export function getRedirectPath(user) {
  if (!user || !user.role) return '/login';
  const userRoleConfig = ROLE_CONFIG[user.role.toUpperCase()];
  if (!userRoleConfig) return '/login';
  return userRoleConfig.redirect || '/';
}
