import React, { useState, useRef } from 'react';
import { Menu, LogOut, Camera, Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/Notifications/NotificationBell';

export default function TopNav() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminName, setAdminName] = useState(localStorage.getItem('adminName') || user?.username || 'Admin');
  const [profilePic, setProfilePic] = useState(localStorage.getItem('adminProfilePic') || null);
  const fileInputRef = useRef(null);

  const handleLogout = () => {
    logout();
  };

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem('adminProfilePic', reader.result);
        toast.success('Profile picture updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    localStorage.setItem('adminName', adminName);
    toast.success('Profile name updated!');
    setShowProfileMenu(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-outline bg-surface-lowest">
      <div className="flex items-center gap-4">
        <button className="p-2 -ml-2 rounded-md hover:bg-surface-container md:hidden text-surface-on-variant">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-surface-container transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container text-primary-on-container flex items-center justify-center font-medium text-sm overflow-hidden border border-outline">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                adminName.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="hidden md:flex flex-col items-start mr-1">
              <span className="text-sm font-medium leading-none mb-1">{adminName}</span>
              <span className="text-xs text-surface-on-variant leading-none">{user?.role === 'VENDOR' ? 'Vendor' : 'Admin'}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
              <h3 className="font-semibold text-slate-800 mb-4">Edit Profile</h3>
              
              <div className="flex flex-col items-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-medium text-slate-500">{adminName.charAt(0)}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleProfileUpload}
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button 
                  onClick={handleSaveProfile}
                  className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleLogout}
          className="ml-2 p-2 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
