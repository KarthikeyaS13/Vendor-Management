import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, RefreshCw, Calendar, 
  Building2, User, Shield, ArrowUpRight, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/platform/audit-logs?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch audit logs');
      }
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast.error(err.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeClass = (action) => {
    if (action.includes('IMPERSONAT')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('TENANT_STATUS')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('CREATE_TENANT') || action.includes('PROVISION')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (action.includes('CREATE') || action.includes('APPROVED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Audit Trail</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Immutable Log
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time compliance ledger tracking platform-wide mutations, tenant actions, and administrative logins.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium w-full sm:w-auto"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE_TENANT">Create Tenant</option>
            <option value="TENANT_STATUS_CHANGE">Tenant Status Change</option>
            <option value="IMPERSONATION_LOGIN">Impersonation Login</option>
            <option value="TENANT_ADMIN_PASSWORD_RESET">Password Reset</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading audit events...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-4 py-4">Actor</th>
                  <th className="px-4 py-4">Tenant Scope</th>
                  <th className="px-4 py-4">Details / Entity</th>
                  <th className="px-5 py-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{log.user_name || log.user_email || 'System'}</div>
                      <div className="text-xs text-slate-400">{log.user_email}</div>
                    </td>
                    <td className="px-4 py-4">
                      {log.tenant_name ? (
                        <span className="font-medium text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                          {log.tenant_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Platform Global</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 font-mono">
                      {log.entity_type ? `${log.entity_type}: ${log.entity_id || 'N/A'}` : 'Platform Action'}
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
