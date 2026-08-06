import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const VendorLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [emailState, setEmailState] = useState('');
  const [passwordState, setPasswordState] = useState('');
  const [errorState, setErrorState] = useState('');
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Removed auto-redirect so the vendor login page can be accessed even if an admin session is active.

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorState('');
    setIsLoadingState(true);

    try {
      const response = await fetch('/api/invitations/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailState, password: passwordState }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // We have the token, now redirect to the registration wizard
      if (data.token) {
        // Find if there's a token in the URL params (from the email link), but wait,
        // The email link is: /vendor-login?token=abc
        // Actually, we don't need the token from the URL if the backend returns it!
        sessionStorage.setItem('vendorAuthToken', data.token);
        navigate(`/register/${data.token}`);
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (err) {
      setErrorState(err.message);
    } finally {
      setIsLoadingState(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Vendor Portal Login
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Please use the credentials provided in your invitation email.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            {errorState && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errorState}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address (Username)
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={emailState}
                  onChange={(e) => setEmailState(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Temporary Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                  value={passwordState}
                  onChange={(e) => setPasswordState(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoadingState}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoadingState ? 'Signing in...' : 'Sign in to register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorLogin;
