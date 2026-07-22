import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ChevronRight, Calendar } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function PODocumentsList() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await fetch('/api/documents/purchase-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
      setPos(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPOs = pos.filter(p => 
    (p.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Purchase Orders' }]} />
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-on">Purchase Order Documents</h1>
          <p className="text-surface-on-variant mt-1">Browse documents related to purchase orders and invoices.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-on-variant" />
          <input
            type="text"
            placeholder="Search by PO Number, Vendor, or Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-outline rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-lowest border-b border-outline">
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">PO Number</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Vendor</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">PO Date</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Status</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant text-center">Total Documents</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-on-variant">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-on-variant">
                    No purchase orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="border-b border-outline hover:bg-surface-highest transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-surface-on">{po.po_number}</td>
                    <td className="py-4 px-6 text-sm text-surface-on font-semibold">{po.vendor_name}</td>
                    <td className="py-4 px-6 text-sm text-surface-on-variant">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 opacity-50" />
                        {formatDate(po.po_date)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        po.status === 'Draft' ? 'bg-gray-100 text-gray-800' : 
                        po.status === 'Issued' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        <FileText className="w-4 h-4 mr-1" />
                        {po.total_documents}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/documents/purchase-orders/${po.id}`)}
                        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark"
                      >
                        View Documents
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
