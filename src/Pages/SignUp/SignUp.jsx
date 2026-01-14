import { useState, useEffect } from 'react';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'STREAMER' // Default role
  });
  const [otp, setOtp] = useState('');
  const [secretId, setSecretId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Also check for data-theme attribute on document
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    };
    
    checkTheme();
    
    // Create a MutationObserver to watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle phone number input - only allow digits
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: digitsOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error on typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Validation functions
  const validateEmail = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhone = () => {
    const newErrors = {};
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must contain only digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAccountInfo = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Start cooldown timer for resend OTP
  const startCooldown = () => {
    setResendCooldown(30);
    
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send Email OTP
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sendEmailOtp`, {
        email: formData.email,
        secretId: secretId || undefined
      });

      setSecretId(response.data.data.secretId);
      setStep(2);
      showMessage(`OTP sent to ${formData.email}`, 'success');
      startCooldown();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sendEmailOtp`, {
        email: formData.email,
        secretId: secretId || undefined
      });

      setSecretId(response.data.data.secretId);
      showMessage(`OTP resent to ${formData.email}`, 'success');
      startCooldown();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP
  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      setErrors({ otp: 'OTP is required' });
      return;
    } else if (otp.length !== 4) {
      setErrors({ otp: 'OTP must be 4 digits' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/verifyEmailOtp`, {
        secretId,
        otp
      });

      setOtp('');
      setStep(3);
      showMessage('Email verified successfully', 'success');
    } catch (error) {
      showMessage(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Account Creation
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    // Validate phone and account info
    if (!validatePhone() || !validateAccountInfo()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/createAccount`, {
        secretId,
        name: formData.name,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: 'STREAMER', // Always send STREAMER as role
        phone: formData.phone
      });

      showMessage(`Account created successfully as STREAMER`, 'success');
      navigate('/signin');
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Theme-based classes
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const inputFocusRing = isDarkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-indigo-500 focus:border-indigo-500';
  const linkColor = isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-indigo-600 hover:text-indigo-500';
  const buttonBg = isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700';
  const secondaryButtonBg = isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-white hover:bg-gray-50 text-gray-700';
  const secondaryButtonBorder = isDarkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className={`min-h-screen ${bgColor} flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className={`mt-6 text-center text-3xl font-extrabold ${textColor}`}>
          Create your account
        </h2>
        <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Step {step} of 3
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${cardBgColor} py-8 px-4 shadow sm:rounded-lg sm:px-10 transition-colors duration-200`}>
          {message.text && (
            <div className={`mb-4 p-3 rounded-md ${message.type === 'success' 
              ? (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
              : (isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
            }`}>
              {message.text}
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSendEmailOtp}>
              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${labelColor}`}>
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.email 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Sending...' : 'Send Verification OTP'}
                </button>
              </div>

              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Already have an account?{' '}
                  <Link to="/signin" className={`font-medium ${linkColor}`}>
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Step 2: Email OTP Verification */}
          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyEmailOtp}>
              <div>
                <label htmlFor="otp" className={`block text-sm font-medium ${labelColor}`}>
                  Enter OTP sent to <span className="font-semibold">{formData.email}</span>
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setOtp(value);
                      if (errors.otp) setErrors({ ...errors, otp: '' });
                    }}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.otp 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
                  />
                </div>
                {errors.otp && (
                  <p className="mt-1 text-sm text-red-500">{errors.otp}</p>
                )}
                <div className="mt-2 text-sm text-right">
                  <button
                    type="button"
                    onClick={handleResendEmailOtp}
                    disabled={resendCooldown > 0 || loading}
                    className={`${linkColor} disabled:${isDarkMode ? 'text-gray-600' : 'text-gray-400'} disabled:cursor-not-allowed`}
                  >
                    {resendCooldown > 0 
                      ? `Resend OTP in ${resendCooldown}s` 
                      : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`w-1/2 flex justify-center py-2 px-4 border ${secondaryButtonBorder} rounded-md shadow-sm text-sm font-medium ${secondaryButtonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  }`}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>

              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Already have an account?{' '}
                  <Link to="/signin" className={`font-medium ${linkColor}`}>
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Step 3: Account Creation (now includes phone input) */}
          {step === 3 && (
            <form className="space-y-6" onSubmit={handleCreateAccount}>
              <div>
                <label htmlFor="name" className={`block text-sm font-medium ${labelColor}`}>
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.name 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={`block text-sm font-medium ${labelColor}`}>
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.phone 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${labelColor}`}>
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 pr-10 border ${
                      errors.password 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
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

              <div>
                <label htmlFor="confirmPassword" className={`block text-sm font-medium ${labelColor}`}>
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 py-2 pr-10 border ${
                      errors.confirmPassword 
                        ? (isDarkMode ? 'border-red-500' : 'border-red-300') 
                        : inputBorderColor
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none ${inputFocusRing} sm:text-sm ${inputBgColor} ${textColor}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    ) : (
                      <EyeIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`w-1/2 flex justify-center py-2 px-4 border ${secondaryButtonBorder} rounded-md shadow-sm text-sm font-medium ${secondaryButtonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  }`}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDarkMode ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Already have an account?{' '}
                  <Link to="/signin" className={`font-medium ${linkColor}`}>
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUp;










// import { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import { 
//   EyeIcon, 
//   EyeSlashIcon,
//   ChevronRightIcon,
//   UserCircleIcon,
//   CheckCircleIcon,
//   SparklesIcon,
//   GlobeAltIcon,
//   LinkIcon,
//   BookOpenIcon,
//   TrophyIcon,
//   EnvelopeIcon,
//   PhoneIcon,
//   LockClosedIcon,
//   ArrowLeftIcon,
//   ClockIcon,
//   ShieldCheckIcon,
//   XMarkIcon,
//   ChevronLeftIcon,
//   CameraIcon,
//   DocumentIcon,
//   PaperClipIcon,
//   TrashIcon,
//   CloudArrowUpIcon,
//   AcademicCapIcon,
//   DocumentTextIcon,
//   ExclamationTriangleIcon
// } from '@heroicons/react/24/outline';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useNavigate, Link } from 'react-router-dom';

// const SignUp = () => {
//   const [step, setStep] = useState(1);
//   const [formData, setFormData] = useState({
//     email: '',
//     phone: '',
//     name: '',
//     password: '',
//     confirmPassword: '',
//     role: 'STREAMER'
//   });
  
//   // Streamer Profile Fields
//   const [streamerProfile, setStreamerProfile] = useState({
//     bio: '',
//     expertise: [],
//     experienceYears: 0,
//     experienceDescription: '',
//     qualifications: [],
//     certifications: [],
//     socialLinks: {
//       youtube: '',
//       linkedin: '',
//       twitter: '',
//       github: '',
//       portfolio: ''
//     }
//   });
  
//   // File Upload States
//   const [profilePic, setProfilePic] = useState(null);
//   const [profilePicPreview, setProfilePicPreview] = useState('');
//   const [qualificationFiles, setQualificationFiles] = useState([]);
//   const [certificationFiles, setCertificationFiles] = useState([]);
  
//   // Upload Progress States
//   const [uploadProgress, setUploadProgress] = useState({
//     profilePic: 0,
//     qualifications: [],
//     certifications: [],
//     overall: 0
//   });
  
//   const [uploadQueue, setUploadQueue] = useState([]);
//   const [backgroundUploads, setBackgroundUploads] = useState([]);
//   const [showUploadProgress, setShowUploadProgress] = useState(false);
  
//   // Refs for file inputs
//   const profilePicRef = useRef(null);
//   const qualificationFilesRef = useRef(null);
//   const certificationFilesRef = useRef(null);
  
//   const [otp, setOtp] = useState(['', '', '', '']);
//   const [secretId, setSecretId] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState({ text: '', type: '' });
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [resendCooldown, setResendCooldown] = useState(0);
//   const [errors, setErrors] = useState({});
//   const [expertiseInput, setExpertiseInput] = useState('');
//   const [qualificationInput, setQualificationInput] = useState({ 
//     degree: '', 
//     institute: '', 
//     year: '', 
//     certificateFile: null 
//   });
//   const [certificationInput, setCertificationInput] = useState({ 
//     name: '', 
//     issuer: '', 
//     issueDate: '', 
//     expiryDate: '', 
//     certificateFile: null 
//   });
//   const [activeProfileSection, setActiveProfileSection] = useState(1);
//   const [isMobile, setIsMobile] = useState(false);
//   const [accountCreated, setAccountCreated] = useState(false);
//   const [createdUserId, setCreatedUserId] = useState('');
//   const [createdToken, setCreatedToken] = useState('');
  
//   const navigate = useNavigate();

//   // Check for mobile screen
//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
    
//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);

//   // Monitor background uploads
//   useEffect(() => {
//     if (backgroundUploads.length > 0 && accountCreated) {
//       const totalUploads = backgroundUploads.length;
//       const completedUploads = backgroundUploads.filter(u => u.status === 'completed').length;
//       const failedUploads = backgroundUploads.filter(u => u.status === 'failed').length;
      
//       setUploadProgress(prev => ({
//         ...prev,
//         overall: Math.round((completedUploads / totalUploads) * 100)
//       }));
      
//       // Check if all uploads are done
//       if (completedUploads + failedUploads === totalUploads) {
//         if (failedUploads > 0) {
//           // Show retry option for failed uploads
//           setTimeout(() => {
//             showMessage(`${failedUploads} file(s) failed to upload. You can retry from your profile.`, 'warning');
//           }, 2000);
//         } else {
//           setTimeout(() => {
//             showMessage('All files uploaded successfully!', 'success');
//           }, 2000);
//         }
        
//         // Clear progress after 5 seconds
//         setTimeout(() => {
//           setShowUploadProgress(false);
//         }, 5000);
//       }
//     }
//   }, [backgroundUploads, accountCreated]);

//   const showMessage = (text, type = 'error') => {
//     setMessage({ text, type });
//     setTimeout(() => setMessage({ text: '', type: '' }), 5000);
//   };

//   // Optimize image before upload
//   const optimizeImage = async (file, maxWidth = 1200, quality = 0.8) => {
//     return new Promise((resolve, reject) => {
//       // Check if file is an image
//       if (!file.type.startsWith('image/')) {
//         resolve(file);
//         return;
//       }
      
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const img = new Image();
//         img.onload = () => {
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d');
          
//           // Calculate new dimensions
//           let width = img.width;
//           let height = img.height;
          
//           if (width > maxWidth) {
//             const ratio = maxWidth / width;
//             width = maxWidth;
//             height = height * ratio;
//           }
          
//           canvas.width = width;
//           canvas.height = height;
          
//           // Draw and compress
//           ctx.drawImage(img, 0, 0, width, height);
          
//           canvas.toBlob(
//             (blob) => {
//               if (blob) {
//                 const optimizedFile = new File([blob], file.name, {
//                   type: 'image/jpeg',
//                   lastModified: Date.now()
//                 });
//                 resolve(optimizedFile);
//               } else {
//                 resolve(file);
//               }
//             },
//             'image/jpeg',
//             quality
//           );
//         };
        
//         img.onerror = () => {
//           console.error('Image loading error');
//           resolve(file); // Return original if optimization fails
//         };
        
//         img.src = e.target.result;
//       };
      
//       reader.onerror = () => {
//         console.error('File reading error');
//         resolve(file); // Return original if reading fails
//       };
      
//       reader.readAsDataURL(file);
//     });
//   };

//   // File Upload Handlers
//   const handleProfilePicChange = async (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
//       if (!validTypes.includes(file.type)) {
//         showMessage('Only JPEG, PNG, and WebP images are allowed', 'error');
//         return;
//       }
      
//       // Optimize image
//       setLoading(true);
//       try {
//         const optimizedFile = await optimizeImage(file);
        
//         if (optimizedFile.size > 5 * 1024 * 1024) {
//           showMessage('Profile picture must be less than 5MB', 'error');
//           return;
//         }
        
//         setProfilePic(optimizedFile);
//         setProfilePicPreview(URL.createObjectURL(optimizedFile));
//       } catch (error) {
//         console.error('Image optimization failed:', error);
//         // Use original file if optimization fails
//         setProfilePic(file);
//         setProfilePicPreview(URL.createObjectURL(file));
//       } finally {
//         setLoading(false);
//       }
//     }
//   };

//   const handleQualificationFilesChange = async (e) => {
//     const files = Array.from(e.target.files);
//     const validFiles = [];
    
//     for (const file of files) {
//       const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
//       if (!validTypes.includes(file.type)) {
//         showMessage('Only PDF, JPEG, and PNG files are allowed', 'error');
//         continue;
//       }
//       if (file.size > 10 * 1024 * 1024) {
//         showMessage(`${file.name} must be less than 10MB`, 'error');
//         continue;
//       }
      
//       // Optimize image files
//       if (file.type.startsWith('image/')) {
//         try {
//           const optimizedFile = await optimizeImage(file, 1600, 0.7);
//           validFiles.push(optimizedFile);
//         } catch (error) {
//           validFiles.push(file); // Use original if optimization fails
//         }
//       } else {
//         validFiles.push(file);
//       }
//     }
    
//     setQualificationFiles(prev => [...prev, ...validFiles]);
//   };

//   const handleCertificationFilesChange = async (e) => {
//     const files = Array.from(e.target.files);
//     const validFiles = [];
    
//     for (const file of files) {
//       const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
//       if (!validTypes.includes(file.type)) {
//         showMessage('Only PDF, JPEG, and PNG files are allowed', 'error');
//         continue;
//       }
//       if (file.size > 10 * 1024 * 1024) {
//         showMessage(`${file.name} must be less than 10MB`, 'error');
//         continue;
//       }
      
//       // Optimize image files
//       if (file.type.startsWith('image/')) {
//         try {
//           const optimizedFile = await optimizeImage(file, 1600, 0.7);
//           validFiles.push(optimizedFile);
//         } catch (error) {
//           validFiles.push(file); // Use original if optimization fails
//         }
//       } else {
//         validFiles.push(file);
//       }
//     }
    
//     setCertificationFiles(prev => [...prev, ...validFiles]);
//   };

//   const removeProfilePic = () => {
//     setProfilePic(null);
//     setProfilePicPreview('');
//     if (profilePicRef.current) {
//       profilePicRef.current.value = '';
//     }
//   };

//   const removeQualificationFile = (index) => {
//     setQualificationFiles(prev => prev.filter((_, i) => i !== index));
//   };

//   const removeCertificationFile = (index) => {
//     setCertificationFiles(prev => prev.filter((_, i) => i !== index));
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
    
//     if (name === 'phone') {
//       const digitsOnly = value.replace(/\D/g, '');
//       setFormData({ ...formData, [name]: digitsOnly });
//     } else {
//       setFormData({ ...formData, [name]: value });
//     }
    
//     if (errors[name]) {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   // Handle OTP input
//   const handleOtpChange = (value, index) => {
//     if (!/^\d?$/.test(value)) return;
    
//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);
    
//     if (value && index < 3) {
//       document.getElementById(`otp-${index + 1}`)?.focus();
//     }
    
//     if (!value && index > 0) {
//       document.getElementById(`otp-${index - 1}`)?.focus();
//     }
//   };

//   // Handle streamer profile changes
//   const handleStreamerProfileChange = (e) => {
//     const { name, value } = e.target;
    
//     if (name.startsWith('socialLinks.')) {
//       const field = name.split('.')[1];
//       setStreamerProfile({
//         ...streamerProfile,
//         socialLinks: {
//           ...streamerProfile.socialLinks,
//           [field]: value
//         }
//       });
//     } else if (name === 'experienceYears') {
//       setStreamerProfile({
//         ...streamerProfile,
//         [name]: parseInt(value) || 0
//       });
//     } else {
//       setStreamerProfile({
//         ...streamerProfile,
//         [name]: value
//       });
//     }
//   };

//   // Add expertise
//   const handleAddExpertise = () => {
//     if (expertiseInput.trim() && !streamerProfile.expertise.includes(expertiseInput.trim())) {
//       setStreamerProfile({
//         ...streamerProfile,
//         expertise: [...streamerProfile.expertise, expertiseInput.trim()]
//       });
//       setExpertiseInput('');
//     }
//   };

//   // Remove expertise
//   const handleRemoveExpertise = (index) => {
//     const newExpertise = [...streamerProfile.expertise];
//     newExpertise.splice(index, 1);
//     setStreamerProfile({ ...streamerProfile, expertise: newExpertise });
//   };

//   // Add qualification
//   const handleAddQualification = () => {
//     if (qualificationInput.degree.trim() && qualificationInput.institute.trim()) {
//       const newQualification = {
//         degree: qualificationInput.degree.trim(),
//         institute: qualificationInput.institute.trim(),
//         year: parseInt(qualificationInput.year) || new Date().getFullYear(),
//         certificateFile: null,
//         certificatePreview: null
//       };
      
//       setStreamerProfile({
//         ...streamerProfile,
//         qualifications: [...streamerProfile.qualifications, newQualification]
//       });
      
//       setQualificationInput({ 
//         degree: '', 
//         institute: '', 
//         year: '', 
//         certificateFile: null 
//       });
//     }
//   };

//   // Remove qualification
//   const handleRemoveQualification = (index) => {
//     const newQualifications = [...streamerProfile.qualifications];
//     newQualifications.splice(index, 1);
//     setStreamerProfile({ ...streamerProfile, qualifications: newQualifications });
//   };

//   // Handle qualification certificate file
//   const handleQualificationCertificate = async (e, index) => {
//     const file = e.target.files[0];
//     if (file) {
//       const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
//       if (!validTypes.includes(file.type)) {
//         showMessage('Only PDF, JPEG, and PNG files are allowed', 'error');
//         return;
//       }
      
//       // Optimize image files
//       let processedFile = file;
//       if (file.type.startsWith('image/')) {
//         try {
//           processedFile = await optimizeImage(file, 1600, 0.7);
//         } catch (error) {
//           console.error('Image optimization failed:', error);
//         }
//       }
      
//       if (processedFile.size > 10 * 1024 * 1024) {
//         showMessage('File must be less than 10MB', 'error');
//         return;
//       }
      
//       const updatedQualifications = [...streamerProfile.qualifications];
//       updatedQualifications[index] = {
//         ...updatedQualifications[index],
//         certificateFile: processedFile,
//         certificatePreview: processedFile.type.startsWith('image/') ? URL.createObjectURL(processedFile) : null
//       };
//       setStreamerProfile({ ...streamerProfile, qualifications: updatedQualifications });
//     }
//   };

//   // Remove qualification certificate
//   const handleRemoveQualificationCertificate = (index) => {
//     const updatedQualifications = [...streamerProfile.qualifications];
//     updatedQualifications[index] = {
//       ...updatedQualifications[index],
//       certificateFile: null,
//       certificatePreview: null
//     };
//     setStreamerProfile({ ...streamerProfile, qualifications: updatedQualifications });
//   };

//   // Add certification
//   const handleAddCertification = () => {
//     if (certificationInput.name.trim() && certificationInput.issuer.trim()) {
//       const newCertification = {
//         name: certificationInput.name.trim(),
//         issuer: certificationInput.issuer.trim(),
//         issueDate: certificationInput.issueDate,
//         expiryDate: certificationInput.expiryDate,
//         certificateFile: null,
//         certificatePreview: null
//       };
      
//       setStreamerProfile({
//         ...streamerProfile,
//         certifications: [...streamerProfile.certifications, newCertification]
//       });
      
//       setCertificationInput({ 
//         name: '', 
//         issuer: '', 
//         issueDate: '', 
//         expiryDate: '', 
//         certificateFile: null 
//       });
//     }
//   };

//   // Remove certification
//   const handleRemoveCertification = (index) => {
//     const newCertifications = [...streamerProfile.certifications];
//     newCertifications.splice(index, 1);
//     setStreamerProfile({ ...streamerProfile, certifications: newCertifications });
//   };

//   // Handle certification file
//   const handleCertificationFile = async (e, index) => {
//     const file = e.target.files[0];
//     if (file) {
//       const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
//       if (!validTypes.includes(file.type)) {
//         showMessage('Only PDF, JPEG, and PNG files are allowed', 'error');
//         return;
//       }
      
//       // Optimize image files
//       let processedFile = file;
//       if (file.type.startsWith('image/')) {
//         try {
//           processedFile = await optimizeImage(file, 1600, 0.7);
//         } catch (error) {
//           console.error('Image optimization failed:', error);
//         }
//       }
      
//       if (processedFile.size > 10 * 1024 * 1024) {
//         showMessage('File must be less than 10MB', 'error');
//         return;
//       }
      
//       const updatedCertifications = [...streamerProfile.certifications];
//       updatedCertifications[index] = {
//         ...updatedCertifications[index],
//         certificateFile: processedFile,
//         certificatePreview: processedFile.type.startsWith('image/') ? URL.createObjectURL(processedFile) : null
//       };
//       setStreamerProfile({ ...streamerProfile, certifications: updatedCertifications });
//     }
//   };

//   // Remove certification certificate
//   const handleRemoveCertificationCertificate = (index) => {
//     const updatedCertifications = [...streamerProfile.certifications];
//     updatedCertifications[index] = {
//       ...updatedCertifications[index],
//       certificateFile: null,
//       certificatePreview: null
//     };
//     setStreamerProfile({ ...streamerProfile, certifications: updatedCertifications });
//   };

//   // Validation functions
//   const validateEmail = () => {
//     const newErrors = {};
    
//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//     } else {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(formData.email)) {
//         newErrors.email = 'Please enter a valid email address';
//       }
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const validatePhone = () => {
//     const newErrors = {};
    
//     if (!formData.phone.trim()) {
//       newErrors.phone = 'Phone number is required';
//     } else if (formData.phone.length < 10) {
//       newErrors.phone = 'Phone number must be at least 10 digits';
//     } else if (!/^\d+$/.test(formData.phone)) {
//       newErrors.phone = 'Phone number must contain only digits';
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const validateAccountInfo = () => {
//     const newErrors = {};
    
//     if (!formData.name.trim()) {
//       newErrors.name = 'Full name is required';
//     }
    
//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     } else if (formData.password.length < 6) {
//       newErrors.password = 'Password must be at least 6 characters';
//     }
    
//     if (!formData.confirmPassword) {
//       newErrors.confirmPassword = 'Please confirm your password';
//     } else if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = 'Passwords do not match';
//     }
    
//     if (!streamerProfile.bio.trim()) {
//       newErrors.bio = 'Bio is required for streamer profile';
//     } else if (streamerProfile.bio.trim().length < 50) {
//       newErrors.bio = 'Bio should be at least 50 characters';
//     }
    
//     if (streamerProfile.expertise.length === 0) {
//       newErrors.expertise = 'Please add at least one expertise';
//     }
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   // Start cooldown timer for resend OTP
//   const startCooldown = () => {
//     setResendCooldown(30);
    
//     const interval = setInterval(() => {
//       setResendCooldown(prev => {
//         if (prev <= 1) {
//           clearInterval(interval);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   };

//   // Step 1: Send Email OTP
//   const handleSendEmailOtp = async (e) => {
//     e.preventDefault();
    
//     if (!validateEmail()) return;

//     setLoading(true);
//     try {
//       const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sendEmailOtp`, {
//         email: formData.email,
//         secretId: secretId || undefined
//       });

//       setSecretId(response.data.data.secretId);
//       setStep(2);
//       showMessage(`OTP sent to ${formData.email}`, 'success');
//       startCooldown();
//     } catch (error) {
//       showMessage(error.response?.data?.message || 'Failed to send OTP');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Resend Email OTP
//   const handleResendEmailOtp = async () => {
//     if (resendCooldown > 0) return;
    
//     setLoading(true);
//     try {
//       const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sendEmailOtp`, {
//         email: formData.email,
//         secretId: secretId || undefined
//       });

//       setSecretId(response.data.data.secretId);
//       showMessage(`OTP resent to ${formData.email}`, 'success');
//       startCooldown();
//     } catch (error) {
//       showMessage(error.response?.data?.message || 'Failed to resend OTP');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Step 2: Verify Email OTP
//   const handleVerifyEmailOtp = async (e) => {
//     e.preventDefault();
    
//     const otpString = otp.join('');
//     if (!otpString) {
//       setErrors({ otp: 'OTP is required' });
//       return;
//     } else if (otpString.length !== 4) {
//       setErrors({ otp: 'OTP must be 4 digits' });
//       return;
//     }

//     setLoading(true);
//     try {
//       await axios.post(`${import.meta.env.VITE_API_URL}/auth/verifyEmailOtp`, {
//         secretId,
//         otp: otpString
//       });

//       setOtp(['', '', '', '']);
//       setStep(3);
//       showMessage('Email verified successfully', 'success');
//     } catch (error) {
//       showMessage(error.response?.data?.message || 'Invalid OTP');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Upload single file with progress
//   const uploadFileWithProgress = async (file, fileType, userId, token, metadata = {}) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('fileType', fileType);
//     formData.append('userId', userId);
    
//     if (metadata.qualificationIndex !== undefined) {
//       formData.append('qualificationIndex', metadata.qualificationIndex);
//     }
    
//     if (metadata.certificationIndex !== undefined) {
//       formData.append('certificationIndex', metadata.certificationIndex);
//     }

//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_API_URL}/auth/upload-file`,
//         formData,
//         {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             // NO TOKEN NEEDED - user ID is in body
//           },
//           onUploadProgress: (progressEvent) => {
//             const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            
//             // Update progress based on file type
//             if (fileType === 'profilePic') {
//               setUploadProgress(prev => ({ ...prev, profilePic: percentCompleted }));
//             } else if (fileType === 'qualification') {
//               const newQualificationsProgress = [...uploadProgress.qualifications];
//               newQualificationsProgress[metadata.qualificationIndex] = percentCompleted;
//               setUploadProgress(prev => ({ ...prev, qualifications: newQualificationsProgress }));
//             } else if (fileType === 'certification') {
//               const newCertificationsProgress = [...uploadProgress.certifications];
//               newCertificationsProgress[metadata.certificationIndex] = percentCompleted;
//               setUploadProgress(prev => ({ ...prev, certifications: newCertificationsProgress }));
//             }
            
//             // Update overall progress
//             setUploadProgress(prev => {
//               const allProgress = [
//                 prev.profilePic,
//                 ...prev.qualifications,
//                 ...prev.certifications
//               ].filter(p => p > 0);
              
//               const overall = allProgress.length > 0 
//                 ? Math.round(allProgress.reduce((a, b) => a + b, 0) / allProgress.length)
//                 : 0;
              
//               return { ...prev, overall };
//             });
//           }
//         }
//       );
      
//       return { success: true, data: response.data.data, fileType, metadata };
//     } catch (error) {
//       console.error(`Upload failed for ${fileType}:`, error);
//       return { 
//         success: false, 
//         error: error.response?.data?.message || 'Upload failed',
//         fileType,
//         metadata,
//         fileName: file.name
//       };
//     }
//   };

//   // Upload files in background
//   const uploadFilesInBackground = async (userId) => { // ✅ Token removed
//     const uploadPromises = [];
//     const backgroundUploadsList = [];
    
//     // Prepare qualification files progress array
//     const qualificationsProgress = Array(streamerProfile.qualifications.length + qualificationFiles.length).fill(0);
//     setUploadProgress(prev => ({ ...prev, qualifications: qualificationsProgress }));
    
//     // Prepare certification files progress array
//     const certificationsProgress = Array(streamerProfile.certifications.length + certificationFiles.length).fill(0);
//     setUploadProgress(prev => ({ ...prev, certifications: certificationsProgress }));
    
//     // Show upload progress modal
//     setShowUploadProgress(true);
    
//     // Upload profile picture
//     if (profilePic) {
//       const uploadTask = {
//         id: 'profile_pic',
//         type: 'profilePic',
//         fileName: profilePic.name,
//         status: 'pending',
//         progress: 0
//       };
//       backgroundUploadsList.push(uploadTask);
      
//       uploadPromises.push(
//         uploadFileWithProgress(profilePic, 'profilePic', userId)
//           .then(result => {
//             const index = backgroundUploadsList.findIndex(u => u.id === 'profile_pic');
//             if (index !== -1) {
//               backgroundUploadsList[index] = {
//                 ...backgroundUploadsList[index],
//                 status: result.success ? 'completed' : 'failed',
//                 progress: 100
//               };
//               setBackgroundUploads([...backgroundUploadsList]);
//             }
//             return result;
//           })
//       );
//     }
    
//     // Upload qualification certificates
//     streamerProfile.qualifications.forEach((qual, index) => {
//       if (qual.certificateFile) {
//         const uploadTask = {
//           id: `qual_${index}`,
//           type: 'qualification',
//           fileName: qual.certificateFile.name,
//           status: 'pending',
//           progress: 0,
//           metadata: { qualificationIndex: index }
//         };
//         backgroundUploadsList.push(uploadTask);
        
//         uploadPromises.push(
//           uploadFileWithProgress(qual.certificateFile, 'qualification', userId, null, {
//             qualificationIndex: index
//           }).then(result => {
//             const taskIndex = backgroundUploadsList.findIndex(u => u.id === `qual_${index}`);
//             if (taskIndex !== -1) {
//               backgroundUploadsList[taskIndex] = {
//                 ...backgroundUploadsList[taskIndex],
//                 status: result.success ? 'completed' : 'failed',
//                 progress: 100
//               };
//               setBackgroundUploads([...backgroundUploadsList]);
//             }
//             return result;
//           })
//         );
//       }
//     });
    
//     // Upload certification files
//     streamerProfile.certifications.forEach((cert, index) => {
//       if (cert.certificateFile) {
//         const uploadTask = {
//           id: `cert_${index}`,
//           type: 'certification',
//           fileName: cert.certificateFile.name,
//           status: 'pending',
//           progress: 0,
//           metadata: { certificationIndex: index }
//         };
//         backgroundUploadsList.push(uploadTask);
        
//         uploadPromises.push(
//           uploadFileWithProgress(cert.certificateFile, 'certification', userId, null, {
//             certificationIndex: index
//           }).then(result => {
//             const taskIndex = backgroundUploadsList.findIndex(u => u.id === `cert_${index}`);
//             if (taskIndex !== -1) {
//               backgroundUploadsList[taskIndex] = {
//                 ...backgroundUploadsList[taskIndex],
//                 status: result.success ? 'completed' : 'failed',
//                 progress: 100
//               };
//               setBackgroundUploads([...backgroundUploadsList]);
//             }
//             return result;
//           })
//         );
//       }
//     });
    
//     // Upload additional qualification files
//     qualificationFiles.forEach((file, index) => {
//       const qualIndex = streamerProfile.qualifications.length + index;
//       const uploadTask = {
//         id: `additional_qual_${index}`,
//         type: 'additionalQualification',
//         fileName: file.name,
//         status: 'pending',
//         progress: 0,
//         metadata: { qualificationIndex: qualIndex, isAdditional: true }
//       };
//       backgroundUploadsList.push(uploadTask);
      
//       uploadPromises.push(
//         uploadFileWithProgress(file, 'qualification', userId, null, {
//           qualificationIndex: qualIndex,
//           isAdditional: true
//         }).then(result => {
//           const taskIndex = backgroundUploadsList.findIndex(u => u.id === `additional_qual_${index}`);
//           if (taskIndex !== -1) {
//             backgroundUploadsList[taskIndex] = {
//               ...backgroundUploadsList[taskIndex],
//               status: result.success ? 'completed' : 'failed',
//               progress: 100
//             };
//             setBackgroundUploads([...backgroundUploadsList]);
//           }
//           return result;
//         })
//       );
//     });
    
//     // Upload additional certification files
//     certificationFiles.forEach((file, index) => {
//       const certIndex = streamerProfile.certifications.length + index;
//       const uploadTask = {
//         id: `additional_cert_${index}`,
//         type: 'additionalCertification',
//         fileName: file.name,
//         status: 'pending',
//         progress: 0,
//         metadata: { certificationIndex: certIndex, isAdditional: true }
//       };
//       backgroundUploadsList.push(uploadTask);
      
//       uploadPromises.push(
//         uploadFileWithProgress(file, 'certification', userId, null, {
//           certificationIndex: certIndex,
//           isAdditional: true
//         }).then(result => {
//           const taskIndex = backgroundUploadsList.findIndex(u => u.id === `additional_cert_${index}`);
//           if (taskIndex !== -1) {
//             backgroundUploadsList[taskIndex] = {
//               ...backgroundUploadsList[taskIndex],
//               status: result.success ? 'completed' : 'failed',
//               progress: 100
//             };
//             setBackgroundUploads([...backgroundUploadsList]);
//           }
//           return result;
//         })
//       );
//     });
    
//     setBackgroundUploads(backgroundUploadsList);
    
//     // Execute all uploads
//     try {
//       const results = await Promise.allSettled(uploadPromises);
      
//       // Check results
//       const successfulUploads = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
//       const failedUploads = results.filter(r => 
//         r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
//       ).length;
      
//       console.log(`Upload complete: ${successfulUploads} successful, ${failedUploads} failed`);
      
//       // Update final status
//       setTimeout(() => {
//         setBackgroundUploads(prev => 
//           prev.map(upload => ({
//             ...upload,
//             status: upload.status === 'pending' ? 'completed' : upload.status
//           }))
//         );
//       }, 1000);
      
//     } catch (error) {
//       console.error('Background upload error:', error);
//     }
//   };

//   // Step 3: Create Basic Account (without files)
//   const handleCreateBasicAccount = async (e) => {
//     e.preventDefault();
    
//     if (!validatePhone() || !validateAccountInfo()) return;

//     setLoading(true);
//     try {
//       // Create account without files
//       const response = await axios.post(
//         `${import.meta.env.VITE_API_URL}/auth/create-basic-streamer-account`,
//         {
//           secretId,
//           name: formData.name,
//           email: formData.email,
//           phone: formData.phone,
//           password: formData.password,
//           confirmPassword: formData.confirmPassword,
//           bio: streamerProfile.bio,
//           expertise: JSON.stringify(streamerProfile.expertise),
//           experienceYears: streamerProfile.experienceYears,
//           experienceDescription: streamerProfile.experienceDescription,
//           qualifications: JSON.stringify(streamerProfile.qualifications.map(qual => ({
//             degree: qual.degree,
//             institute: qual.institute,
//             year: qual.year
//           }))),
//           certifications: JSON.stringify(streamerProfile.certifications.map(cert => ({
//             name: cert.name,
//             issuer: cert.issuer,
//             issueDate: cert.issueDate,
//             expiryDate: cert.expiryDate
//           }))),
//           socialLinks: JSON.stringify(streamerProfile.socialLinks)
//         }
//       );

//       // ✅ CORRECT WAY TO ACCESS RESPONSE DATA
//       const { data } = response.data;
//       const { token, userId } = data; // ✅ userId and token from response
      
//       if (!userId) {
//         throw new Error('User ID not received from server');
//       }

//       // Store token and user ID
//       localStorage.setItem('token', token);
//       localStorage.setItem('user', JSON.stringify(response.data.data));
      
//       setCreatedToken(token);
//       setCreatedUserId(userId);
//       setAccountCreated(true);
      
//       showMessage('Account created successfully! Starting background uploads...', 'success');
      
//       // Navigate immediately
//       setTimeout(() => {
//         navigate('/dashboard');
//       }, 1500);
      
//       // Start background uploads WITH USER ID
//       setTimeout(() => {
//         uploadFilesInBackground(userId);
//       }, 2000);
      
//     } catch (error) {
//       console.error('Account creation error:', error);
//       console.error('Response:', error.response?.data);
//       showMessage(error.response?.data?.message || 'Failed to create account');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Progress steps
//   const steps = [
//     { number: 1, title: 'Email', icon: EnvelopeIcon },
//     { number: 2, title: 'Verify', icon: ShieldCheckIcon },
//     { number: 3, title: 'Profile', icon: UserCircleIcon }
//   ];

//   // Profile sections for mobile
//   const profileSections = [
//     { id: 1, title: 'Personal Info', icon: UserCircleIcon },
//     { id: 2, title: 'Streamer Profile', icon: TrophyIcon },
//     { id: 3, title: 'Qualifications', icon: BookOpenIcon },
//     { id: 4, title: 'Documents', icon: DocumentIcon },
//     { id: 5, title: 'Social Links', icon: GlobeAltIcon }
//   ];

//   // Check if all required fields are filled for mobile
//   const isMobileFormComplete = () => {
//     return (
//       formData.name.trim() &&
//       formData.phone.trim() && formData.phone.length >= 10 &&
//       formData.password && formData.password.length >= 6 &&
//       formData.confirmPassword && formData.password === formData.confirmPassword &&
//       streamerProfile.bio.trim() && streamerProfile.bio.length >= 50 &&
//       streamerProfile.expertise.length > 0
//     );
//   };

//   // Animation variants
//   const containerVariants = {
//     hidden: { opacity: 0 },
//     visible: { 
//       opacity: 1,
//       transition: { 
//         duration: 0.5,
//         staggerChildren: 0.1
//       }
//     }
//   };

//   const itemVariants = {
//     hidden: { y: 20, opacity: 0 },
//     visible: { 
//       y: 0, 
//       opacity: 1,
//       transition: { duration: 0.5 }
//     }
//   };

//   // File upload component
//   const FileUploadArea = ({ 
//     title, 
//     description, 
//     onFileChange, 
//     files, 
//     onRemoveFile, 
//     accept,
//     multiple = false,
//     ref,
//     maxFiles = 5
//   }) => (
//     <div className="space-y-3">
//       <div>
//         <label className="block text-sm font-medium text-gray-300 mb-1">
//           {title}
//         </label>
//         <p className="text-xs text-gray-500 mb-3">
//           {description}
//         </p>
//       </div>
      
//       <div 
//         className={`border-2 border-dashed border-gray-700 rounded-xl p-6 text-center transition-all duration-300 hover:border-purple-500/50 hover:bg-gray-900/30 cursor-pointer ${files.length > 0 ? 'border-purple-500/30 bg-purple-900/10' : ''}`}
//         onClick={() => ref.current?.click()}
//       >
//         <input
//           type="file"
//           ref={ref}
//           onChange={onFileChange}
//           accept={accept}
//           multiple={multiple}
//           className="hidden"
//         />
        
//         {files.length === 0 ? (
//           <div className="space-y-2">
//             <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 flex items-center justify-center">
//               <CloudArrowUpIcon className="h-6 w-6 text-purple-400" />
//             </div>
//             <div>
//               <p className="text-sm font-medium text-gray-300">
//                 Click to upload {multiple ? 'files' : 'file'}
//               </p>
//               <p className="text-xs text-gray-500 mt-1">
//                 {accept.includes('image') ? 'JPEG, PNG, WebP (Max 5MB)' : 'PDF, JPEG, PNG (Max 10MB each)'}
//               </p>
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-3">
//             <div className="text-center">
//               <CheckCircleIcon className="h-8 w-8 text-green-400 mx-auto mb-2" />
//               <p className="text-sm font-medium text-gray-300">
//                 {files.length} {multiple ? 'files' : 'file'} selected
//               </p>
//             </div>
            
//             <div className="space-y-2 max-h-32 overflow-y-auto">
//               {files.map((file, index) => (
//                 <div 
//                   key={index}
//                   className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50 border border-gray-700"
//                 >
//                   <div className="flex items-center gap-2">
//                     <DocumentIcon className="h-4 w-4 text-gray-400" />
//                     <div className="text-left">
//                       <p className="text-xs font-medium text-gray-300 truncate max-w-[120px]">
//                         {file.name}
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         {formatFileSize(file.size)}
//                       </p>
//                     </div>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       onRemoveFile(index);
//                     }}
//                     className="p-1 rounded hover:bg-red-900/30 text-red-400"
//                   >
//                     <TrashIcon className="h-4 w-4" />
//                   </button>
//                 </div>
//               ))}
//             </div>
            
//             <button
//               type="button"
//               onClick={() => ref.current?.click()}
//               className="text-sm text-purple-400 hover:text-purple-300"
//             >
//               Add more files
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );

//   // Custom Icons
//   const CalendarIcon = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
//       <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
//     </svg>
//   );

//   const BuildingOfficeIcon = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
//       <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
//     </svg>
//   );

//   // Qualification Item Component
//   const QualificationItem = ({ qual, index }) => (
//     <motion.div
//       initial={{ opacity: 0, scale: 0.95 }}
//       animate={{ opacity: 1, scale: 1 }}
//       className="mb-6"
//     >
//       <div className="flex items-center justify-between p-5 rounded-t-2xl bg-gradient-to-r from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//         <div className="flex items-center gap-4">
//           <div className="p-3 rounded-xl bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-800/30">
//             <AcademicCapIcon className="h-6 w-6 text-blue-400" />
//           </div>
//           <div>
//             <h4 className="font-bold text-white text-lg">{qual.degree}</h4>
//             <div className="flex items-center gap-3 mt-1">
//               <div className="flex items-center gap-1">
//                 <BookOpenIcon className="h-4 w-4 text-gray-400" />
//                 <span className="text-sm text-gray-300">{qual.institute}</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <CalendarIcon className="h-4 w-4 text-gray-400" />
//                 <span className="text-sm text-gray-300">Year: {qual.year}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//         <button
//           type="button"
//           onClick={() => handleRemoveQualification(index)}
//           className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-800/30 transition-colors"
//         >
//           <XMarkIcon className="h-5 w-5" />
//         </button>
//       </div>

//       <div className="p-5 rounded-b-2xl border-x border-b border-gray-700/50 bg-gray-900/30">
//         <div className="mb-4">
//           <div className="flex items-center justify-between mb-3">
//             <div className="flex items-center gap-2">
//               <DocumentTextIcon className="h-5 w-5 text-blue-400" />
//               <h5 className="font-semibold text-white">
//                 Upload Certificate for "{qual.degree}"
//               </h5>
//             </div>
//             <span className="text-xs text-gray-500">Max 10MB</span>
//           </div>
          
//           {qual.certificateFile ? (
//             <div className="space-y-4">
//               <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-700">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 rounded-lg bg-blue-900/30">
//                     <DocumentIcon className="h-5 w-5 text-blue-400" />
//                   </div>
//                   <div>
//                     <p className="font-medium text-white">{qual.certificateFile.name}</p>
//                     <p className="text-sm text-gray-400">{formatFileSize(qual.certificateFile.size)}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   {qual.certificatePreview && (
//                     <button
//                       type="button"
//                       onClick={() => window.open(qual.certificatePreview, '_blank')}
//                       className="p-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-800/30 transition-colors"
//                     >
//                       <EyeIcon className="h-4 w-4" />
//                     </button>
//                   )}
//                   <button
//                     type="button"
//                     onClick={() => handleRemoveQualificationCertificate(index)}
//                     className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-800/30 transition-colors"
//                   >
//                     <TrashIcon className="h-4 w-4" />
//                   </button>
//                 </div>
//               </div>
              
//               {qual.certificatePreview && qual.certificateFile.type.startsWith('image/') && (
//                 <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700">
//                   <p className="text-sm font-medium text-gray-300 mb-2">Certificate Preview:</p>
//                   <div className="relative rounded-lg overflow-hidden border border-gray-700">
//                     <img 
//                       src={qual.certificatePreview} 
//                       alt={`${qual.degree} Certificate`}
//                       className="w-full h-40 object-contain bg-gray-900"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div>
//               <input
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 onChange={(e) => handleQualificationCertificate(e, index)}
//                 className="hidden"
//                 id={`qual-cert-${index}`}
//               />
//               <label
//                 htmlFor={`qual-cert-${index}`}
//                 className="block p-6 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500/50 hover:bg-gray-900/30 transition-all duration-300 cursor-pointer"
//               >
//                 <div className="flex flex-col items-center gap-3">
//                   <div className="p-4 rounded-full bg-blue-900/20">
//                     <CloudArrowUpIcon className="h-8 w-8 text-blue-400" />
//                   </div>
//                   <div className="text-center">
//                     <p className="font-medium text-white">Click to upload certificate</p>
//                     <p className="text-sm text-gray-400 mt-1">
//                       For: <span className="text-blue-300">{qual.degree}</span> from <span className="text-blue-300">{qual.institute}</span>
//                     </p>
//                     <p className="text-xs text-gray-500 mt-2">PDF, JPEG, or PNG format</p>
//                   </div>
//                 </div>
//               </label>
//             </div>
//           )}
//         </div>
        
//         {!qual.certificateFile && (
//           <div className="mt-4 p-3 rounded-lg bg-amber-900/10 border border-amber-800/30">
//             <p className="text-sm text-amber-300 flex items-center gap-2">
//               <ExclamationTriangleIcon className="h-4 w-4" />
//               Certificate optional - can be uploaded later
//             </p>
//           </div>
//         )}
//       </div>
//     </motion.div>
//   );

//   // Certification Item Component
//   const CertificationItem = ({ cert, index }) => (
//     <motion.div
//       initial={{ opacity: 0, scale: 0.95 }}
//       animate={{ opacity: 1, scale: 1 }}
//       className="mb-6"
//     >
//       <div className="flex items-center justify-between p-5 rounded-t-2xl bg-gradient-to-r from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//         <div className="flex items-center gap-4">
//           <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-800/30">
//             <ShieldCheckIcon className="h-6 w-6 text-emerald-400" />
//           </div>
//           <div>
//             <h4 className="font-bold text-white text-lg">{cert.name}</h4>
//             <div className="flex items-center gap-3 mt-1">
//               <div className="flex items-center gap-1">
//                 <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
//                 <span className="text-sm text-gray-300">{cert.issuer}</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <CalendarIcon className="h-4 w-4 text-gray-400" />
//                 <span className="text-sm text-gray-300">Issued: {cert.issueDate}</span>
//               </div>
//               {cert.expiryDate && (
//                 <div className="flex items-center gap-1">
//                   <ClockIcon className="h-4 w-4 text-gray-400" />
//                   <span className="text-sm text-gray-300">Expires: {cert.expiryDate}</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//         <button
//           type="button"
//           onClick={() => handleRemoveCertification(index)}
//           className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-800/30 transition-colors"
//         >
//           <XMarkIcon className="h-5 w-5" />
//         </button>
//       </div>

//       <div className="p-5 rounded-b-2xl border-x border-b border-gray-700/50 bg-gray-900/30">
//         <div className="mb-4">
//           <div className="flex items-center justify-between mb-3">
//             <div className="flex items-center gap-2">
//               <DocumentTextIcon className="h-5 w-5 text-emerald-400" />
//               <h5 className="font-semibold text-white">
//                 Upload Certificate for "{cert.name}"
//               </h5>
//             </div>
//             <span className="text-xs text-gray-500">Max 10MB</span>
//           </div>
          
//           {cert.certificateFile ? (
//             <div className="space-y-4">
//               <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-700">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2 rounded-lg bg-emerald-900/30">
//                     <DocumentIcon className="h-5 w-5 text-emerald-400" />
//                   </div>
//                   <div>
//                     <p className="font-medium text-white">{cert.certificateFile.name}</p>
//                     <p className="text-sm text-gray-400">{formatFileSize(cert.certificateFile.size)}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   {cert.certificatePreview && (
//                     <button
//                       type="button"
//                       onClick={() => window.open(cert.certificatePreview, '_blank')}
//                       className="p-2 rounded-lg bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/30 transition-colors"
//                     >
//                       <EyeIcon className="h-4 w-4" />
//                     </button>
//                   )}
//                   <button
//                     type="button"
//                     onClick={() => handleRemoveCertificationCertificate(index)}
//                     className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-800/30 transition-colors"
//                   >
//                     <TrashIcon className="h-4 w-4" />
//                   </button>
//                 </div>
//               </div>
              
//               {cert.certificatePreview && cert.certificateFile.type.startsWith('image/') && (
//                 <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700">
//                   <p className="text-sm font-medium text-gray-300 mb-2">Certificate Preview:</p>
//                   <div className="relative rounded-lg overflow-hidden border border-gray-700">
//                     <img 
//                       src={cert.certificatePreview} 
//                       alt={`${cert.name} Certificate`}
//                       className="w-full h-40 object-contain bg-gray-900"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div>
//               <input
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 onChange={(e) => handleCertificationFile(e, index)}
//                 className="hidden"
//                 id={`cert-file-${index}`}
//               />
//               <label
//                 htmlFor={`cert-file-${index}`}
//                 className="block p-6 rounded-xl border-2 border-dashed border-gray-600 hover:border-emerald-500/50 hover:bg-gray-900/30 transition-all duration-300 cursor-pointer"
//               >
//                 <div className="flex flex-col items-center gap-3">
//                   <div className="p-4 rounded-full bg-emerald-900/20">
//                     <CloudArrowUpIcon className="h-8 w-8 text-emerald-400" />
//                   </div>
//                   <div className="text-center">
//                     <p className="font-medium text-white">Click to upload certificate</p>
//                     <p className="text-sm text-gray-400 mt-1">
//                       For: <span className="text-emerald-300">{cert.name}</span> issued by <span className="text-emerald-300">{cert.issuer}</span>
//                     </p>
//                     <p className="text-xs text-gray-500 mt-2">PDF, JPEG, or PNG format</p>
//                   </div>
//                 </div>
//               </label>
//             </div>
//           )}
//         </div>
//       </div>
//     </motion.div>
//   );

//   // Upload Progress Modal
//   const UploadProgressModal = () => (
//     <AnimatePresence>
//       {showUploadProgress && (
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
//         >
//           <motion.div
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             exit={{ scale: 0.9, opacity: 0 }}
//             className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4"
//           >
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-xl font-bold text-white flex items-center gap-2">
//                 <CloudArrowUpIcon className="h-6 w-6 text-blue-400" />
//                 Uploading Files
//               </h3>
//               <button
//                 onClick={() => setShowUploadProgress(false)}
//                 className="text-gray-400 hover:text-white"
//               >
//                 <XMarkIcon className="h-5 w-5" />
//               </button>
//             </div>
            
//             <div className="space-y-4">
//               {/* Overall Progress */}
//               <div>
//                 <div className="flex justify-between mb-2">
//                   <span className="text-sm text-gray-300">Overall Progress</span>
//                   <span className="text-sm font-medium text-white">{uploadProgress.overall}%</span>
//                 </div>
//                 <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
//                   <motion.div
//                     initial={{ width: 0 }}
//                     animate={{ width: `${uploadProgress.overall}%` }}
//                     className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
//                   />
//                 </div>
//               </div>
              
//               {/* Profile Picture Progress */}
//               {profilePic && (
//                 <div>
//                   <div className="flex justify-between mb-1">
//                     <span className="text-xs text-gray-400">Profile Picture</span>
//                     <span className="text-xs font-medium text-white">{uploadProgress.profilePic}%</span>
//                   </div>
//                   <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
//                     <motion.div
//                       initial={{ width: 0 }}
//                       animate={{ width: `${uploadProgress.profilePic}%` }}
//                       className="h-full bg-blue-400 rounded-full"
//                     />
//                   </div>
//                 </div>
//               )}
              
//               {/* Upload Status List */}
//               <div className="max-h-60 overflow-y-auto">
//                 {backgroundUploads.map((upload, index) => (
//                   <div key={index} className="flex items-center justify-between p-2 mb-1 rounded-lg bg-gray-800/50">
//                     <div className="flex items-center gap-2">
//                       <DocumentIcon className={`h-4 w-4 ${
//                         upload.status === 'completed' ? 'text-green-400' :
//                         upload.status === 'failed' ? 'text-red-400' :
//                         'text-blue-400'
//                       }`} />
//                       <div>
//                         <p className="text-xs font-medium text-gray-300 truncate max-w-[200px]">
//                           {upload.fileName}
//                         </p>
//                         <p className="text-xs text-gray-500 capitalize">
//                           {upload.type.replace(/([A-Z])/g, ' $1').trim()}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       {upload.status === 'completed' && (
//                         <CheckCircleIcon className="h-4 w-4 text-green-400" />
//                       )}
//                       {upload.status === 'failed' && (
//                         <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
//                       )}
//                       {upload.status === 'pending' && (
//                         <div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
//                       )}
//                       <span className={`text-xs font-medium ${
//                         upload.status === 'completed' ? 'text-green-400' :
//                         upload.status === 'failed' ? 'text-red-400' :
//                         'text-blue-400'
//                       }`}>
//                         {upload.status}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
              
//               <div className="pt-4 border-t border-gray-700">
//                 <p className="text-xs text-gray-400 text-center">
//                   Files are uploading in background. You can close this popup.
//                 </p>
//                 <button
//                   onClick={() => setShowUploadProgress(false)}
//                   className="w-full mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );

//   // Render current profile section for mobile
//   const renderMobileProfileSection = () => {
//     switch(activeProfileSection) {
//       case 1: // Personal Info
//         return (
//           <motion.div
//             key="personal-info"
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: 20 }}
//             className="space-y-6"
//           >
//             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30">
//                 <UserCircleIcon className="h-6 w-6 text-purple-400" />
//               </div>
//               Personal Information
//             </h3>
            
//             <div className="mb-6">
//               <label className="block text-sm font-medium text-gray-300 mb-3">
//                 Profile Picture (Optional)
//               </label>
//               <div className="flex flex-col items-center gap-4">
//                 <div className="relative">
//                   {profilePicPreview ? (
//                     <div className="relative">
//                       <img 
//                         src={profilePicPreview} 
//                         alt="Profile preview" 
//                         className="w-32 h-32 rounded-full object-cover border-4 border-purple-900/30"
//                       />
//                       <button
//                         type="button"
//                         onClick={removeProfilePic}
//                         className="absolute -top-2 -right-2 p-1.5 bg-red-600 rounded-full hover:bg-red-700"
//                       >
//                         <XMarkIcon className="h-4 w-4 text-white" />
//                       </button>
//                     </div>
//                   ) : (
//                     <div 
//                       className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-4 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
//                       onClick={() => profilePicRef.current?.click()}
//                     >
//                       <CameraIcon className="h-8 w-8 text-gray-500" />
//                     </div>
//                   )}
//                 </div>
//                 <input
//                   type="file"
//                   ref={profilePicRef}
//                   onChange={handleProfilePicChange}
//                   accept="image/*"
//                   className="hidden"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => profilePicRef.current?.click()}
//                   className="px-4 py-2 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50"
//                 >
//                   {profilePic ? 'Change Photo' : 'Upload Photo (Optional)'}
//                 </button>
//                 <p className="text-xs text-gray-500 text-center">
//                   Recommended: Square image, max 5MB
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-5">
//               <div>
//                 <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
//                   Full Name *
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <UserCircleIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="name"
//                     name="name"
//                     type="text"
//                     autoComplete="name"
//                     required
//                     value={formData.name}
//                     onChange={handleChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                     placeholder="John Doe"
//                   />
//                 </div>
//                 {errors.name && (
//                   <p className="mt-2 text-sm text-red-400">{errors.name}</p>
//                 )}
//               </div>

//               <div>
//                 <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
//                   Phone Number *
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <PhoneIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="phone"
//                     name="phone"
//                     type="tel"
//                     autoComplete="tel"
//                     required
//                     value={formData.phone}
//                     onChange={handleChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                     placeholder="+1 (555) 123-4567"
//                   />
//                 </div>
//                 {errors.phone && (
//                   <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
//                 )}
//               </div>

//               <div>
//                 <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
//                   Password *
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LockClosedIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="password"
//                     name="password"
//                     type={showPassword ? 'text' : 'password'}
//                     autoComplete="new-password"
//                     required
//                     value={formData.password}
//                     onChange={handleChange}
//                     className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                     placeholder="Create a strong password"
//                   />
//                   <button
//                     type="button"
//                     className="absolute right-4 top-1/2 transform -translate-y-1/2"
//                     onClick={() => setShowPassword(!showPassword)}
//                   >
//                     {showPassword ? (
//                       <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
//                     ) : (
//                       <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
//                     )}
//                   </button>
//                 </div>
//                 {errors.password && (
//                   <p className="mt-2 text-sm text-red-400">{errors.password}</p>
//                 )}
//               </div>

//               <div>
//                 <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
//                   Confirm Password *
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <ShieldCheckIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="confirmPassword"
//                     name="confirmPassword"
//                     type={showConfirmPassword ? 'text' : 'password'}
//                     autoComplete="new-password"
//                     required
//                     value={formData.confirmPassword}
//                     onChange={handleChange}
//                     className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                     placeholder="Confirm your password"
//                   />
//                   <button
//                     type="button"
//                     className="absolute right-4 top-1/2 transform -translate-y-1/2"
//                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                   >
//                     {showConfirmPassword ? (
//                       <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
//                     ) : (
//                       <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors" />
//                     )}
//                   </button>
//                 </div>
//                 {errors.confirmPassword && (
//                   <p className="mt-2 text-sm text-red-400">{errors.confirmPassword}</p>
//                 )}
//               </div>
//             </div>
//           </motion.div>
//         );

//       case 2: // Streamer Profile
//         return (
//           <motion.div
//             key="streamer-profile"
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: 20 }}
//             className="space-y-6"
//           >
//             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-amber-900/30 to-orange-900/30">
//                 <TrophyIcon className="h-6 w-6 text-amber-400" />
//               </div>
//               Streamer Profile *
//             </h3>
            
//             <div className="space-y-5">
//               <div>
//                 <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
//                   Bio *
//                 </label>
//                 <textarea
//                   id="bio"
//                   name="bio"
//                   rows={4}
//                   required
//                   value={streamerProfile.bio}
//                   onChange={handleStreamerProfileChange}
//                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none transition-all duration-300"
//                   placeholder="Tell us about yourself, your teaching style, expertise..."
//                 />
//                 {errors.bio && (
//                   <p className="mt-2 text-sm text-red-400">{errors.bio}</p>
//                 )}
//                 <div className="mt-3 flex items-center justify-between">
//                   <span className={`text-xs ${streamerProfile.bio.length >= 50 ? 'text-green-400' : 'text-gray-500'}`}>
//                     {streamerProfile.bio.length >= 50 ? '✓ Minimum reached' : `${50 - streamerProfile.bio.length} more characters`}
//                   </span>
//                   <span className="text-xs text-gray-500">
//                     {streamerProfile.bio.length} characters
//                   </span>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-300 mb-2">
//                   Expertise *
//                 </label>
//                 <div className="flex gap-2">
//                   <input
//                     type="text"
//                     value={expertiseInput}
//                     onChange={(e) => setExpertiseInput(e.target.value)}
//                     onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
//                     className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
//                     placeholder="Add expertise (e.g., JavaScript, Python)"
//                   />
//                   <motion.button
//                     whileTap={{ scale: 0.95 }}
//                     type="button"
//                     onClick={handleAddExpertise}
//                     className="px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl"
//                   >
//                     Add
//                   </motion.button>
//                 </div>
//                 {errors.expertise && (
//                   <p className="mt-2 text-sm text-red-400">{errors.expertise}</p>
//                 )}
//                 <div className="mt-3 flex flex-wrap gap-2">
//                   {streamerProfile.expertise.map((exp, index) => (
//                     <motion.span
//                       key={index}
//                       initial={{ opacity: 0, scale: 0.8 }}
//                       animate={{ opacity: 1, scale: 1 }}
//                       className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-purple-900/30 to-blue-900/30 text-purple-300 border border-purple-800/50"
//                     >
//                       {exp}
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveExpertise(index)}
//                         className="ml-1.5 h-4 w-4 flex items-center justify-center rounded-full hover:bg-purple-900/50"
//                       >
//                         ×
//                       </button>
//                     </motion.span>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-300 mb-2">
//                   Years of Experience
//                 </label>
//                 <div className="flex items-center gap-4">
//                   <input
//                     id="experienceYears"
//                     name="experienceYears"
//                     type="range"
//                     min="0"
//                     max="50"
//                     value={streamerProfile.experienceYears}
//                     onChange={handleStreamerProfileChange}
//                     className="flex-1 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg appearance-none cursor-pointer"
//                   />
//                   <span className="text-lg font-bold text-amber-400 min-w-[2rem]">
//                     {streamerProfile.experienceYears}
//                   </span>
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="experienceDescription" className="block text-sm font-medium text-gray-300 mb-2">
//                   Experience Description
//                 </label>
//                 <textarea
//                   id="experienceDescription"
//                   name="experienceDescription"
//                   rows={3}
//                   value={streamerProfile.experienceDescription}
//                   onChange={handleStreamerProfileChange}
//                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none transition-all duration-300"
//                   placeholder="Describe your teaching/streaming experience..."
//                 />
//               </div>
//             </div>
//           </motion.div>
//         );

//       case 3: // Qualifications
//         return (
//           <motion.div
//             key="qualifications"
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: 20 }}
//             className="space-y-6"
//           >
//             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
//                 <BookOpenIcon className="h-6 w-6 text-blue-400" />
//               </div>
//               Qualifications (Optional)
//             </h3>
            
//             <div className="space-y-4">
//               {streamerProfile.qualifications.map((qual, index) => (
//                 <QualificationItem key={index} qual={qual} index={index} />
//               ))}
//             </div>
            
//             <div className="grid grid-cols-1 gap-3 p-4 rounded-xl bg-gray-900/30 border border-gray-700/50">
//               <input
//                 type="text"
//                 value={qualificationInput.degree}
//                 onChange={(e) => setQualificationInput({...qualificationInput, degree: e.target.value})}
//                 className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                 placeholder="Degree"
//               />
//               <input
//                 type="text"
//                 value={qualificationInput.institute}
//                 onChange={(e) => setQualificationInput({...qualificationInput, institute: e.target.value})}
//                 className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                 placeholder="Institute"
//               />
//               <div className="grid grid-cols-2 gap-3">
//                 <input
//                   type="number"
//                   value={qualificationInput.year}
//                   onChange={(e) => setQualificationInput({...qualificationInput, year: e.target.value})}
//                   className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                   placeholder="Year"
//                 />
//                 <motion.button
//                   whileTap={{ scale: 0.95 }}
//                   type="button"
//                   onClick={handleAddQualification}
//                   className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg"
//                 >
//                   Add Qualification
//                 </motion.button>
//               </div>
//             </div>
            
//             <div className="mt-6">
//               <FileUploadArea
//                 title="Additional Qualification Certificates (Optional)"
//                 description="Upload extra qualification certificates"
//                 onFileChange={handleQualificationFilesChange}
//                 files={qualificationFiles}
//                 onRemoveFile={removeQualificationFile}
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 multiple={true}
//                 ref={qualificationFilesRef}
//               />
//             </div>
//           </motion.div>
//         );

//       case 4: // Documents Section
//         return (
//           <motion.div
//             key="documents"
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: 20 }}
//             className="space-y-6"
//           >
//             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-900/30 to-teal-900/30">
//                 <DocumentIcon className="h-6 w-6 text-emerald-400" />
//               </div>
//               Certifications (Optional)
//             </h3>
            
//             <div className="space-y-4">
//               {streamerProfile.certifications.map((cert, index) => (
//                 <CertificationItem key={index} cert={cert} index={index} />
//               ))}
              
//               <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-700/50 space-y-3">
//                 <input
//                   type="text"
//                   value={certificationInput.name}
//                   onChange={(e) => setCertificationInput({...certificationInput, name: e.target.value})}
//                   className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                   placeholder="Certification Name"
//                 />
//                 <input
//                   type="text"
//                   value={certificationInput.issuer}
//                   onChange={(e) => setCertificationInput({...certificationInput, issuer: e.target.value})}
//                   className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                   placeholder="Issuing Organization"
//                 />
//                 <div className="grid grid-cols-2 gap-3">
//                   <input
//                     type="date"
//                     value={certificationInput.issueDate}
//                     onChange={(e) => setCertificationInput({...certificationInput, issueDate: e.target.value})}
//                     className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                     placeholder="Issue Date"
//                   />
//                   <input
//                     type="date"
//                     value={certificationInput.expiryDate}
//                     onChange={(e) => setCertificationInput({...certificationInput, expiryDate: e.target.value})}
//                     className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                     placeholder="Expiry Date (Optional)"
//                   />
//                 </div>
//                 <motion.button
//                   whileTap={{ scale: 0.95 }}
//                   type="button"
//                   onClick={handleAddCertification}
//                   className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-lg"
//                 >
//                   Add Certification
//                 </motion.button>
//               </div>

//               {/* Additional Files Upload */}
//               <FileUploadArea
//                 title="Additional Documents (Optional)"
//                 description="Upload additional certificates or documents"
//                 onFileChange={handleCertificationFilesChange}
//                 files={certificationFiles}
//                 onRemoveFile={removeCertificationFile}
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 multiple={true}
//                 ref={certificationFilesRef}
//               />
//             </div>
//           </motion.div>
//         );

//       case 5: // Social Links
//         return (
//           <motion.div
//             key="social-links"
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: 20 }}
//             className="space-y-6"
//           >
//             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
//               <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
//                 <GlobeAltIcon className="h-6 w-6 text-indigo-400" />
//               </div>
//               Social Links (Optional)
//             </h3>
            
//             <div className="space-y-4">
//               <div>
//                 <label htmlFor="youtube" className="block text-sm font-medium text-gray-300 mb-2">
//                   YouTube
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LinkIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="youtube"
//                     name="socialLinks.youtube"
//                     type="url"
//                     value={streamerProfile.socialLinks.youtube}
//                     onChange={handleStreamerProfileChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
//                     placeholder="https://youtube.com/@yourchannel"
//                   />
//                 </div>
//               </div>
              
//               <div>
//                 <label htmlFor="linkedin" className="block text-sm font-medium text-gray-300 mb-2">
//                   LinkedIn
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LinkIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="linkedin"
//                     name="socialLinks.linkedin"
//                     type="url"
//                     value={streamerProfile.socialLinks.linkedin}
//                     onChange={handleStreamerProfileChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                     placeholder="https://linkedin.com/in/yourprofile"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-2">
//                   Twitter
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LinkIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="twitter"
//                     name="socialLinks.twitter"
//                     type="url"
//                     value={streamerProfile.socialLinks.twitter}
//                     onChange={handleStreamerProfileChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
//                     placeholder="https://twitter.com/@yourhandle"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="github" className="block text-sm font-medium text-gray-300 mb-2">
//                   GitHub
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LinkIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="github"
//                     name="socialLinks.github"
//                     type="url"
//                     value={streamerProfile.socialLinks.github}
//                     onChange={handleStreamerProfileChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500"
//                     placeholder="https://github.com/yourusername"
//                   />
//                 </div>
//               </div>
              
//               <div>
//                 <label htmlFor="portfolio" className="block text-sm font-medium text-gray-300 mb-2">
//                   Portfolio
//                 </label>
//                 <div className="relative">
//                   <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                     <LinkIcon className="h-5 w-5 text-gray-500" />
//                   </div>
//                   <input
//                     id="portfolio"
//                     name="socialLinks.portfolio"
//                     type="url"
//                     value={streamerProfile.socialLinks.portfolio}
//                     onChange={handleStreamerProfileChange}
//                     className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
//                     placeholder="https://yourportfolio.com"
//                   />
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 overflow-hidden relative">
//       <UploadProgressModal />
      
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-900/20 blur-3xl"></div>
//         <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-900/20 blur-3xl"></div>
//       </div>

//       <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg lg:max-w-4xl">
//         <motion.div 
//           initial={{ y: -20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ duration: 0.5 }}
//           className="text-center mb-6 sm:mb-8"
//         >
//           <div className="flex flex-col items-center justify-center gap-3 mb-4">
//             <motion.div
//               whileHover={{ scale: 1.05 }}
//               className="p-3 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm border border-purple-800/30"
//             >
//               <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500">
//                 <SparklesIcon className="h-6 w-6 text-white" />
//               </div>
//             </motion.div>
            
//             <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
//               <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
//                 {isMobile ? 'Streamer Sign Up' : 'Become a Streamer'}
//               </span>
//             </h1>
            
//             <p className="text-sm sm:text-base text-gray-300 max-w-md">
//               {isMobile ? 'Create your teaching profile' : 'Join our community of educators and share your knowledge'}
//             </p>
//           </div>
//         </motion.div>

//         <motion.div 
//           variants={containerVariants}
//           initial="hidden"
//           animate="visible"
//           className="mb-8"
//         >
//           <div className="flex items-center justify-center space-x-4 sm:space-x-8">
//             {steps.map((stepItem, index) => (
//               <motion.div
//                 key={stepItem.number}
//                 variants={itemVariants}
//                 className="flex items-center"
//               >
//                 <div className="flex flex-col items-center">
//                   <motion.div
//                     whileHover={{ scale: 1.05 }}
//                     className={`relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 transition-all duration-300 ${
//                       step >= stepItem.number
//                         ? 'border-purple-500 bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30'
//                         : 'border-gray-700 bg-gray-900/50'
//                     }`}
//                   >
//                     <stepItem.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${
//                       step >= stepItem.number ? 'text-white' : 'text-gray-500'
//                     }`} />
                    
//                     {step > stepItem.number && (
//                       <motion.div
//                         initial={{ scale: 0 }}
//                         animate={{ scale: 1 }}
//                         className="absolute -top-1 -right-1"
//                       >
//                         <div className="p-1 bg-green-500 rounded-full">
//                           <CheckCircleIcon className="h-3 w-3 text-white" />
//                         </div>
//                       </motion.div>
//                     )}
//                   </motion.div>
                  
//                   <span className={`mt-2 text-xs sm:text-sm font-medium ${
//                     step >= stepItem.number 
//                       ? 'text-purple-400' 
//                       : 'text-gray-500'
//                   }`}>
//                     {isMobile ? stepItem.number : stepItem.title}
//                   </span>
//                 </div>
                
//                 {index < steps.length - 1 && (
//                   <div className={`hidden sm:block w-12 h-1 ${
//                     step > stepItem.number 
//                       ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
//                       : 'bg-gray-700'
//                   } transition-all duration-300 rounded-full`}></div>
//                 )}
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>

//         <AnimatePresence mode="wait">
//           {/* Step 1: Email Input */}
//           {step === 1 && (
//             <motion.div
//               key="step-1"
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: 20 }}
//               transition={{ duration: 0.3 }}
//               className="bg-gray-900/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-700/50"
//             >
//               <div className="px-6 py-8 sm:px-8 sm:py-10">
//                 <div className="mx-auto">
//                   <div className="text-center mb-6 sm:mb-8">
//                     <motion.div
//                       whileHover={{ scale: 1.05 }}
//                       className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 mb-4"
//                     >
//                       <EnvelopeIcon className="h-7 w-7 sm:h-8 sm:w-8 text-purple-400" />
//                     </motion.div>
//                     <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
//                       Start Your Journey
//                     </h2>
//                     <p className="text-gray-400 text-sm sm:text-base">
//                       Enter your email to begin
//                     </p>
//                   </div>

//                   <form onSubmit={handleSendEmailOtp} className="space-y-6">
//                     <motion.div
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: 0.1 }}
//                     >
//                       <label htmlFor="email" className="block text-sm font-semibold text-gray-200 mb-2">
//                         Email Address
//                       </label>
//                       <div className="relative">
//                         <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
//                           <EnvelopeIcon className="h-5 w-5 text-purple-400" />
//                         </div>
//                         <input
//                           id="email"
//                           name="email"
//                           type="email"
//                           autoComplete="email"
//                           required
//                           value={formData.email}
//                           onChange={handleChange}
//                           className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl border border-gray-700 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                           placeholder="you@example.com"
//                         />
//                       </div>
//                       {errors.email && (
//                         <motion.p 
//                           initial={{ opacity: 0, y: -10 }}
//                           animate={{ opacity: 1, y: 0 }}
//                           className="mt-2 text-sm text-red-400"
//                         >
//                           {errors.email}
//                         </motion.p>
//                       )}
//                     </motion.div>

//                     <motion.div
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: 0.2 }}
//                     >
//                       <motion.button
//                         whileHover={{ scale: 1.02 }}
//                         whileTap={{ scale: 0.98 }}
//                         type="submit"
//                         disabled={loading}
//                         className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
//                       >
//                         {loading ? (
//                           <div className="flex items-center justify-center gap-2">
//                             <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                             Sending...
//                           </div>
//                         ) : (
//                           <div className="flex items-center justify-center gap-2">
//                             Continue
//                             <ChevronRightIcon className="h-5 w-5" />
//                           </div>
//                         )}
//                       </motion.button>
//                     </motion.div>

//                     <motion.div
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       transition={{ delay: 0.3 }}
//                       className="text-center pt-4 border-t border-gray-800/50"
//                     >
//                       <p className="text-gray-400 text-sm">
//                         Already have an account?{' '}
//                         <Link 
//                           to="/signin" 
//                           className="font-semibold text-purple-400 hover:text-purple-300 transition-colors"
//                         >
//                           Sign in
//                         </Link>
//                       </p>
//                     </motion.div>
//                   </form>
//                 </div>
//               </div>
//             </motion.div>
//           )}

//           {/* Step 2: Email OTP Verification */}
//           {step === 2 && (
//             <motion.div
//               key="step-2"
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: 20 }}
//               transition={{ duration: 0.3 }}
//               className="bg-gray-900/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-700/50"
//             >
//               <div className="px-6 py-8 sm:px-8 sm:py-10">
//                 <div className="mx-auto">
//                   <div className="text-center mb-6 sm:mb-8">
//                     <motion.div
//                       whileHover={{ scale: 1.05 }}
//                       className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 mb-4"
//                     >
//                       <ShieldCheckIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-400" />
//                     </motion.div>
//                     <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
//                       Verify Email
//                     </h2>
//                     <p className="text-gray-400 text-sm sm:text-base">
//                       Code sent to{' '}
//                       <span className="font-semibold text-purple-400">{formData.email}</span>
//                     </p>
//                   </div>

//                   <form onSubmit={handleVerifyEmailOtp} className="space-y-6">
//                     <motion.div
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: 0.1 }}
//                     >
//                       <label className="block text-sm font-semibold text-gray-200 mb-3 text-center">
//                         Enter 4-digit code
//                       </label>
//                       <div className="flex justify-center gap-3">
//                         {[0, 1, 2, 3].map((index) => (
//                           <motion.div
//                             key={index}
//                             initial={{ opacity: 0, scale: 0.8 }}
//                             animate={{ opacity: 1, scale: 1 }}
//                             transition={{ delay: index * 0.1 }}
//                           >
//                             <input
//                               id={`otp-${index}`}
//                               type="text"
//                               inputMode="numeric"
//                               pattern="[0-9]"
//                               maxLength="1"
//                               value={otp[index]}
//                               onChange={(e) => handleOtpChange(e.target.value, index)}
//                               className="w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 border-gray-700 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
//                             />
//                           </motion.div>
//                         ))}
//                       </div>
//                       {errors.otp && (
//                         <motion.p 
//                           initial={{ opacity: 0, y: -10 }}
//                           animate={{ opacity: 1, y: 0 }}
//                           className="mt-3 text-sm text-red-400 text-center"
//                         >
//                           {errors.otp}
//                         </motion.p>
//                       )}
//                       <div className="mt-6 text-center">
//                         <motion.button
//                           type="button"
//                           onClick={handleResendEmailOtp}
//                           disabled={resendCooldown > 0 || loading}
//                           whileHover={{ scale: 1.05 }}
//                           whileTap={{ scale: 0.95 }}
//                           className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/30 border border-gray-700 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
//                         >
//                           {resendCooldown > 0 ? (
//                             <>
//                               <ClockIcon className="h-4 w-4" />
//                               Resend in {resendCooldown}s
//                             </>
//                           ) : (
//                             <>
//                               <EnvelopeIcon className="h-4 w-4" />
//                               Resend code
//                             </>
//                           )}
//                         </motion.button>
//                       </div>
//                     </motion.div>

//                     <motion.div
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: 0.2 }}
//                       className="flex gap-3"
//                     >
//                       <motion.button
//                         whileHover={{ scale: 1.02 }}
//                         whileTap={{ scale: 0.98 }}
//                         type="button"
//                         onClick={() => setStep(1)}
//                         className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800/50 font-semibold transition-all duration-300 flex items-center justify-center gap-2"
//                       >
//                         <ArrowLeftIcon className="h-4 w-4" />
//                         Back
//                       </motion.button>
//                       <motion.button
//                         whileHover={{ scale: 1.02 }}
//                         whileTap={{ scale: 0.98 }}
//                         type="submit"
//                         disabled={loading || otp.join('').length !== 4}
//                         className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                       >
//                         {loading ? (
//                           <>
//                             <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                             Verifying
//                           </>
//                         ) : (
//                           <>
//                             Verify
//                             <ChevronRightIcon className="h-4 w-4" />
//                           </>
//                         )}
//                       </motion.button>
//                     </motion.div>
//                   </form>
//                 </div>
//               </div>
//             </motion.div>
//           )}

//           {/* Step 3: Account Creation with Streamer Profile */}
//           {step === 3 && (
//             <motion.div
//               key="step-3"
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: 20 }}
//               transition={{ duration: 0.3 }}
//               className="bg-gray-900/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-700/50"
//             >
//               <div className="px-4 py-6 sm:px-8 sm:py-10">
//                 <div className="mx-auto">
//                   <div className="text-center mb-6">
//                     <motion.div
//                       whileHover={{ scale: 1.05 }}
//                       className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 mb-4"
//                     >
//                       <UserCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
//                     </motion.div>
//                     <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
//                       Complete Profile
//                     </h2>
//                     <p className="text-gray-400 text-sm sm:text-base">
//                       Fill in your details. Files will upload in background.
//                     </p>
//                   </div>

//                   {isMobile ? (
//                     // Mobile View - Section Tabs
//                     <div className="space-y-6">
//                       {/* Section Navigation */}
//                       <div className="flex items-center justify-between mb-4 bg-gray-900/30 rounded-xl p-1">
//                         {profileSections.map((section) => (
//                           <button
//                             key={section.id}
//                             onClick={() => setActiveProfileSection(section.id)}
//                             className={`flex-1 py-2 px-1 sm:px-2 rounded-lg flex flex-col items-center transition-all duration-300 ${
//                               activeProfileSection === section.id
//                                 ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30'
//                                 : 'hover:bg-gray-800/30'
//                             }`}
//                           >
//                             <section.icon className={`h-4 w-4 sm:h-5 sm:w-5 mb-1 ${
//                               activeProfileSection === section.id ? 'text-purple-400' : 'text-gray-500'
//                             }`} />
//                             <span className={`text-xs font-medium ${
//                               activeProfileSection === section.id ? 'text-purple-400' : 'text-gray-500'
//                             }`}>
//                               {section.title}
//                             </span>
//                           </button>
//                         ))}
//                       </div>

//                       {/* Section Navigation Arrows */}
//                       <div className="flex justify-between items-center mb-4">
//                         <motion.button
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => setActiveProfileSection(prev => Math.max(1, prev - 1))}
//                           disabled={activeProfileSection === 1}
//                           className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/30 border border-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
//                         >
//                           <ChevronLeftIcon className="h-4 w-4" />
//                           Prev
//                         </motion.button>
                        
//                         <div className="flex items-center gap-2">
//                           {profileSections.map((section) => (
//                             <div
//                               key={section.id}
//                               className={`h-1.5 rounded-full transition-all duration-300 ${
//                                 activeProfileSection === section.id
//                                   ? 'w-4 bg-purple-500'
//                                   : 'w-1.5 bg-gray-700'
//                               }`}
//                             />
//                           ))}
//                         </div>
                        
//                         <motion.button
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => setActiveProfileSection(prev => Math.min(5, prev + 1))}
//                           disabled={activeProfileSection === 5}
//                           className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/30 border border-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
//                         >
//                           Next
//                           <ChevronRightIcon className="h-4 w-4" />
//                         </motion.button>
//                       </div>

//                       {/* Current Section Content */}
//                       <AnimatePresence mode="wait">
//                         <div className="min-h-[400px]">
//                           {renderMobileProfileSection()}
//                         </div>
//                       </AnimatePresence>

//                       {/* Mobile Action Buttons */}
//                       <div className="mt-8 space-y-4">
//                         <div className="flex gap-3">
//                           <motion.button
//                             whileTap={{ scale: 0.98 }}
//                             type="button"
//                             onClick={() => setStep(2)}
//                             className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/50 text-gray-300 font-semibold transition-all duration-300 flex items-center justify-center gap-2"
//                           >
//                             <ArrowLeftIcon className="h-4 w-4" />
//                             Back
//                           </motion.button>
//                           <motion.button
//                             whileTap={{ scale: 0.98 }}
//                             type="button"
//                             onClick={handleCreateBasicAccount}
//                             disabled={loading || activeProfileSection !== 5 || !isMobileFormComplete()}
//                             className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                           >
//                             {loading ? (
//                               <>
//                                 <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                                 Creating...
//                               </>
//                             ) : (
//                               <>
//                                 <SparklesIcon className="h-4 w-4" />
//                                 Create Account
//                               </>
//                             )}
//                           </motion.button>
//                         </div>
                        
//                         {activeProfileSection < 5 && (
//                           <motion.button
//                             whileTap={{ scale: 0.95 }}
//                             type="button"
//                             onClick={() => setActiveProfileSection(prev => prev + 1)}
//                             className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-gray-400 font-medium transition-all duration-300 flex items-center justify-center gap-2"
//                           >
//                             Next Section
//                             <ChevronRightIcon className="h-4 w-4" />
//                           </motion.button>
//                         )}
//                       </div>
//                     </div>
//                   ) : (
//                     // Desktop View - Complete Form
//                     <form onSubmit={handleCreateBasicAccount} className="space-y-6">
//                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                         {/* Left Column - Personal Info & Documents */}
//                         <div className="space-y-6">
//                           {/* Profile Picture */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                               <CameraIcon className="h-5 w-5 text-purple-400" />
//                               Profile Picture (Optional)
//                             </h3>
                            
//                             <div className="flex flex-col items-center gap-4">
//                               <div className="relative">
//                                 {profilePicPreview ? (
//                                   <div className="relative">
//                                     <img 
//                                       src={profilePicPreview} 
//                                       alt="Profile preview" 
//                                       className="w-40 h-40 rounded-full object-cover border-4 border-purple-900/30"
//                                     />
//                                     <button
//                                       type="button"
//                                       onClick={removeProfilePic}
//                                       className="absolute -top-2 -right-2 p-1.5 bg-red-600 rounded-full hover:bg-red-700"
//                                     >
//                                       <XMarkIcon className="h-4 w-4 text-white" />
//                                     </button>
//                                   </div>
//                                 ) : (
//                                   <div 
//                                     className="w-40 h-40 rounded-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-4 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
//                                     onClick={() => profilePicRef.current?.click()}
//                                   >
//                                     <CameraIcon className="h-12 w-12 text-gray-500" />
//                                   </div>
//                                 )}
//                               </div>
//                               <input
//                                 type="file"
//                                 ref={profilePicRef}
//                                 onChange={handleProfilePicChange}
//                                 accept="image/*"
//                                 className="hidden"
//                               />
//                               <button
//                                 type="button"
//                                 onClick={() => profilePicRef.current?.click()}
//                                 className="px-4 py-2 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800/50"
//                               >
//                                 {profilePic ? 'Change Photo' : 'Upload Photo (Optional)'}
//                               </button>
//                               <p className="text-xs text-gray-500 text-center">
//                                 Recommended: Square image, max 5MB
//                               </p>
//                             </div>
//                           </div>

//                           {/* Personal Information */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                               <UserCircleIcon className="h-5 w-5 text-blue-400" />
//                               Personal Information
//                             </h3>
                            
//                             <div className="space-y-4">
//                               <div>
//                                 <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Full Name *
//                                 </label>
//                                 <input
//                                   id="name"
//                                   name="name"
//                                   type="text"
//                                   autoComplete="name"
//                                   required
//                                   value={formData.name}
//                                   onChange={handleChange}
//                                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="John Doe"
//                                 />
//                                 {errors.name && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.name}</p>
//                                 )}
//                               </div>

//                               <div>
//                                 <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Phone Number *
//                                 </label>
//                                 <input
//                                   id="phone"
//                                   name="phone"
//                                   type="tel"
//                                   autoComplete="tel"
//                                   required
//                                   value={formData.phone}
//                                   onChange={handleChange}
//                                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="+1 (555) 123-4567"
//                                 />
//                                 {errors.phone && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
//                                 )}
//                               </div>

//                               <div>
//                                 <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Password *
//                                 </label>
//                                 <div className="relative">
//                                   <input
//                                     id="password"
//                                     name="password"
//                                     type={showPassword ? 'text' : 'password'}
//                                     autoComplete="new-password"
//                                     required
//                                     value={formData.password}
//                                     onChange={handleChange}
//                                     className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                     placeholder="Create a strong password"
//                                   />
//                                   <button
//                                     type="button"
//                                     className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                                     onClick={() => setShowPassword(!showPassword)}
//                                   >
//                                     {showPassword ? (
//                                       <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                                     ) : (
//                                       <EyeIcon className="h-5 w-5 text-gray-400" />
//                                     )}
//                                   </button>
//                                 </div>
//                                 {errors.password && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.password}</p>
//                                 )}
//                               </div>

//                               <div>
//                                 <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Confirm Password *
//                                 </label>
//                                 <div className="relative">
//                                   <input
//                                     id="confirmPassword"
//                                     name="confirmPassword"
//                                     type={showConfirmPassword ? 'text' : 'password'}
//                                     autoComplete="new-password"
//                                     required
//                                     value={formData.confirmPassword}
//                                     onChange={handleChange}
//                                     className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                     placeholder="Confirm your password"
//                                   />
//                                   <button
//                                     type="button"
//                                     className="absolute right-3 top-1/2 transform -translate-y-1/2"
//                                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                                   >
//                                     {showConfirmPassword ? (
//                                       <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                                     ) : (
//                                       <EyeIcon className="h-5 w-5 text-gray-400" />
//                                     )}
//                                   </button>
//                                 </div>
//                                 {errors.confirmPassword && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.confirmPassword}</p>
//                                 )}
//                               </div>
//                             </div>
//                           </div>

//                           {/* Additional Documents */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                               <DocumentIcon className="h-5 w-5 text-emerald-400" />
//                               Additional Documents (Optional)
//                             </h3>
                            
//                             <div className="space-y-6">
//                               <FileUploadArea
//                                 title="Additional Qualification Certificates"
//                                 description="Upload extra qualification certificates"
//                                 onFileChange={handleQualificationFilesChange}
//                                 files={qualificationFiles}
//                                 onRemoveFile={removeQualificationFile}
//                                 accept=".pdf,.jpg,.jpeg,.png"
//                                 multiple={true}
//                                 ref={qualificationFilesRef}
//                               />

//                               <FileUploadArea
//                                 title="Additional Certification Files"
//                                 description="Upload extra certification documents"
//                                 onFileChange={handleCertificationFilesChange}
//                                 files={certificationFiles}
//                                 onRemoveFile={removeCertificationFile}
//                                 accept=".pdf,.jpg,.jpeg,.png"
//                                 multiple={true}
//                                 ref={certificationFilesRef}
//                               />
//                             </div>
//                           </div>
//                         </div>

//                         {/* Right Column - Streamer Profile */}
//                         <div className="space-y-6">
//                           {/* Streamer Profile Section */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                               <TrophyIcon className="h-5 w-5 text-amber-400" />
//                               Streamer Profile *
//                             </h3>
                            
//                             <div className="space-y-4">
//                               <div>
//                                 <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Bio *
//                                 </label>
//                                 <textarea
//                                   id="bio"
//                                   name="bio"
//                                   rows={3}
//                                   required
//                                   value={streamerProfile.bio}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
//                                   placeholder="Tell us about yourself..."
//                                 />
//                                 {errors.bio && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.bio}</p>
//                                 )}
//                                 <div className="mt-2 text-xs text-gray-500">
//                                   Minimum 50 characters required
//                                 </div>
//                               </div>

//                               <div>
//                                 <label className="block text-sm font-medium text-gray-300 mb-2">
//                                   Expertise *
//                                 </label>
//                                 <div className="flex gap-2">
//                                   <input
//                                     type="text"
//                                     value={expertiseInput}
//                                     onChange={(e) => setExpertiseInput(e.target.value)}
//                                     onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
//                                     className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
//                                     placeholder="Add expertise"
//                                   />
//                                   <button
//                                     type="button"
//                                     onClick={handleAddExpertise}
//                                     className="px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl"
//                                   >
//                                     Add
//                                   </button>
//                                 </div>
//                                 {errors.expertise && (
//                                   <p className="mt-2 text-sm text-red-400">{errors.expertise}</p>
//                                 )}
//                                 <div className="mt-2 flex flex-wrap gap-2">
//                                   {streamerProfile.expertise.map((exp, index) => (
//                                     <span
//                                       key={index}
//                                       className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-purple-900/30 to-blue-900/30 text-purple-300 border border-purple-800/50"
//                                     >
//                                       {exp}
//                                       <button
//                                         type="button"
//                                         onClick={() => handleRemoveExpertise(index)}
//                                         className="ml-1.5 h-4 w-4 flex items-center justify-center rounded-full hover:bg-purple-900/50"
//                                       >
//                                         ×
//                                       </button>
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>

//                               <div>
//                                 <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Years of Experience
//                                 </label>
//                                 <div className="flex items-center gap-4">
//                                   <input
//                                     id="experienceYears"
//                                     name="experienceYears"
//                                     type="range"
//                                     min="0"
//                                     max="50"
//                                     value={streamerProfile.experienceYears}
//                                     onChange={handleStreamerProfileChange}
//                                     className="flex-1 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg appearance-none cursor-pointer"
//                                   />
//                                   <span className="text-lg font-bold text-amber-400 min-w-[2rem]">
//                                     {streamerProfile.experienceYears}
//                                   </span>
//                                 </div>
//                               </div>

//                               <div>
//                                 <label htmlFor="experienceDescription" className="block text-sm font-medium text-gray-300 mb-2">
//                                   Experience Description
//                                 </label>
//                                 <textarea
//                                   id="experienceDescription"
//                                   name="experienceDescription"
//                                   rows={2}
//                                   value={streamerProfile.experienceDescription}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
//                                   placeholder="Describe your teaching/streaming experience..."
//                                 />
//                               </div>
//                             </div>
//                           </div>

//                           {/* Qualifications Section */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <div className="flex items-center justify-between mb-6">
//                               <div className="flex items-center gap-2">
//                                 <div className="p-2 rounded-lg bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
//                                   <BookOpenIcon className="h-5 w-5 text-blue-400" />
//                                 </div>
//                                 <h3 className="text-lg font-bold text-white">Qualifications (Optional)</h3>
//                               </div>
//                               <span className="text-sm text-gray-400">
//                                 {streamerProfile.qualifications.length} added
//                               </span>
//                             </div>
                            
//                             <div className="space-y-4">
//                               {streamerProfile.qualifications.map((qual, index) => (
//                                 <QualificationItem key={index} qual={qual} index={index} />
//                               ))}
                              
//                               <div className="grid grid-cols-2 gap-3">
//                                 <input
//                                   type="text"
//                                   value={qualificationInput.degree}
//                                   onChange={(e) => setQualificationInput({...qualificationInput, degree: e.target.value})}
//                                   className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="Degree"
//                                 />
//                                 <input
//                                   type="text"
//                                   value={qualificationInput.institute}
//                                   onChange={(e) => setQualificationInput({...qualificationInput, institute: e.target.value})}
//                                   className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="Institute"
//                                 />
//                                 <input
//                                   type="number"
//                                   value={qualificationInput.year}
//                                   onChange={(e) => setQualificationInput({...qualificationInput, year: e.target.value})}
//                                   className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="Year"
//                                 />
//                                 <button
//                                   type="button"
//                                   onClick={handleAddQualification}
//                                   className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg"
//                                 >
//                                   Add Qualification
//                                 </button>
//                               </div>
//                             </div>
//                           </div>

//                           {/* Certifications Section */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <div className="flex items-center justify-between mb-6">
//                               <div className="flex items-center gap-2">
//                                 <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-900/30 to-teal-900/30">
//                                   <ShieldCheckIcon className="h-5 w-5 text-emerald-400" />
//                                 </div>
//                                 <h3 className="text-lg font-bold text-white">Certifications (Optional)</h3>
//                               </div>
//                               <span className="text-sm text-gray-400">
//                                 {streamerProfile.certifications.length} added
//                               </span>
//                             </div>
                            
//                             <div className="space-y-4">
//                               {streamerProfile.certifications.map((cert, index) => (
//                                 <CertificationItem key={index} cert={cert} index={index} />
//                               ))}
                              
//                               <div className="space-y-3 p-3 rounded-xl bg-gray-900/30 border border-gray-700/50">
//                                 <input
//                                   type="text"
//                                   value={certificationInput.name}
//                                   onChange={(e) => setCertificationInput({...certificationInput, name: e.target.value})}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                                   placeholder="Certification Name"
//                                 />
//                                 <input
//                                   type="text"
//                                   value={certificationInput.issuer}
//                                   onChange={(e) => setCertificationInput({...certificationInput, issuer: e.target.value})}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                                   placeholder="Issuing Organization"
//                                 />
//                                 <div className="grid grid-cols-2 gap-3">
//                                   <input
//                                     type="date"
//                                     value={certificationInput.issueDate}
//                                     onChange={(e) => setCertificationInput({...certificationInput, issueDate: e.target.value})}
//                                     className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                                     placeholder="Issue Date"
//                                   />
//                                   <input
//                                     type="date"
//                                     value={certificationInput.expiryDate}
//                                     onChange={(e) => setCertificationInput({...certificationInput, expiryDate: e.target.value})}
//                                     className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
//                                     placeholder="Expiry Date (Optional)"
//                                   />
//                                 </div>
//                                 <button
//                                   type="button"
//                                   onClick={handleAddCertification}
//                                   className="w-full px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-lg"
//                                 >
//                                   Add Certification
//                                 </button>
//                               </div>
//                             </div>
//                           </div>

//                           {/* Social Links Section */}
//                           <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
//                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                               <GlobeAltIcon className="h-5 w-5 text-indigo-400" />
//                               Social Links (Optional)
//                             </h3>
                            
//                             <div className="space-y-3">
//                               <div>
//                                 <label htmlFor="youtube" className="block text-sm font-medium text-gray-300 mb-1">
//                                   YouTube
//                                 </label>
//                                 <input
//                                   id="youtube"
//                                   name="socialLinks.youtube"
//                                   type="url"
//                                   value={streamerProfile.socialLinks.youtube}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
//                                   placeholder="https://youtube.com/@yourchannel"
//                                 />
//                               </div>
                              
//                               <div>
//                                 <label htmlFor="linkedin" className="block text-sm font-medium text-gray-300 mb-1">
//                                   LinkedIn
//                                 </label>
//                                 <input
//                                   id="linkedin"
//                                   name="socialLinks.linkedin"
//                                   type="url"
//                                   value={streamerProfile.socialLinks.linkedin}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
//                                   placeholder="https://linkedin.com/in/yourprofile"
//                                 />
//                               </div>

//                               <div>
//                                 <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-1">
//                                   Twitter
//                                 </label>
//                                 <input
//                                   id="twitter"
//                                   name="socialLinks.twitter"
//                                   type="url"
//                                   value={streamerProfile.socialLinks.twitter}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
//                                   placeholder="https://twitter.com/@yourhandle"
//                                 />
//                               </div>

//                               <div>
//                                 <label htmlFor="github" className="block text-sm font-medium text-gray-300 mb-1">
//                                   GitHub
//                                 </label>
//                                 <input
//                                   id="github"
//                                   name="socialLinks.github"
//                                   type="url"
//                                   value={streamerProfile.socialLinks.github}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500"
//                                   placeholder="https://github.com/yourusername"
//                                 />
//                               </div>
                              
//                               <div>
//                                 <label htmlFor="portfolio" className="block text-sm font-medium text-gray-300 mb-1">
//                                   Portfolio
//                                 </label>
//                                 <input
//                                   id="portfolio"
//                                   name="socialLinks.portfolio"
//                                   type="url"
//                                   value={streamerProfile.socialLinks.portfolio}
//                                   onChange={handleStreamerProfileChange}
//                                   className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
//                                   placeholder="https://yourportfolio.com"
//                                 />
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Action Buttons */}
//                       <div className="flex gap-4 pt-4">
//                         <motion.button
//                           whileHover={{ scale: 1.02 }}
//                           whileTap={{ scale: 0.98 }}
//                           type="button"
//                           onClick={() => setStep(2)}
//                           className="flex-1 px-6 py-3 rounded-xl border border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800/50 font-semibold transition-all duration-300 flex items-center justify-center gap-2"
//                         >
//                           <ArrowLeftIcon className="h-4 w-4" />
//                           Back
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.02 }}
//                           whileTap={{ scale: 0.98 }}
//                           type="submit"
//                           disabled={loading}
//                           className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                         >
//                           {loading ? (
//                             <>
//                               <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                               Creating...
//                             </>
//                           ) : (
//                             <>
//                               <SparklesIcon className="h-5 w-5" />
//                               Create Account
//                             </>
//                           )}
//                         </motion.button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Message Toast */}
//         {message.text && (
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: 20 }}
//             className="fixed bottom-4 right-4 left-4 sm:left-auto z-50"
//           >
//             <div className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border ${
//               message.type === 'success'
//                 ? 'bg-gradient-to-r from-emerald-900/80 to-green-900/80 text-emerald-100 border-emerald-800/50'
//                 : message.type === 'warning'
//                 ? 'bg-gradient-to-r from-amber-900/80 to-yellow-900/80 text-amber-100 border-amber-800/50'
//                 : 'bg-gradient-to-r from-red-900/80 to-rose-900/80 text-red-100 border-red-800/50'
//             }`}>
//               <div className="flex items-center gap-3">
//                 {message.type === 'success' ? (
//                   <CheckCircleIcon className="h-5 w-5" />
//                 ) : message.type === 'warning' ? (
//                   <ExclamationTriangleIcon className="h-5 w-5" />
//                 ) : (
//                   <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
//                     !
//                   </div>
//                 )}
//                 <span className="text-sm">{message.text}</span>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </div>

//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ delay: 1 }}
//         className="text-center mt-8 text-gray-500 text-xs sm:text-sm"
//       >
//         <p>© 2024 StreamLearn. All rights reserved.</p>
//       </motion.div>
//     </div>
//   );
// };

// export default SignUp;