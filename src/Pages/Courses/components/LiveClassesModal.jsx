// // src/pages/Courses/components/LiveClassesModal.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { toast } from 'react-toastify';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// const LiveClassesModal = ({ course, onClose, onSuccess }) => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//   const [liveClasses, setLiveClasses] = useState([]);
//   const [activeTab, setActiveTab] = useState('create');
  
//   // Form states - only startTime (scheduledStartTime) needed
//   const [newLiveClass, setNewLiveClass] = useState({
//     title: '',
//     description: '',
//     duration: 60,
//     maxParticipants: 100,
//     scheduledStartTime: '' // Changed from startTime to scheduledStartTime
//   });

//   // Initialize form with default time
//   useEffect(() => {
//     const now = new Date();
//     const defaultStartTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    
//     setNewLiveClass(prev => ({
//       ...prev,
//       scheduledStartTime: formatDateTimeForInput(defaultStartTime)
//     }));
//   }, []);

//   useEffect(() => {
//     if (course?.liveClasses) {
//       setLiveClasses(course.liveClasses);
//     }
//   }, [course]);

//   const getAuthToken = () => {
//     return localStorage.getItem('token');
//   };

//   // Format date for datetime-local input
//   const formatDateTimeForInput = (date) => {
//     const d = new Date(date);
//     d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
//     return d.toISOString().slice(0, 16);
//   };

//   // Get course live sessions from API
//   const fetchLiveSessions = async () => {
//     try {
//       const token = getAuthToken();
//       const response = await axios.get(
//         `${API_BASE_URL}/live-session/course/${course._id}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         // Combine course liveClasses and liveSessions from API
//         const apiSessions = response.data.data?.liveSessions || [];
//         const courseSessions = course.liveClasses || [];
        
//         // Merge sessions (prioritize API sessions)
//         const mergedSessions = [...apiSessions];
        
//         // Add course sessions that aren't in API sessions
//         courseSessions.forEach(courseSession => {
//           if (!mergedSessions.find(s => s.sessionId === courseSession.sessionId)) {
//             mergedSessions.push(courseSession);
//           }
//         });
        
//         setLiveClasses(mergedSessions);
//       }
//     } catch (err) {
//       console.error('Error fetching live sessions:', err);
//       // Fallback to course liveClasses
//       setLiveClasses(course.liveClasses || []);
//     }
//   };

//   useEffect(() => {
//     if (course && activeTab === 'manage') {
//       fetchLiveSessions();
//     }
//   }, [course, activeTab]);

//   // Create Live Session
//   const handleCreateLiveSession = async () => {
//     if (!newLiveClass.title.trim()) {
//       setError('Please provide a session title');
//       return;
//     }

//     if (!newLiveClass.description.trim()) {
//       setError('Please provide a session description');
//       return;
//     }

//     if (!newLiveClass.scheduledStartTime) {
//       setError('Please select a start time');
//       return;
//     }

//     const startTime = new Date(newLiveClass.scheduledStartTime);
    
//     if (startTime <= new Date()) {
//       setError('Start time must be in the future');
//       return;
//     }

//     setLoading(true);
//     setError('');

//     try {
//       const token = getAuthToken();
      
//       const response = await axios.post(
//         `${API_BASE_URL}/courseLiveSession/create`,
//         {
//           title: newLiveClass.title,
//           description: newLiveClass.description,
//           courseId: course._id,
//           duration: parseInt(newLiveClass.duration),
//           maxParticipants: parseInt(newLiveClass.maxParticipants),
//           scheduledStartTime: startTime.toISOString() // Send as scheduledStartTime
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         const createdSession = response.data.data;
        
//         // Reset form
//         const now = new Date();
//         const defaultStartTime = new Date(now.getTime() + 30 * 60000);
        
//         setNewLiveClass({
//           title: '',
//           description: '',
//           duration: 60,
//           maxParticipants: 100,
//           scheduledStartTime: formatDateTimeForInput(defaultStartTime)
//         });
        
//         // Show success
//         setSuccessMessage('✅ Live session created successfully!');
        
//         // Show session details in toast
//         toast.success(
//           <div className="space-y-2">
//             <p className="font-semibold">🎉 Live Session Created!</p>
//             <div className="bg-white p-3 rounded-lg border border-green-200">
//               <p className="text-sm font-medium mb-2">Session Details:</p>
//               <div className="space-y-1 text-sm">
//                 <p><span className="font-medium">Title:</span> {createdSession.title}</p>
//                 <p><span className="font-medium">Scheduled Time:</span> {formatDateTime(createdSession.scheduledStartTime)}</p>
//                 <p><span className="font-medium">Duration:</span> {createdSession.duration} minutes</p>
//                 <p><span className="font-medium">Room Code:</span> <code className="bg-gray-100 px-2 py-1 rounded">{createdSession.roomCode}</code></p>
//               </div>
//               <p className="text-xs text-gray-600 mt-2">
//                 Session has been scheduled. You can join when it starts from the "Manage Sessions" tab.
//               </p>
//             </div>
//           </div>,
//           { 
//             autoClose: 8000,
//             closeButton: true,
//             draggable: false 
//           }
//         );
        
//         // Refresh data
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
        
//         // Switch to manage tab
//         setActiveTab('manage');
        
//       } else {
//         setError(response.data?.message || 'Failed to create live session');
//       }
//     } catch (err) {
//       console.error('Error creating live session:', err);
//       const errorMessage = err.response?.data?.message || err.message || 'Failed to create live session';
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // End Live Session
//   const handleEndLiveSession = async (sessionId) => {
//     if (!window.confirm('Are you sure you want to end this live session?')) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const token = getAuthToken();
//       const response = await axios.post(
//         `${API_BASE_URL}/live-session/end/${sessionId}`,
//         {},
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         setSuccessMessage('✅ Live session ended successfully!');
        
//         // Update local state
//         setLiveClasses(prev => prev.map(session => 
//           session.sessionId === sessionId 
//             ? { ...session, status: 'ENDED' }
//             : session
//         ));
        
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError(response.data?.message || 'Failed to end live session');
//       }
//     } catch (err) {
//       console.error('Error ending live session:', err);
//       setError(err.response?.data?.message || 'Failed to end live session');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Delete Live Session
//   const handleDeleteLiveSession = async (sessionId) => {
//     if (!window.confirm('Are you sure you want to delete this live session?')) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const token = getAuthToken();
//       const response = await axios.delete(
//         `${API_BASE_URL}/live-session/${sessionId}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         // Remove from local state
//         setLiveClasses(prev => prev.filter(session => session.sessionId !== sessionId));
//         setSuccessMessage('✅ Live session deleted successfully!');
        
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError(response.data?.message || 'Failed to delete live session');
//       }
//     } catch (err) {
//       console.error('Error deleting live session:', err);
//       setError(err.response?.data?.message || 'Failed to delete live session');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Join Live Session
//   const handleJoinLiveSession = async (sessionId) => {
//     try {
//       const token = getAuthToken();
      
//       // Find session details
//       const session = liveClasses.find(lc => lc.sessionId === sessionId);
//       if (!session) {
//         setError('Session not found');
//         return;
//       }

//       // First join via API
//       const response = await axios.post(
//         `${API_BASE_URL}/live-session/join/${sessionId}/${session.roomCode}`,
//         {},
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         // Open live session page in new tab
//         const joinUrl = `${window.location.origin}/live/${sessionId}?room=${session.roomCode}`;
//         window.open(joinUrl, '_blank', 'noopener,noreferrer');
//       } else {
//         setError('Failed to join live session');
//       }
//     } catch (err) {
//       console.error('Error joining live session:', err);
      
//       // Even if API fails, try to open live session page
//       const session = liveClasses.find(lc => lc.sessionId === sessionId);
//       if (session?.sessionId && session?.roomCode) {
//         const joinUrl = `${window.location.origin}/live/${session.sessionId}?room=${session.roomCode}`;
//         window.open(joinUrl, '_blank', 'noopener,noreferrer');
//       } else {
//         setError(err.response?.data?.message || 'Failed to join live session');
//       }
//     }
//   };

//   const handleBackdropClick = (e) => {
//     if (e.target === e.currentTarget) {
//       onClose();
//     }
//   };

//   const handleCloseClick = () => {
//     onClose();
//   };

//   const formatDateTime = (dateString) => {
//     if (!dateString) return 'N/A';
//     try {
//       const date = new Date(dateString);
//       return date.toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true
//       });
//     } catch (e) {
//       return 'Invalid Date';
//     }
//   };

//   const getStatusBadge = (status) => {
//     const statusConfig = {
//       'ACTIVE': { 
//         color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
//         text: '🔴 Live Now',
//         pulse: true
//       },
//       'SCHEDULED': { 
//         color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
//         text: '📅 Scheduled'
//       },
//       'ENDED': { 
//         color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
//         text: '✅ Ended'
//       },
//       'CANCELLED': { 
//         color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
//         text: '❌ Cancelled'
//       }
//     };
    
//     const config = statusConfig[status] || { 
//       color: 'bg-gray-100 text-gray-800', 
//       text: status 
//     };
    
//     return (
//       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
//         {config.text}
//       </span>
//     );
//   };

//   const isSessionJoinable = (session) => {
//     const now = new Date();
//     const startTime = new Date(session.scheduledStartTime || session.startTime || session.actualStartTime || session.createdAt);
    
//     // Check if session is active OR if it's scheduled and current time is past scheduled time
//     if (session.status === 'ACTIVE') {
//       return true;
//     }
    
//     if (session.status === 'SCHEDULED' && now >= startTime) {
//       return true;
//     }
    
//     return false;
//   };

//   return (
//     <div 
//       className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
//       onClick={handleBackdropClick}
//     >
//       <div className="bg-card rounded-xl border border-border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-border">
//           <div>
//             <h2 className="text-xl sm:text-2xl font-bold text-foreground">
//               Manage Live Classes
//             </h2>
//             <p className="text-muted-foreground mt-1">
//               {course?.title} - Create and manage live sessions
//             </p>
//           </div>
//           <button
//             onClick={handleCloseClick}
//             className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 cursor-pointer"
//             aria-label="Close modal"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="border-b border-border">
//           <div className="flex space-x-8 px-6">
//             <button
//               onClick={() => setActiveTab('create')}
//               className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer duration-200 ${
//                 activeTab === 'create'
//                   ? 'border-red-500 text-red-600'
//                   : 'border-transparent text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               🔴 Create Live Session
//             </button>
//             <button
//               onClick={() => setActiveTab('manage')}
//               className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 cursor-pointer ${
//                 activeTab === 'manage'
//                   ? 'border-red-500 text-red-600'
//                   : 'border-transparent text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               📋 Manage Sessions ({liveClasses.length})
//             </button>
//           </div>
//         </div>

//         {/* Success/Error Messages */}
//         {successMessage && (
//           <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
//             {successMessage}
//           </div>
//         )}

//         {error && (
//           <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
//             {error}
//           </div>
//         )}

//         <div className="p-6">
//           {/* Create Tab */}
//           {activeTab === 'create' && (
//             <div className="space-y-6">
//               <div className="bg-muted/20 p-4 rounded-lg border border-border">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">Create New Live Session</h3>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Session Title *
//                     </label>
//                     <input
//                       type="text"
//                       value={newLiveClass.title}
//                       onChange={(e) => setNewLiveClass(prev => ({ ...prev, title: e.target.value }))}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
//                       placeholder="Enter session title"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Duration (minutes) *
//                     </label>
//                     <input
//                       type="number"
//                       value={newLiveClass.duration}
//                       onChange={(e) => setNewLiveClass(prev => ({ ...prev, duration: e.target.value }))}
//                       min="5"
//                       max="480"
//                       required
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
//                     />
//                   </div>

//                   <div className="md:col-span-2">
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Scheduled Start Time *
//                     </label>
//                     <input
//                       type="datetime-local"
//                       value={newLiveClass.scheduledStartTime}
//                       onChange={(e) => setNewLiveClass(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
//                       required
//                       min={formatDateTimeForInput(new Date())}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
//                     />
//                     <p className="text-xs text-muted-foreground mt-1">
//                       Session will be scheduled for this time. End time will be automatically calculated based on duration.
//                     </p>
//                   </div>

//                   <div className="md:col-span-2">
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Description *
//                     </label>
//                     <textarea
//                       value={newLiveClass.description}
//                       onChange={(e) => setNewLiveClass(prev => ({ ...prev, description: e.target.value }))}
//                       rows={3}
//                       required
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
//                       placeholder="Describe what this session will cover..."
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Max Participants *
//                     </label>
//                     <input
//                       type="number"
//                       value={newLiveClass.maxParticipants}
//                       onChange={(e) => setNewLiveClass(prev => ({ ...prev, maxParticipants: e.target.value }))}
//                       min="1"
//                       max="500"
//                       required
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
//                     />
//                   </div>
//                 </div>

//                 <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                   <h4 className="font-medium text-blue-800 mb-2">ℹ️ Important Notes:</h4>
//                   <ul className="text-sm text-blue-700 space-y-1">
//                     <li>• Session will be scheduled for the selected start time</li>
//                     <li>• You can join the session when it starts from the "Manage Sessions" tab</li>
//                     <li>• Participants must be enrolled in this course to join</li>
//                     <li>• Session will be automatically linked to this course</li>
//                     <li>• Session will be created with status "SCHEDULED"</li>
//                     <li>• End time will be automatically calculated (start time + duration)</li>
//                   </ul>
//                 </div>

//                 <button
//                   onClick={handleCreateLiveSession}
//                   disabled={loading || !newLiveClass.title.trim() || !newLiveClass.description.trim() || !newLiveClass.scheduledStartTime}
//                   className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
//                 >
//                   {loading ? (
//                     <>
//                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                       <span>Creating Session...</span>
//                     </>
//                   ) : (
//                     <>
//                       <span>📅</span>
//                       <span>Schedule Live Session</span>
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Manage Tab */}
//           {activeTab === 'manage' && (
//             <div className="space-y-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold text-foreground">Live Sessions</h3>
//                 <button
//                   onClick={fetchLiveSessions}
//                   className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
//                 >
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                   </svg>
//                   <span>Refresh</span>
//                 </button>
//               </div>
                
//               {liveClasses.length === 0 ? (
//                 <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
//                   <div className="text-muted-foreground text-lg mb-4">
//                     No live sessions created yet.
//                   </div>
//                   <p className="text-sm text-muted-foreground mb-4">
//                     Create your first live session using the "Create Live Session" tab.
//                   </p>
//                   <button
//                     onClick={() => setActiveTab('create')}
//                     className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 cursor-pointer"
//                   >
//                     Create Live Session
//                   </button>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {liveClasses.map((liveClass) => (
//                     <div key={liveClass.sessionId || liveClass._id} className="p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors duration-200">
//                       <div className="flex justify-between items-start">
//                         <div className="flex-1">
//                           <div className="flex items-center space-x-3 mb-2">
//                             <h4 className="font-medium text-foreground">{liveClass.sessionTitle || liveClass.title}</h4>
//                             {getStatusBadge(liveClass.status)}
//                             <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
//                               👥 {liveClass.currentParticipants || liveClass.participantsCount || 0}/{liveClass.maxParticipants || 100}
//                             </span>
//                           </div>
                          
//                           {liveClass.description && (
//                             <p className="text-sm text-muted-foreground mb-3">{liveClass.description}</p>
//                           )}
                          
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//                             <div className="flex items-center space-x-2">
//                               <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                               </svg>
//                               <span className="text-muted-foreground">
//                                 Scheduled: {formatDateTime(liveClass.scheduledStartTime || liveClass.startTime || liveClass.actualStartTime || liveClass.createdAt)}
//                               </span>
//                             </div>
                            
//                             <div className="flex items-center space-x-2">
//                               <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                               </svg>
//                               <span className="text-muted-foreground">
//                                 Duration: {liveClass.duration || 60} minutes
//                               </span>
//                             </div>
//                           </div>
                          
//                           {/* Session IDs and Room Code */}
//                           <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
//                             {liveClass.sessionId && (
//                               <div className="flex items-center space-x-1">
//                                 <span className="text-muted-foreground">Session ID:</span>
//                                 <code className="bg-gray-100 px-2 py-1 rounded">{liveClass.sessionId}</code>
//                               </div>
//                             )}
//                             {liveClass.roomCode && (
//                               <div className="flex items-center space-x-1">
//                                 <span className="text-muted-foreground">Room Code:</span>
//                                 <code className="bg-gray-100 px-2 py-1 rounded">{liveClass.roomCode}</code>
//                               </div>
//                             )}
//                           </div>
//                         </div>
                        
//                         <div className="flex flex-col space-y-2 ml-4">
//                           {/* Join Button (for active or scheduled sessions that should have started) */}
//                           {isSessionJoinable(liveClass) && (
//                             <button
//                               onClick={() => handleJoinLiveSession(liveClass.sessionId)}
//                               className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm flex items-center space-x-2 min-w-[120px] justify-center cursor-pointer"
//                             >
//                               <span className={liveClass.status === 'ACTIVE' ? 'animate-pulse' : ''}>🔴</span>
//                               <span>Join Session</span>
//                             </button>
//                           )}
                          
//                           {/* End Session Button (only for LIVE sessions) */}
//                           {liveClass.status === 'ACTIVE' && (
//                             <button
//                               onClick={() => handleEndLiveSession(liveClass.sessionId)}
//                               disabled={loading}
//                               className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm disabled:opacity-50 min-w-[120px] cursor-pointer"
//                             >
//                               End Session
//                             </button>
//                           )}
                          
//                           {/* Delete Button */}
//                           <button
//                             onClick={() => handleDeleteLiveSession(liveClass.sessionId)}
//                             disabled={loading || liveClass.status === 'ACTIVE'}
//                             className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 text-sm disabled:opacity-50 min-w-[120px] cursor-pointer"
//                           >
//                             {liveClass.status === 'ACTIVE' ? 'Cannot Delete Live' : 'Delete Session'}
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex justify-between items-center p-6 border-t border-border">
//           <div className="text-sm text-muted-foreground">
//             Course ID: <code className="bg-gray-100 px-2 py-1 rounded">{course?._id}</code>
//           </div>
//           <div className="flex space-x-3">
//             <button
//               onClick={handleCloseClick}
//               className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LiveClassesModal;


// src/pages/Courses/components/LiveClassesModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const LiveClassesModal = ({ course, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form states - only startTime (scheduledStartTime) needed
  const [newLiveClass, setNewLiveClass] = useState({
    title: '',
    description: '',
    duration: 60,
    maxParticipants: 100,
    scheduledStartTime: '' // Changed from startTime to scheduledStartTime
  });

  // Initialize form with default time
  useEffect(() => {
    const now = new Date();
    const defaultStartTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    
    setNewLiveClass(prev => ({
      ...prev,
      scheduledStartTime: formatDateTimeForInput(defaultStartTime)
    }));
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('trainertoken');
  };

  // Format date for datetime-local input
  const formatDateTimeForInput = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  // Create Live Session
  const handleCreateLiveSession = async () => {
    if (!newLiveClass.title.trim()) {
      setError('Please provide a session title');
      return;
    }

    if (!newLiveClass.description.trim()) {
      setError('Please provide a session description');
      return;
    }

    if (!newLiveClass.scheduledStartTime) {
      setError('Please select a start time');
      return;
    }

    const startTime = new Date(newLiveClass.scheduledStartTime);
    
    if (startTime <= new Date()) {
      setError('Start time must be in the future');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      
      const response = await axios.post(
        `${API_BASE_URL}/courseLiveSession/create`,
        {
          title: newLiveClass.title,
          description: newLiveClass.description,
          courseId: course._id,
          duration: parseInt(newLiveClass.duration),
          maxParticipants: parseInt(newLiveClass.maxParticipants),
          scheduledStartTime: startTime.toISOString() // Send as scheduledStartTime
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success) {
        const createdSession = response.data.data;
        
        // Reset form
        const now = new Date();
        const defaultStartTime = new Date(now.getTime() + 30 * 60000);
        
        setNewLiveClass({
          title: '',
          description: '',
          duration: 60,
          maxParticipants: 100,
          scheduledStartTime: formatDateTimeForInput(defaultStartTime)
        });
        
        // Show success
        setSuccessMessage('✅ Live session created successfully!');
        
        // Show session details in toast
        toast.success(
          <div className="space-y-2">
            <p className="font-semibold">🎉 Live Session Created!</p>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <p className="text-sm font-medium mb-2">Session Details:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Title:</span> {createdSession.title}</p>
                <p><span className="font-medium">Scheduled Time:</span> {formatDateTime(createdSession.scheduledStartTime)}</p>
                <p><span className="font-medium">Duration:</span> {createdSession.duration} minutes</p>
                <p><span className="font-medium">Room Code:</span> <code className="bg-gray-100 px-2 py-1 rounded">{createdSession.roomCode}</code></p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Session has been scheduled. You can manage it from the course dashboard.
              </p>
            </div>
          </div>,
          { 
            autoClose: 8000,
            closeButton: true,
            draggable: false 
          }
        );
        
        // Refresh data
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
        
        // Close modal after success
        setTimeout(() => {
          onClose();
        }, 2000);
        
      } else {
        setError(response.data?.message || 'Failed to create live session');
      }
    } catch (err) {
      console.error('Error creating live session:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create live session';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    onClose();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Create Live Session
            </h2>
            <p className="text-muted-foreground mt-1">
              {course?.title} - Schedule a new live class
            </p>
          </div>
          <button
            onClick={handleCloseClick}
            className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="p-6">
          <div className="space-y-6">
            <div className="bg-muted/20 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Live Session Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    value={newLiveClass.title}
                    onChange={(e) => setNewLiveClass(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter session title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={newLiveClass.duration}
                    onChange={(e) => setNewLiveClass(prev => ({ ...prev, duration: e.target.value }))}
                    min="5"
                    max="480"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Scheduled Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newLiveClass.scheduledStartTime}
                    onChange={(e) => setNewLiveClass(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
                    required
                    min={formatDateTimeForInput(new Date())}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Session will be scheduled for this time. End time will be automatically calculated based on duration.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newLiveClass.description}
                    onChange={(e) => setNewLiveClass(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                    placeholder="Describe what this session will cover..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Participants *
                  </label>
                  <input
                    type="number"
                    value={newLiveClass.maxParticipants}
                    onChange={(e) => setNewLiveClass(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    min="1"
                    max="500"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">ℹ️ Important Notes:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Session will be scheduled for the selected start time</li>
                  <li>• You can manage sessions from the course dashboard</li>
                  <li>• Participants must be enrolled in this course to join</li>
                  <li>• Session will be automatically linked to this course</li>
                  <li>• Session will be created with status "SCHEDULED"</li>
                  <li>• End time will be automatically calculated (start time + duration)</li>
                </ul>
              </div>

              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={handleCreateLiveSession}
                  disabled={loading || !newLiveClass.title.trim() || !newLiveClass.description.trim() || !newLiveClass.scheduledStartTime}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Session...</span>
                    </>
                  ) : (
                    <>
                      <span>📅</span>
                      <span>Schedule Live Session</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCloseClick}
                  className="px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Course ID: <code className="bg-gray-100 px-2 py-1 rounded">{course?._id}</code>
          </div>
          <div className="text-sm text-muted-foreground">
            Live sessions will appear in course dashboard
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassesModal;