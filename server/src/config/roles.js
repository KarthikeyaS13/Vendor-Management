import { PERMISSIONS } from './permissions.js';

export const ROLE_CONFIG = {
  SUPER_ADMIN: {
    redirect: '/dashboard',
    displayName: 'Super Administrator',
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [], // future sidebar placeholder
    dashboard: 'super_admin' // future dashboard placeholder
  },
  PLATFORM_SUPPORT: {
    redirect: '/dashboard',
    displayName: 'Platform Support',
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: 'super_admin'
  },
  PLATFORM_OPERATIONS: {
    redirect: '/dashboard',
    displayName: 'Platform Operations',
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: 'super_admin'
  },
  PLATFORM_DEVELOPER: {
    redirect: '/dashboard',
    displayName: 'Platform Developer',
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: 'super_admin'
  },
  PLATFORM_AUDITOR: {
    redirect: '/dashboard',
    displayName: 'Platform Auditor',
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: 'super_admin'
  },
  TENANT_ADMIN: {
    redirect: '/dashboard',
    displayName: 'Tenant Administrator',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.VENDOR_CREATE,
      PERMISSIONS.VENDOR_EDIT,
      PERMISSIONS.VENDOR_DELETE,
      PERMISSIONS.VENDOR_APPROVE,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_SUBMIT,
      PERMISSIONS.INVOICE_PROCESS,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.PO_EDIT,
      PERMISSIONS.PO_DELETE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_RESET_PASSWORD
    ],
    sidebar: ['users'],
    dashboard: 'tenant_admin'
  },
  PROCUREMENT: {
    redirect: '/dashboard',
    displayName: 'Procurement Officer',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.PO_EDIT,
      PERMISSIONS.PO_DELETE
    ],
    sidebar: [],
    dashboard: 'procurement'
  },
  FINANCE: {
    redirect: '/dashboard',
    displayName: 'Finance Officer',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_PROCESS
    ],
    sidebar: [],
    dashboard: 'finance'
  },
  COMPLIANCE: {
    redirect: '/dashboard',
    displayName: 'Compliance Officer',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.VENDOR_APPROVE
    ],
    sidebar: [],
    dashboard: 'compliance'
  },
  MANAGEMENT: {
    redirect: '/dashboard',
    displayName: 'Management',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.REPORTS_VIEW
    ],
    sidebar: [],
    dashboard: 'management'
  },
  VENDOR: {
    redirect: '/portal/dashboard',
    displayName: 'Vendor',
    permissions: [
      PERMISSIONS.VENDOR_DASHBOARD_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_SUBMIT
    ],
    sidebar: [],
    dashboard: 'vendor'
  }
};

export const normalizeRole = (rawRole) => {
  if (!rawRole) return 'VENDOR';
  const r = rawRole.toUpperCase();
  if (r === 'ADMIN') return 'TENANT_ADMIN';
  if (ROLE_CONFIG[r]) return r;
  return 'VENDOR'; // Default fallback
};

export const getRedirectPath = (role) => {
  return ROLE_CONFIG[role]?.redirect || '/dashboard';
};
