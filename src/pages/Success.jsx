import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Clock, Ticket } from 'lucide-react';

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const applicationId = location.state?.applicationId || '#VR ' + Math.floor(1000 + Math.random() * 9000) + '-' + new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements similar to the screenshot */}
      <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="100" stroke="#2563EB" strokeWidth="40" strokeOpacity="0.5"/>
          <circle cx="350" cy="350" r="50" fill="#2563EB"/>
          <path d="M100 300 L200 400 M300 200 L400 300" stroke="#2563EB" strokeWidth="20" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 p-10 md:p-16 relative z-10 flex flex-col items-center text-center">
        
        {/* Header (Vendor Registration / Save Draft style header from screenshot) */}
        <div className="absolute top-0 left-0 right-0 w-full flex justify-between items-center px-8 py-6">
          <span className="font-bold text-blue-700">Vendor Registration</span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">Help</span>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Vendor Registration Submitted Successfully</h1>
          
          {/* Subheading */}
          <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
            Our team will verify your information and notify you once your application has been reviewed.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <button 
              onClick={() => navigate('/vendor-login')}
              className="px-6 py-2.5 bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:bg-blue-800 transition-colors"
            >
              Back to Home
            </button>
            <button 
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              View Submission
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mx-auto">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Estimated Wait</p>
                <p className="text-sm font-bold text-slate-900">3-5 Business Days</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Application ID</p>
                <p className="text-sm font-bold text-slate-900">{applicationId}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Success;
