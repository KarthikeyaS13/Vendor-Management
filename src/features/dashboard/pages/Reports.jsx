import { useState } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import { FileText, Download, Filter, Search } from 'lucide-react';
import { Skeleton, TableRowSkeleton } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function Reports() {
  const [reportType, setReportType] = useState('vendors');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      let resData = [];
      if (reportType === 'vendors') {
        resData = await dashboardService.getVendorsReport(filters);
      } else if (reportType === 'purchase-orders') {
        resData = await dashboardService.getPurchaseOrdersReport(filters);
      } else if (reportType === 'invoices') {
        resData = await dashboardService.getInvoicesReport(filters);
      }
      setData(resData || []);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(val => \`"\${val || ''}"\`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", \`\${reportType}-report.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-surface-on">Reports & Analytics</h2>
          <p className="text-surface-on-variant mt-1">Generate comprehensive system reports.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            disabled={data.length === 0 || isLoading}
            className="bg-white border border-outline hover:bg-surface-hover text-surface-on px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-surface-lowest border border-outline rounded-xl p-6 shadow-sm">
        <form onSubmit={generateReport} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-md border border-outline p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest">
              <option value="vendors">Vendors Report</option>
              <option value="purchase-orders">Purchase Orders Report</option>
              <option value="invoices">Invoices Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Status Filter</label>
            <input 
              type="text" 
              placeholder="e.g. Active, Paid"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full rounded-md border border-outline p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Date From</label>
            <input 
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full rounded-md border border-outline p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-on mb-1">Date To</label>
            <input 
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full rounded-md border border-outline p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest"
            />
          </div>
          <div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-on px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm inline-flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> Generate
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface-lowest border border-outline rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState title="Report Generation Failed" message={error} onRetry={generateReport} />
            </div>
          ) : data.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={FileText} title="No Data" description="Adjust filters and generate a report to see results here." />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-xs uppercase font-semibold text-surface-on-variant">
                <tr>
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="px-6 py-3 border-b border-outline">{key.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-surface/50 transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-6 py-3 text-surface-on">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3 border-t border-outline bg-surface text-sm text-surface-on-variant">
          Total Records: {data.length}
        </div>
      </div>
    </div>
  );
}
