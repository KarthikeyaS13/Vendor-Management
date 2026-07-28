import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Building2,
  MapPin,
  UploadCloud,
  Save,
  Key,
  Globe,
  Mail,
  List,
  Plus,
  Trash2
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  // Upload state
  const fileInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('companyLogo') || null);
  const [signaturePreview, setSignaturePreview] = useState(localStorage.getItem('companySignature') || null);

  useEffect(() => {
    // Other setup if needed
  }, []);



  const [formData, setFormData] = useState({
    brandName: localStorage.getItem('brandName') || 'Finnovo',
    companyAddress: localStorage.getItem('companyAddress') || '123 Business Avenue, Tech District',
    location: localStorage.getItem('location') || 'Mumbai, India',
    companyPan: localStorage.getItem('companyPan') || '',
    companyGst: localStorage.getItem('companyGst') || '',
    autoAccept: false,
    emailNotifications: true,
  });

  const [mailData, setMailData] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    fromName: ''
  });

  const [vendorOptions, setVendorOptions] = useState({
    vendorType: [],
    vendorCategory: []
  });
  const [newOption, setNewOption] = useState({ category: 'vendorType', value: '' });
  const [poConfig, setPoConfig] = useState({ prefix: 'PO', nextNumber: 1, padding: 3 });
  const [currentPoInput, setCurrentPoInput] = useState('000');

  useEffect(() => {
    // Fetch Mail Settings
    fetch('/api/settings/mail')
      .then(res => res.json())
      .then(data => setMailData(data))
      .catch(err => console.error('Failed to fetch mail settings', err));

    fetchOptions();
    fetchPoConfig();
  }, []);

  const fetchPoConfig = async () => {
    try {
      const res = await fetch('/api/settings/config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.poConfig) {
          setPoConfig(data.poConfig);
          const currNum = Math.max(0, data.poConfig.nextNumber - 1);
          setCurrentPoInput(String(currNum).padStart(data.poConfig.padding, '0'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch PO config', err);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/settings/options', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVendorOptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch vendor options', err);
    }
  };

  const handleAddOption = async (e) => {
    e.preventDefault();
    if (!newOption.value.trim()) return;

    try {
      const res = await fetch('/api/settings/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(newOption)
      });
      if (res.ok) {
        toast.success('Option added successfully');
        setNewOption({ ...newOption, value: '' });
        fetchOptions();
      } else {
        toast.error('Failed to add option (might be a duplicate)');
      }
    } catch (err) {
      toast.error('Network error while adding option');
    }
  };

  const handleSavePoConfig = async (e) => {
    e.preventDefault();
    try {
      const configToSave = {
        prefix: poConfig.prefix,
        padding: poConfig.padding,
        nextNumber: parseInt(currentPoInput || '0', 10) + 1
      };
      const res = await fetch('/api/settings/config/poConfig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ value: configToSave })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('PO Format configured successfully');
      } else {
        toast.error(data.error || 'Failed to save PO format');
      }
    } catch (err) {
      toast.error('Error saving PO format');
    }
  };

  const handleDeleteOption = async (id) => {
    try {
      const res = await fetch(`/api/settings/options/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success('Option deleted successfully');
        fetchOptions();
      } else {
        toast.error('Failed to delete option');
      }
    } catch (err) {
      toast.error('Network error while deleting option');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (activeTab === 'general') {
      const panValue = formData.companyPan.trim().toUpperCase();
      const gstValue = formData.companyGst.trim().toUpperCase();

      // Validate PAN
      if (!panValue) {
        toast.error('Please enter a valid PAN number.');
        return;
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panValue)) {
        toast.error('Please enter a valid PAN number.');
        return;
      }

      // Validate GSTIN
      if (!gstValue) {
        toast.error('Please enter a valid GSTIN.');
        return;
      }
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      if (!gstRegex.test(gstValue)) {
        toast.error('Please enter a valid GSTIN.');
        return;
      }

      // Cross validate GST with PAN
      if (gstValue.substring(2, 12) !== panValue) {
        toast.error('PAN does not match the GSTIN.');
        return;
      }

      localStorage.setItem('brandName', formData.brandName);
      localStorage.setItem('companyAddress', formData.companyAddress);
      localStorage.setItem('location', formData.location);
      localStorage.setItem('companyPan', panValue);
      localStorage.setItem('companyGst', gstValue);
      window.dispatchEvent(new Event('brandNameUpdated'));
      toast.success('Settings saved successfully!');
    } else if (activeTab === 'mail') {
      try {
        const response = await fetch('/api/settings/mail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mailData)
        });
        if (response.ok) {
          toast.success('Mail configuration saved successfully!');
        } else {
          toast.error('Failed to save mail configuration.');
        }
      } catch (err) {
        toast.error('Network error saving mail configuration.');
      }
    } else {
      toast.success('Settings saved successfully!');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        localStorage.setItem('companyLogo', reader.result);
        window.dispatchEvent(new Event('companyLogoUpdated'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
        localStorage.setItem('companySignature', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your brand, company profile, and vendor workflows.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Building2 className="w-4 h-4" />
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Key className="w-4 h-4" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('mail')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'mail' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Mail className="w-4 h-4" />
              Mail Configuration
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'options' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <List className="w-4 h-4" />
              Reference Master
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Branding & Profile</h2>

              <div className="space-y-4 max-w-2xl">
                {/* Logo and Signature Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                          <UploadCloud className="w-4 h-4" />
                          Upload Logo
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Recommended: 400x400px</p>
                      </div>
                    </div>
                  </div>

                  {/* Signature Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Authorized Signature</label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {signaturePreview ? (
                          <img src={signaturePreview} alt="Authorized Signature" className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                          <span className="text-xs text-slate-400">No Signature</span>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          ref={signatureInputRef}
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current.click()}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                          <UploadCloud className="w-4 h-4" />
                          Upload Signature
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Clear background (PNG) preferred</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Legal Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.companyAddress}
                        onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Location / Region</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Permanent Account Number (PAN) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        maxLength="10"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        value={formData.companyPan}
                        onChange={(e) => setFormData({ ...formData, companyPan: e.target.value.trim().toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="29ABCDE1234F1Z5"
                        maxLength="15"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        value={formData.companyGst}
                        onChange={(e) => setFormData({ ...formData, companyGst: e.target.value.trim().toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSave} className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h2>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your new password"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Update Password
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'mail' && (
            <form onSubmit={handleSave} className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Mail Configuration</h2>
              <p className="text-sm text-slate-500 mb-6">Configure the SMTP settings for sending system emails (like invitations and notifications).</p>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. smtp.gmail.com"
                    value={mailData.smtpHost}
                    onChange={(e) => setMailData({ ...mailData, smtpHost: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Port</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 587"
                    value={mailData.smtpPort}
                    onChange={(e) => setMailData({ ...mailData, smtpPort: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP User (Email)</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter SMTP email address"
                    value={mailData.smtpUser}
                    onChange={(e) => setMailData({ ...mailData, smtpUser: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Password / App Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter SMTP password"
                    value={mailData.smtpPass}
                    onChange={(e) => setMailData({ ...mailData, smtpPass: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">From Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Vendor Portal"
                    value={mailData.fromName}
                    onChange={(e) => setMailData({ ...mailData, fromName: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'options' && (
            <div className="p-4 sm:p-6">
              {/* PO Format Section */}
              <div className="mb-10 pb-8 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Purchase Order Format</h2>

                <form onSubmit={handleSavePoConfig}>
                  {/* Top Section */}
                  <div className="flex flex-col md:flex-row gap-6 items-end max-w-4xl mb-6">
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Prefix</label>
                      <input type="text" value={poConfig.prefix} onChange={(e) => setPoConfig({ ...poConfig, prefix: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. SA026-" />
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Number Length</label>
                      <select 
                        value={poConfig.padding} 
                        onChange={(e) => {
                          const newPadding = parseInt(e.target.value, 10);
                          setPoConfig({ ...poConfig, padding: newPadding });
                          
                          let currNumStr = currentPoInput;
                          if (currNumStr.length > newPadding) {
                            currNumStr = currNumStr.slice(currNumStr.length - newPadding);
                          }
                          setCurrentPoInput(currNumStr.padStart(newPadding, '0'));
                        }} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </div>
                    <div className="w-full md:w-1/3 pb-2">
                      <div className="text-sm text-slate-600">
                        Preview: <span className="font-semibold text-slate-900">{poConfig.prefix}{'1'.padStart(poConfig.padding, '0')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex flex-col md:flex-row gap-6 items-start max-w-4xl mb-6">
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Current PO Num.</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        maxLength={poConfig.padding}
                        value={currentPoInput} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCurrentPoInput(val);
                        }} 
                        onBlur={() => {
                          if (!currentPoInput) setCurrentPoInput('0'.padStart(poConfig.padding, '0'));
                        }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                      />
                      <p className="text-xs text-slate-500 mt-1.5">Allow as per section above.</p>
                    </div>
                    <div className="w-full md:w-2/3 pt-7">
                      <div className="text-sm text-slate-700 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 inline-flex items-center gap-2">
                        Next PO: <span className="font-bold text-blue-700 text-base">{poConfig.prefix}{String(parseInt(currentPoInput || '0', 10) + 1).padStart(poConfig.padding, '0')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 h-[38px]">
                      Save Format
                    </button>
                  </div>
                </form>
              </div>

              <h2 className="text-lg font-semibold text-slate-800 mb-4">Vendor Form Options</h2>
              <p className="text-sm text-slate-500 mb-6">Manage the dropdown choices available to vendors during onboarding.</p>

              <form onSubmit={handleAddOption} className="mb-8 flex gap-3 max-w-lg items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={newOption.category}
                    onChange={(e) => setNewOption({ ...newOption, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="vendorType">Vendor Type</option>
                    <option value="vendorCategory">Vendor Category</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Option Value</label>
                  <input
                    type="text"
                    required
                    value={newOption.value}
                    onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Wholesaler"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 h-10">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Vendor Types</h3>
                  <div className="space-y-2">
                    {vendorOptions.vendorType?.map(opt => (
                      <div key={opt.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <span className="text-sm text-slate-700">{opt.value}</span>
                        <button onClick={() => handleDeleteOption(opt.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!vendorOptions.vendorType || vendorOptions.vendorType.length === 0) && (
                      <p className="text-xs text-slate-500 italic">No vendor types configured.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Vendor Categories</h3>
                  <div className="space-y-2">
                    {vendorOptions.vendorCategory?.map(opt => (
                      <div key={opt.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <span className="text-sm text-slate-700">{opt.value}</span>
                        <button onClick={() => handleDeleteOption(opt.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!vendorOptions.vendorCategory || vendorOptions.vendorCategory.length === 0) && (
                      <p className="text-xs text-slate-500 italic">No vendor categories configured.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-4 text-center pb-2">
        <p className="text-slate-500 text-sm font-medium tracking-wide">
          powered by <a href="https://finnovo.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700 transition-colors">finnovo<sup className="text-[10px]">®</sup></a>
        </p>
      </div>
    </div>
  );
}
