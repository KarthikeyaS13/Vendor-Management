import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  CreditCard,
  Briefcase,
  CheckCircle2,
  XCircle,
  Ban,
  Activity,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function VendorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('company');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  
  // Credential States
  const [vendorUsername, setVendorUsername] = useState('');
  const [vendorPassword, setVendorPassword] = useState('');
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadVendorData();
  }, [id]);

  const loadVendorData = async () => {
    try {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) throw new Error('Vendor not found');
      const data = await res.json();
      setVendorData(data);
    } catch (err) {
      toast.error('Failed to load vendor profile');
      console.error(err);
      navigate('/vendors');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const res = await fetch(`/api/vendors/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      toast.success(`Vendor status updated to ${newStatus}`);
      setStatusMenuOpen(false);
      loadVendorData(); // Refresh to get new audit log
    } catch (err) {
      toast.error('Failed to update vendor status');
      console.error(err);
    }
  };

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setIsSubmittingCredentials(true);

    try {
      const response = await fetch(`/api/vendors/${id}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: vendorUsername, // Using this field for email in the new architecture
          password: vendorPassword,
          fullName: vendorData.vendor.contact_person
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create credentials');
      }

      toast.success('Vendor credentials created successfully!');
      setCreatedCredentials({ email: vendorUsername, password: vendorPassword });
      setVendorUsername('');
      setVendorPassword('');
      // Optionally reload vendor data to show created accounts if backend returns them
      loadVendorData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vendorData) return null;

  const { vendor, company, business, financial, contacts, documents, auditLogs } = vendorData;

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200/50"><CheckCircle2 className="w-4 h-4" /> Active</span>;
      case 'Inactive':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200/50">Inactive</span>;
      case 'Suspended':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200/50"><Ban className="w-4 h-4" /> Suspended</span>;
      case 'Blacklisted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700 border border-rose-200/50"><XCircle className="w-4 h-4" /> Blacklisted</span>;
      default:
        return null;
    }
  };

  const SectionHeader = ({ id, title, icon: Icon }) => (
    <button 
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-slate-100"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>
      {expandedSection === id ? (
        <ChevronDown className="w-5 h-5 text-slate-400" />
      ) : (
        <ChevronRight className="w-5 h-5 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">

      
      {/* Top Navigation */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/vendors')}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>
      </div>

      {/* Vendor Header Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Building2 className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{vendor.company_name}</h1>
                <StatusBadge status={vendor.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                <span>{vendor.vendor_code}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{vendor.industry || 'Unknown Industry'}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Joined {new Date(vendor.registration_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm transition-all"
            >
              Update Status <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            
            {statusMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-10 py-1">
                {['Active', 'Inactive', 'Suspended', 'Blacklisted'].map(status => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${vendor.status === status ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                  >
                    Set as {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details Accordion */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Company Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader id="company" title="Company Information" icon={Building2} />
            {expandedSection === 'company' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Name</label>
                  <p className="mt-1 text-slate-900 font-medium">{company?.legal_name || vendor.company_name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trade Name</label>
                  <p className="mt-1 text-slate-900 font-medium">{company?.trade_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity Type</label>
                  <p className="mt-1 text-slate-900 font-medium">{company?.entity_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Incorporation</label>
                  <p className="mt-1 text-slate-900 font-medium">{company?.date_of_incorporation ? new Date(company.date_of_incorporation).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Business & Tax Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader id="business" title="Business & Tax Details" icon={Briefcase} />
            {expandedSection === 'business' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Industry Category</label>
                  <p className="mt-1 text-slate-900 font-medium">{business?.industry_category || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Products</label>
                  <p className="mt-1 text-slate-900 font-medium">{business?.primary_products || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Number</label>
                  <p className="mt-1 text-slate-900 font-medium">{business?.gst_number || vendor.gst_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PAN Number</label>
                  <p className="mt-1 text-slate-900 font-medium">{business?.pan_number || vendor.pan_number || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Financial Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader id="financial" title="Bank Details" icon={CreditCard} />
            {expandedSection === 'financial' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name</label>
                  <p className="mt-1 text-slate-900 font-medium">{financial?.bank_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Name</label>
                  <p className="mt-1 text-slate-900 font-medium">{financial?.account_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Number</label>
                  <p className="mt-1 text-slate-900 font-medium">{financial?.account_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">IFSC Code</label>
                  <p className="mt-1 text-slate-900 font-medium uppercase">{financial?.ifsc_code || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader id="documents" title="Uploaded Documents" icon={FileText} />
            {expandedSection === 'documents' && (
              <div className="p-6 bg-slate-50/50">
                {documents && documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.document_type_name || 'Document'}</p>
                            <p className="text-xs text-slate-500 truncate">{doc.file_name}</p>
                          </div>
                        </div>
                        <a 
                          href={doc.file_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-blue-600 rounded-md shadow-sm hover:bg-slate-50 shrink-0"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">No documents available.</p>
                )}
              </div>
            )}
          </div>

          {/* Login Credentials */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-4">
            <SectionHeader id="credentials" title="Login Credentials" icon={Key} />
            {expandedSection === 'credentials' && (
              <div className="p-6 bg-slate-50/50">
                {createdCredentials ? (
                  <div className="bg-white rounded-xl border border-green-200 p-6 shadow-sm relative">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Credentials Created</h3>
                        <p className="text-sm text-slate-500">Share these securely with the vendor</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email / Username</label>
                        <p className="text-sm font-medium text-slate-900">{createdCredentials.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Temporary Password</label>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-slate-900 font-mono bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                            {showPassword ? createdCredentials.password : '••••••••••••'}
                          </p>
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form autoComplete="off" onSubmit={handleCreateCredential} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-800 mb-4">Create Vendor Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={vendorUsername}
                          onChange={(e) => setVendorUsername(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="e.g. vendor@example.com"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password *</label>
                        <input
                          type="password"
                          required
                          value={vendorPassword}
                          onChange={(e) => setVendorPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="Enter temporary password"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button 
                        type="submit" 
                        disabled={isSubmittingCredentials}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmittingCredentials ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Audit Timeline & Quick Info */}
        <div className="space-y-6">
          
          {/* Contact Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-slate-400" /> Primary Contact
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{vendor.contact_person}</p>
                <p className="text-xs text-slate-500 mt-0.5">Account Manager</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 mb-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {vendor.email}
                </a>
                <a href={`tel:${vendor.mobile}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {vendor.mobile || 'No phone provided'}
                </a>
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> Audit Timeline
            </h3>
            
            <div className="space-y-6">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log, index) => {
                  let actionText = log.action.replace(/_/g, ' ');
                  let detailText = '';
                  
                  if (log.action === 'VENDOR_CREATED') {
                    detailText = 'Vendor master record created automatically upon application approval.';
                  } else if (log.action.includes('STATUS_UPDATED')) {
                    try {
                      const newVals = JSON.parse(log.new_values);
                      detailText = `Status changed to ${newVals.status}`;
                    } catch (e) {}
                  }

                  return (
                    <div key={index} className="relative pl-6">
                      {/* Line connecting items */}
                      {index !== auditLogs.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-24px] w-px bg-slate-200"></div>
                      )}
                      
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 w-[19px] h-[19px] rounded-full bg-white border-[3px] border-blue-500 shadow-sm z-10"></div>
                      
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{actionText.toLowerCase()}</p>
                        <p className="text-xs text-slate-400 mt-1 mb-1">{new Date(log.created_at).toLocaleString()}</p>
                        {detailText && <p className="text-xs text-slate-600">{detailText}</p>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 italic">No audit history available.</p>
              )}
              
              {/* Origin Point */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-[19px] h-[19px] rounded-full bg-white border-[3px] border-slate-300 z-10"></div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Application Submitted</p>
                  <p className="text-xs text-slate-400 mt-1">Origin record</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
