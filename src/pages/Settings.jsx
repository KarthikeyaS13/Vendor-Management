import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Building2,
  MapPin,
  UploadCloud,
  Save,
  Key,
  Globe,
  Mail
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
    companyAddress: '123 Business Avenue, Tech District',
    location: 'Mumbai, India',
    autoApprove: false,
    emailNotifications: true,
  });

  const [mailData, setMailData] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    fromName: ''
  });

  useEffect(() => {
    // Fetch Mail Settings
    fetch('/api/settings/mail')
      .then(res => res.json())
      .then(data => setMailData(data))
      .catch(err => console.error('Failed to fetch mail settings', err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (activeTab === 'general') {
      localStorage.setItem('brandName', formData.brandName);
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand Name</label>
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
                    onChange={(e) => setMailData({...mailData, smtpHost: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Port</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 587"
                    value={mailData.smtpPort}
                    onChange={(e) => setMailData({...mailData, smtpPort: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP User (Email)</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter SMTP email address"
                    value={mailData.smtpUser}
                    onChange={(e) => setMailData({...mailData, smtpUser: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Password / App Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter SMTP password"
                    value={mailData.smtpPass}
                    onChange={(e) => setMailData({...mailData, smtpPass: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">From Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Vendor Portal"
                    value={mailData.fromName}
                    onChange={(e) => setMailData({...mailData, fromName: e.target.value})}
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

        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-4 text-center pb-2">
        <p className="text-slate-400 text-xs font-medium tracking-wide">
          powered by finnovo<sup className="text-[9px]">®</sup>
        </p>
      </div>
    </div>
  );
}
