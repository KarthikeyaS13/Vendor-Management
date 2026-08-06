import { PERMISSIONS } from './permissions.js';

export const ROLE_CONFIG = {
  SUPER_ADMIN: {
    redirect: "/dashboard",
    displayName: "Super Administrator",
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: "super_admin"
  },
  PLATFORM_SUPPORT: {
    redirect: "/dashboard",
    displayName: "Platform Support",
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: "super_admin"
  },
  PLATFORM_OPERATIONS: {
    redirect: "/dashboard",
    displayName: "Platform Operations",
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: "super_admin"
  },
  PLATFORM_DEVELOPER: {
    redirect: "/dashboard",
    displayName: "Platform Developer",
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: "super_admin"
  },
  PLATFORM_AUDITOR: {
    redirect: "/dashboard",
    displayName: "Platform Auditor",
    isPlatformAdmin: true,
    permissions: [],
    sidebar: [],
    dashboard: "super_admin"
  },
  TENANT_ADMIN: {
    redirect: "/dashboard",
    displayName: "Tenant Administrator",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.VENDOR_CREATE,
      PERMISSIONS.VENDOR_EDIT,
      PERMISSIONS.VENDOR_DELETE,
      PERMISSIONS.VENDOR_APPROVE,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.PO_EDIT,
      PERMISSIONS.PO_DELETE,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_PROCESS,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_RESET_PASSWORD
    ],
    sidebar: ["dashboard", "vendors", "purchase_orders", "invoices", "reports", "users", "settings"],
    dashboard: "admin"
  },
  PROCUREMENT: {
    redirect: "/dashboard",
    displayName: "Procurement Manager",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.VENDOR_CREATE,
      PERMISSIONS.VENDOR_EDIT,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.PO_CREATE,
      PERMISSIONS.PO_EDIT
    ],
    sidebar: ["dashboard", "vendors", "purchase_orders"],
    dashboard: "procurement"
  },
  FINANCE: {
    redirect: "/dashboard",
    displayName: "Finance Manager",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_PROCESS,
      PERMISSIONS.REPORTS_VIEW
    ],
    sidebar: ["dashboard", "purchase_orders", "invoices", "reports"],
    dashboard: "finance"
  },
  COMPLIANCE: {
    redirect: "/dashboard",
    displayName: "Compliance Officer",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.VENDOR_APPROVE,
      PERMISSIONS.REPORTS_VIEW
    ],
    sidebar: ["dashboard", "vendors", "reports"],
    dashboard: "compliance"
  },
  MANAGEMENT: {
    redirect: "/dashboard",
    displayName: "Management",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDOR_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.REPORTS_VIEW
    ],
    sidebar: ["dashboard", "vendors", "purchase_orders", "invoices", "reports"],
    dashboard: "management"
  },
  VENDOR: {
    redirect: "/portal/dashboard",
    displayName: "Vendor",
    permissions: [
      PERMISSIONS.VENDOR_DASHBOARD_VIEW,
      PERMISSIONS.PO_VIEW,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_SUBMIT
    ],
    sidebar: ["dashboard", "purchase_orders", "invoices", "settings"],
    dashboard: "vendor"
  }
};
