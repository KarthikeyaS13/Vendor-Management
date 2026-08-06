/**
 * Centralized Multi-Tenant Query and Context Helper
 * 
 * Provides uniform tenant filtering, target tenant resolution,
 * and audit log user identification across all business modules.
 */

import { ROLE_CONFIG } from '../config/roles.js';

/**
 * Checks if the given user is a platform admin (SUPER_ADMIN or others).
 * @param {object} user - req.user object
 * @returns {boolean}
 */
export function isSuperAdmin(user) {
  return !user || ROLE_CONFIG[user.role]?.isPlatformAdmin === true;
}

/**
 * Gets the tenant ID from user or optional target fallback.
 * @param {object} user - req.user object
 * @param {number|string|null} fallbackTenantId - optional fallback tenant ID
 * @returns {number|string|null}
 */
export function getTenantId(user, fallbackTenantId = null) {
  if (user && user.tenantId) {
    return user.tenantId;
  }
  return fallbackTenantId || null;
}

/**
 * Generates SQL condition snippet and parameters for tenant isolation.
 * If user is SUPER_ADMIN, returns empty condition and empty params.
 * 
 * @param {object} user - req.user object
 * @param {string|null} alias - table alias (e.g. 'v', 'po', 'i')
 * @returns {{ condition: string, params: Array, isSuperAdmin: boolean, tenantId: number|null }}
 */
export function getTenantCondition(user, alias = null) {
  if (isSuperAdmin(user)) {
    return {
      condition: '',
      params: [],
      isSuperAdmin: true,
      tenantId: null
    };
  }

  const prefix = alias ? `${alias}.` : '';
  const tenantId = user.tenantId;

  return {
    condition: `${prefix}tenant_id = ?`,
    params: tenantId ? [tenantId] : [],
    isSuperAdmin: false,
    tenantId
  };
}

/**
 * Returns SQL snippet with 'WHERE tenant_id = ?' or '' for SUPER_ADMIN.
 * @param {object} user - req.user object
 * @param {string|null} alias - table alias
 * @returns {{ whereClause: string, params: Array }}
 */
export function tenantWhere(user, alias = null) {
  const { condition, params, isSuperAdmin } = getTenantCondition(user, alias);
  if (isSuperAdmin || !condition) {
    return { whereClause: '', params: [] };
  }
  return { whereClause: ` WHERE ${condition}`, params };
}

/**
 * Returns SQL snippet with 'AND tenant_id = ?' or '' for SUPER_ADMIN.
 * @param {object} user - req.user object
 * @param {string|null} alias - table alias
 * @returns {{ andClause: string, params: Array }}
 */
export function tenantAnd(user, alias = null) {
  const { condition, params, isSuperAdmin } = getTenantCondition(user, alias);
  if (isSuperAdmin || !condition) {
    return { andClause: '', params: [] };
  }
  return { andClause: ` AND ${condition}`, params };
}

/**
 * Helper to get safe user ID for audit log insertions.
 * Platform admins (SUPER_ADMIN), external vendors (VENDOR), or non-numeric IDs return null
 * to prevent foreign key constraint violations against the users table.
 * @param {object} user - req.user
 * @returns {number|null}
 */
export function getAuditUserId(user) {
  if (!user || user.role === 'SUPER_ADMIN' || user.role === 'VENDOR' || user.id === 'admin') {
    return null;
  }
  const numericId = Number(user.id);
  return !isNaN(numericId) ? numericId : null;
}

export default {
  isSuperAdmin,
  getTenantId,
  getTenantCondition,
  tenantWhere,
  tenantAnd,
  getAuditUserId
};
