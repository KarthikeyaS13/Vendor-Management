import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  FileText,
  FileBox,
  BarChart3,
  Settings,
  HelpCircle,
  Activity,
  Building2,
  ShoppingCart,
  Receipt,
  Banknote
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Onboarding Vendor', path: '/invitations', icon: Mail },
  // { name: 'Applications', path: '/applications', icon: FileText },
  { name: 'Vendors', path: '/vendors', icon: Building2 },
  { name: 'Documents', path: '/documents', icon: FileBox },
  { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Payments', path: '/payments', icon: Banknote },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];



export default function Sidebar() {
  const [logo, setLogo] = useState(localStorage.getItem('companyLogo'));
  const [brandName, setBrandName] = useState(localStorage.getItem('brandName') || 'Vendor Management');

  useEffect(() => {
    const handleLogoUpdate = () => {
      setLogo(localStorage.getItem('companyLogo'));
    };
    
    const handleBrandNameUpdate = () => {
      setBrandName(localStorage.getItem('brandName') || 'Vendor Management');
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
  }, []);

  return (
    <aside className="w-64 flex flex-col border-r border-outline bg-surface-lowest shrink-0 md:flex hidden">
      {/* Brand */}
      <div className="py-4 flex flex-col items-center justify-center border-b border-outline">
        <div className="flex flex-col items-center gap-1 overflow-hidden w-full px-4">
          {logo ? (
            <img src={logo} alt="Logo" className="h-12 object-contain shrink-0 rounded-md" />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-on font-bold text-2xl shrink-0">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm tracking-tight truncate text-center w-full" title={brandName}>{brandName}</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-surface-on-variant mb-4 px-2 uppercase tracking-widest">
          Main Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-primary-container/10 text-primary font-medium"
                : "text-surface-on-variant hover:bg-surface-container hover:text-surface-on"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}
