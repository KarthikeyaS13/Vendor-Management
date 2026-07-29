import { useState, useEffect } from 'react';
import { ArrowRight, FileText, Users, Clock, ShoppingCart, DollarSign, Activity, AlertCircle, PieChart, BarChart } from 'lucide-react';
import { dashboardService } from '../../../services/dashboardService';
import { Skeleton, ActivitySkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-surface-on">Executive Dashboard</h2>
          <p className="text-surface-on-variant mt-1">Tenant-wide overview of procurement metrics.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-lowest border border-outline rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))
        ) : kpis.error ? (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-surface-lowest border border-outline rounded-xl">
             <ErrorState title="Failed to load KPIs" message={kpis.error} onRetry={loadData} />
          </div>
        ) : kpis.data ? (
          <>
            <KpiCard title="Active Vendors" value={kpis.data.activeVendors} total={kpis.data.totalVendors} icon={Users} color="text-blue-600" bg="bg-blue-100" />
            <KpiCard title="Pending Applications" value={kpis.data.pendingVendorApplications} icon={Clock} color="text-amber-600" bg="bg-amber-100" />
            <KpiCard title="Purchase Orders" value={kpis.data.purchaseOrders} subtitle={\`\${kpis.data.draftPurchaseOrders} Draft / \${kpis.data.issuedPurchaseOrders} Issued\`} icon={ShoppingCart} color="text-green-600" bg="bg-green-100" />
            <KpiCard title="Total Spend (Year)" value={\`$\${Number(kpis.data.thisYearSpend).toLocaleString()}\`} subtitle={\`$\${Number(kpis.data.thisMonthSpend).toLocaleString()} this month\`} icon={DollarSign} color="text-purple-600" bg="bg-purple-100" />
            
            <KpiCard title="Invoice Value" value={\`$\${Number(kpis.data.totalInvoiceValue).toLocaleString()}\`} icon={FileText} color="text-indigo-600" bg="bg-indigo-100" />
            <KpiCard title="Pending Invoices" value={kpis.data.pendingInvoices} icon={AlertCircle} color="text-rose-600" bg="bg-rose-100" />
            <KpiCard title="Outstanding Amount" value={\`$\${Number(kpis.data.outstandingAmount).toLocaleString()}\`} icon={Activity} color="text-orange-600" bg="bg-orange-100" />
            <KpiCard title="Total Payments" value={\`$\${Number(kpis.data.totalPayments).toLocaleString()}\`} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-100" />
          </>
        ) : (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-surface-lowest border border-outline rounded-xl">
             <EmptyState title="No KPIs" description="No key metrics are available at this time." />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Area */}
          <div className="bg-surface-lowest border border-outline rounded-xl shadow-sm p-6 min-h-[350px] flex flex-col">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><BarChart className="w-5 h-5 text-primary"/> Monthly Spend Trend</h3>
            <div className="flex-1 w-full h-[300px]">
              {charts.isLoading ? (
                <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-full h-full rounded-lg" /></div>
              ) : charts.error ? (
                <ErrorState title="Failed to load charts" message={charts.error} onRetry={loadData} />
              ) : charts.data?.monthlySpend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={charts.data.monthlySpend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} tickFormatter={(val) => \`$\${val}\`}/>
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Bar dataKey="spend" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart} title="No Data Available" description="Not enough data to generate trends." />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-outline rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-primary"/> Invoice Status</h3>
              <div className="flex-1 w-full h-[220px]">
                {charts.isLoading ? (
                   <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-48 h-48 rounded-full" /></div>
                ) : charts.data?.invoiceStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={charts.data.invoiceStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {charts.data.invoiceStatus.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
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
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {charts.data.invoiceStatus.map((entry, index) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-xs text-surface-on-variant">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                      {entry.status} ({entry.count})
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-surface-lowest border border-outline rounded-xl p-6 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-primary"/> PO Status</h3>
              <div className="flex-1 w-full h-[220px]">
                {charts.isLoading ? (
                   <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-48 h-48 rounded-full" /></div>
                ) : charts.data?.poStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={charts.data.poStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {charts.data.poStatus.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={PieChart} title="No Data" description="No POs to display." />
                )}
              </div>
              {charts.data?.poStatus?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {charts.data.poStatus.map((entry, index) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-xs text-surface-on-variant">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[(index + 2) % COLORS.length]}}></div>
                      {entry.status} ({entry.count})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activities */}
          <div className="bg-surface-lowest border border-outline rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center">
              <h3 className="text-base font-semibold">Activity Timeline</h3>
            </div>
            <div className="p-6 flex-1">
              {activities.isLoading ? (
                <div className="ml-3 border-l-2 border-outline/50 space-y-6">
                   {Array.from({ length: 4 }).map((_, i) => <ActivitySkeleton key={i} />)}
                </div>
              ) : activities.error ? (
                <ErrorState title="Failed to load activity" message={activities.error} onRetry={loadData} />
              ) : activities.data.length === 0 ? (
                <EmptyState title="No Recent Activities" description="There is no recent activity to show." />
              ) : (
                <div className="relative border-l-2 border-outline/50 ml-3 space-y-6">
                  {activities.data.map((activity) => (
                    <div key={activity.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-lowest border-2 border-primary"></span>
                      <div className="text-sm font-semibold text-surface-on mb-1 leading-relaxed">
                        {activity.action}
                      </div>
                      <div className="text-xs text-surface-on-variant mb-1">
                        {activity.entity_type} #{activity.entity_id}
                      </div>
                      <div className="text-xs font-medium text-surface-on-variant flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, total, icon: Icon, color, bg }) {
  return (
    <div className="bg-surface-lowest border border-outline rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={\`w-12 h-12 rounded-lg flex items-center justify-center \${bg} \${color}\`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-surface-on">
            {value}
            {total !== undefined && <span className="text-sm font-medium text-surface-on-variant ml-1">/ {total}</span>}
          </div>
          <div className="text-sm font-medium text-surface-on-variant mt-1">{title}</div>
          {subtitle && <div className="text-xs text-surface-on-variant/80 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
