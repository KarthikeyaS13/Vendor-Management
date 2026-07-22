import { Folder, Users, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocumentsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-on">Document Repository</h1>
        <p className="text-surface-on-variant mt-2">
          Centralized storage for all enterprise procurement documents. Select a category to browse.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendors Folder */}
        <div 
          onClick={() => navigate('/documents/vendors')}
          className="bg-surface border border-outline rounded-xl p-8 hover:border-primary hover:shadow-md cursor-pointer transition-all group flex flex-col items-center justify-center text-center h-64"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-surface-on mb-2">Vendors</h2>
          <p className="text-surface-on-variant">
            Browse onboarding documents, registrations, and certifications for all approved vendors.
          </p>
        </div>

        {/* Purchase Orders Folder */}
        <div 
          onClick={() => navigate('/documents/purchase-orders')}
          className="bg-surface border border-outline rounded-xl p-8 hover:border-primary hover:shadow-md cursor-pointer transition-all group flex flex-col items-center justify-center text-center h-64"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-surface-on mb-2">Purchase Orders</h2>
          <p className="text-surface-on-variant">
            View generated POs, attached terms, and associated vendor invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
