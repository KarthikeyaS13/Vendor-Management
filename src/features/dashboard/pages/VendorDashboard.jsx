import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ShoppingCart, FileText, IndianRupee, AlertCircle, Activity, CheckCircle2, PieChart } from 'lucide-react';
import { dashboardService } from '../../../services/dashboardService';
import { Skeleton, ActivitySkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function VendorDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({ data: null, isLoading: true, error: null });
  const [charts, setCharts] = useState({ data: null, isLoading: true, error: null });
  const [activities, setActivities] = useState({ data: [], isLoading: true, error: null });

  const loadData = () => {
    // Fetch KPIs
    setKpis(prev => ({ ...prev, isLoading: true, error: null }));
    dashboardService.getKpis()
      .then(data => setKpis({ data, isLoading: false, error: null }))
      .catch(err => setKpis({ data: null, isLoading: false, error: err.message }));

    // Fetch Charts
    setCharts(prev => ({ ...prev, isLoading: true, error: null }));
    dashboardService.getCharts()
      .then(data => setCharts({ data, isLoading: false, error: null }))
      .catch(err => setCharts({ data: null, isLoading: false, error: err.message }));

    // Fetch Activities
    setActivities(prev => ({ ...prev, isLoading: true, error: null }));
    dashboardService.getActivity(5)
      .then(data => setActivities({ data: data || [], isLoading: false, error: null }))
      .catch(err => setActivities({ data: [], isLoading: false, error: err.message }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.username}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : kpis.error ? (
          <div className="col-span-full">
            <ErrorState title="Failed to load KPIs" message={kpis.error} onRetry={loadData} />
          </div>
        ) : kpis.data ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Purchase Orders</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpis.data.purchaseOrders}</h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Invoices</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpis.data.pendingInvoices}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Outstanding Value</p>
                <h3 className="text-2xl font-bold text-slate-900">₹{Number(kpis.data.outstandingAmount || 0).toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Paid Invoices</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpis.data.paidInvoices}</h3>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[300px] flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Status</h2>
            <div className="flex-1 w-full h-[250px]">
              {charts.isLoading ? (
                 <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-48 h-48 rounded-full" /></div>
              ) : charts.data?.invoiceStatus?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={charts.data.invoiceStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {charts.data.invoiceStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={PieChart} title="No Data" description="No invoices to display." />
              )}
            </div>
            {charts.data?.invoiceStatus?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {charts.data.invoiceStatus.map((entry, index) => (
                  <div key={entry.status} className="flex items-center gap-1.5 text-sm text-slate-500">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    {entry.status} ({entry.count})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            {activities.isLoading ? (
              <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => <ActivitySkeleton key={i} />)}
              </div>
            ) : activities.error ? (
              <ErrorState title="Failed to load activity" message={activities.error} onRetry={loadData} />
            ) : activities.data.length === 0 ? (
              <div className="text-slate-500 flex flex-col items-center justify-center py-8">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p>No recent activity to display.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                {activities.data.map((activity) => (
                  <div key={activity.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500"></span>
                    <div className="text-sm font-semibold text-slate-900 mb-1 leading-relaxed">
                      {activity.action}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">
                      {activity.entity_type} #{activity.entity_id}
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
