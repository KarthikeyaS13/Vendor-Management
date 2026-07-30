import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../lib/permissions';
import { PERMISSIONS } from '../config/permissions';
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
  EyeOff,
  Pencil,
  Save,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function VendorProfile() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('company');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  
  // Company Edit States
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    trade_name: '',
    entity_type: '',
    address: '',
    city: '',
    state: '',
    contact_person: '',
    email: '',
    mobile: ''
  });

  // Credential States
  const [vendorUsername, setVendorUsername] = useState('');
  const [vendorPassword, setVendorPassword] = useState('');
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadVendorData();
  }, [id]);

  useEffect(() => {
    if (vendorData) {
      const email = vendorData.contacts?.[0]?.email || vendorData.company?.email || '';
      setVendorUsername(email);
      if (email && email.length >= 4) {
        setVendorPassword(`${email.substring(0, 4)}2026`);
      }
    }
  }, [vendorData]);

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

  const handleStartEditCompany = () => {
    setCompanyForm({
      company_name: company?.legal_name || vendor.company_name || '',
      trade_name: company?.trade_name || '',
      entity_type: company?.entity_type || '',
      address: company?.address || '',
      city: company?.city || '',
      state: company?.state || '',
      contact_person: company?.contact_person || vendor.contact_person || '',
      email: company?.email || vendor.email || '',
      mobile: vendor.mobile || ''
    });
    setIsEditingCompany(true);
    setExpandedSection('company');
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company information');

      toast.success('Company & contact information updated successfully!');
      setIsEditingCompany(false);
      loadVendorData();
    } catch (err) {
      toast.error(err.message);
      console.error(err);
    } finally {
      setIsSavingCompany(false);
    }
  };

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

  const SectionHeader = ({ id, title, icon: Icon, action }) => (
    <div className="w-full flex items-center justify-between p-4 bg-white border-b border-slate-100">
      <button 
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="flex items-center gap-3 text-left flex-1"
      >
        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-900">{title}</span>
      </button>
      <div className="flex items-center gap-3">
        {action}
        <button onClick={() => setExpandedSection(expandedSection === id ? null : id)}>
          {expandedSection === id ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>
    </div>
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

          {hasPermission(user, PERMISSIONS.VENDOR_EDIT) && (
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details Accordion */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Company Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <SectionHeader 
              id="company" 
              title="Company Information" 
              icon={Building2} 
              action={
                !isEditingCompany && hasPermission(user, PERMISSIONS.VENDOR_EDIT) ? (
                  <button 
                    onClick={handleStartEditCompany}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : null
              }
            />
            {expandedSection === 'company' && (
              isEditingCompany ? (
                <form onSubmit={handleSaveCompany} className="p-6 bg-slate-50/50 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Legal Name *</label>
                      <input 
                        type="text" 
                        required
                        value={companyForm.company_name}
                        onChange={(e) => setCompanyForm({...companyForm, company_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Trade Name</label>
                      <input 
                        type="text" 
                        value={companyForm.trade_name}
                        onChange={(e) => setCompanyForm({...companyForm, trade_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Entity Type</label>
                      <input 
                        type="text" 
                        value={companyForm.entity_type}
                        onChange={(e) => setCompanyForm({...companyForm, entity_type: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="e.g. Private Limited, Proprietorship"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Contact Person *</label>
                      <input 
                        type="text" 
                        required
                        value={companyForm.contact_person}
                        onChange={(e) => setCompanyForm({...companyForm, contact_person: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <p className="text-[11px] text-blue-600 mt-1">All future notifications & portal logins will use this email.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Mobile Number</label>
                      <input 
                        type="text" 
                        value={companyForm.mobile}
                        onChange={(e) => setCompanyForm({...companyForm, mobile: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Street Address</label>
                        <input 
                          type="text" 
                          value={companyForm.address}
                          onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">City</label>
                        <input 
                          type="text" 
                          value={companyForm.city}
                          onChange={(e) => setCompanyForm({...companyForm, city: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">State</label>
                        <input 
                          type="text" 
                          value={companyForm.state}
                          onChange={(e) => setCompanyForm({...companyForm, state: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingCompany(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSavingCompany}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" /> {isSavingCompany ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
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

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</label>
                    <p className="mt-1 text-slate-900 font-medium">
                      {company?.address ? `${company.address}${company.city ? `, ${company.city}` : ''}${company.state ? `, ${company.state}` : ''}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Person</label>
                    <p className="mt-1 text-slate-900 font-medium">{company?.contact_person || vendor.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                    <p className="mt-1 text-slate-900 font-medium">{company?.email || vendor.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                    <p className="mt-1 text-slate-900 font-medium">{vendor.mobile || 'N/A'}</p>
                  </div>
                </div>
              )
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
