import React, { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';

const VendorDetailsSlideOver = ({ isOpen, onClose, applicationData, onApprove, onReject }) => {
  const [activeTab, setActiveTab] = useState('Invitation Details');

  if (!isOpen) return null;

  const { invitation, application, company, business, financial } = applicationData || {};

  const tabs = [
    'Invitation Details',
    'Company Details',
    'Tax Details',
    'Bank Details',
    'History'
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return 'text-blue-600 bg-blue-100';
      case 'APPROVED':
      case 'Completed':
        return 'text-emerald-600 bg-emerald-100';
      case 'REJECTED':
        return 'text-rose-600 bg-rose-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const currentStatus = application?.status || invitation?.status || 'Pending';

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 max-w-4xl w-full flex">
        <div className="w-full h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {company?.legal_name || invitation?.companyName || 'Vendor Application'}
              </h2>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {application && application.status === 'SUBMITTED' && (
                <>
                  <button onClick={onApprove} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={onReject} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-sm font-medium rounded-md hover:bg-rose-700">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reg No Bar */}
          {application && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold text-slate-700">Reg No: </span>
                <span className="font-bold text-blue-700">{application.application_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Completion</span>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-full"></div>
                </div>
                <span className="text-xs font-bold text-slate-700">100%</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-slate-200 px-6 mt-4">
            <nav className="flex space-x-6">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'Invitation Details' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Invitation Info</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
                    <p className="mt-1 text-slate-900 font-medium">{invitation?.companyName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Person</label>
                    <p className="mt-1 text-slate-900 font-medium">{invitation?.contactPerson}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                    <p className="mt-1 text-slate-900 font-medium">{invitation?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile</label>
                    <p className="mt-1 text-slate-900 font-medium">{invitation?.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invitation Date</label>
                    <p className="mt-1 text-slate-900 font-medium">{new Date(invitation?.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                    <p className="mt-1 text-slate-900 font-medium">{new Date(invitation?.expires_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Company Details' && company && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Company Profile</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Name</label>
                    <p className="mt-1 text-slate-900 font-medium">{company?.legal_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trade Name</label>
                    <p className="mt-1 text-slate-900 font-medium">{company?.trade_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity Type</label>
                    <p className="mt-1 text-slate-900 font-medium">{company?.entity_type}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Incorporation</label>
                    <p className="mt-1 text-slate-900 font-medium">{new Date(company?.date_of_incorporation).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Website</label>
                    <p className="mt-1 text-blue-600 font-medium hover:underline cursor-pointer">{company?.website || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address (Placeholder)</label>
                    <p className="mt-1 text-slate-900 font-medium">123 Business Avenue, Tech Park, City, Country</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Tax Details' && business && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Tax & Business Data</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Number</label>
                    <p className="mt-1 text-slate-900 font-medium">{business?.gst_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PAN Number</label>
                    <p className="mt-1 text-slate-900 font-medium">{business?.pan_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Industry Category</label>
                    <p className="mt-1 text-slate-900 font-medium">{business?.industry_category}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Regions</label>
                    <p className="mt-1 text-slate-900 font-medium">{business?.service_regions || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Products/Services</label>
                    <p className="mt-1 text-slate-900 font-medium">{business?.primary_products || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Bank Details' && financial && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Financial Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name</label>
                    <p className="mt-1 text-slate-900 font-medium">{financial?.bank_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Name</label>
                    <p className="mt-1 text-slate-900 font-medium">{financial?.account_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Number</label>
                    <p className="mt-1 text-slate-900 font-medium">{financial?.account_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">IFSC Code</label>
                    <p className="mt-1 text-slate-900 font-medium uppercase">{financial?.ifsc_code}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currency</label>
                    <p className="mt-1 text-slate-900 font-medium">{financial?.currency}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'History' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                 <div className="text-center py-12 text-slate-500">
                    <p>Audit history will be displayed here.</p>
                 </div>
              </div>
            )}

            {/* Empty States for missing tabs */}
            {!company && activeTab === 'Company Details' && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">Company details have not been submitted yet.</div>
            )}
            {!business && activeTab === 'Tax Details' && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">Tax details have not been submitted yet.</div>
            )}
            {!financial && activeTab === 'Bank Details' && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">Bank details have not been submitted yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetailsSlideOver;
