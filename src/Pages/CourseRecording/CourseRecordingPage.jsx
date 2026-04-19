// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import { 
//   PlayCircle, 
//   Calendar, 
//   Clock, 
//   User, 
//   Video, 
//   ArrowLeft,
//   Loader2,
//   AlertCircle,
//   ExternalLink,
//   FileVideo,
//   Users,
//   Hash
// } from 'lucide-react';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [recordings, setRecordings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedSession, setSelectedSession] = useState(null);
//   const [sessionRecordings, setSessionRecordings] = useState([]);

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         // Fetch course details from your API
//         const response = await axios.get(
//           `${process.env.REACT_APP_API_URL}/course/getAllCourses`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             },
//             params: {
//               page: 1,
//               limit: 10
//             }
//           }
//         );

//         if (response.data.success) {
//           // Find the specific course by ID
//           const foundCourse = response.data.data.courses.find(
//             course => course._id === courseId
//           );
          
//           if (foundCourse) {
//             setCourse(foundCourse);
//             // Set first session as selected by default if exists
//             if (foundCourse.liveClasses && foundCourse.liveClasses.length > 0) {
//               setSelectedSession(foundCourse.liveClasses[0]);
//               // Fetch recordings for the first session
//               fetchSessionRecordings(foundCourse.liveClasses[0].sessionId);
//             }
//           } else {
//             setError('Course not found');
//           }
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings for a specific session
//   const fetchSessionRecordings = async (sessionId) => {
//     if (!sessionId) return;
    
//     try {
//       setLoadingRecordings(true);
//       setSessionRecordings([]);
      
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_URL}/liveSession/${sessionId}/recordings`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         setSessionRecordings(response.data.data.recordings || []);
//       } else {
//         setSessionRecordings([]);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setSessionRecordings([]);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle session selection
//   const handleSessionSelect = (session) => {
//     setSelectedSession(session);
//     fetchSessionRecordings(session.sessionId);
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   // Format time
//   const formatTime = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Calculate session duration
//   const getSessionDuration = (minutes) => {
//     if (minutes < 60) {
//       return `${minutes} min`;
//     }
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
//   };

//   // Get session status badge color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'SCHEDULED':
//         return 'bg-blue-100 text-blue-800';
//       case 'LIVE':
//         return 'bg-green-100 text-green-800';
//       case 'COMPLETED':
//         return 'bg-purple-100 text-purple-800';
//       case 'CANCELLED':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//           <p className="text-gray-600">Loading course details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//           <p className="text-gray-600 mb-6">{error}</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!course) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//           <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-4">
//             <div className="flex items-center space-x-4">
//               <button
//                 onClick={() => navigate(-1)}
//                 className="flex items-center text-gray-600 hover:text-gray-900"
//               >
//                 <ArrowLeft className="h-5 w-5 mr-2" />
//                 Back
//               </button>
//               <div className="h-8 w-px bg-gray-300" />
//               <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//             </div>
//             <Link
//               to={`/courses/${courseId}`}
//               className="flex items-center text-blue-600 hover:text-blue-800"
//             >
//               <ExternalLink className="h-5 w-5 mr-2" />
//               Go to Course
//             </Link>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Course Info Card */}
//         <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
//           <div className="p-6">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//               <div>
//                 <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h2>
//                 <p className="text-gray-600">{course.description}</p>
//               </div>
//               <div className="mt-4 md:mt-0">
//                 <div className="flex items-center space-x-4">
//                   <div className="flex items-center text-gray-600">
//                     <User className="h-5 w-5 mr-2" />
//                     <span>{course.instructor}</span>
//                   </div>
//                   <div className="flex items-center text-gray-600">
//                     <Video className="h-5 w-5 mr-2" />
//                     <span>{course.liveClasses?.length || 0} Sessions</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Left Column - Sessions List */}
//           <div className="lg:col-span-1">
//             <div className="bg-white rounded-lg shadow-lg overflow-hidden">
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <Calendar className="h-5 w-5 mr-2" />
//                   Live Sessions
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Select a session to view recordings
//                 </p>
//               </div>
              
//               <div className="overflow-y-auto max-h-[600px]">
//                 {course.liveClasses && course.liveClasses.length > 0 ? (
//                   <div className="divide-y divide-gray-200">
//                     {course.liveClasses.map((session) => (
//                       <button
//                         key={session._id}
//                         onClick={() => handleSessionSelect(session)}
//                         className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
//                           selectedSession?._id === session._id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
//                         }`}
//                       >
//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-medium text-gray-900">{session.sessionTitle}</h4>
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
//                             {session.status}
//                           </span>
//                         </div>
                        
//                         <div className="space-y-2 text-sm text-gray-600">
//                           <div className="flex items-center">
//                             <Clock className="h-4 w-4 mr-2" />
//                             <span>
//                               {formatDate(session.scheduleAt)} • {formatTime(session.scheduleAt)}
//                             </span>
//                           </div>
                          
//                           <div className="flex items-center">
//                             <Hash className="h-4 w-4 mr-2" />
//                             <span>Room: {session.roomCode}</span>
//                           </div>
                          
//                           <div className="flex items-center">
//                             <Users className="h-4 w-4 mr-2" />
//                             <span>Duration: {getSessionDuration(session.duration)}</span>
//                           </div>
//                         </div>
                        
//                         {session.description && (
//                           <p className="mt-3 text-sm text-gray-500 line-clamp-2">
//                             {session.description}
//                           </p>
//                         )}
//                       </button>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="p-8 text-center">
//                     <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                     <h4 className="font-medium text-gray-900 mb-2">No Live Sessions</h4>
//                     <p className="text-gray-500">This course doesn't have any live sessions yet.</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Right Column - Recordings */}
//           <div className="lg:col-span-2">
//             <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
//               {selectedSession ? (
//                 <>
//                   <div className="px-6 py-4 border-b border-gray-200">
//                     <div className="flex justify-between items-center">
//                       <div>
//                         <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                           <FileVideo className="h-5 w-5 mr-2" />
//                           Recordings for: {selectedSession.sessionTitle}
//                         </h3>
//                         <p className="text-sm text-gray-500 mt-1">
//                           Scheduled: {formatDate(selectedSession.scheduleAt)} at {formatTime(selectedSession.scheduleAt)}
//                         </p>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <Hash className="h-5 w-5 text-gray-400" />
//                         <span className="font-mono bg-gray-100 px-3 py-1 rounded text-sm">
//                           {selectedSession.roomCode}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="p-6">
//                     {loadingRecordings ? (
//                       <div className="text-center py-12">
//                         <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                         <p className="text-gray-600">Loading recordings...</p>
//                       </div>
//                     ) : sessionRecordings.length > 0 ? (
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                         {sessionRecordings.map((recording, index) => (
//                           <div
//                             key={index}
//                             className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
//                           >
//                             <div className="aspect-video bg-gray-900 relative">
//                               {/* Video thumbnail preview */}
//                               <div className="absolute inset-0 flex items-center justify-center">
//                                 <PlayCircle className="h-16 w-16 text-white opacity-75" />
//                               </div>
//                               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
//                                 <p className="text-white font-medium">
//                                   Recording {index + 1}
//                                 </p>
//                               </div>
//                             </div>
                            
//                             <div className="p-4">
//                               <h4 className="font-medium text-gray-900 mb-2">
//                                 {recording.title || `Session Recording - Part ${index + 1}`}
//                               </h4>
                              
//                               {recording.duration && (
//                                 <p className="text-sm text-gray-600 mb-3 flex items-center">
//                                   <Clock className="h-4 w-4 mr-2" />
//                                   {getSessionDuration(recording.duration)}
//                                 </p>
//                               )}
                              
//                               <a
//                                 href={recording.url}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//                               >
//                                 <PlayCircle className="h-5 w-5 mr-2" />
//                                 Watch Recording
//                               </a>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <div className="text-center py-12">
//                         <FileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                         <h4 className="font-medium text-gray-900 mb-2">No Recordings Available</h4>
//                         <p className="text-gray-500 mb-6">
//                           {selectedSession.status === 'SCHEDULED'
//                             ? 'Recordings will be available after the session is completed.'
//                             : 'No recordings were captured for this session.'}
//                         </p>
//                         <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
//                           <div className="flex items-center">
//                             <Users className="h-4 w-4 mr-2" />
//                             <span>Status: {selectedSession.status}</span>
//                           </div>
//                           <div className="flex items-center">
//                             <Clock className="h-4 w-4 mr-2" />
//                             <span>Duration: {getSessionDuration(selectedSession.duration)}</span>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {/* Session Details */}
//                     {selectedSession.description && (
//                       <div className="mt-8 pt-8 border-t border-gray-200">
//                         <h4 className="font-medium text-gray-900 mb-3">Session Description</h4>
//                         <p className="text-gray-600 whitespace-pre-line">
//                           {selectedSession.description}
//                         </p>
//                       </div>
//                     )}

//                     {/* Session Features */}
//                     <div className="mt-8 pt-8 border-t border-gray-200">
//                       <h4 className="font-medium text-gray-900 mb-3">Session Features</h4>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className="flex items-center">
//                           <div className={`p-2 rounded-lg mr-3 ${
//                             selectedSession.chatEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
//                           }`}>
//                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                             </svg>
//                           </div>
//                           <div>
//                             <p className="font-medium">Chat</p>
//                             <p className="text-sm text-gray-500">
//                               {selectedSession.chatEnabled ? 'Enabled' : 'Disabled'}
//                             </p>
//                           </div>
//                         </div>
                        
//                         <div className="flex items-center">
//                           <div className={`p-2 rounded-lg mr-3 ${
//                             selectedSession.whiteboardEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
//                           }`}>
//                             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
//                             </svg>
//                           </div>
//                           <div>
//                             <p className="font-medium">Whiteboard</p>
//                             <p className="text-sm text-gray-500">
//                               {selectedSession.whiteboardEnabled ? 'Enabled' : 'Disabled'}
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <div className="p-12 text-center">
//                   <FileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Session</h3>
//                   <p className="text-gray-500">
//                     Choose a live session from the list to view its recordings
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Footer Stats */}
//       <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="bg-white rounded-lg shadow p-6">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div className="text-center">
//               <div className="text-3xl font-bold text-blue-600">
//                 {course.liveClasses?.filter(s => s.status === 'COMPLETED').length || 0}
//               </div>
//               <div className="text-gray-600">Completed Sessions</div>
//             </div>
//             <div className="text-center">
//               <div className="text-3xl font-bold text-green-600">
//                 {sessionRecordings.length}
//               </div>
//               <div className="text-gray-600">Total Recordings</div>
//             </div>
//             <div className="text-center">
//               <div className="text-3xl font-bold text-purple-600">
//                 {course.enrolledCount || 0}
//               </div>
//               <div className="text-gray-600">Enrolled Students</div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CourseRecordingsPage;













// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import {
//   FaPlayCircle,
//   FaCalendarAlt,
//   FaClock,
//   FaUser,
//   FaVideo,
//   FaArrowLeft,
//   FaSpinner,
//   FaExclamationCircle,
//   FaExternalLinkAlt,
//   FaFileVideo,
//   FaUsers,
//   FaHashtag,
//   FaComment,
//   FaChalkboard,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaRegCalendarCheck
// } from 'react-icons/fa';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedSession, setSelectedSession] = useState(null);
//   const [sessionRecordings, setSessionRecordings] = useState([]);

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         // Fetch course details from your API
//         const response = await axios.get(
//           `${import.meta.env.VITE_API_URL}/course/getAllCourses`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             },
          
//           }
//         );

//         if (response.data.success) {
//           // Find the specific course by ID
//           const foundCourse = response.data.data.courses.find(
//             course => course._id === courseId
//           );
          
//           if (foundCourse) {
//             setCourse(foundCourse);
//             // Set first session as selected by default if exists
//             if (foundCourse.liveClasses && foundCourse.liveClasses.length > 0) {
//               setSelectedSession(foundCourse.liveClasses[0]);
//               // Fetch recordings for the first session
//               fetchSessionRecordings(foundCourse.liveClasses[0].sessionId);
//             }
//           } else {
//             setError('Course not found');
//           }
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings for a specific session
//   const fetchSessionRecordings = async (sessionId) => {
//     if (!sessionId) return;
    
//     try {
//       setLoadingRecordings(true);
//       setSessionRecordings([]);
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/liveSession/${sessionId}/recordings`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         setSessionRecordings(response.data.data.recordings || []);
//       } else {
//         setSessionRecordings([]);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setSessionRecordings([]);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle session selection
//   const handleSessionSelect = (session) => {
//     setSelectedSession(session);
//     fetchSessionRecordings(session.sessionId);
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   // Format time
//   const formatTime = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Calculate session duration
//   const getSessionDuration = (minutes) => {
//     if (minutes < 60) {
//       return `${minutes} min`;
//     }
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
//   };

//   // Get session status badge color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'SCHEDULED':
//         return 'bg-blue-100 text-blue-800';
//       case 'LIVE':
//         return 'bg-green-100 text-green-800';
//       case 'COMPLETED':
//         return 'bg-purple-100 text-purple-800';
//       case 'CANCELLED':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   // Get status icon
//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'COMPLETED':
//         return <FaCheckCircle className="inline mr-1" />;
//       case 'SCHEDULED':
//         return <FaRegCalendarCheck className="inline mr-1" />;
//       case 'CANCELLED':
//         return <FaTimesCircle className="inline mr-1" />;
//       default:
//         return null;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//           <p className="text-gray-600">Loading course details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//           <p className="text-gray-600 mb-6">{error}</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!course) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//           <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <DashboardLayout>
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-4">
//             <div className="flex items-center space-x-4">
//               <button
//                 onClick={() => navigate(-1)}
//                 className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
//               >
//                 <FaArrowLeft className="h-5 w-5 mr-2" />
//                 Back
//               </button>
//               <div className="h-8 w-px bg-gray-300" />
//               <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//             </div>
//             <Link
//               to={`/courses/${courseId}`}
//               className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
//             >
//               <FaExternalLinkAlt className="h-5 w-5 mr-2" />
//               Go to Course
//             </Link>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Course Info Card */}
//         <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 border border-gray-200">
//           <div className="p-6">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//               <div className="flex-1">
//                 <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h2>
//                 <p className="text-gray-600">{course.description}</p>
//               </div>
//               <div className="mt-4 md:mt-0 flex-shrink-0">
//                 <div className="flex items-center space-x-6">
//                   <div className="flex items-center text-gray-600">
//                     <FaUser className="h-5 w-5 mr-2 text-gray-400" />
//                     <span className="font-medium">{course.instructor}</span>
//                   </div>
//                   <div className="flex items-center text-gray-600">
//                     <FaVideo className="h-5 w-5 mr-2 text-gray-400" />
//                     <span className="font-medium">{course.liveClasses?.length || 0} Sessions</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="flex flex-wrap gap-4">
//               <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
//                 {course.category}
//               </div>
//               <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
//                 {course.level}
//               </div>
//               <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
//                 {course.duration} hours total
//               </div>
//               <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
//                 {course.enrolledCount || 0} enrolled
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Left Column - Sessions List */}
//           <div className="lg:col-span-1">
//             <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
//               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaCalendarAlt className="h-5 w-5 mr-2 text-blue-600" />
//                   Live Sessions
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Select a session to view recordings
//                 </p>
//               </div>
              
//               <div className="overflow-y-auto max-h-[600px]">
//                 {course.liveClasses && course.liveClasses.length > 0 ? (
//                   <div className="divide-y divide-gray-200">
//                     {course.liveClasses.map((session) => (
//                       <button
//                         key={session._id}
//                         onClick={() => handleSessionSelect(session)}
//                         className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 ${
//                           selectedSession?._id === session._id 
//                             ? 'bg-blue-50 border-l-4 border-blue-600' 
//                             : ''
//                         }`}
//                       >
//                         <div className="flex justify-between items-start mb-2">
//                           <h4 className="font-medium text-gray-900 text-sm">{session.sessionTitle}</h4>
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(session.status)}`}>
//                             {getStatusIcon(session.status)}
//                             {session.status}
//                           </span>
//                         </div>
                        
//                         <div className="space-y-2 text-xs text-gray-600">
//                           <div className="flex items-center">
//                             <FaClock className="h-3 w-3 mr-2 flex-shrink-0" />
//                             <span>
//                               {formatDate(session.scheduleAt)} • {formatTime(session.scheduleAt)}
//                             </span>
//                           </div>
                          
//                           <div className="flex items-center">
//                             <FaHashtag className="h-3 w-3 mr-2 flex-shrink-0" />
//                             <span className="font-mono">Room: {session.roomCode}</span>
//                           </div>
                          
//                           <div className="flex items-center">
//                             <FaUsers className="h-3 w-3 mr-2 flex-shrink-0" />
//                             <span>Duration: {getSessionDuration(session.duration)}</span>
//                           </div>
//                         </div>
                        
//                         {session.description && (
//                           <p className="mt-3 text-xs text-gray-500 line-clamp-2">
//                             {session.description}
//                           </p>
//                         )}
//                       </button>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="p-8 text-center">
//                     <FaCalendarAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                     <h4 className="font-medium text-gray-900 mb-2">No Live Sessions</h4>
//                     <p className="text-gray-500 text-sm">This course doesn't have any live sessions yet.</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Right Column - Recordings */}
//           <div className="lg:col-span-2">
//             <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 h-full">
//               {selectedSession ? (
//                 <>
//                   <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//                     <div className="flex flex-col md:flex-row md:items-center justify-between">
//                       <div>
//                         <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                           <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
//                           Recordings for: {selectedSession.sessionTitle}
//                         </h3>
//                         <p className="text-sm text-gray-500 mt-1">
//                           <FaCalendarAlt className="inline mr-1 h-3 w-3" />
//                           Scheduled: {formatDate(selectedSession.scheduleAt)} at {formatTime(selectedSession.scheduleAt)}
//                         </p>
//                       </div>
//                       <div className="mt-2 md:mt-0 flex items-center space-x-2">
//                         <FaHashtag className="h-5 w-5 text-gray-400" />
//                         <span className="font-mono bg-gray-100 px-3 py-1 rounded text-sm border border-gray-300">
//                           {selectedSession.roomCode}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="p-6">
//                     {loadingRecordings ? (
//                       <div className="text-center py-12">
//                         <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                         <p className="text-gray-600">Loading recordings...</p>
//                       </div>
//                     ) : sessionRecordings.length > 0 ? (
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                         {sessionRecordings.map((recording, index) => (
//                           <div
//                             key={index}
//                             className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white"
//                           >
//                             <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
//                               {/* Video thumbnail preview */}
//                               <div className="absolute inset-0 flex items-center justify-center">
//                                 <div className="relative">
//                                   <FaPlayCircle className="h-16 w-16 text-white opacity-90" />
//                                   <div className="absolute inset-0 animate-ping opacity-25">
//                                     <FaPlayCircle className="h-16 w-16 text-white" />
//                                   </div>
//                                 </div>
//                               </div>
//                               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
//                                 <div className="flex items-center justify-between">
//                                   <p className="text-white font-medium text-sm">
//                                     Recording {index + 1}
//                                   </p>
//                                   {recording.duration && (
//                                     <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
//                                       {getSessionDuration(recording.duration)}
//                                     </span>
//                                   )}
//                                 </div>
//                               </div>
//                             </div>
                            
//                             <div className="p-4">
//                               <h4 className="font-medium text-gray-900 mb-2 text-sm">
//                                 {recording.title || `Session Recording - Part ${index + 1}`}
//                               </h4>
                              
//                               {recording.createdAt && (
//                                 <p className="text-xs text-gray-500 mb-3 flex items-center">
//                                   <FaClock className="h-3 w-3 mr-1" />
//                                   Added: {new Date(recording.createdAt).toLocaleDateString()}
//                                 </p>
//                               )}
                              
//                               <a
//                                 href={recording.url}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:-translate-y-0.5 shadow hover:shadow-md"
//                               >
//                                 <FaPlayCircle className="h-4 w-4 mr-2" />
//                                 Watch Recording
//                               </a>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <div className="text-center py-12">
//                         <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                         <h4 className="font-medium text-gray-900 mb-2">No Recordings Available</h4>
//                         <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                           {selectedSession.status === 'SCHEDULED'
//                             ? 'Recordings will be available after the session is completed.'
//                             : selectedSession.status === 'CANCELLED'
//                             ? 'This session was cancelled and has no recordings.'
//                             : 'No recordings were captured for this session.'}
//                         </p>
//                         <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
//                           <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                             <FaUsers className="h-4 w-4 mr-2" />
//                             <span>Status: {selectedSession.status}</span>
//                           </div>
//                           <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                             <FaClock className="h-4 w-4 mr-2" />
//                             <span>Duration: {getSessionDuration(selectedSession.duration)}</span>
//                           </div>
//                           <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                             <FaHashtag className="h-4 w-4 mr-2" />
//                             <span>Max Participants: {selectedSession.maxParticipants}</span>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {/* Session Details */}
//                     {selectedSession.description && (
//                       <div className="mt-8 pt-8 border-t border-gray-200">
//                         <h4 className="font-medium text-gray-900 mb-3 flex items-center">
//                           <FaFileVideo className="h-4 w-4 mr-2 text-gray-500" />
//                           Session Description
//                         </h4>
//                         <div className="bg-gray-50 rounded-lg p-4">
//                           <p className="text-gray-600 whitespace-pre-line text-sm">
//                             {selectedSession.description}
//                           </p>
//                         </div>
//                       </div>
//                     )}

//                     {/* Session Features */}
//                     <div className="mt-8 pt-8 border-t border-gray-200">
//                       <h4 className="font-medium text-gray-900 mb-4 flex items-center">
//                         <FaVideo className="h-4 w-4 mr-2 text-gray-500" />
//                         Session Features
//                       </h4>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className={`flex items-center p-3 rounded-lg border ${
//                           selectedSession.chatEnabled 
//                             ? 'border-green-200 bg-green-50' 
//                             : 'border-gray-200 bg-gray-50'
//                         }`}>
//                           <div className={`p-2 rounded-lg mr-3 ${
//                             selectedSession.chatEnabled 
//                               ? 'bg-green-100 text-green-600' 
//                               : 'bg-gray-100 text-gray-400'
//                           }`}>
//                             <FaComment className="h-5 w-5" />
//                           </div>
//                           <div>
//                             <p className="font-medium text-sm">Live Chat</p>
//                             <p className="text-xs text-gray-500">
//                               {selectedSession.chatEnabled ? 'Enabled for interaction' : 'Disabled'}
//                             </p>
//                           </div>
//                         </div>
                        
//                         <div className={`flex items-center p-3 rounded-lg border ${
//                           selectedSession.whiteboardEnabled 
//                             ? 'border-blue-200 bg-blue-50' 
//                             : 'border-gray-200 bg-gray-50'
//                         }`}>
//                           <div className={`p-2 rounded-lg mr-3 ${
//                             selectedSession.whiteboardEnabled 
//                               ? 'bg-blue-100 text-blue-600' 
//                               : 'bg-gray-100 text-gray-400'
//                           }`}>
//                             <FaChalkboard className="h-5 w-5" />
//                           </div>
//                           <div>
//                             <p className="font-medium text-sm">Interactive Whiteboard</p>
//                             <p className="text-xs text-gray-500">
//                               {selectedSession.whiteboardEnabled ? 'Enabled for collaboration' : 'Disabled'}
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <div className="p-12 text-center">
//                   <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Session</h3>
//                   <p className="text-gray-500 max-w-md mx-auto">
//                     Choose a live session from the list to view its recordings and details
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Footer Stats */}
//         <div className="mt-8">
//           <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//               <h3 className="font-semibold text-gray-900 flex items-center">
//                 <FaVideo className="h-5 w-5 mr-2 text-blue-600" />
//                 Course Statistics
//               </h3>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
//               <div className="text-center p-6">
//                 <div className="text-3xl font-bold text-blue-600 mb-2">
//                   {course.liveClasses?.filter(s => s.status === 'COMPLETED').length || 0}
//                 </div>
//                 <div className="text-gray-600 flex items-center justify-center">
//                   <FaCheckCircle className="h-4 w-4 mr-2 text-green-500" />
//                   Completed Sessions
//                 </div>
//               </div>
//               <div className="text-center p-6">
//                 <div className="text-3xl font-bold text-purple-600 mb-2">
//                   {sessionRecordings.length}
//                 </div>
//                 <div className="text-gray-600 flex items-center justify-center">
//                   <FaFileVideo className="h-4 w-4 mr-2 text-purple-500" />
//                   Total Recordings
//                 </div>
//               </div>
//               <div className="text-center p-6">
//                 <div className="text-3xl font-bold text-green-600 mb-2">
//                   {course.enrolledCount || 0}
//                 </div>
//                 <div className="text-gray-600 flex items-center justify-center">
//                   <FaUsers className="h-4 w-4 mr-2 text-green-500" />
//                   Enrolled Students
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//     </DashboardLayout>
//   );
// };

// export default CourseRecordingsPage;







// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import {
//   FaPlayCircle,
//   FaCalendarAlt,
//   FaClock,
//   FaUser,
//   FaVideo,
//   FaArrowLeft,
//   FaSpinner,
//   FaExclamationCircle,
//   FaExternalLinkAlt,
//   FaFileVideo,
//   FaUsers,
//   FaHashtag,
//   FaComment,
//   FaChalkboard,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaRegCalendarCheck,
//   FaLock,
//   FaUnlock,
//   FaUpload,
//   FaTrash,
//   FaEye,
//   FaEyeSlash
// } from 'react-icons/fa';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token, user } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedSession, setSelectedSession] = useState(null);
//   const [sessionRecordings, setSessionRecordings] = useState([]);
//   const [sessionPermissions, setSessionPermissions] = useState(null);

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         const response = await axios.get(
//           `${import.meta.env.VITE_API_URL}/course/getAllCourses`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             },
//           }
//         );

//         if (response.data.success) {
//           const foundCourse = response.data.data.courses.find(
//             course => course._id === courseId
//           );
          
//           if (foundCourse) {
//             setCourse(foundCourse);
//             if (foundCourse.liveClasses && foundCourse.liveClasses.length > 0) {
//               setSelectedSession(foundCourse.liveClasses[0]);
//               fetchSessionRecordings(foundCourse.liveClasses[0].sessionId);
//             }
//           } else {
//             setError('Course not found');
//           }
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings for a specific session
//   const fetchSessionRecordings = async (sessionId) => {
//     if (!sessionId) return;
    
//     try {
//       setLoadingRecordings(true);
//       setSessionRecordings([]);
//       setSessionPermissions(null);
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/session/${sessionId}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         setSessionRecordings(response.data.data.recordings || []);
//         setSessionPermissions(response.data.data.permissions || {});
//       } else {
//         setSessionRecordings([]);
//         setSessionPermissions(null);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setSessionRecordings([]);
//       setSessionPermissions(null);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle session selection
//   const handleSessionSelect = (session) => {
//     setSelectedSession(session);
//     fetchSessionRecordings(session.sessionId);
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   // Format time
//   const formatTime = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Calculate session duration
//   const getSessionDuration = (minutes) => {
//     if (!minutes) return 'N/A';
//     if (minutes < 60) {
//       return `${minutes} min`;
//     }
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
//   };

//   // Format recording duration
//   const formatRecordingDuration = (seconds) => {
//     if (!seconds) return 'N/A';
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);
    
//     if (hours > 0) {
//       return `${hours}h ${minutes}m ${secs}s`;
//     } else if (minutes > 0) {
//       return `${minutes}m ${secs}s`;
//     } else {
//       return `${secs}s`;
//     }
//   };

//   // Get session status badge color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'SCHEDULED':
//         return 'bg-blue-100 text-blue-800';
//       case 'LIVE':
//         return 'bg-green-100 text-green-800';
//       case 'COMPLETED':
//         return 'bg-purple-100 text-purple-800';
//       case 'CANCELLED':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   // Get status icon
//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'COMPLETED':
//         return <FaCheckCircle className="inline mr-1" />;
//       case 'SCHEDULED':
//         return <FaRegCalendarCheck className="inline mr-1" />;
//       case 'CANCELLED':
//         return <FaTimesCircle className="inline mr-1" />;
//       default:
//         return null;
//     }
//   };

//   // Handle recording upload (if user has permission)
//   const handleUploadRecording = async () => {
//     // Implement recording upload functionality
//     alert('Upload recording functionality to be implemented');
//   };

//   // Handle recording deletion (if user has permission)
//   const handleDeleteRecording = async (recordingId) => {
//     if (window.confirm('Are you sure you want to delete this recording?')) {
//       // Implement recording deletion
//       alert(`Delete recording ${recordingId} functionality to be implemented`);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//           <p className="text-gray-600">Loading course details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//           <p className="text-gray-600 mb-6">{error}</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!course) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//           <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//           <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//           <button
//             onClick={() => navigate('/courses')}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Back to Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen bg-gray-50">
//         {/* Header */}
//         <div className="bg-white shadow">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex items-center justify-between py-4">
//               <div className="flex items-center space-x-4">
//                 <button
//                   onClick={() => navigate(-1)}
//                   className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
//                 >
//                   <FaArrowLeft className="h-5 w-5 mr-2" />
//                   Back
//                 </button>
//                 <div className="h-8 w-px bg-gray-300" />
//                 <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//               </div>
//               <Link
//                 to={`/courses/${courseId}`}
//                 className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
//               >
//                 <FaExternalLinkAlt className="h-5 w-5 mr-2" />
//                 Go to Course
//               </Link>
//             </div>
//           </div>
//         </div>

//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           {/* Course Info Card */}
//           <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 border border-gray-200">
//             <div className="p-6">
//               <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//                 <div className="flex-1">
//                   <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h2>
//                   <p className="text-gray-600">{course.description}</p>
//                 </div>
//                 <div className="mt-4 md:mt-0 flex-shrink-0">
//                   <div className="flex items-center space-x-6">
//                     <div className="flex items-center text-gray-600">
//                       <FaUser className="h-5 w-5 mr-2 text-gray-400" />
//                       <span className="font-medium">{course.instructor}</span>
//                     </div>
//                     <div className="flex items-center text-gray-600">
//                       <FaVideo className="h-5 w-5 mr-2 text-gray-400" />
//                       <span className="font-medium">{course.liveClasses?.length || 0} Sessions</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div className="flex flex-wrap gap-4">
//                 <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
//                   {course.category}
//                 </div>
//                 <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
//                   {course.level}
//                 </div>
//                 <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
//                   {course.duration} hours total
//                 </div>
//                 <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
//                   {course.enrolledCount || 0} enrolled
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//             {/* Left Column - Sessions List */}
//             <div className="lg:col-span-1">
//               <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
//                 <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//                   <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                     <FaCalendarAlt className="h-5 w-5 mr-2 text-blue-600" />
//                     Live Sessions
//                   </h3>
//                   <p className="text-sm text-gray-500 mt-1">
//                     Select a session to view recordings
//                   </p>
//                 </div>
                
//                 <div className="overflow-y-auto max-h-[600px]">
//                   {course.liveClasses && course.liveClasses.length > 0 ? (
//                     <div className="divide-y divide-gray-200">
//                       {course.liveClasses.map((session) => (
//                         <button
//                           key={session._id}
//                           onClick={() => handleSessionSelect(session)}
//                           className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 ${
//                             selectedSession?._id === session._id 
//                               ? 'bg-blue-50 border-l-4 border-blue-600' 
//                               : ''
//                           }`}
//                         >
//                           <div className="flex justify-between items-start mb-2">
//                             <h4 className="font-medium text-gray-900 text-sm">{session.sessionTitle}</h4>
//                             <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(session.status)}`}>
//                               {getStatusIcon(session.status)}
//                               {session.status}
//                             </span>
//                           </div>
                          
//                           <div className="space-y-2 text-xs text-gray-600">
//                             <div className="flex items-center">
//                               <FaClock className="h-3 w-3 mr-2 flex-shrink-0" />
//                               <span>
//                                 {formatDate(session.scheduleAt)} • {formatTime(session.scheduleAt)}
//                               </span>
//                             </div>
                            
//                             <div className="flex items-center">
//                               <FaHashtag className="h-3 w-3 mr-2 flex-shrink-0" />
//                               <span className="font-mono">Room: {session.roomCode}</span>
//                             </div>
                            
//                             <div className="flex items-center">
//                               <FaUsers className="h-3 w-3 mr-2 flex-shrink-0" />
//                               <span>Duration: {getSessionDuration(session.duration)}</span>
//                             </div>
//                           </div>
                          
//                           {session.description && (
//                             <p className="mt-3 text-xs text-gray-500 line-clamp-2">
//                               {session.description}
//                             </p>
//                           )}
//                         </button>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="p-8 text-center">
//                       <FaCalendarAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                       <h4 className="font-medium text-gray-900 mb-2">No Live Sessions</h4>
//                       <p className="text-gray-500 text-sm">This course doesn't have any live sessions yet.</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Right Column - Recordings */}
//             <div className="lg:col-span-2">
//               <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 h-full">
//                 {selectedSession ? (
//                   <>
//                     <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//                       <div className="flex flex-col md:flex-row md:items-center justify-between">
//                         <div>
//                           <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                             <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
//                             Recordings for: {selectedSession.sessionTitle}
//                           </h3>
//                           <div className="flex flex-wrap items-center gap-2 mt-1">
//                             <p className="text-sm text-gray-500">
//                               <FaCalendarAlt className="inline mr-1 h-3 w-3" />
//                               Scheduled: {formatDate(selectedSession.scheduleAt)} at {formatTime(selectedSession.scheduleAt)}
//                             </p>
//                             <span className="flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
//                               {selectedSession.isPrivate ? (
//                                 <>
//                                   <FaLock className="h-3 w-3 mr-1" /> Private
//                                 </>
//                               ) : (
//                                 <>
//                                   <FaUnlock className="h-3 w-3 mr-1" /> Public
//                                 </>
//                               )}
//                             </span>
//                           </div>
//                         </div>
//                         <div className="mt-2 md:mt-0 flex items-center space-x-2">
//                           <FaHashtag className="h-5 w-5 text-gray-400" />
//                           <span className="font-mono bg-gray-100 px-3 py-1 rounded text-sm border border-gray-300">
//                             {selectedSession.roomCode}
//                           </span>
//                           {sessionPermissions?.canUpload && (
//                             <button
//                               onClick={handleUploadRecording}
//                               className="flex items-center text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
//                             >
//                               <FaUpload className="h-3 w-3 mr-1" />
//                               Upload
//                             </button>
//                           )}
//                         </div>
//                       </div>
//                     </div>

//                     <div className="p-6">
//                       {loadingRecordings ? (
//                         <div className="text-center py-12">
//                           <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                           <p className="text-gray-600">Loading recordings...</p>
//                         </div>
//                       ) : sessionRecordings.length > 0 ? (
//                         <div className="space-y-6">
//                           {/* Total Recording Stats */}
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                             <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
//                               <div className="text-2xl font-bold text-blue-700 mb-1">
//                                 {sessionRecordings.length}
//                               </div>
//                               <div className="text-sm text-blue-600 flex items-center">
//                                 <FaFileVideo className="h-4 w-4 mr-2" />
//                                 Total Recordings
//                               </div>
//                             </div>
//                             <div className="bg-green-50 p-4 rounded-lg border border-green-200">
//                               <div className="text-2xl font-bold text-green-700 mb-1">
//                                 {formatRecordingDuration(
//                                   sessionRecordings.reduce((total, rec) => total + (rec.duration || 0), 0)
//                                 )}
//                               </div>
//                               <div className="text-sm text-green-600 flex items-center">
//                                 <FaClock className="h-4 w-4 mr-2" />
//                                 Total Duration
//                               </div>
//                             </div>
//                             <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
//                               <div className="text-2xl font-bold text-purple-700 mb-1">
//                                 {sessionPermissions?.canUpload ? 'Yes' : 'No'}
//                               </div>
//                               <div className="text-sm text-purple-600 flex items-center">
//                                 <FaUpload className="h-4 w-4 mr-2" />
//                                 Can Upload
//                               </div>
//                             </div>
//                           </div>

//                           {/* Recordings Grid */}
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                             {sessionRecordings.map((recording, index) => (
//                               <div
//                                 key={index}
//                                 className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white group"
//                               >
//                                 <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
//                                   {/* Video thumbnail preview */}
//                                   <div className="absolute inset-0 flex items-center justify-center">
//                                     <div className="relative">
//                                       <FaPlayCircle className="h-16 w-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
//                                       <div className="absolute inset-0 animate-ping opacity-25">
//                                         <FaPlayCircle className="h-16 w-16 text-white" />
//                                       </div>
//                                     </div>
//                                   </div>
//                                   <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
//                                     <div className="flex items-center justify-between">
//                                       <p className="text-white font-medium text-sm">
//                                         {recording.title || `Recording ${index + 1}`}
//                                       </p>
//                                       {recording.duration && (
//                                         <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
//                                           {formatRecordingDuration(recording.duration)}
//                                         </span>
//                                       )}
//                                     </div>
//                                   </div>
//                                   {sessionPermissions?.canDelete && (
//                                     <button
//                                       onClick={() => handleDeleteRecording(recording._id || index)}
//                                       className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
//                                     >
//                                       <FaTrash className="h-4 w-4" />
//                                     </button>
//                                   )}
//                                 </div>
                                
//                                 <div className="p-4">
//                                   <div className="flex justify-between items-start mb-3">
//                                     <div>
//                                       <h4 className="font-medium text-gray-900 text-sm">
//                                         {recording.title || `Session Recording - Part ${index + 1}`}
//                                       </h4>
//                                       {recording.createdAt && (
//                                         <p className="text-xs text-gray-500 mt-1 flex items-center">
//                                           <FaClock className="h-3 w-3 mr-1" />
//                                           Added: {new Date(recording.createdAt).toLocaleDateString()}
//                                         </p>
//                                       )}
//                                     </div>
//                                     {recording.isPrivate && (
//                                       <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 flex items-center">
//                                         <FaLock className="h-3 w-3 mr-1" />
//                                         Private
//                                       </span>
//                                     )}
//                                   </div>
                                  
//                                   <div className="flex space-x-2">
//                                     <a
//                                       href={recording.url}
//                                       target="_blank"
//                                       rel="noopener noreferrer"
//                                       className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:-translate-y-0.5 shadow hover:shadow-md"
//                                     >
//                                       <FaPlayCircle className="h-4 w-4 mr-2" />
//                                       Watch Recording
//                                     </a>
//                                     {sessionPermissions?.canDelete && (
//                                       <button
//                                         onClick={() => handleDeleteRecording(recording._id || index)}
//                                         className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
//                                       >
//                                         <FaTrash className="h-4 w-4" />
//                                       </button>
//                                     )}
//                                   </div>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="text-center py-12">
//                           <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                           <h4 className="font-medium text-gray-900 mb-2">No Recordings Available</h4>
//                           <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                             {selectedSession.status === 'SCHEDULED'
//                               ? 'Recordings will be available after the session is completed.'
//                               : selectedSession.status === 'CANCELLED'
//                               ? 'This session was cancelled and has no recordings.'
//                               : 'No recordings were captured for this session.'}
//                           </p>
//                           {sessionPermissions?.canUpload && (
//                             <button
//                               onClick={handleUploadRecording}
//                               className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow hover:shadow-md"
//                             >
//                               <FaUpload className="h-5 w-5 mr-2" />
//                               Upload Recording
//                             </button>
//                           )}
//                           <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 mt-6">
//                             <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                               {selectedSession.isPrivate ? (
//                                 <FaLock className="h-4 w-4 mr-2 text-red-500" />
//                               ) : (
//                                 <FaUnlock className="h-4 w-4 mr-2 text-green-500" />
//                               )}
//                               <span>{selectedSession.isPrivate ? 'Private Session' : 'Public Session'}</span>
//                             </div>
//                             <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                               <FaClock className="h-4 w-4 mr-2" />
//                               <span>Duration: {getSessionDuration(selectedSession.duration)}</span>
//                             </div>
//                             <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
//                               <FaUsers className="h-4 w-4 mr-2" />
//                               <span>Max Participants: {selectedSession.maxParticipants || 'Unlimited'}</span>
//                             </div>
//                           </div>
//                         </div>
//                       )}

//                       {/* Session Details */}
//                       {selectedSession.description && (
//                         <div className="mt-8 pt-8 border-t border-gray-200">
//                           <h4 className="font-medium text-gray-900 mb-3 flex items-center">
//                             <FaFileVideo className="h-4 w-4 mr-2 text-gray-500" />
//                             Session Description
//                           </h4>
//                           <div className="bg-gray-50 rounded-lg p-4">
//                             <p className="text-gray-600 whitespace-pre-line text-sm">
//                               {selectedSession.description}
//                             </p>
//                           </div>
//                         </div>
//                       )}

//                       {/* Session Features */}
//                       <div className="mt-8 pt-8 border-t border-gray-200">
//                         <h4 className="font-medium text-gray-900 mb-4 flex items-center">
//                           <FaVideo className="h-4 w-4 mr-2 text-gray-500" />
//                           Session Features
//                         </h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <div className={`flex items-center p-3 rounded-lg border ${
//                             selectedSession.chatEnabled 
//                               ? 'border-green-200 bg-green-50' 
//                               : 'border-gray-200 bg-gray-50'
//                           }`}>
//                             <div className={`p-2 rounded-lg mr-3 ${
//                               selectedSession.chatEnabled 
//                                 ? 'bg-green-100 text-green-600' 
//                                 : 'bg-gray-100 text-gray-400'
//                             }`}>
//                               <FaComment className="h-5 w-5" />
//                             </div>
//                             <div>
//                               <p className="font-medium text-sm">Live Chat</p>
//                               <p className="text-xs text-gray-500">
//                                 {selectedSession.chatEnabled ? 'Enabled for interaction' : 'Disabled'}
//                               </p>
//                             </div>
//                           </div>
                          
//                           <div className={`flex items-center p-3 rounded-lg border ${
//                             selectedSession.whiteboardEnabled 
//                               ? 'border-blue-200 bg-blue-50' 
//                               : 'border-gray-200 bg-gray-50'
//                           }`}>
//                             <div className={`p-2 rounded-lg mr-3 ${
//                               selectedSession.whiteboardEnabled 
//                                 ? 'bg-blue-100 text-blue-600' 
//                                 : 'bg-gray-100 text-gray-400'
//                             }`}>
//                               <FaChalkboard className="h-5 w-5" />
//                             </div>
//                             <div>
//                               <p className="font-medium text-sm">Interactive Whiteboard</p>
//                               <p className="text-xs text-gray-500">
//                                 {selectedSession.whiteboardEnabled ? 'Enabled for collaboration' : 'Disabled'}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Permissions Info */}
//                       {sessionPermissions && (
//                         <div className="mt-8 pt-8 border-t border-gray-200">
//                           <h4 className="font-medium text-gray-900 mb-4 flex items-center">
//                             <FaEye className="h-4 w-4 mr-2 text-gray-500" />
//                             Your Permissions
//                           </h4>
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div className="flex items-center p-3 rounded-lg border border-gray-200 bg-gray-50">
//                               <div className={`p-2 rounded-lg mr-3 ${
//                                 sessionPermissions.canUpload 
//                                   ? 'bg-green-100 text-green-600' 
//                                   : 'bg-gray-100 text-gray-400'
//                               }`}>
//                                 {sessionPermissions.canUpload ? (
//                                   <FaUpload className="h-5 w-5" />
//                                 ) : (
//                                   <FaEyeSlash className="h-5 w-5" />
//                                 )}
//                               </div>
//                               <div>
//                                 <p className="font-medium text-sm">
//                                   {sessionPermissions.canUpload ? 'Can Upload Recordings' : 'View Only'}
//                                 </p>
//                                 <p className="text-xs text-gray-500">
//                                   {sessionPermissions.canUpload 
//                                     ? 'You can upload and manage recordings' 
//                                     : 'You can only view recordings'}
//                                 </p>
//                               </div>
//                             </div>
                            
//                             <div className="flex items-center p-3 rounded-lg border border-gray-200 bg-gray-50">
//                               <div className={`p-2 rounded-lg mr-3 ${
//                                 sessionPermissions.canDelete 
//                                   ? 'bg-red-100 text-red-600' 
//                                   : 'bg-gray-100 text-gray-400'
//                               }`}>
//                                 <FaTrash className="h-5 w-5" />
//                               </div>
//                               <div>
//                                 <p className="font-medium text-sm">
//                                   {sessionPermissions.canDelete ? 'Can Delete Recordings' : 'Cannot Delete'}
//                                 </p>
//                                 <p className="text-xs text-gray-500">
//                                   {sessionPermissions.canDelete 
//                                     ? 'You can delete recordings' 
//                                     : 'You cannot delete recordings'}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </>
//                 ) : (
//                   <div className="p-12 text-center">
//                     <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Session</h3>
//                     <p className="text-gray-500 max-w-md mx-auto">
//                       Choose a live session from the list to view its recordings and details
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Footer Stats */}
//           <div className="mt-8">
//             <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//                 <h3 className="font-semibold text-gray-900 flex items-center">
//                   <FaVideo className="h-5 w-5 mr-2 text-blue-600" />
//                   Course Statistics
//                 </h3>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
//                 <div className="text-center p-6">
//                   <div className="text-3xl font-bold text-blue-600 mb-2">
//                     {course.liveClasses?.filter(s => s.status === 'COMPLETED').length || 0}
//                   </div>
//                   <div className="text-gray-600 flex items-center justify-center">
//                     <FaCheckCircle className="h-4 w-4 mr-2 text-green-500" />
//                     Completed Sessions
//                   </div>
//                 </div>
//                 <div className="text-center p-6">
//                   <div className="text-3xl font-bold text-purple-600 mb-2">
//                     {sessionRecordings.length}
//                   </div>
//                   <div className="text-gray-600 flex items-center justify-center">
//                     <FaFileVideo className="h-4 w-4 mr-2 text-purple-500" />
//                     Current Recordings
//                   </div>
//                 </div>
//                 <div className="text-center p-6">
//                   <div className="text-3xl font-bold text-green-600 mb-2">
//                     {course.enrolledCount || 0}
//                   </div>
//                   <div className="text-gray-600 flex items-center justify-center">
//                     <FaUsers className="h-4 w-4 mr-2 text-green-500" />
//                     Enrolled Students
//                   </div>
//                 </div>
//                 <div className="text-center p-6">
//                   <div className="text-3xl font-bold text-red-600 mb-2">
//                     {course.liveClasses?.filter(s => s.isPrivate).length || 0}
//                   </div>
//                   <div className="text-gray-600 flex items-center justify-center">
//                     <FaLock className="h-4 w-4 mr-2 text-red-500" />
//                     Private Sessions
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default CourseRecordingsPage;














// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import {
//   FaPlayCircle,
//   FaCalendarAlt,
//   FaClock,
//   FaUser,
//   FaVideo,
//   FaArrowLeft,
//   FaSpinner,
//   FaExclamationCircle,
//   FaExternalLinkAlt,
//   FaFileVideo,
//   FaUsers,
//   FaHashtag,
//   FaDownload,
//   FaSearch,
//   FaFilter,
//   FaSort,
//   FaEye,
//   FaLock,
//   FaUnlock,
//   FaUpload,
//   FaTrash,
//   FaEyeSlash,
//   FaInfoCircle,
//   FaCloudDownloadAlt,
//   FaLink,
//   FaRegCalendarCheck,
//   FaCheckCircle,
//   FaTimesCircle
// } from 'react-icons/fa';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token, user } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Recordings state
//   const [recordings, setRecordings] = useState([]);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
  
//   // Filter & Search state
//   const [searchTerm, setSearchTerm] = useState('');
//   const [sortBy, setSortBy] = useState('date');
//   const [sortOrder, setSortOrder] = useState('desc');
//   const [minDuration, setMinDuration] = useState('');
//   const [maxDuration, setMaxDuration] = useState('');
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
//   // Selected recording for download
//   const [selectedRecording, setSelectedRecording] = useState(null);
//   const [downloading, setDownloading] = useState(false);
  
//   // Stats
//   const [stats, setStats] = useState({
//     totalRecordings: 0,
//     totalDuration: 0,
//     totalSize: 0,
//     avgDuration: 0
//   });

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         const response = await axios.get(
//           `${import.meta.env.VITE_API_URL}/course/${courseId}`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           }
//         );

//         if (response.data.success) {
//           setCourse(response.data.data);
//           // Fetch recordings for this course
//           fetchCourseRecordings();
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings using search endpoint
//   const fetchCourseRecordings = async () => {
//     try {
//       setLoadingRecordings(true);
      
//       // Build query params
//       const params = {
//         courseId,
//         page: 1,
//         limit: 100,
//         sortBy,
//         sortOrder
//       };
      
//       if (searchTerm) params.query = searchTerm;
//       if (minDuration) params.minDuration = minDuration;
//       if (maxDuration) params.maxDuration = maxDuration;
//       if (dateRange.from) params.fromDate = dateRange.from;
//       if (dateRange.to) params.toDate = dateRange.to;
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/search`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           params
//         }
//       );

//       if (response.data.success) {
//         const recordingsData = response.data.data.recordings || [];
//         setRecordings(recordingsData);
        
//         // Calculate stats
//         calculateStats(recordingsData);
//       } else {
//         setRecordings([]);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setRecordings([]);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle download recording
//   const handleDownloadRecording = async (sessionId, recordingId) => {
//     try {
//       setDownloading(true);
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/${sessionId}/${recordingId}/download`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         const { downloadUrl, fileName } = response.data.data;
        
//         // Create download link
//         const link = document.createElement('a');
//         link.href = downloadUrl;
//         link.download = fileName;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         // Update downloads count locally
//         setRecordings(prev => prev.map(rec => 
//           rec._id === recordingId 
//             ? { ...rec, downloads: (rec.downloads || 0) + 1 }
//             : rec
//         ));
//       }
//     } catch (err) {
//       console.error('Error downloading recording:', err);
//       alert('Failed to download recording. Please try again.');
//     } finally {
//       setDownloading(false);
//       setSelectedRecording(null);
//     }
//   };

//   // Calculate statistics
//   const calculateStats = (recordingsData) => {
//     const total = recordingsData.length;
//     const totalDuration = recordingsData.reduce((sum, rec) => sum + (rec.duration || 0), 0);
//     const totalSize = recordingsData.reduce((sum, rec) => sum + (rec.fileSize || 0), 0);
//     const avgDuration = total > 0 ? totalDuration / total : 0;
    
//     setStats({
//       totalRecordings: total,
//       totalDuration,
//       totalSize,
//       avgDuration
//     });
//   };

//   // Format duration
//   const formatDuration = (seconds) => {
//     if (!seconds) return 'N/A';
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);
    
//     if (hours > 0) {
//       return `${hours}h ${minutes}m`;
//     } else if (minutes > 0) {
//       return `${minutes}m ${secs}s`;
//     } else {
//       return `${secs}s`;
//     }
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'N/A';
//     if (bytes < 1024) return bytes + ' B';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//     return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     });
//   };

//   // Get session status color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'COMPLETED': return 'bg-green-100 text-green-800';
//       case 'LIVE': return 'bg-red-100 text-red-800';
//       case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
//       case 'CANCELLED': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   // Filter recordings based on search
//   const filteredRecordings = recordings.filter(recording => {
//     const matchesSearch = !searchTerm || 
//       (recording.title && recording.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.description && recording.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.sessionTitle && recording.sessionTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesDuration = (!minDuration || recording.duration >= parseInt(minDuration)) &&
//                           (!maxDuration || recording.duration <= parseInt(maxDuration));
    
//     return matchesSearch && matchesDuration;
//   });

//   // Apply sorting
//   const sortedRecordings = [...filteredRecordings].sort((a, b) => {
//     const aValue = a[sortBy] || 0;
//     const bValue = b[sortBy] || 0;
    
//     if (sortOrder === 'asc') {
//       return aValue > bValue ? 1 : -1;
//     } else {
//       return aValue < bValue ? 1 : -1;
//     }
//   });

//   // Reset filters
//   const resetFilters = () => {
//     setSearchTerm('');
//     setMinDuration('');
//     setMaxDuration('');
//     setDateRange({ from: '', to: '' });
//     setSortBy('date');
//     setSortOrder('desc');
//   };

//   if (loading) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="text-center">
//             <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//             <p className="text-gray-600">Loading course details...</p>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (error) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//             <p className="text-gray-600 mb-6">{error}</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (!course) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//             <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen bg-gray-50">
//         {/* Header */}
//         <div className="bg-white shadow">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between py-6">
//               <div className="flex items-center space-x-4 mb-4 md:mb-0">
//                 <button
//                   onClick={() => navigate(-1)}
//                   className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
//                 >
//                   <FaArrowLeft className="h-5 w-5 mr-2" />
//                   Back
//                 </button>
//                 <div className="h-8 w-px bg-gray-300 hidden md:block" />
//                 <div>
//                   <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//                   <p className="text-gray-600 text-sm mt-1">
//                     {course.title} • {course.instructor}
//                   </p>
//                 </div>
//               </div>
//               <Link
//                 to={`/courses/${courseId}`}
//                 className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
//               >
//                 <FaExternalLinkAlt className="h-4 w-4 mr-2" />
//                 Go to Course
//               </Link>
//             </div>
//           </div>
//         </div>

//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           {/* Stats Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
//               <div className="flex items-center">
//                 <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
//                   <FaFileVideo className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">{stats.totalRecordings}</div>
//                   <div className="text-sm text-gray-600">Total Recordings</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
//               <div className="flex items-center">
//                 <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
//                   <FaClock className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.totalDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Duration</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
//               <div className="flex items-center">
//                 <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
//                   <FaCloudDownloadAlt className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatFileSize(stats.totalSize)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Size</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
//               <div className="flex items-center">
//                 <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
//                   <FaInfoCircle className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.avgDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Average Duration</div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Search and Filter Bar */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaSearch className="h-5 w-5 mr-2 text-blue-600" />
//                   Search Recordings
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   {recordings.length} recordings found
//                 </p>
//               </div>
//               <div className="mt-4 md:mt-0">
//                 <button
//                   onClick={resetFilters}
//                   className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   Reset Filters
//                 </button>
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Search Input */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Search Recordings
//                 </label>
//                 <div className="relative">
//                   <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                   <input
//                     type="text"
//                     placeholder="Search by title, description..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   />
//                 </div>
//               </div>

//               {/* Duration Filters */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Min Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 300"
//                   value={minDuration}
//                   onChange={(e) => setMinDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Max Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 3600"
//                   value={maxDuration}
//                   onChange={(e) => setMaxDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               {/* Sort By */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Sort By
//                 </label>
//                 <div className="flex space-x-2">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => setSortBy(e.target.value)}
//                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   >
//                     <option value="recordedAt">Date</option>
//                     <option value="duration">Duration</option>
//                     <option value="title">Title</option>
//                     <option value="views">Views</option>
//                     <option value="downloads">Downloads</option>
//                   </select>
//                   <button
//                     onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
//                   >
//                     {sortOrder === 'asc' ? '↑' : '↓'}
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             {/* Date Range Filters */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   From Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.from}
//                   onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   To Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.to}
//                   onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//             </div>
            
//             {/* Apply Filters Button */}
//             <div className="mt-6">
//               <button
//                 onClick={fetchCourseRecordings}
//                 className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
//               >
//                 <FaFilter className="h-4 w-4 mr-2" />
//                 Apply Filters
//               </button>
//             </div>
//           </div>

//           {/* Recordings Grid */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
//                 Available Recordings ({sortedRecordings.length})
//               </h3>
//             </div>
            
//             <div className="p-6">
//               {loadingRecordings ? (
//                 <div className="text-center py-12">
//                   <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                   <p className="text-gray-600">Loading recordings...</p>
//                 </div>
//               ) : sortedRecordings.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {sortedRecordings.map((recording) => (
//                     <div
//                       key={recording._id}
//                       className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white group"
//                     >
//                       {/* Thumbnail/Header */}
//                       <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
//                         <div className="absolute inset-0 flex items-center justify-center">
//                           <FaPlayCircle className="h-16 w-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
//                         </div>
//                         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
//                           <div className="flex items-center justify-between">
//                             <p className="text-white font-medium text-sm truncate">
//                               {recording.title || 'Recording'}
//                             </p>
//                             <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
//                               {formatDuration(recording.duration)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
                      
//                       {/* Recording Details */}
//                       <div className="p-4">
//                         {/* Session Info */}
//                         <div className="mb-4">
//                           <h4 className="font-semibold text-gray-900 text-sm mb-2 truncate">
//                             {recording.sessionTitle}
//                           </h4>
//                           <div className="flex items-center text-xs text-gray-500 mb-2">
//                             <FaCalendarAlt className="h-3 w-3 mr-1" />
//                             {formatDate(recording.recordedAt)}
//                           </div>
//                           <div className="flex items-center text-xs text-gray-500">
//                             <FaUser className="h-3 w-3 mr-1" />
//                             {recording.streamer?.name || 'Unknown Streamer'}
//                           </div>
//                         </div>
                        
//                         {/* Recording Metadata */}
//                         <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
//                           <div className="bg-gray-50 p-2 rounded">
//                             <div className="text-gray-600">Size</div>
//                             <div className="font-medium">{formatFileSize(recording.fileSize)}</div>
//                           </div>
//                           <div className="bg-gray-50 p-2 rounded">
//                             <div className="text-gray-600">Views</div>
//                             <div className="font-medium">{recording.views || 0}</div>
//                           </div>
//                           <div className="bg-gray-50 p-2 rounded">
//                             <div className="text-gray-600">Downloads</div>
//                             <div className="font-medium">{recording.downloads || 0}</div>
//                           </div>
//                           <div className="bg-gray-50 p-2 rounded">
//                             <div className="text-gray-600">Status</div>
//                             <div className="font-medium">{recording.status || 'COMPLETED'}</div>
//                           </div>
//                         </div>
                        
//                         {/* Actions */}
//                         <div className="flex space-x-2">
//                           <button
//                             onClick={() => {
//                               if (recording.fileUrl) {
//                                 window.open(recording.fileUrl, '_blank');
//                               }
//                             }}
//                             className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
//                             disabled={!recording.fileUrl}
//                           >
//                             <FaPlayCircle className="h-4 w-4 mr-2" />
//                             Watch
//                           </button>
                          
//                           <button
//                             onClick={() => handleDownloadRecording(recording.sessionId, recording._id)}
//                             disabled={downloading && selectedRecording === recording._id}
//                             className="flex-1 inline-flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
//                           >
//                             {downloading && selectedRecording === recording._id ? (
//                               <>
//                                 <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                                 Downloading...
//                               </>
//                             ) : (
//                               <>
//                                 <FaDownload className="h-4 w-4 mr-2" />
//                                 Download
//                               </>
//                             )}
//                           </button>
//                         </div>
                        
//                         {/* Tags */}
//                         {recording.tags && recording.tags.length > 0 && (
//                           <div className="mt-4 flex flex-wrap gap-1">
//                             {recording.tags.slice(0, 3).map((tag, index) => (
//                               <span
//                                 key={index}
//                                 className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
//                               >
//                                 {tag}
//                               </span>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-12">
//                   <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                   <h4 className="font-medium text-gray-900 mb-2">No Recordings Found</h4>
//                   <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                     {searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to
//                       ? 'No recordings match your search criteria. Try adjusting your filters.'
//                       : 'No recordings available for this course yet.'}
//                   </p>
//                   <button
//                     onClick={resetFilters}
//                     className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
//                   >
//                     <FaFilter className="h-4 w-4 mr-2" />
//                     Clear all filters
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Course Information */}
//           <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <FaInfoCircle className="h-5 w-5 mr-2 text-blue-600" />
//                 Course Information
//               </h3>
//             </div>
//             <div className="p-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4">Course Details</h4>
//                   <div className="space-y-3">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Course Title:</span>
//                       <span className="font-medium">{course.title}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Instructor:</span>
//                       <span className="font-medium">{course.instructor}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Category:</span>
//                       <span className="font-medium">{course.category}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Level:</span>
//                       <span className="font-medium">{course.level}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Total Duration:</span>
//                       <span className="font-medium">{course.duration} hours</span>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4">Enrollment Info</h4>
//                   <div className="space-y-3">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Enrolled Students:</span>
//                       <span className="font-medium">{course.enrolledCount || 0}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Live Sessions:</span>
//                       <span className="font-medium">{course.liveClasses?.length || 0}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Course Status:</span>
//                       <span className="font-medium">{course.status || 'Active'}</span>
//                     </div>
//                   </div>
                  
//                   {/* Course Description */}
//                   {course.description && (
//                     <div className="mt-6">
//                       <h5 className="font-medium text-gray-900 mb-2">Description</h5>
//                       <p className="text-gray-600 text-sm">{course.description}</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Download Modal */}
//       {selectedRecording && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
//             <div className="p-6">
//               <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
//                 <FaCloudDownloadAlt className="h-5 w-5 mr-2 text-blue-600" />
//                 Download Recording
//               </h3>
//               <p className="text-gray-600 mb-6">
//                 The download link will be valid for 1 hour. Click the button below to start downloading.
//               </p>
//               <div className="flex justify-end space-x-3">
//                 <button
//                   onClick={() => setSelectedRecording(null)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={() => handleDownloadRecording(selectedRecording.sessionId, selectedRecording._id)}
//                   disabled={downloading}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
//                 >
//                   {downloading ? (
//                     <>
//                       <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                       Downloading...
//                     </>
//                   ) : (
//                     <>
//                       <FaDownload className="h-4 w-4 mr-2" />
//                       Download Now
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </DashboardLayout>
//   );
// };

// export default CourseRecordingsPage;














// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import {
//   FaPlayCircle,
//   FaCalendarAlt,
//   FaClock,
//   FaUser,
//   FaVideo,
//   FaArrowLeft,
//   FaSpinner,
//   FaExclamationCircle,
//   FaExternalLinkAlt,
//   FaFileVideo,
//   FaUsers,
//   FaHashtag,
//   FaDownload,
//   FaSearch,
//   FaFilter,
//   FaSort,
//   FaEye,
//   FaLock,
//   FaUnlock,
//   FaUpload,
//   FaTrash,
//   FaEyeSlash,
//   FaInfoCircle,
//   FaCloudDownloadAlt,
//   FaLink,
//   FaRegCalendarCheck,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaBook,
//   FaGraduationCap,
//   FaChartLine
// } from 'react-icons/fa';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token, user } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Recordings state
//   const [recordings, setRecordings] = useState([]);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
  
//   // Filter & Search state
//   const [searchTerm, setSearchTerm] = useState('');
//   const [sortBy, setSortBy] = useState('recordedAt');
//   const [sortOrder, setSortOrder] = useState('desc');
//   const [minDuration, setMinDuration] = useState('');
//   const [maxDuration, setMaxDuration] = useState('');
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
//   // Selected recording for download
//   const [selectedRecording, setSelectedRecording] = useState(null);
//   const [downloading, setDownloading] = useState(false);
  
//   // Stats
//   const [stats, setStats] = useState({
//     totalRecordings: 0,
//     totalDuration: 0,
//     totalSize: 0,
//     avgDuration: 0
//   });

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         const response = await axios.get(
//           `${import.meta.env.VITE_API_URL}/course/getSingleCourse/${courseId}`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           }
//         );

//         if (response.data.success) {
//           setCourse(response.data.data);
//           // Fetch recordings for this course
//           fetchCourseRecordings();
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings using search endpoint
//   const fetchCourseRecordings = async () => {
//     try {
//       setLoadingRecordings(true);
      
//       // Build query params
//       const params = {
//         courseId,
//         page: 1,
//         limit: 100,
//         sortBy,
//         sortOrder
//       };
      
//       if (searchTerm) params.query = searchTerm;
//       if (minDuration) params.minDuration = minDuration;
//       if (maxDuration) params.maxDuration = maxDuration;
//       if (dateRange.from) params.fromDate = dateRange.from;
//       if (dateRange.to) params.toDate = dateRange.to;
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/search`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           params
//         }
//       );

//       if (response.data.success) {
//         const recordingsData = response.data.data.recordings || [];
//         setRecordings(recordingsData);
        
//         // Calculate stats
//         calculateStats(recordingsData);
//       } else {
//         setRecordings([]);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setRecordings([]);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle download recording
//   const handleDownloadRecording = async (sessionId, recordingId) => {
//     try {
//       setDownloading(true);
//       setSelectedRecording(recordingId);
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/${sessionId}/${recordingId}/download`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.data.success) {
//         const { downloadUrl, fileName } = response.data.data;
        
//         // Create download link
//         const link = document.createElement('a');
//         link.href = downloadUrl;
//         link.download = fileName;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         // Update downloads count locally
//         setRecordings(prev => prev.map(rec => 
//           rec._id === recordingId 
//             ? { ...rec, downloads: (rec.downloads || 0) + 1 }
//             : rec
//         ));
        
//         // Show success message
//         alert(`Recording "${fileName}" download started!`);
//       }
//     } catch (err) {
//       console.error('Error downloading recording:', err);
//       alert(err.response?.data?.message || 'Failed to download recording. Please try again.');
//     } finally {
//       setDownloading(false);
//       setSelectedRecording(null);
//     }
//   };

//   // Calculate statistics
//   const calculateStats = (recordingsData) => {
//     const total = recordingsData.length;
//     const totalDuration = recordingsData.reduce((sum, rec) => sum + (rec.duration || 0), 0);
//     const totalSize = recordingsData.reduce((sum, rec) => sum + (rec.fileSize || 0), 0);
//     const avgDuration = total > 0 ? totalDuration / total : 0;
    
//     setStats({
//       totalRecordings: total,
//       totalDuration,
//       totalSize,
//       avgDuration
//     });
//   };

//   // Format duration
//   const formatDuration = (seconds) => {
//     if (!seconds) return 'N/A';
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);
    
//     if (hours > 0) {
//       return `${hours}h ${minutes}m`;
//     } else if (minutes > 0) {
//       return `${minutes}m ${secs}s`;
//     } else {
//       return `${secs}s`;
//     }
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'N/A';
//     if (bytes < 1024) return bytes + ' B';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//     return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     });
//   };

//   // Format date time
//   const formatDateTime = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Get session status color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'COMPLETED': return 'bg-green-100 text-green-800';
//       case 'LIVE': return 'bg-red-100 text-red-800';
//       case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
//       case 'CANCELLED': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   // Get status icon
//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'COMPLETED': return <FaCheckCircle className="h-3 w-3 mr-1" />;
//       case 'LIVE': return <FaVideo className="h-3 w-3 mr-1" />;
//       case 'SCHEDULED': return <FaRegCalendarCheck className="h-3 w-3 mr-1" />;
//       case 'CANCELLED': return <FaTimesCircle className="h-3 w-3 mr-1" />;
//       default: return null;
//     }
//   };

//   // Filter recordings based on search
//   const filteredRecordings = recordings.filter(recording => {
//     const matchesSearch = !searchTerm || 
//       (recording.title && recording.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.description && recording.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.sessionTitle && recording.sessionTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.streamer?.name && recording.streamer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesDuration = (!minDuration || recording.duration >= parseInt(minDuration)) &&
//                           (!maxDuration || recording.duration <= parseInt(maxDuration));
    
//     const matchesDate = (!dateRange.from || new Date(recording.recordedAt) >= new Date(dateRange.from)) &&
//                        (!dateRange.to || new Date(recording.recordedAt) <= new Date(dateRange.to));
    
//     return matchesSearch && matchesDuration && matchesDate;
//   });

//   // Apply sorting
//   const sortedRecordings = [...filteredRecordings].sort((a, b) => {
//     let aValue, bValue;
    
//     switch (sortBy) {
//       case 'recordedAt':
//         aValue = new Date(a.recordedAt).getTime();
//         bValue = new Date(b.recordedAt).getTime();
//         break;
//       case 'duration':
//         aValue = a.duration || 0;
//         bValue = b.duration || 0;
//         break;
//       case 'title':
//         aValue = (a.title || '').toLowerCase();
//         bValue = (b.title || '').toLowerCase();
//         break;
//       case 'views':
//         aValue = a.views || 0;
//         bValue = b.views || 0;
//         break;
//       case 'downloads':
//         aValue = a.downloads || 0;
//         bValue = b.downloads || 0;
//         break;
//       default:
//         aValue = 0;
//         bValue = 0;
//     }
    
//     if (sortOrder === 'asc') {
//       return aValue > bValue ? 1 : -1;
//     } else {
//       return aValue < bValue ? 1 : -1;
//     }
//   });

//   // Reset filters
//   const resetFilters = () => {
//     setSearchTerm('');
//     setMinDuration('');
//     setMaxDuration('');
//     setDateRange({ from: '', to: '' });
//     setSortBy('recordedAt');
//     setSortOrder('desc');
//     fetchCourseRecordings();
//   };

//   // Apply filters
//   const applyFilters = () => {
//     fetchCourseRecordings();
//   };

//   if (loading) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="text-center">
//             <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//             <p className="text-gray-600">Loading course details...</p>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (error) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//             <p className="text-gray-600 mb-6">{error}</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (!course) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//             <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen bg-gray-50">
//         {/* Header */}
//         <div className="bg-white shadow">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between py-6">
//               <div className="flex items-center space-x-4 mb-4 md:mb-0">
//                 <button
//                   onClick={() => navigate(-1)}
//                   className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
//                 >
//                   <FaArrowLeft className="h-5 w-5 mr-2" />
//                   Back
//                 </button>
//                 <div className="h-8 w-px bg-gray-300 hidden md:block" />
//                 <div>
//                   <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//                   <p className="text-gray-600 text-sm mt-1 flex items-center">
//                     <FaBook className="h-4 w-4 mr-2" />
//                     {course.title} • Created by {course.createdBy?.name || 'Unknown'}
//                   </p>
//                 </div>
//               </div>
//               <div className="flex items-center space-x-4">
//                 <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">
//                   <FaGraduationCap className="h-4 w-4 mr-2" />
//                   {course.enrolledCount || 0} Enrolled
//                 </div>
//                 <Link
//                   to={`/courses/${courseId}`}
//                   className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
//                 >
//                   <FaExternalLinkAlt className="h-4 w-4 mr-2" />
//                   View Course
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           {/* Stats Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
//                   <FaFileVideo className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">{stats.totalRecordings}</div>
//                   <div className="text-sm text-gray-600">Total Recordings</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
//                   <FaClock className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.totalDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Duration</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
//                   <FaCloudDownloadAlt className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatFileSize(stats.totalSize)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Size</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
//                   <FaChartLine className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.avgDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Avg. Duration</div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Search and Filter Bar */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaSearch className="h-5 w-5 mr-2 text-blue-600" />
//                   Search & Filter Recordings
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Found {recordings.length} recordings • Showing {filteredRecordings.length}
//                 </p>
//               </div>
//               <div className="mt-4 md:mt-0">
//                 <button
//                   onClick={resetFilters}
//                   className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
//                 >
//                   <FaFilter className="h-4 w-4 mr-2" />
//                   Reset All Filters
//                 </button>
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Search Input */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Search Recordings
//                 </label>
//                 <div className="relative">
//                   <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                   <input
//                     type="text"
//                     placeholder="Search by title, description, streamer..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   />
//                 </div>
//               </div>

//               {/* Duration Filters */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Min Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 300 (5 min)"
//                   value={minDuration}
//                   onChange={(e) => setMinDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Max Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 3600 (1 hour)"
//                   value={maxDuration}
//                   onChange={(e) => setMaxDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               {/* Sort By */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Sort By
//                 </label>
//                 <div className="flex space-x-2">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => setSortBy(e.target.value)}
//                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   >
//                     <option value="recordedAt">Date Recorded</option>
//                     <option value="duration">Duration</option>
//                     <option value="title">Title</option>
//                     <option value="views">Views</option>
//                     <option value="downloads">Downloads</option>
//                   </select>
//                   <button
//                     onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
//                   >
//                     {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             {/* Date Range Filters */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   From Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.from}
//                   onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   To Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.to}
//                   onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//             </div>
            
//             {/* Apply Filters Button */}
//             <div className="mt-6">
//               <button
//                 onClick={applyFilters}
//                 className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow hover:shadow-md"
//                 disabled={loadingRecordings}
//               >
//                 {loadingRecordings ? (
//                   <>
//                     <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                     Applying Filters...
//                   </>
//                 ) : (
//                   <>
//                     <FaFilter className="h-4 w-4 mr-2" />
//                     Apply Filters & Refresh
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Recordings Grid */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
//                   Available Recordings
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   {sortedRecordings.length} recordings found
//                   {sortedRecordings.length !== recordings.length && ` (filtered from ${recordings.length})`}
//                 </p>
//               </div>
//               <div className="mt-2 md:mt-0">
//                 <div className="text-sm text-gray-600">
//                   Sorted by: <span className="font-medium">{sortBy}</span> ({sortOrder})
//                 </div>
//               </div>
//             </div>
            
//             <div className="p-6">
//               {loadingRecordings ? (
//                 <div className="text-center py-12">
//                   <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                   <p className="text-gray-600">Loading recordings...</p>
//                 </div>
//               ) : sortedRecordings.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {sortedRecordings.map((recording) => (
//                     <div
//                       key={recording._id}
//                       className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 bg-white group hover:border-blue-300"
//                     >
//                       {/* Thumbnail/Header */}
//                       <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
//                         <div className="absolute inset-0 flex items-center justify-center">
//                           <FaPlayCircle className="h-16 w-16 text-white opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transition-transform" />
//                         </div>
//                         <div className="absolute top-2 right-2">
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(recording.status)}`}>
//                             {getStatusIcon(recording.status)}
//                             {recording.status}
//                           </span>
//                         </div>
//                         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
//                           <div className="flex items-center justify-between">
//                             <p className="text-white font-medium text-sm truncate">
//                               {recording.title || recording.fileName || 'Recording'}
//                             </p>
//                             <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
//                               {formatDuration(recording.duration)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
                      
//                       {/* Recording Details */}
//                       <div className="p-4">
//                         {/* Session Info */}
//                         <div className="mb-4">
//                           <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
//                             {recording.sessionTitle || 'Live Session Recording'}
//                           </h4>
//                           <div className="space-y-2">
//                             <div className="flex items-center text-xs text-gray-500">
//                               <FaCalendarAlt className="h-3 w-3 mr-1 flex-shrink-0" />
//                               <span className="truncate">
//                                 Recorded: {formatDateTime(recording.recordedAt)}
//                               </span>
//                             </div>
//                             <div className="flex items-center text-xs text-gray-500">
//                               <FaUser className="h-3 w-3 mr-1 flex-shrink-0" />
//                               <span className="truncate">
//                                 Streamer: {recording.streamer?.name || 'Unknown'}
//                               </span>
//                             </div>
//                             {recording.roomCode && (
//                               <div className="flex items-center text-xs text-gray-500">
//                                 <FaHashtag className="h-3 w-3 mr-1 flex-shrink-0" />
//                                 <span className="font-mono truncate">
//                                   Room: {recording.roomCode}
//                                 </span>
//                               </div>
//                             )}
//                           </div>
//                         </div>
                        
//                         {/* Recording Metadata */}
//                         <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
//                           <div className="bg-blue-50 p-2 rounded border border-blue-100">
//                             <div className="text-blue-600 font-medium">Size</div>
//                             <div className="font-semibold text-gray-900">{formatFileSize(recording.fileSize)}</div>
//                           </div>
//                           <div className="bg-green-50 p-2 rounded border border-green-100">
//                             <div className="text-green-600 font-medium">Views</div>
//                             <div className="font-semibold text-gray-900">{recording.views || 0}</div>
//                           </div>
//                           <div className="bg-purple-50 p-2 rounded border border-purple-100">
//                             <div className="text-purple-600 font-medium">Downloads</div>
//                             <div className="font-semibold text-gray-900">{recording.downloads || 0}</div>
//                           </div>
//                           <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
//                             <div className="text-yellow-600 font-medium">Status</div>
//                             <div className="font-semibold text-gray-900">{recording.status || 'COMPLETED'}</div>
//                           </div>
//                         </div>
                        
//                         {/* Actions */}
//                         <div className="flex space-x-2">
//                           {recording.fileUrl && (
//                             <button
//                               onClick={() => window.open(recording.fileUrl, '_blank')}
//                               className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow"
//                             >
//                               <FaPlayCircle className="h-4 w-4 mr-2" />
//                               Watch Now
//                             </button>
//                           )}
                          
//                           <button
//                             onClick={() => handleDownloadRecording(recording.sessionId, recording._id)}
//                             disabled={downloading && selectedRecording === recording._id}
//                             className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
//                           >
//                             {downloading && selectedRecording === recording._id ? (
//                               <>
//                                 <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                                 Downloading...
//                               </>
//                             ) : (
//                               <>
//                                 <FaDownload className="h-4 w-4 mr-2" />
//                                 Download
//                               </>
//                             )}
//                           </button>
//                         </div>
                        
//                         {/* Tags & Description */}
//                         <div className="mt-4">
//                           {recording.tags && recording.tags.length > 0 && (
//                             <div className="flex flex-wrap gap-1 mb-2">
//                               {recording.tags.slice(0, 3).map((tag, index) => (
//                                 <span
//                                   key={index}
//                                   className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
//                                 >
//                                   #{tag}
//                                 </span>
//                               ))}
//                               {recording.tags.length > 3 && (
//                                 <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
//                                   +{recording.tags.length - 3} more
//                                 </span>
//                               )}
//                             </div>
//                           )}
                          
//                           {recording.description && (
//                             <p className="text-xs text-gray-500 line-clamp-2">
//                               {recording.description}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-12">
//                   <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                   <h4 className="font-medium text-gray-900 mb-2">No Recordings Found</h4>
//                   <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                     {searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to
//                       ? 'No recordings match your search criteria. Try adjusting your filters.'
//                       : 'No recordings available for this course yet.'}
//                   </p>
//                   {(searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to) && (
//                     <button
//                       onClick={resetFilters}
//                       className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
//                     >
//                       <FaFilter className="h-4 w-4 mr-2" />
//                       Clear all filters and show all recordings
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Course Information */}
//           <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <FaInfoCircle className="h-5 w-5 mr-2 text-blue-600" />
//                 Course Information
//               </h3>
//             </div>
//             <div className="p-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
//                     <FaBook className="h-5 w-5 mr-2 text-blue-500" />
//                     Course Details
//                   </h4>
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Course Title:</span>
//                       <span className="font-semibold text-gray-900">{course.title}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Instructor:</span>
//                       <span className="font-semibold text-gray-900">{course.createdBy?.name || 'Unknown'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Category:</span>
//                       <span className="font-semibold text-gray-900">{course.category || 'N/A'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Level:</span>
//                       <span className="font-semibold text-gray-900">{course.level || 'All Levels'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Course Status:</span>
//                       <span className={`font-semibold px-3 py-1 rounded-full ${
//                         course.isActive 
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-red-100 text-red-800'
//                       }`}>
//                         {course.isActive ? 'Active' : 'Inactive'}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
//                     <FaGraduationCap className="h-5 w-5 mr-2 text-green-500" />
//                     Enrollment & Statistics
//                   </h4>
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
//                       <span className="text-blue-600">Enrolled Students:</span>
//                       <span className="font-bold text-blue-700 text-lg">{course.enrolledCount || 0}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
//                       <span className="text-green-600">Live Sessions:</span>
//                       <span className="font-bold text-green-700 text-lg">{course.liveClasses?.length || 0}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
//                       <span className="text-purple-600">Recordings Available:</span>
//                       <span className="font-bold text-purple-700 text-lg">{stats.totalRecordings}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
//                       <span className="text-yellow-600">Total Content Duration:</span>
//                       <span className="font-bold text-yellow-700 text-lg">{course.duration || 0} hours</span>
//                     </div>
//                     {course.permissions && (
//                       <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                         <h5 className="font-medium text-gray-900 mb-2">Your Permissions:</h5>
//                         <div className="space-y-2">
//                           {course.permissions.canEdit && (
//                             <div className="flex items-center text-green-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Can edit course content
//                             </div>
//                           )}
//                           {course.permissions.canDelete && (
//                             <div className="flex items-center text-green-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Can delete course
//                             </div>
//                           )}
//                           {course.isEnrolled && (
//                             <div className="flex items-center text-blue-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Enrolled in this course
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
              
//               {/* Course Description */}
//               {course.description && (
//                 <div className="mt-8 pt-8 border-t border-gray-200">
//                   <h4 className="font-semibold text-gray-900 mb-4">Course Description</h4>
//                   <div className="bg-gray-50 rounded-lg p-6">
//                     <p className="text-gray-700 whitespace-pre-line leading-relaxed">
//                       {course.description}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default CourseRecordingsPage;














// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { useAuth } from '../../contexts/AuthContext';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import {
//   FaPlayCircle,
//   FaCalendarAlt,
//   FaClock,
//   FaUser,
//   FaVideo,
//   FaArrowLeft,
//   FaSpinner,
//   FaExclamationCircle,
//   FaExternalLinkAlt,
//   FaFileVideo,
//   FaUsers,
//   FaHashtag,
//   FaDownload,
//   FaSearch,
//   FaFilter,
//   FaSort,
//   FaEye,
//   FaInfoCircle,
//   FaCloudDownloadAlt,
//   FaRegCalendarCheck,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaBook,
//   FaGraduationCap,
//   FaChartLine,
//   FaTimes,
//   FaExpand,
//   FaCompress,
//   FaVolumeUp,
//   FaVolumeMute,
//   FaPlay,
//   FaPause,
//   FaStepForward,
//   FaStepBackward
// } from 'react-icons/fa';

// const CourseRecordingsPage = () => {
//   const { courseId } = useParams();
//   const navigate = useNavigate();
//   const { token, user } = useAuth();
  
//   const [course, setCourse] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Recordings state
//   const [recordings, setRecordings] = useState([]);
//   const [loadingRecordings, setLoadingRecordings] = useState(false);
  
//   // Filter & Search state
//   const [searchTerm, setSearchTerm] = useState('');
//   const [sortBy, setSortBy] = useState('recordedAt');
//   const [sortOrder, setSortOrder] = useState('desc');
//   const [minDuration, setMinDuration] = useState('');
//   const [maxDuration, setMaxDuration] = useState('');
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
//   // Selected recording for download
//   const [selectedRecording, setSelectedRecording] = useState(null);
//   const [downloading, setDownloading] = useState(false);
  
//   // Video Player state - SIMPLIFIED
//   const [showVideoPlayer, setShowVideoPlayer] = useState(false);
//   const [currentVideoUrl, setCurrentVideoUrl] = useState('');
//   const [currentVideoTitle, setCurrentVideoTitle] = useState('');
//   const videoRef = useRef(null);
  
//   // Stats
//   const [stats, setStats] = useState({
//     totalRecordings: 0,
//     totalDuration: 0,
//     totalSize: 0,
//     avgDuration: 0
//   });

//   // Fetch course details
//   useEffect(() => {
//     const fetchCourseDetails = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         const response = await axios.get(
//           `${import.meta.env.VITE_API_URL}/course/getSingleCourse/${courseId}`,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           }
//         );

//         if (response.data.success) {
//           setCourse(response.data.data);
//           fetchCourseRecordings();
//         } else {
//           setError('Failed to fetch course details');
//         }
//       } catch (err) {
//         console.error('Error fetching course:', err);
//         setError(err.response?.data?.message || 'Failed to load course details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (courseId && token) {
//       fetchCourseDetails();
//     }
//   }, [courseId, token]);

//   // Fetch recordings
//   const fetchCourseRecordings = async () => {
//     try {
//       setLoadingRecordings(true);
      
//       const params = {
//         courseId,
//         page: 1,
//         limit: 100,
//         sortBy,
//         sortOrder
//       };
      
//       if (searchTerm) params.query = searchTerm;
//       if (minDuration) params.minDuration = minDuration;
//       if (maxDuration) params.maxDuration = maxDuration;
//       if (dateRange.from) params.fromDate = dateRange.from;
//       if (dateRange.to) params.toDate = dateRange.to;
      
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_URL}/recording/search`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           params
//         }
//       );

//       if (response.data.success) {
//         const recordingsData = response.data.data.recordings || [];
//         setRecordings(recordingsData);
//         calculateStats(recordingsData);
//       } else {
//         setRecordings([]);
//       }
//     } catch (err) {
//       console.error('Error fetching recordings:', err);
//       setRecordings([]);
//     } finally {
//       setLoadingRecordings(false);
//     }
//   };

//   // Handle download recording
//   const handleDownloadRecording = async (sessionId, recordingId, fileName, fileUrl) => {
//     try {
//       setDownloading(true);
//       setSelectedRecording(recordingId);
      
//       // Direct download from S3 URL
//       const link = document.createElement('a');
//       link.href = fileUrl;
//       link.download = fileName || 'recording.webm';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//       // Update downloads count locally
//       setRecordings(prev => prev.map(rec => 
//         rec._id === recordingId 
//           ? { ...rec, downloads: (rec.downloads || 0) + 1 }
//           : rec
//       ));
      
//       alert(`Recording "${fileName}" download started!`);
//     } catch (err) {
//       console.error('Error downloading recording:', err);
//       alert('Failed to download recording. Please try again.');
//     } finally {
//       setDownloading(false);
//       setSelectedRecording(null);
//     }
//   };

//   // Handle watch now - SIMPLIFIED
//   const handleWatchNow = (recording) => {
//     setCurrentVideoUrl(recording.fileUrl);
//     setCurrentVideoTitle(recording.title || recording.sessionTitle || recording.fileName);
//     setShowVideoPlayer(true);
    
//     // Track view locally
//     setRecordings(prev => prev.map(rec => 
//       rec._id === recording._id 
//         ? { ...rec, views: (rec.views || 0) + 1 }
//         : rec
//     ));
//   };

//   // Calculate statistics
//   const calculateStats = (recordingsData) => {
//     const total = recordingsData.length;
//     const totalDuration = recordingsData.reduce((sum, rec) => sum + (rec.duration || 0), 0);
//     const totalSize = recordingsData.reduce((sum, rec) => sum + (rec.fileSize || 0), 0);
//     const avgDuration = total > 0 ? totalDuration / total : 0;
    
//     setStats({
//       totalRecordings: total,
//       totalDuration,
//       totalSize,
//       avgDuration
//     });
//   };

//   // Format duration
//   const formatDuration = (seconds) => {
//     if (!seconds) return 'N/A';
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const secs = Math.floor(seconds % 60);
    
//     if (hours > 0) {
//       return `${hours}h ${minutes}m`;
//     } else if (minutes > 0) {
//       return `${minutes}m ${secs}s`;
//     } else {
//       return `${secs}s`;
//     }
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'N/A';
//     if (bytes < 1024) return bytes + ' B';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//     return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     });
//   };

//   // Format date time
//   const formatDateTime = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Get session status color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'COMPLETED': return 'bg-green-100 text-green-800';
//       case 'LIVE': return 'bg-red-100 text-red-800';
//       case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
//       case 'CANCELLED': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   // Get status icon
//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'COMPLETED': return <FaCheckCircle className="h-3 w-3 mr-1" />;
//       case 'LIVE': return <FaVideo className="h-3 w-3 mr-1" />;
//       case 'SCHEDULED': return <FaRegCalendarCheck className="h-3 w-3 mr-1" />;
//       case 'CANCELLED': return <FaTimesCircle className="h-3 w-3 mr-1" />;
//       default: return null;
//     }
//   };

//   // Filter recordings
//   const filteredRecordings = recordings.filter(recording => {
//     const matchesSearch = !searchTerm || 
//       (recording.title && recording.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.description && recording.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.sessionTitle && recording.sessionTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (recording.streamer?.name && recording.streamer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesDuration = (!minDuration || recording.duration >= parseInt(minDuration)) &&
//                           (!maxDuration || recording.duration <= parseInt(maxDuration));
    
//     const matchesDate = (!dateRange.from || new Date(recording.recordedAt) >= new Date(dateRange.from)) &&
//                        (!dateRange.to || new Date(recording.recordedAt) <= new Date(dateRange.to));
    
//     return matchesSearch && matchesDuration && matchesDate;
//   });

//   // Apply sorting
//   const sortedRecordings = [...filteredRecordings].sort((a, b) => {
//     let aValue, bValue;
    
//     switch (sortBy) {
//       case 'recordedAt':
//         aValue = new Date(a.recordedAt).getTime();
//         bValue = new Date(b.recordedAt).getTime();
//         break;
//       case 'duration':
//         aValue = a.duration || 0;
//         bValue = b.duration || 0;
//         break;
//       case 'title':
//         aValue = (a.title || '').toLowerCase();
//         bValue = (b.title || '').toLowerCase();
//         break;
//       case 'views':
//         aValue = a.views || 0;
//         bValue = b.views || 0;
//         break;
//       case 'downloads':
//         aValue = a.downloads || 0;
//         bValue = b.downloads || 0;
//         break;
//       default:
//         aValue = 0;
//         bValue = 0;
//     }
    
//     if (sortOrder === 'asc') {
//       return aValue > bValue ? 1 : -1;
//     } else {
//       return aValue < bValue ? 1 : -1;
//     }
//   });

//   // Reset filters
//   const resetFilters = () => {
//     setSearchTerm('');
//     setMinDuration('');
//     setMaxDuration('');
//     setDateRange({ from: '', to: '' });
//     setSortBy('recordedAt');
//     setSortOrder('desc');
//     fetchCourseRecordings();
//   };

//   // Apply filters
//   const applyFilters = () => {
//     fetchCourseRecordings();
//   };

//   // SIMPLE Video Player Modal
//   const VideoPlayerModal = () => {
//     if (!showVideoPlayer) return null;

//     return (
//       <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
//         <div className="relative w-full h-full max-w-6xl mx-auto">
//           {/* Close Button */}
//           <button
//             onClick={() => {
//               setShowVideoPlayer(false);
//               setCurrentVideoUrl('');
//               setCurrentVideoTitle('');
//             }}
//             className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 rounded-full"
//           >
//             <FaTimes className="h-6 w-6" />
//           </button>

//           {/* Video Container */}
//           <div className="w-full h-full flex flex-col">
//             {/* Video Title */}
//             <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
//               <h3 className="text-xl font-semibold text-white truncate">
//                 {currentVideoTitle}
//               </h3>
//             </div>

//             {/* Video Player - SIMPLE HTML5 Video */}
//             <div className="flex-1 relative bg-black">
//               <video
//                 ref={videoRef}
//                 src={currentVideoUrl}
//                 className="w-full h-full object-contain"
//                 controls
//                 autoPlay
//                 playsInline
//                 webkit-playsinline="true"
//                 preload="metadata"
//                 crossOrigin="anonymous"
//               >
//                 Your browser does not support the video tag.
//                 <source src={currentVideoUrl} type="video/webm" />
//                 <source src={currentVideoUrl.replace('.webm', '.mp4')} type="video/mp4" />
//               </video>
              
//               {/* Loading Spinner */}
//               {/* {!videoRef.current?.readyState && (
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <FaSpinner className="h-16 w-16 text-white animate-spin" />
//                 </div>
//               )} */}
//             </div>

//             {/* Simple Controls Info */}
//             <div className="px-6 py-3 bg-gray-900 border-t border-gray-800">
//               <div className="flex items-center justify-between text-sm text-gray-400">
//                 <div className="flex items-center space-x-4">
//                   <span>Format: WebM</span>
//                   <span>•</span>
//                   <span>Use browser controls to play/pause</span>
//                 </div>
//                 <button
//                   onClick={() => window.open(currentVideoUrl, '_blank')}
//                   className="text-blue-400 hover:text-blue-300 transition-colors"
//                 >
//                   Open in new tab
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="text-center">
//             <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//             <p className="text-gray-600">Loading course details...</p>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (error) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
//             <p className="text-gray-600 mb-6">{error}</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (!course) {
//     return (
//       <DashboardLayout>
//         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//           <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
//             <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
//             <p className="text-gray-600 mb-6">The requested course could not be found.</p>
//             <button
//               onClick={() => navigate('/courses')}
//               className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//             >
//               Back to Courses
//             </button>
//           </div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen bg-gray-50">
//         {/* Video Player Modal */}
//         <VideoPlayerModal />

//         {/* Header */}
//         <div className="bg-white shadow">
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between py-6">
//               <div className="flex items-center space-x-4 mb-4 md:mb-0">
//                 <button
//                   onClick={() => navigate(-1)}
//                   className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
//                 >
//                   <FaArrowLeft className="h-5 w-5 mr-2" />
//                   Back
//                 </button>
//                 <div className="h-8 w-px bg-gray-300 hidden md:block" />
//                 <div>
//                   <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
//                   <p className="text-gray-600 text-sm mt-1 flex items-center">
//                     <FaBook className="h-4 w-4 mr-2" />
//                     {course.title} • Created by {course.createdBy?.name || 'Unknown'}
//                   </p>
//                 </div>
//               </div>
//               <div className="flex items-center space-x-4">
//                 <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">
//                   <FaGraduationCap className="h-4 w-4 mr-2" />
//                   {course.enrolledCount || 0} Enrolled
//                 </div>
//                 <Link
//                   to={`/courses/${courseId}`}
//                   className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
//                 >
//                   <FaExternalLinkAlt className="h-4 w-4 mr-2" />
//                   View Course
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           {/* Stats Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
//                   <FaFileVideo className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">{stats.totalRecordings}</div>
//                   <div className="text-sm text-gray-600">Total Recordings</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
//                   <FaClock className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.totalDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Duration</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
//                   <FaCloudDownloadAlt className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatFileSize(stats.totalSize)}
//                   </div>
//                   <div className="text-sm text-gray-600">Total Size</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
//               <div className="flex items-center">
//                 <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
//                   <FaChartLine className="h-6 w-6" />
//                 </div>
//                 <div>
//                   <div className="text-2xl font-bold text-gray-900">
//                     {formatDuration(stats.avgDuration)}
//                   </div>
//                   <div className="text-sm text-gray-600">Avg. Duration</div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Search and Filter Bar */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaSearch className="h-5 w-5 mr-2 text-blue-600" />
//                   Search & Filter Recordings
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Found {recordings.length} recordings • Showing {filteredRecordings.length}
//                 </p>
//               </div>
//               <div className="mt-4 md:mt-0">
//                 <button
//                   onClick={resetFilters}
//                   className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
//                 >
//                   <FaFilter className="h-4 w-4 mr-2" />
//                   Reset All Filters
//                 </button>
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Search Input */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Search Recordings
//                 </label>
//                 <div className="relative">
//                   <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                   <input
//                     type="text"
//                     placeholder="Search by title, description, streamer..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   />
//                 </div>
//               </div>

//               {/* Duration Filters */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Min Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 300 (5 min)"
//                   value={minDuration}
//                   onChange={(e) => setMinDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Max Duration (seconds)
//                 </label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 3600 (1 hour)"
//                   value={maxDuration}
//                   onChange={(e) => setMaxDuration(e.target.value)}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>

//               {/* Sort By */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Sort By
//                 </label>
//                 <div className="flex space-x-2">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => setSortBy(e.target.value)}
//                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                   >
//                     <option value="recordedAt">Date Recorded</option>
//                     <option value="duration">Duration</option>
//                     <option value="title">Title</option>
//                     <option value="views">Views</option>
//                     <option value="downloads">Downloads</option>
//                   </select>
//                   <button
//                     onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
//                   >
//                     {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
//                   </button>
//                 </div>
//               </div>
//             </div>
            
//             {/* Date Range Filters */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   From Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.from}
//                   onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   To Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateRange.to}
//                   onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
//                 />
//               </div>
//             </div>
            
//             {/* Apply Filters Button */}
//             <div className="mt-6">
//               <button
//                 onClick={applyFilters}
//                 className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow hover:shadow-md"
//                 disabled={loadingRecordings}
//               >
//                 {loadingRecordings ? (
//                   <>
//                     <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                     Applying Filters...
//                   </>
//                 ) : (
//                   <>
//                     <FaFilter className="h-4 w-4 mr-2" />
//                     Apply Filters & Refresh
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Recordings Grid */}
//           <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                   <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
//                   Available Recordings
//                 </h3>
//                 <p className="text-sm text-gray-500 mt-1">
//                   {sortedRecordings.length} recordings found
//                   {sortedRecordings.length !== recordings.length && ` (filtered from ${recordings.length})`}
//                 </p>
//               </div>
//               <div className="mt-2 md:mt-0">
//                 <div className="text-sm text-gray-600">
//                   Sorted by: <span className="font-medium">{sortBy}</span> ({sortOrder})
//                 </div>
//               </div>
//             </div>
            
//             <div className="p-6">
//               {loadingRecordings ? (
//                 <div className="text-center py-12">
//                   <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//                   <p className="text-gray-600">Loading recordings...</p>
//                 </div>
//               ) : sortedRecordings.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {sortedRecordings.map((recording) => (
//                     <div
//                       key={recording._id}
//                       className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 bg-white group hover:border-blue-300"
//                     >
//                       {/* Thumbnail/Header */}
//                       <div 
//                         className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden cursor-pointer"
//                         onClick={() => handleWatchNow(recording)}
//                       >
//                         <div className="absolute inset-0 flex items-center justify-center">
//                           <FaPlayCircle className="h-16 w-16 text-white opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transition-transform" />
//                         </div>
//                         <div className="absolute top-2 right-2">
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(recording.status)}`}>
//                             {getStatusIcon(recording.status)}
//                             {recording.status}
//                           </span>
//                         </div>
//                         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
//                           <div className="flex items-center justify-between">
//                             <p className="text-white font-medium text-sm truncate">
//                               {recording.title || recording.fileName || 'Recording'}
//                             </p>
//                             <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
//                               {formatDuration(recording.duration)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
                      
//                       {/* Recording Details */}
//                       <div className="p-4">
//                         {/* Session Info */}
//                         <div className="mb-4">
//                           <h4 
//                             className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
//                             onClick={() => handleWatchNow(recording)}
//                           >
//                             {recording.sessionTitle || 'Live Session Recording'}
//                           </h4>
//                           <div className="space-y-2">
//                             <div className="flex items-center text-xs text-gray-500">
//                               <FaCalendarAlt className="h-3 w-3 mr-1 flex-shrink-0" />
//                               <span className="truncate">
//                                 Recorded: {formatDateTime(recording.recordedAt)}
//                               </span>
//                             </div>
//                             <div className="flex items-center text-xs text-gray-500">
//                               <FaUser className="h-3 w-3 mr-1 flex-shrink-0" />
//                               <span className="truncate">
//                                 Streamer: {recording.streamer?.name || 'Unknown'}
//                               </span>
//                             </div>
//                             {recording.roomCode && (
//                               <div className="flex items-center text-xs text-gray-500">
//                                 <FaHashtag className="h-3 w-3 mr-1 flex-shrink-0" />
//                                 <span className="font-mono truncate">
//                                   Room: {recording.roomCode}
//                                 </span>
//                               </div>
//                             )}
//                           </div>
//                         </div>
                        
//                         {/* Recording Metadata */}
//                         <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
//                           <div className="bg-blue-50 p-2 rounded border border-blue-100">
//                             <div className="text-blue-600 font-medium">Size</div>
//                             <div className="font-semibold text-gray-900">{formatFileSize(recording.fileSize)}</div>
//                           </div>
//                           <div className="bg-green-50 p-2 rounded border border-green-100">
//                             <div className="text-green-600 font-medium">Views</div>
//                             <div className="font-semibold text-gray-900">{recording.views || 0}</div>
//                           </div>
//                           <div className="bg-purple-50 p-2 rounded border border-purple-100">
//                             <div className="text-purple-600 font-medium">Downloads</div>
//                             <div className="font-semibold text-gray-900">{recording.downloads || 0}</div>
//                           </div>
//                           <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
//                             <div className="text-yellow-600 font-medium">Status</div>
//                             <div className="font-semibold text-gray-900">{recording.status || 'COMPLETED'}</div>
//                           </div>
//                         </div>
                        
//                         {/* Actions */}
//                         <div className="flex space-x-2">
//                           <button
//                             onClick={() => handleWatchNow(recording)}
//                             className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow"
//                           >
//                             <FaPlayCircle className="h-4 w-4 mr-2" />
//                             Watch Now
//                           </button>
                          
//                           <button
//                             onClick={() => handleDownloadRecording(
//                               recording.sessionId, 
//                               recording._id,
//                               recording.fileName,
//                               recording.fileUrl
//                             )}
//                             disabled={downloading && selectedRecording === recording._id}
//                             className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
//                           >
//                             {downloading && selectedRecording === recording._id ? (
//                               <>
//                                 <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
//                                 Downloading...
//                               </>
//                             ) : (
//                               <>
//                                 <FaDownload className="h-4 w-4 mr-2" />
//                                 Download
//                               </>
//                             )}
//                           </button>
//                         </div>
                        
//                         {/* Tags & Description */}
//                         <div className="mt-4">
//                           {recording.tags && recording.tags.length > 0 && (
//                             <div className="flex flex-wrap gap-1 mb-2">
//                               {recording.tags.slice(0, 3).map((tag, index) => (
//                                 <span
//                                   key={index}
//                                   className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
//                                 >
//                                   #{tag}
//                                 </span>
//                               ))}
//                               {recording.tags.length > 3 && (
//                                 <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
//                                   +{recording.tags.length - 3} more
//                                 </span>
//                               )}
//                             </div>
//                           )}
                          
//                           {recording.description && (
//                             <p className="text-xs text-gray-500 line-clamp-2">
//                               {recording.description}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-12">
//                   <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                   <h4 className="font-medium text-gray-900 mb-2">No Recordings Found</h4>
//                   <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                     {searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to
//                       ? 'No recordings match your search criteria. Try adjusting your filters.'
//                       : 'No recordings available for this course yet.'}
//                   </p>
//                   {(searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to) && (
//                     <button
//                       onClick={resetFilters}
//                       className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
//                     >
//                       <FaFilter className="h-4 w-4 mr-2" />
//                       Clear all filters and show all recordings
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Course Information */}
//           <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <FaInfoCircle className="h-5 w-5 mr-2 text-blue-600" />
//                 Course Information
//               </h3>
//             </div>
//             <div className="p-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
//                     <FaBook className="h-5 w-5 mr-2 text-blue-500" />
//                     Course Details
//                   </h4>
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Course Title:</span>
//                       <span className="font-semibold text-gray-900">{course.title}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Instructor:</span>
//                       <span className="font-semibold text-gray-900">{course.createdBy?.name || 'Unknown'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Category:</span>
//                       <span className="font-semibold text-gray-900">{course.category || 'N/A'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Level:</span>
//                       <span className="font-semibold text-gray-900">{course.level || 'All Levels'}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
//                       <span className="text-gray-600">Course Status:</span>
//                       <span className={`font-semibold px-3 py-1 rounded-full ${
//                         course.isActive 
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-red-100 text-red-800'
//                       }`}>
//                         {course.isActive ? 'Active' : 'Inactive'}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
//                     <FaGraduationCap className="h-5 w-5 mr-2 text-green-500" />
//                     Enrollment & Statistics
//                   </h4>
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
//                       <span className="text-blue-600">Enrolled Students:</span>
//                       <span className="font-bold text-blue-700 text-lg">{course.enrolledCount || 0}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
//                       <span className="text-green-600">Live Sessions:</span>
//                       <span className="font-bold text-green-700 text-lg">{course.liveClasses?.length || 0}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
//                       <span className="text-purple-600">Recordings Available:</span>
//                       <span className="font-bold text-purple-700 text-lg">{stats.totalRecordings}</span>
//                     </div>
//                     <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
//                       <span className="text-yellow-600">Total Content Duration:</span>
//                       <span className="font-bold text-yellow-700 text-lg">{course.duration || 0} hours</span>
//                     </div>
//                     {course.permissions && (
//                       <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                         <h5 className="font-medium text-gray-900 mb-2">Your Permissions:</h5>
//                         <div className="space-y-2">
//                           {course.permissions.canEdit && (
//                             <div className="flex items-center text-green-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Can edit course content
//                             </div>
//                           )}
//                           {course.permissions.canDelete && (
//                             <div className="flex items-center text-green-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Can delete course
//                             </div>
//                           )}
//                           {course.isEnrolled && (
//                             <div className="flex items-center text-blue-600 text-sm">
//                               <FaCheckCircle className="h-4 w-4 mr-2" />
//                               Enrolled in this course
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
              
//               {/* Course Description */}
//               {course.description && (
//                 <div className="mt-8 pt-8 border-t border-gray-200">
//                   <h4 className="font-semibold text-gray-900 mb-4">Course Description</h4>
//                   <div className="bg-gray-50 rounded-lg p-6">
//                     <p className="text-gray-700 whitespace-pre-line leading-relaxed">
//                       {course.description}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default CourseRecordingsPage;



import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../utils/layout/DashboardLayout';
import {
  FaPlayCircle,
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaVideo,
  FaArrowLeft,
  FaSpinner,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaFileVideo,
  FaUsers,
  FaHashtag,
  FaDownload,
  FaSearch,
  FaFilter,
  FaSort,
  FaEye,
  FaInfoCircle,
  FaCloudDownloadAlt,
  FaRegCalendarCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaBook,
  FaGraduationCap,
  FaChartLine,
  FaTimes,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';

const CourseRecordingsPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Recordings state
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  
  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recordedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // 3x3 grid = 9 items per page
  const [paginatedRecordings, setPaginatedRecordings] = useState([]);
  
  // Selected recording for download
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  // Video Player state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const videoRef = useRef(null);
  
  // Stats
  const [stats, setStats] = useState({
    totalRecordings: 0,
    totalDuration: 0,
    totalSize: 0,
    avgDuration: 0
  });

  // Fetch course details
  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/course/getSingleCourse/${courseId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          setCourse(response.data.data);
          fetchCourseRecordings();
        } else {
          setError('Failed to fetch course details');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err.response?.data?.message || 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    if (courseId && token) {
      fetchCourseDetails();
    }
  }, [courseId, token]);

  // Fetch recordings
  const fetchCourseRecordings = async () => {
    try {
      setLoadingRecordings(true);
      setCurrentPage(1); // Reset to first page on new fetch
      
      const params = {
        courseId,
        page: 1,
        limit: 100,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) params.query = searchTerm;
      if (minDuration) params.minDuration = minDuration;
      if (maxDuration) params.maxDuration = maxDuration;
      if (dateRange.from) params.fromDate = dateRange.from;
      if (dateRange.to) params.toDate = dateRange.to;
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/recording/search`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params
        }
      );

      if (response.data.success) {
        const recordingsData = response.data.data.recordings || [];
        setRecordings(recordingsData);
        calculateStats(recordingsData);
      } else {
        setRecordings([]);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setRecordings([]);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Apply client-side pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedRecordings(sortedRecordings.slice(startIndex, endIndex));
  }, [currentPage, itemsPerPage, searchTerm, sortBy, sortOrder, minDuration, maxDuration, dateRange, recordings]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, minDuration, maxDuration, dateRange]);

  // Handle download recording
  const handleDownloadRecording = async (sessionId, recordingId, fileName, fileUrl) => {
    try {
      setDownloading(true);
      setSelectedRecording(recordingId);
      
      // Direct download from S3 URL
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'recording.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update downloads count locally
      setRecordings(prev => prev.map(rec => 
        rec._id === recordingId 
          ? { ...rec, downloads: (rec.downloads || 0) + 1 }
          : rec
      ));
      
      alert(`Recording "${fileName}" download started!`);
    } catch (err) {
      console.error('Error downloading recording:', err);
      alert('Failed to download recording. Please try again.');
    } finally {
      setDownloading(false);
      setSelectedRecording(null);
    }
  };

  // Handle watch now
  const handleWatchNow = (recording) => {
    setCurrentVideoUrl(recording.fileUrl);
    setCurrentVideoTitle(recording.title || recording.sessionTitle || recording.fileName);
    setShowVideoPlayer(true);
    
    // Track view locally
    setRecordings(prev => prev.map(rec => 
      rec._id === recording._id 
        ? { ...rec, views: (rec.views || 0) + 1 }
        : rec
    ));
  };

  // Calculate statistics
  const calculateStats = (recordingsData) => {
    const total = recordingsData.length;
    const totalDuration = recordingsData.reduce((sum, rec) => sum + (rec.duration || 0), 0);
    const totalSize = recordingsData.reduce((sum, rec) => sum + (rec.fileSize || 0), 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;
    
    setStats({
      totalRecordings: total,
      totalDuration,
      totalSize,
      avgDuration
    });
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get session status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'LIVE': return 'bg-red-100 text-red-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <FaCheckCircle className="h-3 w-3 mr-1" />;
      case 'LIVE': return <FaVideo className="h-3 w-3 mr-1" />;
      case 'SCHEDULED': return <FaRegCalendarCheck className="h-3 w-3 mr-1" />;
      case 'CANCELLED': return <FaTimesCircle className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  // Filter recordings
  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = !searchTerm || 
      (recording.title && recording.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (recording.description && recording.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (recording.sessionTitle && recording.sessionTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (recording.streamer?.name && recording.streamer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDuration = (!minDuration || recording.duration >= parseInt(minDuration)) &&
                          (!maxDuration || recording.duration <= parseInt(maxDuration));
    
    const matchesDate = (!dateRange.from || new Date(recording.recordedAt) >= new Date(dateRange.from)) &&
                       (!dateRange.to || new Date(recording.recordedAt) <= new Date(dateRange.to));
    
    return matchesSearch && matchesDuration && matchesDate;
  });

  // Apply sorting
  const sortedRecordings = [...filteredRecordings].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'recordedAt':
        aValue = new Date(a.recordedAt).getTime();
        bValue = new Date(b.recordedAt).getTime();
        break;
      case 'duration':
        aValue = a.duration || 0;
        bValue = b.duration || 0;
        break;
      case 'title':
        aValue = (a.title || '').toLowerCase();
        bValue = (b.title || '').toLowerCase();
        break;
      case 'views':
        aValue = a.views || 0;
        bValue = b.views || 0;
        break;
      case 'downloads':
        aValue = a.downloads || 0;
        bValue = b.downloads || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedRecordings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, sortedRecordings.length);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setMinDuration('');
    setMaxDuration('');
    setDateRange({ from: '', to: '' });
    setSortBy('recordedAt');
    setSortOrder('desc');
    setCurrentPage(1);
    fetchCourseRecordings();
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchCourseRecordings();
  };

  // Change items per page
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // Video Player Modal
  const VideoPlayerModal = () => {
    if (!showVideoPlayer) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="relative w-full h-full max-w-6xl mx-auto">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowVideoPlayer(false);
              setCurrentVideoUrl('');
              setCurrentVideoTitle('');
            }}
            className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 rounded-full"
          >
            <FaTimes className="h-6 w-6" />
          </button>

          {/* Video Container */}
          <div className="w-full h-full flex flex-col">
            {/* Video Title */}
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white truncate">
                {currentVideoTitle}
              </h3>
            </div>

            {/* Video Player */}
            <div className="flex-1 relative bg-black">
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
                webkit-playsinline="true"
                preload="metadata"
                crossOrigin="anonymous"
              >
                Your browser does not support the video tag.
                <source src={currentVideoUrl} type="video/webm" />
                <source src={currentVideoUrl.replace('.webm', '.mp4')} type="video/mp4" />
              </video>
            </div>

            {/* Simple Controls Info */}
            <div className="px-6 py-3 bg-gray-900 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>Format: WebM</span>
                  <span>•</span>
                  <span>Use browser controls to play/pause</span>
                </div>
                <button
                  onClick={() => window.open(currentVideoUrl, '_blank')}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Open in new tab
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading course details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <FaExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/courses')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <FaExclamationCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Not Found</h2>
            <p className="text-gray-600 mb-6">The requested course could not be found.</p>
            <button
              onClick={() => navigate('/courses')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Video Player Modal */}
        <VideoPlayerModal />

        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between py-6">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </button>
                <div className="h-8 w-px bg-gray-300 hidden md:block" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Course Recordings</h1>
                  <p className="text-gray-600 text-sm mt-1 flex items-center">
                    <FaBook className="h-4 w-4 mr-2" />
                    {course.title} • Created by {course.createdBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">
                  <FaGraduationCap className="h-4 w-4 mr-2" />
                  {course.enrolledCount || 0} Enrolled
                </div>
                <Link
                  to={`/courses/${courseId}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                >
                  <FaExternalLinkAlt className="h-4 w-4 mr-2" />
                  View Course
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                  <FaFileVideo className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalRecordings}</div>
                  <div className="text-sm text-gray-600">Total Recordings</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
                  <FaClock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatDuration(stats.totalDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
                  <FaCloudDownloadAlt className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatFileSize(stats.totalSize)}
                  </div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
                  <FaChartLine className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatDuration(stats.avgDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Duration</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaSearch className="h-5 w-5 mr-2 text-blue-600" />
                  Search & Filter Recordings
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Found {recordings.length} recordings • Showing {sortedRecordings.length} after filters
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <FaFilter className="h-4 w-4 mr-2" />
                  Reset All Filters
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Recordings
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by title, description, streamer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Duration Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Duration (seconds)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 300 (5 min)"
                  value={minDuration}
                  onChange={(e) => setMinDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Duration (seconds)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 3600 (1 hour)"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="recordedAt">Date Recorded</option>
                    <option value="duration">Duration</option>
                    <option value="title">Title</option>
                    <option value="views">Views</option>
                    <option value="downloads">Downloads</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
            
            {/* Apply Filters Button */}
            <div className="mt-6">
              <button
                onClick={applyFilters}
                className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow hover:shadow-md"
                disabled={loadingRecordings}
              >
                {loadingRecordings ? (
                  <>
                    <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                    Applying Filters...
                  </>
                ) : (
                  <>
                    <FaFilter className="h-4 w-4 mr-2" />
                    Apply Filters & Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recordings Grid */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
                  Available Recordings
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {startIndex} - {endIndex} of {sortedRecordings.length} recordings
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={6}>6 per page</option>
                    <option value={9}>9 per page</option>
                    <option value={12}>12 per page</option>
                    <option value={18}>18 per page</option>
                    <option value={24}>24 per page</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Sorted by: <span className="font-medium">{sortBy}</span> ({sortOrder})
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {loadingRecordings ? (
                <div className="text-center py-12">
                  <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading recordings...</p>
                </div>
              ) : paginatedRecordings.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedRecordings.map((recording) => (
                      <div
                        key={recording._id}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 bg-white group hover:border-blue-300"
                      >
                        {/* Thumbnail/Header */}
                        <div 
                          className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden cursor-pointer"
                          onClick={() => handleWatchNow(recording)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaPlayCircle className="h-16 w-16 text-white opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(recording.status)}`}>
                              {getStatusIcon(recording.status)}
                              {recording.status}
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium text-sm truncate">
                                {recording.title || recording.fileName || 'Recording'}
                              </p>
                              <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                                {formatDuration(recording.duration)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recording Details */}
                        <div className="p-4">
                          {/* Session Info */}
                          <div className="mb-4">
                            <h4 
                              className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleWatchNow(recording)}
                            >
                              {recording.sessionTitle || 'Live Session Recording'}
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center text-xs text-gray-500">
                                <FaCalendarAlt className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  Recorded: {formatDateTime(recording.recordedAt)}
                                </span>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <FaUser className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  Streamer: {recording.streamer?.name || 'Unknown'}
                                </span>
                              </div>
                              {recording.roomCode && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <FaHashtag className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="font-mono truncate">
                                    Room: {recording.roomCode}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Recording Metadata */}
                          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                              <div className="text-blue-600 font-medium">Size</div>
                              <div className="font-semibold text-gray-900">{formatFileSize(recording.fileSize)}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded border border-green-100">
                              <div className="text-green-600 font-medium">Views</div>
                              <div className="font-semibold text-gray-900">{recording.views || 0}</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded border border-purple-100">
                              <div className="text-purple-600 font-medium">Downloads</div>
                              <div className="font-semibold text-gray-900">{recording.downloads || 0}</div>
                            </div>
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                              <div className="text-yellow-600 font-medium">Status</div>
                              <div className="font-semibold text-gray-900">{recording.status || 'COMPLETED'}</div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleWatchNow(recording)}
                              className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow"
                            >
                              <FaPlayCircle className="h-4 w-4 mr-2" />
                              Watch Now
                            </button>
                            
                            <button
                              onClick={() => handleDownloadRecording(
                                recording.sessionId, 
                                recording._id,
                                recording.fileName,
                                recording.fileUrl
                              )}
                              disabled={downloading && selectedRecording === recording._id}
                              className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {downloading && selectedRecording === recording._id ? (
                                <>
                                  <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <FaDownload className="h-4 w-4 mr-2" />
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                          
                          {/* Tags & Description */}
                          <div className="mt-4">
                            {recording.tags && recording.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {recording.tags.slice(0, 3).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {recording.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                                    +{recording.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {recording.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {recording.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-6">
                      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                        Showing <span className="font-medium">{startIndex}</span> to{' '}
                        <span className="font-medium">{endIndex}</span> of{' '}
                        <span className="font-medium">{sortedRecordings.length}</span> results
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={goToFirstPage}
                          disabled={currentPage === 1}
                          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaAngleDoubleLeft className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaChevronLeft className="h-4 w-4" />
                        </button>
                        
                        {getPageNumbers().map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ))}
                        
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaChevronRight className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={goToLastPage}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaAngleDoubleRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FaFileVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Recordings Found</h4>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to
                      ? 'No recordings match your search criteria. Try adjusting your filters.'
                      : 'No recordings available for this course yet.'}
                  </p>
                  {(searchTerm || minDuration || maxDuration || dateRange.from || dateRange.to) && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    >
                      <FaFilter className="h-4 w-4 mr-2" />
                      Clear all filters and show all recordings
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Course Information */}
          <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaInfoCircle className="h-5 w-5 mr-2 text-blue-600" />
                Course Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FaBook className="h-5 w-5 mr-2 text-blue-500" />
                    Course Details
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Course Title:</span>
                      <span className="font-semibold text-gray-900">{course.title}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Instructor:</span>
                      <span className="font-semibold text-gray-900">{course.createdBy?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-semibold text-gray-900">{course.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Level:</span>
                      <span className="font-semibold text-gray-900">{course.level || 'All Levels'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Course Status:</span>
                      <span className={`font-semibold px-3 py-1 rounded-full ${
                        course.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FaGraduationCap className="h-5 w-5 mr-2 text-green-500" />
                    Enrollment & Statistics
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-600">Enrolled Students:</span>
                      <span className="font-bold text-blue-700 text-lg">{course.enrolledCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-600">Live Sessions:</span>
                      <span className="font-bold text-green-700 text-lg">{course.liveClasses?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-600">Recordings Available:</span>
                      <span className="font-bold text-purple-700 text-lg">{stats.totalRecordings}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-600">Total Content Duration:</span>
                      <span className="font-bold text-yellow-700 text-lg">{course.duration || 0} hours</span>
                    </div>
                    {course.permissions && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-2">Your Permissions:</h5>
                        <div className="space-y-2">
                          {course.permissions.canEdit && (
                            <div className="flex items-center text-green-600 text-sm">
                              <FaCheckCircle className="h-4 w-4 mr-2" />
                              Can edit course content
                            </div>
                          )}
                          {course.permissions.canDelete && (
                            <div className="flex items-center text-green-600 text-sm">
                              <FaCheckCircle className="h-4 w-4 mr-2" />
                              Can delete course
                            </div>
                          )}
                          {course.isEnrolled && (
                            <div className="flex items-center text-blue-600 text-sm">
                              <FaCheckCircle className="h-4 w-4 mr-2" />
                              Enrolled in this course
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Course Description */}
              {course.description && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Course Description</h4>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseRecordingsPage;
//wefeef