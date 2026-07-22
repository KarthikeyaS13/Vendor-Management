import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-600 to-slate-50 z-0"></div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-6">
            <span className="text-3xl font-bold text-blue-600">N</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Nexus Procurement
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Enterprise Vendor Lifecycle Management Platform. Securely manage onboarding, purchase orders, and invoices in one place.
          </p>
        </div>

        {/* Portals Selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Vendor Portal Card */}
          <div 
            onClick={() => navigate('/portal-login')}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-500 overflow-hidden cursor-pointer flex flex-col p-8"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vendor Portal</h2>
            <p className="text-slate-500 mb-8 flex-1">
              Access your personalized dashboard to view purchase orders, submit invoices, and track payments.
            </p>
            <div className="flex items-center text-blue-600 font-medium group-hover:gap-3 gap-2 transition-all">
              Login to Portal <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Admin Portal Card */}
          <div 
            onClick={() => navigate('/admin-login')}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-800 overflow-hidden cursor-pointer flex flex-col p-8"
          >
            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Staff Portal</h2>
            <p className="text-slate-500 mb-8 flex-1">
              Internal access for Procurement and Finance teams to manage vendors, approve invoices, and track analytics.
            </p>
            <div className="flex items-center text-slate-700 font-medium group-hover:gap-3 gap-2 transition-all">
              Staff Login <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Nexus Procurement Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
