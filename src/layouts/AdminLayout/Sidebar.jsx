import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../lib/permissions';
import { PERMISSIONS } from '../../config/permissions';
import { ROLE_CONFIG } from '../../config/roles';
import {
  LayoutDashboard,
  Mail,
  FileBox,
  BarChart3,
  Settings,
  Activity,
  Building2,
  ShoppingCart,
  Receipt,
  Banknote,
  Users,
  ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Dedicated Platform Navigation for SUPER_ADMIN
const platformNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenant Management', path: '/tenants', icon: Building2 },
  { name: 'Platform Users', path: '/platform-users', icon: Users },
  { name: 'Audit Logs', path: '/audit-logs', icon: Activity },
  { name: 'Global Settings', path: '/settings', icon: Settings },
];

// Tenant Business Navigation (for TENANT_ADMIN, PROCUREMENT, FINANCE, etc.)
const tenantNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
  { name: 'Onboarding Vendor', path: '/invitations', icon: Mail, permission: PERMISSIONS.VENDOR_CREATE },
  { name: 'Vendors', path: '/vendors', icon: Building2, permission: PERMISSIONS.VENDOR_VIEW },
  { name: 'Documents', path: '/documents', icon: FileBox, permission: [PERMISSIONS.VENDOR_VIEW, PERMISSIONS.PO_VIEW] },
  { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, permission: PERMISSIONS.PO_VIEW },
  { name: 'Invoices', path: '/invoices', icon: Receipt, permission: PERMISSIONS.INVOICE_VIEW },
  { name: 'Payments', path: '/payments', icon: Banknote, permission: PERMISSIONS.INVOICE_PROCESS },
  { name: 'Reports', path: '/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
  { name: 'Internal Users', path: '/users', icon: Users, permission: PERMISSIONS.USERS_VIEW },
  { name: 'Settings', path: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isSuperAdmin = ROLE_CONFIG[user?.role]?.isPlatformAdmin === true;
  const [logo, setLogo] = useState(localStorage.getItem('companyLogo'));
  const [brandName, setBrandName] = useState(localStorage.getItem('brandName') || (isSuperAdmin ? 'Finnovo Platform' : 'Vendor Management'));

  useEffect(() => {
    const handleLogoUpdate = () => {
      setLogo(localStorage.getItem('companyLogo'));
    };
    
    const handleBrandNameUpdate = () => {
      setBrandName(localStorage.getItem('brandName') || (isSuperAdmin ? 'Finnovo Platform' : 'Vendor Management'));
    };

    window.addEventListener('companyLogoUpdated', handleLogoUpdate);
    window.addEventListener('brandNameUpdated', handleBrandNameUpdate);
    
    // Listen for cross-tab updates too
    window.addEventListener('storage', (e) => {
      if (e.key === 'companyLogo') {
        handleLogoUpdate();
      }
      if (e.key === 'brandName') {
        handleBrandNameUpdate();
      }
    });

    return () => {
      window.removeEventListener('companyLogoUpdated', handleLogoUpdate);
      window.removeEventListener('brandNameUpdated', handleBrandNameUpdate);
    };
  }, [isSuperAdmin]);

  const activeNavItems = isSuperAdmin 
    ? platformNavItems 
    : tenantNavItems.filter(item => hasPermission(user, item.permission));

  return (
    <aside className="w-64 flex flex-col border-r border-outline bg-surface-lowest shrink-0 md:flex hidden">
      {/* Brand */}
      <div className="py-4 flex flex-col items-center justify-center border-b border-outline">
        <div className="flex flex-col items-center gap-1.5 overflow-hidden w-full px-4">
          {logo ? (
            <img src={logo} alt="Logo" className="h-10 object-contain shrink-0 rounded-md" />
          ) : (
            <div className={`w-10 h-10 ${isSuperAdmin ? 'bg-indigo-600' : 'bg-primary'} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0`}>
              {isSuperAdmin ? <ShieldCheck className="w-6 h-6" /> : brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm tracking-tight truncate text-center w-full text-slate-800" title={brandName}>
            {isSuperAdmin ? 'Finnovo Platform' : (user?.companyName || brandName)}
          </span>
          {isSuperAdmin && (
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 uppercase">
              Platform Admin
            </span>
          )}
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 mb-3 px-3 uppercase tracking-wider">
          {isSuperAdmin ? 'Platform Management' : 'Business Operations'}
        </div>
        {activeNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
              isActive
                ? isSuperAdmin 
                  ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                  : "bg-primary-container/10 text-primary font-medium shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-100 text-xs text-slate-400 text-center">
        {isSuperAdmin ? 'FINNOVO Multi-Tenant Core v6.3' : `${user?.companyCode || 'TENANT'} Workspace`}
      </div>
    </aside>
  );
}
