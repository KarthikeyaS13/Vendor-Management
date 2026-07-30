import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserCircle, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, getRedirectPath } from '../lib/permissions';
import { PERMISSIONS } from '../config/permissions';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-600 to-slate-50 z-0"></div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-6">
            <span className="text-3xl font-bold text-blue-600">N</span>
          </div> */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Vendor Management
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Enterprise Vendor Lifecycle Management Platform. Securely manage onboarding, purchase orders, and invoices in one place.
          </p>
        </div>

        {/* Single Portal Login */}
        <div className="flex justify-center max-w-xl mx-auto">
          {user ? (
            <div
              onClick={() => {
                navigate(getRedirectPath(user));
              }}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-500 overflow-hidden cursor-pointer flex flex-col p-10 w-full text-center items-center"
            >
              <div className="w-16 h-16 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome Back</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                You are already signed in as {user.email || user.username}. Click below to return to your dashboard.
              </p>
              <div className="flex items-center justify-center w-full bg-green-600 text-white rounded-lg py-3 font-medium group-hover:bg-green-700 transition-colors gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/login')}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-500 overflow-hidden cursor-pointer flex flex-col p-10 w-full text-center items-center"
            >
              <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Sign In to Platform</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                Securely access your personalized dashboard to manage purchase orders, submit invoices, and track payments.
              </p>
              <div className="flex items-center justify-center w-full bg-blue-600 text-white rounded-lg py-3 font-medium group-hover:bg-blue-700 transition-colors gap-2">
                Sign In <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-base text-slate-500 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} powered by <a href="https://finnovo.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700 transition-colors">finnovo<sup className="text-xs">®</sup></a> All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
