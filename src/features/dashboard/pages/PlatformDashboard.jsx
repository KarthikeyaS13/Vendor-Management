import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShoppingCart, Receipt, IndianRupee, 
  Activity, Shield, CheckCircle2, TrendingUp, AlertTriangle, 
  ArrowUpRight, Clock, Plus, ExternalLink, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PlatformDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const fetchPlatformData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [statsRes, tenantsRes, auditRes] = await Promise.all([
        fetch('/api/platform/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tenants', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/platform/audit-logs?limit=8', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [statsData, tenantsData, auditData] = await Promise.all([
        statsRes.json(),
        tenantsRes.json(),
        auditRes.json()
      ]);

      if (statsData.success) setMetrics(statsData.stats);
      if (tenantsData.success) setTenants(tenantsData.tenants || []);
      if (auditData.success) setAuditLogs(auditData.logs || []);
    } catch (err) {
      console.error('Platform data error:', err);
      toast.error('Failed to load platform dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              SUPER_ADMIN
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your platform, users, and overall activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPlatformData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/tenants"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Tenants</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Companies</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalTenants ?? metrics?.tenants?.total ?? 0}</div>
            <span className="text-xs text-emerald-600 font-medium mt-0.5 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {metrics?.activeTenants ?? metrics?.tenants?.active ?? 0} Active companies
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Internal Users */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Users</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalUsers ?? metrics?.users?.total ?? 0}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Across all tenants
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Ecosystem Vendors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vendors</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalVendors ?? metrics?.vendors?.total ?? 0}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Verified Vendors
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Platform Transaction Volume */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spend</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(metrics?.totalPlatformSpend ?? metrics?.procurement?.totalSpend)}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              {metrics?.totalPOs ?? metrics?.procurement?.purchaseOrders ?? 0} Total POs
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Tenants & Live Platform Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Enterprise Tenants Overview (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Companies</h2>
            </div>
            <Link
              to="/tenants"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All ({tenants.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {tenants.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No tenants provisioned yet.
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-slate-50/70 border-2 border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {t.company_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{t.company_name}</span>
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                            {t.company_code}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Admin: {t.admin_name || t.admin_username || t.admin_email || 'Not configured'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-end text-xs">
                        <span className="font-semibold text-slate-800">{t.users_count ?? t.user_count ?? 0} Users</span>
                        <span className="text-slate-400">{t.vendors_count ?? t.vendor_count ?? 0} Vendors</span>
                      </div>
                      {String(t.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Platform Audit Feed (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Activity Log</h2>
            </div>
            <Link
              to="/audit-logs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              All Logs
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[420px] space-y-3">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No recent activity logged.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-500 truncate">
                    {log.user_name || log.user_email || 'Platform System'} {log.tenant_name ? `• ${log.tenant_name}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
