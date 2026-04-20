import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const SignIn = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);


   useEffect(() => {
    // Clear all existing toasts
    toast.dismiss();
    
    // You can also clear specific toast if needed
    // toast.clearWaitingQueue();
  }, []); // Empty dependency array = runs once on mount


  // Dark mode detection
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check for data-theme attribute
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] 
    });
    
    return () => observer.disconnect();
  }, []);

  // handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // clear error on typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        formData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const data = response.data;

      if (data.success) {
        // ✅ store user & token via AuthContext
        login(
          {
            id: data.data.userId,
            name: data.data.name,
            email: data.data.email,
            phone: data.data.phone,
            role: data.data.role,
            profilePic: data.data.profilePic,
            isActive: data.data.isActive,
          },
          data.data.token
        );

        // ✅ Show success message
        toast.success('Login successful!');

        // ✅ redirect to dashboard (sirf streamer ke liye)
        navigate('/dashboard');
      } else {
        setErrors({ submit: data.message || 'Login failed. Please try again.' });
        toast.error(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200`}>
      <div className={`max-w-md w-full space-y-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-xl shadow-lg transition-colors duration-200`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Sign in to Streamer Panel
          </h2>
          <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Or{' '}
            <Link
              to="/signup"
              className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-indigo-600 hover:text-indigo-500'}`}
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Error box */}
          {errors.submit && (
            <div className={`rounded-md ${isDarkMode ? 'bg-red-900' : 'bg-red-50'} p-4`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>{errors.submit}</div>
            </div>
          )}

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.email 
                    ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                    : (isDarkMode ? 'border-gray-600' : 'border-gray-300')
                } ${isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-500'} ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                } rounded-md focus:outline-none ${
                  isDarkMode 
                    ? 'focus:ring-blue-500 focus:border-blue-500' 
                    : 'focus:ring-indigo-500 focus:border-indigo-500'
                } focus:z-10 sm:text-sm ${
                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                }`}
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password 
                      ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                      : (isDarkMode ? 'border-gray-600' : 'border-gray-300')
                  } ${isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-500'} ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  } rounded-md focus:outline-none ${
                    isDarkMode 
                      ? 'focus:ring-blue-500 focus:border-blue-500' 
                      : 'focus:ring-indigo-500 focus:border-indigo-500'
                  } focus:z-10 sm:text-sm ${
                    isDarkMode ? 'bg-gray-700' : 'bg-white'
                  }`}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  ) : (
                    <EyeIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Remember Me + Forgot */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className={`h-4 w-4 ${isDarkMode ? 'text-blue-600' : 'text-indigo-600'} ${
                  isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                } ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} rounded`}
              />
              <label
                htmlFor="remember-me"
                className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-indigo-600 hover:text-indigo-500'}`}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading
                  ? (isDarkMode ? 'bg-blue-400' : 'bg-indigo-400')
                  : `${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  }`
              } disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 
                      0 5.373 0 12h4zm2 5.291A7.962 
                      7.962 0 014 12H0c0 3.042 1.135 
                      5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;