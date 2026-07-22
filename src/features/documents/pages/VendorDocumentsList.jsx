import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ChevronRight, Download, Eye } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function VendorDocumentsList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/documents/vendors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    (v.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.vendor_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.gstin || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Vendors' }]} />
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-on">Vendor Documents</h1>
          <p className="text-surface-on-variant mt-1">Browse onboarding and compliance documents for all vendors.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-on-variant" />
          <input
            type="text"
            placeholder="Search by vendor name, code, or GSTIN..."
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
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Vendor Code</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Vendor Name</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">GSTIN</th>
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
                    Loading vendors...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-on-variant">
                    No vendors found matching your search.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-outline hover:bg-surface-highest transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-surface-on">{vendor.vendor_code}</td>
                    <td className="py-4 px-6 text-sm text-surface-on font-semibold">{vendor.vendor_name}</td>
                    <td className="py-4 px-6 text-sm text-surface-on-variant">{vendor.gstin || '-'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        <FileText className="w-4 h-4 mr-1" />
                        {vendor.total_documents}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/documents/vendors/${vendor.id}`)}
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
