import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './Components/PrivateRoute';
import PublicRoute from './Components/PublicRoute';
import SignIn from './Pages/SignIn/SignIn';
import SignUp from './Pages/SignUp/SignUp';
import Dashboard from './Pages/Dashboard/Dashboard';
import CourseManagement from "./Pages/Courses/CourseManagement";
import EnrolledStudents from "./Pages/EnrolledStudents/EnrolledStudents";
import LiveSession from "./Pages/LiveSession/LiveSession";
import { ForgotPassword } from "./Pages/ForgotPassword/ForgotPassword";
import CourseRecordingsPage from "./Pages/CourseRecording/CourseRecordingPage";
import AllCourseRecordingsPage from "./Pages/AllCourseRecordings/AllCourseRecordingsPage";
function App() {
  return (
    <>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes - only accessible when not logged in */}
              <Route path="/" element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              } />
              <Route path="/signin" element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              } />

               <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />

              {/* Protected routes - only accessible when logged in */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />

              <Route path="/courses" element={
                <PrivateRoute>
                  <CourseManagement />
                </PrivateRoute>
              } />

              <Route path="/enrolled" element={
                <PrivateRoute>
                  <EnrolledStudents />
                </PrivateRoute>
              } />

              <Route path="/livesession/:sessionId/:roomCode" element={
                <PrivateRoute>
                  <LiveSession />
                </PrivateRoute>
              } />

              <Route path="/courses/:courseId/recordings" element={
                <PrivateRoute>
                  <CourseRecordingsPage />
                </PrivateRoute>
              } />

              <Route path="/recordings/all" element={<AllCourseRecordingsPage />} />


              {/* Fallback route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                    <p className="text-gray-600 dark:text-gray-400">Page not found</p>
                  </div>
                </div>
              } />
            </Routes>
            <ToastContainer 
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </>
  )
}

export default App


// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { AuthProvider } from './contexts/AuthContext';
// import { ThemeProvider } from './contexts/ThemeContext';
// import PrivateRoute from './Components/PrivateRoute';
// import PublicRoute from './Components/PublicRoute';
// import SignIn from './Pages/SignIn/SignIn';
// import SignUp from './Pages/SignUp/SignUp';
// import Dashboard from './Pages/Dashboard/Dashboard';

// function App() {
//   return (
//     <>
//       <BrowserRouter>
//         <ThemeProvider>
//           <AuthProvider>
//             <Routes>
//               {/* Public routes - only accessible when not logged in */}
//               <Route path="/" element={
//                 <PublicRoute>
//                   <SignIn />
//                 </PublicRoute>
//               } />
//               <Route path="/signin" element={
//                 <PublicRoute>
//                   <SignIn />
//                 </PublicRoute>
//               } />
//               <Route path="/signup" element={
//                 <PublicRoute>
//                   <SignUp />
//                 </PublicRoute>
//               } />

//               {/* Protected routes - only accessible when logged in */}
//               <Route path="/dashboard" element={
//                 <PrivateRoute>
//                   <Dashboard />
//                 </PrivateRoute>
//               } />

//               {/* Fallback route */}
//               <Route path="*" element={
//                 <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
//                   <div className="text-center">
//                     <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
//                     <p className="text-gray-600 dark:text-gray-400">Page not found</p>
//                   </div>
//                 </div>
//               } />
//             </Routes>
//             <ToastContainer 
//               position="top-right"
//               autoClose={3000}
//               hideProgressBar={false}
//               newestOnTop={false}
//               closeOnClick
//               rtl={false}
//               pauseOnFocusLoss
//               draggable
//               pauseOnHover
//               theme="light"
//             />
//           </AuthProvider>
//         </ThemeProvider>
//       </BrowserRouter>
//     </>
//   )
// }

// export default App


// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { AuthProvider } from './contexts/AuthContext';
// import PrivateRoute from './Components/PrivateRoute';
// import PublicRoute from './Components/PublicRoute';
// import SignIn from './Pages/SignIn/SignIn';
// import SignUp from './Pages/SignUp/SignUp';
// import Dashboard from './Pages/Dashboard/Dashboard';

// function App() {
//   return (
//     <>
//       <BrowserRouter>
//         <AuthProvider>
//           <Routes>
//             {/* Public routes - only accessible when not logged in */}
//             <Route path="/" element={
//               <PublicRoute>
//                 <SignIn />
//               </PublicRoute>
//             } />
//             <Route path="/signin" element={
//               <PublicRoute>
//                 <SignIn />
//               </PublicRoute>
//             } />
//             <Route path="/signup" element={
//               <PublicRoute>
//                 <SignUp />
//               </PublicRoute>
//             } />

//             {/* Protected routes - only accessible when logged in */}
//             <Route path="/dashboard" element={
//               <PrivateRoute>
//                 <Dashboard />
//               </PrivateRoute>
//             } />

//             {/* Fallback route */}
//             <Route path="*" element={
//               <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                 <div className="text-center">
//                   <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
//                   <p className="text-gray-600">Page not found</p>
//                 </div>
//               </div>
//             } />
//           </Routes>
//           <ToastContainer 
//             position="top-right"
//             autoClose={3000}
//             hideProgressBar={false}
//             newestOnTop={false}
//             closeOnClick
//             rtl={false}
//             pauseOnFocusLoss
//             draggable
//             pauseOnHover
//             theme="light"
//           />
//         </AuthProvider>
//       </BrowserRouter>
//     </>
//   )
// }

// export default App


// import { useState } from 'react'
// import './App.css'
// import SignIn from './Pages/SignIn/SignIn'
// import SignUp from './Pages/SignUp/SignUp'
// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { AuthProvider } from './contexts/AuthContext'; // AuthProvider import करें
// import Dashboard from './Pages/Dashboard/Dashboard';

// function App() {
  

//   return (
//     <>
//       <BrowserRouter>
//         <AuthProvider> {/* AuthProvider को यहाँ wrap करें */}
//           <Routes>
//             <Route path="/" element={<SignIn />} />
//             <Route path="/signin" element={<SignIn />} />
//             <Route path="/signup" element={<SignUp />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//           </Routes>
//           <ToastContainer 
//             position="top-right"
//             autoClose={3000}
//             hideProgressBar={false}
//             newestOnTop={false}
//             closeOnClick
//             rtl={false}
//             pauseOnFocusLoss
//             draggable
//             pauseOnHover
//             theme="light"
//           />
//         </AuthProvider>
//       </BrowserRouter>
//     </>
//   )
// }

// export default App


// import { useState } from 'react'
// import './App.css'
// import SignIn from './Pages/SignIn/SignIn'
// import SignUp from './Pages/SignUp/SignUp'
// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// function App() {
  

//   return (
//     <>
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<SignIn />} />
//           <Route path="/signin" element={<SignIn />} />
//           <Route path="/signup" element={<SignUp />} />
//         </Routes>
//         <ToastContainer 
//           position="top-right"
//           autoClose={3000}
//           hideProgressBar={false}
//           newestOnTop={false}
//           closeOnClick
//           rtl={false}
//           pauseOnFocusLoss
//           draggable
//           pauseOnHover
//           theme="light"
//         />
//       </BrowserRouter>
//     </>
//   )
// }

// export default App




// import { useState } from 'react'
// import './App.css'
// import SignIn from './Pages/SingIn/SignIn'
// import SignUp from './Pages/SignUp/SignUp'
// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { ToastContainer } from 'react-toastify';

// function App() {
  

//   return (
//     <>
     
//     </>
//   )
// }

// export default App
