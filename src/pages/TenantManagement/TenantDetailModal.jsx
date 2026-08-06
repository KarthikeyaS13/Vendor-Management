import React, { useState, useEffect } from 'react';
import { 
  X, Building2, Users, ShoppingCart, Receipt, Shield, 
  Settings, Key, ExternalLink, Calendar, MapPin, Mail, 
  Phone, Hash, DollarSign, HardDrive, CheckCircle, AlertTriangle, 
  Loader2, LogIn
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantDetailModal({ isOpen, onClose, tenantId, onImpersonate, onResetPassword }) {
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTenantDetails();
    } else {
      setTenantData(null);
    }
  }, [isOpen, tenantId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch tenant details');
      }
      setTenantData(data);
    } catch (err) {
      console.error('Error fetching tenant details:', err);
      toast.error(err.message || 'Error loading tenant details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tenant = tenantData?.tenant;
  const metrics = tenantData?.metrics || {};
  const users = tenantData?.users || [];
  const settings = tenantData?.settings;
  const recentAudit = tenantData?.recentAudit || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center border border-indigo-400/30">
              <Building2 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{tenant?.company_name || 'Loading Tenant...'}</h2>
                {tenant && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-900/80 text-indigo-300 border border-indigo-700">
                    {tenant.company_code}
                  </span>
                )}
                {String(tenant?.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Suspended
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Tenant ID: {tenant?.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant && (
              <button
                onClick={() => onImpersonate(tenant)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Log in directly as Tenant Administrator"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login as Tenant
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 px-6 border-b border-slate-100 bg-slate-50/70 shrink-0 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Settings & Numbering
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Audit History ({recentAudit.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading tenant workspace details...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-indigo-700">Internal Users</span>
                      <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.users || 0}</div>
                      <span className="text-[11px] text-slate-500 mt-1">Quota: {tenant?.license_count || 'Unlimited'}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-emerald-700">Active Vendors</span>
                      <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.vendors || 0}</div>
                      <span className="text-[11px] text-slate-500 mt-1">Approved profiles</span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-amber-700">Purchase Orders</span>
                      <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.purchaseOrders || 0}</div>
                      <span className="text-[11px] text-slate-500 mt-1">All lifecycle states</span>
                    </div>
                    <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-sky-700">Invoices Processed</span>
                      <div className="text-2xl font-bold text-slate-900 mt-2">{metrics.invoices || 0}</div>
                      <span className="text-[11px] text-slate-500 mt-1">Total billing records</span>
                    </div>
                  </div>

                  {/* Company Profile Details */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Company Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">Email:</span>
                        <span className="text-slate-900">{tenant?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">Phone:</span>
                        <span className="text-slate-900">{tenant?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">GSTIN / Tax ID:</span>
                        <span className="font-mono text-slate-900 font-semibold">{tenant?.gst_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">Currency / Timezone:</span>
                        <span className="text-slate-900">{tenant?.currency || 'INR'} ({tenant?.timezone || 'Asia/Kolkata'})</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 md:col-span-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-700">Address:</span>
                        <span className="text-slate-900">{tenant?.address || 'No registered physical address specified.'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Admin Card */}
                  <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {users[0]?.username?.substring(0, 2).toUpperCase() || 'AD'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{users[0]?.full_name || users[0]?.username || 'Primary Admin'}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                            TENANT_ADMIN
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{users[0]?.email || 'No email registered'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => onResetPassword(tenant, users[0])}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        Reset Admin Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USERS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                u.role === 'TENANT_ADMIN' 
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                  : u.role === 'PROCUREMENT' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {u.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SETTINGS & NUMBERING */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      Autonomous Document Prefixes & Sequences
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">Purchase Order Prefix</span>
                        <div className="font-mono font-bold text-slate-800 text-sm mt-1">{settings?.po_prefix || 'PO-'}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">Invoice Number Prefix</span>
                        <div className="font-mono font-bold text-slate-800 text-sm mt-1">{settings?.invoice_prefix || 'INV-'}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500 font-medium">Vendor ID Prefix</span>
                        <div className="font-mono font-bold text-slate-800 text-sm mt-1">{settings?.vendor_prefix || 'VEN-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-indigo-600" />
                      Storage & Directory Structure
                    </h3>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700">
                      Isolated Storage Directory: <span className="text-indigo-600 font-semibold">/server/uploads/{tenant?.id}/</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT HISTORY */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  {recentAudit.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                      No recent audit entries logged for this tenant workspace.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentAudit.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{log.action}</span>
                            <span className="text-slate-500 ml-2">by {log.user_email || log.user_name || 'System'}</span>
                          </div>
                          <span className="text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
