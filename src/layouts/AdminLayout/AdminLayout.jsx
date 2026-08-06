import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, ArrowLeftCircle } from 'lucide-react';

export default function AdminLayout() {
  const { user, isImpersonating, exitImpersonation } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-surface-bright overflow-hidden font-sans text-surface-on">
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 font-medium px-4 py-2 flex items-center justify-between text-sm shadow-md z-50 shrink-0 border-b border-amber-600">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-900 animate-pulse" />
            <span>
              <strong>Platform Impersonation Mode:</strong> Currently managing tenant <strong>{user?.companyName || 'Tenant'}</strong> as <em>{user?.username}</em> ({user?.email})
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="flex items-center gap-1.5 bg-slate-950 text-white hover:bg-slate-800 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeftCircle className="w-4 h-4" />
            Exit Impersonation
          </button>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-surface-bright p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
