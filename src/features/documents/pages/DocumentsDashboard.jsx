import { Folder, Users, ShoppingCart, Hammer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocumentsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Hammer className="w-12 h-12 text-blue-600" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-4">Under Construction</h1>
      <p className="text-lg text-slate-500 max-w-lg">
        We're currently building a centralized document repository for all enterprise procurement documents. Check back later!
      </p>

      {/* 
      <div className="mb-8 w-full text-left">
        <h1 className="text-3xl font-bold text-surface-on">Document Repository</h1>
        <p className="text-surface-on-variant mt-2">
          Centralized storage for all enterprise procurement documents. Select a category to browse.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div 
          onClick={() => navigate('/documents/vendors')}
          className="bg-surface border border-outline rounded-xl p-8 hover:border-primary hover:shadow-md cursor-pointer transition-all group flex flex-col items-center justify-center text-center h-64"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-surface-on mb-2">Vendors</h2>
          <p className="text-surface-on-variant">
            Browse onboarding documents, registrations, and certifications for all accepted vendors.
          </p>
        </div>

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
      */}
    </div>
  );
}
