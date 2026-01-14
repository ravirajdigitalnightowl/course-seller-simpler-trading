// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { toast } from "react-toastify";
// import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// export const ForgotPassword = () => {
//   const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
//   const [email, setEmail] = useState("");
//   const [secretId, setSecretId] = useState("");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [timer, setTimer] = useState(0); // resend otp timer
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const navigate = useNavigate();

//   // OTP timer countdown
//   useEffect(() => {
//     let interval;
//     if (timer > 0) {
//       interval = setInterval(() => setTimer((t) => t - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [timer]);

//   // send otp
//   const sendOtp = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.post(
//         `${import.meta.env.VITE_API_URL}/auth/sendOtpForgetPassword`,
//         { email }
//       );
//       setSecretId(res.data.data.secretId);
//       toast.success("OTP sent successfully to your email.");
//       setStep(2);
//       setTimer(60);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error sending OTP");
//     }
//     setLoading(false);
//   };

//   // verify otp
//   const verifyOtp = async () => {
//     setLoading(true);
//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_URL}/apis/auth/verifyOtpForgetPassword`,
//         { otp, secretId }
//       );
//       toast.success("OTP verified successfully.");
//       setStep(3);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Invalid OTP");
//     }
//     setLoading(false);
//   };

//   // reset password
//   const resetPassword = async () => {
//     setLoading(true);
//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_URL}/apis/auth/forgetPassword`,
//         { secretId, newPassword, confirmPassword }
//       );
//       toast.success("Password updated successfully. Redirecting to login...");
//       setTimeout(() => navigate("/login"), 2000);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error resetting password");
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-white px-4">
//       <div className="bg-white shadow-lg border rounded-2xl p-8 w-full max-w-md">
//         <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
//           Forgot Password
//         </h2>

//         {step === 1 && (
//           <>
//             <label className="block mb-2 text-gray-700 font-medium">Email</label>
//             <input
//               type="email"
//               className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="Enter your registered email"
//             />
//             <button
//               onClick={sendOtp}
//               disabled={loading}
//               className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
//             >
//               {loading ? "Sending..." : "Send OTP"}
//             </button>
//           </>
//         )}

//         {step === 2 && (
//           <>
//             <label className="block mb-2 text-gray-700 font-medium">Enter OTP</label>
//             <input
//               type="text"
//               className="w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value)}
//               placeholder="Enter the OTP"
//             />
//             <div className="flex gap-3">
//               <button
//                 onClick={verifyOtp}
//                 disabled={loading}
//                 className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
//               >
//                 {loading ? "Verifying..." : "Verify OTP"}
//               </button>

//               <button
//                 onClick={sendOtp}
//                 disabled={timer > 0}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
//                   timer > 0
//                     ? "bg-gray-400 text-white cursor-not-allowed"
//                     : "bg-yellow-500 text-white hover:bg-yellow-600"
//                 }`}
//               >
//                 {timer > 0 ? `Resend ${timer}s` : "Resend"}
//               </button>
//             </div>
//           </>
//         )}

//         {step === 3 && (
//           <>
//             {/* New password */}
//             <label className="block mb-2 text-gray-700 font-medium">
//               New Password
//             </label>
//             <div className="relative mb-4">
//               <input
//                 type={showPassword ? "text" : "password"}
//                 className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
//                 value={newPassword}
//                 onChange={(e) => setNewPassword(e.target.value)}
//                 placeholder="Enter new password"
//               />
//               <button
//                 type="button"
//                 className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 onClick={() => setShowPassword(!showPassword)}
//               >
//                 {showPassword ? (
//                   <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                 ) : (
//                   <EyeIcon className="h-5 w-5 text-gray-400" />
//                 )}
//               </button>
//             </div>

//             {/* Confirm password */}
//             <label className="block mb-2 text-gray-700 font-medium">
//               Confirm Password
//             </label>
//             <div className="relative mb-4">
//               <input
//                 type={showConfirmPassword ? "text" : "password"}
//                 className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm new password"
//               />
//               <button
//                 type="button"
//                 className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//               >
//                 {showConfirmPassword ? (
//                   <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                 ) : (
//                   <EyeIcon className="h-5 w-5 text-gray-400" />
//                 )}
//               </button>
//             </div>

//             <button
//               onClick={resetPassword}
//               disabled={loading}
//               className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
//             >
//               {loading ? "Resetting..." : "Reset Password"}
//             </button>
//           </>
//         )}

//         {/* Back to Login link */}
//         <p className="mt-6 text-center text-sm text-gray-600">
//           <Link
//             to="/login"
//             className="font-medium text-indigo-600 hover:text-indigo-500"
//           >
//             ← Back to Login
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };




import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [email, setEmail] = useState("");
  const [secretId, setSecretId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0); // resend otp timer
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navigate = useNavigate();

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

  // OTP timer countdown
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // send otp
  const sendOtp = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/sendOtpForgetPassword`,
        { email }
      );
      setSecretId(res.data.data.secretId);
      toast.success("OTP sent successfully to your email.");
      setStep(2);
      setTimer(60);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error sending OTP");
    }
    setLoading(false);
  };

  // verify otp
  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }
    
    if (otp.length !== 4) {
      toast.error("OTP must be 4 digits");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/verifyOtpForgetPassword`,
        { otp, secretId }
      );
      toast.success("OTP verified successfully.");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    }
    setLoading(false);
  };

  // reset password
  const resetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Please enter new password");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (!confirmPassword.trim()) {
      toast.error("Please confirm your password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgetPassword`,
        { secretId, newPassword, confirmPassword }
      );
      toast.success("Password updated successfully. Redirecting to login...");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error resetting password");
    }
    setLoading(false);
  };

  return (
    <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} px-4 transition-colors duration-200`}>
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg border rounded-2xl p-8 w-full max-w-md transition-colors duration-200`}>
        <h2 className={`text-2xl font-bold text-center mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Forgot Password
        </h2>

        {step === 1 && (
          <>
            <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address
            </label>
            <input
              type="email"
              className={`w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
            />
            <button
              onClick={sendOtp}
              disabled={loading}
              className={`w-full ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Enter OTP
            </label>
            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter the 4-digit OTP sent to <span className="font-semibold">{email}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="4"
              className={`w-full px-4 py-2 mb-4 border rounded-lg focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit OTP"
            />
            <div className="flex gap-3">
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 4}
                className={`flex-1 ${
                  isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                } text-white py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                onClick={sendOtp}
                disabled={timer > 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  timer > 0
                    ? `${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-400' 
                          : 'bg-gray-200 text-gray-500'
                      } cursor-not-allowed`
                    : `${
                        isDarkMode 
                          ? 'bg-yellow-600 hover:bg-yellow-700' 
                          : 'bg-yellow-500 hover:bg-yellow-600'
                      } text-white`
                }`}
              >
                {timer > 0 ? `Resend ${timer}s` : "Resend"}
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`w-full mt-4 py-2 px-4 border rounded-lg text-sm font-medium ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
              } transition-colors duration-200`}
            >
              Back to Email
            </button>
          </>
        )}

        {step === 3 && (
          <>
            {/* New password */}
            <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              New Password
            </label>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
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

            {/* Confirm password */}
            <label className={`block mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirm Password
            </label>
            <div className="relative mb-6">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex-1 py-2 px-4 border rounded-lg text-sm font-medium ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-colors duration-200`}
              >
                Back
              </button>
              
              <button
                onClick={resetPassword}
                disabled={loading}
                className={`flex-1 ${
                  isDarkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'
                } text-white py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </>
        )}

        {/* Back to Login link */}
        <p className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Link
            to="/signin"
            className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-indigo-600 hover:text-indigo-500'}`}
          >
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};