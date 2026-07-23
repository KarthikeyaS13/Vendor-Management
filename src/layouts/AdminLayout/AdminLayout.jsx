import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/admin-login');
      } else if (user.role === 'VENDOR') {
        navigate('/portal-login');
      }
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.role === 'VENDOR') {
    return null; // Or some loading spinner
  }

  return (
    <div className="flex h-screen bg-surface-bright overflow-hidden font-sans text-surface-on">
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
  );
}
