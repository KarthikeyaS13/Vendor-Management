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
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Invitations', path: '/invitations', icon: Mail },
  { name: 'Applications', path: '/applications', icon: FileText },
  { name: 'Documents', path: '/documents', icon: FileBox },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const secondaryNavItems = [
  { name: 'Status', path: '/status', icon: Activity },
  { name: 'Help Center', path: '/help', icon: HelpCircle },
];

export default function Sidebar() {
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('companyLogo'));

  useEffect(() => {
    const handleLogoUpdate = () => {
      setLogoUrl(localStorage.getItem('companyLogo'));
    };
    
    window.addEventListener('companyLogoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('companyLogoUpdated', handleLogoUpdate);
  }, []);

  return (
    <aside className="w-64 flex flex-col border-r border-outline bg-surface-lowest shrink-0 md:flex hidden">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-outline">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-md object-contain bg-white" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-on font-bold text-lg">
              V
            </div>
          )}
          <span className="font-semibold text-lg tracking-tight">Vendor Management</span>
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

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-outline space-y-1">
        {secondaryNavItems.map((item) => (
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
      </div>
    </aside>
  );
}
