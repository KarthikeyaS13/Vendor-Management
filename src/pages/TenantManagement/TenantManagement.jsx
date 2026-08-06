import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, Shield, Users, 
  ShoppingCart, Receipt, CheckCircle, AlertTriangle, 
  MoreVertical, LogIn, Key, Eye, PauseCircle, PlayCircle, 
  Trash2, RefreshCw, LayoutGrid, List, Sparkles, Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import CreateTenantModal from './CreateTenantModal';
import TenantDetailModal from './TenantDetailModal';
import ResetAdminPasswordModal from './ResetAdminPasswordModal';

export default function TenantManagement() {
  const { user, impersonateTenant } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [resetTenant, setResetTenant] = useState(null);
  const [resetAdminUser, setResetAdminUser] = useState(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const isTenantActive = (t) => (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

  const fetchTenants = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch tenants');
      }

      const rawTenants = data.tenants || [];
      const tenantList = rawTenants.map(t => ({
        ...t,
        users_count: Number(t.users_count) || 0,
        vendors_count: Number(t.vendors_count) || 0,
        pos_count: Number(t.pos_count) || 0,
        invoices_count: Number(t.invoices_count) || 0,
        applications_count: Number(t.applications_count) || 0
      }));
      setTenants(tenantList);
      setStats(data.stats ? {
        totalTenants: Number(data.stats.totalTenants) || 0,
        activeTenants: Number(data.stats.activeTenants) || 0,
        suspendedTenants: Number(data.stats.suspendedTenants) || 0,
        totalUsers: Number(data.stats.totalUsers) || 0
      } : {
        totalTenants: tenantList.length,
        activeTenants: tenantList.filter(t => isTenantActive(t)).length,
        suspendedTenants: tenantList.filter(t => (t.status || '').toUpperCase() === 'SUSPENDED').length,
        totalUsers: tenantList.reduce((acc, t) => acc + (Number(t.users_count) || 0), 0)
      });
    } catch (err) {
      console.error('Error loading tenants:', err);
      toast.error(err.message || 'Error loading tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const currentlyActive = isTenantActive(tenant);
    const newStatus = currentlyActive ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = currentlyActive ? 'Suspending' : 'Activating';
    const toastId = toast.loading(`${actionLabel} workspace for ${tenant.company_name}...`);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success(`Tenant "${tenant.company_name}" is now ${newStatus.toLowerCase()}`, { id: toastId });
      fetchTenants();
    } catch (err) {
      console.error('Status update error:', err);
      toast.error(err.message || 'Failed to update tenant status', { id: toastId });
    }
  };

  const handleImpersonate = async (tenant) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading(`Initiating impersonation for ${tenant.company_name}...`);

    try {
      const response = await fetch(`/api/tenants/${tenant.id}/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate impersonation session');
      }

      toast.success(`Now logged in as Tenant Admin (${data.user.email})`, { id: toastId });
      impersonateTenant(data.user, data.token);
    } catch (err) {
      console.error('Impersonation error:', err);
      toast.error(err.message || 'Could not impersonate tenant', { id: toastId });
    }
  };

  const handleOpenReset = (tenant, admin = null) => {
    setResetTenant(tenant);
    setResetAdminUser(admin);
    setIsResetOpen(true);
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.gst_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' ? isTenantActive(t) : !isTenantActive(t));
      
    const matchesPlan = planFilter === 'ALL' || t.subscription_plan?.toLowerCase() === planFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Management</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Platform Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Provision, monitor, and manage isolated enterprise customer workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTenants}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh tenants"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tenant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tenants</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTenants}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Companies Onboarded</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Workspaces</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeTenants}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Operating smoothly</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suspended</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.suspendedTenants}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Access paused</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Users</span>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.totalUsers}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Across all tenants</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, View Modes */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, code, GST..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>



          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Data Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading tenant companies...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Tenants Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL'
              ? 'No tenants match your search criteria. Try clearing some filters.'
              : 'Get started by creating your first isolated tenant workspace.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Tenant</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTenants.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                      {t.company_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1" title={t.company_name}>
                        {t.company_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                          {t.company_code}
                        </span>
                        <span className="text-xs text-slate-400">
                          {t.country || 'India'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isTenantActive(t) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Suspended
                    </span>
                  )}
                </div>

                {/* Subscription Tier Pill */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Subscription:</span>
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                    {t.subscription_plan || 'Starter'}
                  </span>
                </div>

                {/* Metrics Mini-Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-center">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Users</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{t.users_count || t.user_count || 0}</div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-xs text-slate-400 font-medium">Vendors</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{t.vendors_count || t.vendor_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">POs</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{t.pos_count || t.po_count || 0}</div>
                  </div>
                </div>

                {/* Primary Admin Info */}
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div className="truncate">
                    <span className="font-medium text-slate-700">Admin:</span> {t.admin_username || t.admin_name || t.admin_email || 'Not provisioned'}
                  </div>
                  {t.admin_email && (
                    <div className="text-slate-400 truncate">{t.admin_email}</div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedTenantId(t.id);
                    setIsDetailOpen(true);
                  }}
                  className="flex-1 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  View Details
                </button>

                <button
                  onClick={() => handleImpersonate(t)}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                  title="Log in directly as Tenant Administrator"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login As
                </button>

                <button
                  onClick={() => handleToggleStatus(t)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isTenantActive(t)
                      ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                      : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                  }`}
                  title={isTenantActive(t) ? 'Suspend Tenant Access' : 'Reactivate Tenant Access'}
                >
                  {isTenantActive(t) ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-4 py-4">Code</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Tier</th>
                  <th className="px-4 py-4">Users</th>
                  <th className="px-4 py-4">Vendors</th>
                  <th className="px-4 py-4">POs</th>
                  <th className="px-4 py-4">Primary Admin</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{t.company_name}</div>
                      <div className="text-xs text-slate-400">{t.email || t.country || 'India'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {t.company_code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isTenantActive(t) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {t.subscription_plan || 'Starter'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{t.users_count || t.user_count || 0}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{t.vendors_count || t.vendor_count || 0}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{t.pos_count || t.po_count || 0}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{t.admin_username || t.admin_name || t.admin_email || '—'}</div>
                      <div className="text-slate-400">{t.admin_email}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTenantId(t.id);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleImpersonate(t)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1"
                          title="Login As Tenant Admin"
                        >
                          <LogIn className="w-3 h-3" />
                          Login As
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isTenantActive(t)
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isTenantActive(t) ? 'Suspend Tenant' : 'Activate Tenant'}
                        >
                          {isTenantActive(t) ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTenantModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTenantCreated={() => fetchTenants()}
      />

      <TenantDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTenantId(null);
        }}
        tenantId={selectedTenantId}
        onImpersonate={(tenant) => {
          setIsDetailOpen(false);
          handleImpersonate(tenant);
        }}
        onResetPassword={(tenant, admin) => {
          setIsDetailOpen(false);
          handleOpenReset(tenant, admin);
        }}
      />

      <ResetAdminPasswordModal
        isOpen={isResetOpen}
        onClose={() => {
          setIsResetOpen(false);
          setResetTenant(null);
          setResetAdminUser(null);
        }}
        tenant={resetTenant}
        adminUser={resetAdminUser}
      />
    </div>
  );
}
