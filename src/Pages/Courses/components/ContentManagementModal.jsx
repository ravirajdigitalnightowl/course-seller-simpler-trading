// // src/pages/Courses/components/ContentManagementModal.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// const ContentManagementModal = ({ course, onClose, onSuccess }) => {
//   const [activeTab, setActiveTab] = useState('lectures');
//   const [lectures, setLectures] = useState([]);
//   const [assignments, setAssignments] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//   const [selectedLectureType, setSelectedLectureType] = useState('all');

//   // New lecture form
//   const [newLecture, setNewLecture] = useState({
//     title: '',
//     type: 'video',
//     duration: '',
//     isPreviewFree: false,
//     file: null
//   });

//   // New assignment form
//   const [newAssignment, setNewAssignment] = useState({
//     title: '',
//     description: '',
//     dueDate: '',
//     resources: []
//   });

//   useEffect(() => {
//     if (course) {
//       setLectures(course.lectures || []);
//       setAssignments(course.assignments || []);
//     }
//   }, [course]);

//   // Clear success message on tab change
//   useEffect(() => {
//     setSuccessMessage('');
//   }, [activeTab]);

//   const getAuthToken = () => {
//     return localStorage.getItem('token');
//   };

//   // Handle duration input change
//   const handleDurationChange = (value) => {
//     // Allow empty string or numbers only
//     if (value === '') {
//       setNewLecture(prev => ({ ...prev, duration: '' }));
//       return;
//     }
    
//     // Remove any non-numeric characters
//     const numericValue = value.replace(/[^\d]/g, '');
    
//     // Convert to number and set
//     if (numericValue === '') {
//       setNewLecture(prev => ({ ...prev, duration: '' }));
//     } else {
//       const num = parseInt(numericValue, 10);
//       // Limit to reasonable max (9999 minutes = ~166 hours)
//       if (num <= 9999) {
//         setNewLecture(prev => ({ ...prev, duration: num }));
//       }
//     }
//   };

//   // File validation based on lecture type
//   const validateLectureFile = (file, lectureType) => {
//     const allowedTypes = {
//       video: [
//         'video/mp4', 'video/x-m4v', 'video/avi', 'video/mov', 
//         'video/wmv', 'video/flv', 'video/mkv', 'video/webm',
//         'video/quicktime'
//       ],
//       pdf: ['application/pdf'],
//       ppt: [
//         'application/vnd.ms-powerpoint',
//         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//         'application/vnd.oasis.opendocument.presentation'
//       ],
//       note: [
//         'text/plain', 'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         'text/markdown', 'application/rtf'
//       ]
//     };

//     if (allowedTypes[lectureType] && !allowedTypes[lectureType].includes(file.type)) {
//       const typeNames = {
//         video: 'video (MP4, AVI, MOV, WMV, etc)',
//         pdf: 'PDF',
//         ppt: 'presentation (PPT, PPTX)',
//         note: 'text/document (DOC, DOCX, TXT)'
//       };
//       return `Please select a valid ${typeNames[lectureType]} file. Selected: ${file.type}`;
//     }

//     // File size validation (50MB max for videos, 10MB for others)
//     const maxSizes = {
//       video: 250 * 1024 * 1024, // 50MB
//       pdf: 10 * 1024 * 1024,   // 10MB
//       ppt: 20 * 1024 * 1024,   // 20MB
//       note: 5 * 1024 * 1024    // 5MB
//     };

//     if (file.size > maxSizes[lectureType]) {
//       const maxSizeMB = maxSizes[lectureType] / (1024 * 1024);
//       return `File too large. Maximum size for ${lectureType} is ${maxSizeMB}MB`;
//     }

//     return null; // No error
//   };

//   // Add Lecture using separate endpoint
//   const handleAddLecture = async () => {
//     if (!newLecture.title.trim() || !newLecture.file) {
//       setError('Please provide lecture title and file');
//       return;
//     }

//     // Validate duration
//     const durationValue = newLecture.duration === '' ? 0 : parseInt(newLecture.duration, 10);
//     if (durationValue < 0) {
//       setError('Duration cannot be negative');
//       return;
//     }

//     // Validate file
//     const fileError = validateLectureFile(newLecture.file, newLecture.type);
//     if (fileError) {
//       setError(fileError);
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccessMessage('');

//     try {
//       const token = getAuthToken();
//       const formData = new FormData();
      
//       // Add lecture data
//       formData.append('title', newLecture.title);
//       formData.append('type', newLecture.type);
//       formData.append('duration', durationValue);
//       formData.append('isPreviewFree', newLecture.isPreviewFree);
//       formData.append('file', newLecture.file);

//       const response = await axios.post(
//         `${API_BASE_URL}/course/${course._id}/addLecture`,
//         formData,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'multipart/form-data',
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         // Add new lecture to state
//         const addedLecture = response.data.data;
//         setLectures(prev => [...prev, addedLecture]);
        
//         // Reset form
//         setNewLecture({
//           title: '',
//           type: 'video',
//           duration: '',
//           isPreviewFree: false,
//           file: null
//         });
        
//         // Show success message
//         setSuccessMessage('✅ Lecture added successfully!');
//         setError('');
        
//         // Refresh parent component if callback provided
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError(response.data?.message || 'Failed to add lecture');
//       }
//     } catch (err) {
//       console.error('Error adding lecture:', err);
//       const errorMessage = err.response?.data?.message || err.message || 'Failed to add lecture';
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Remove Lecture using separate endpoint
//   const handleRemoveLecture = async (lectureId) => {
//     if (!window.confirm('Are you sure you want to remove this lecture?')) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const token = getAuthToken();
//       const response = await axios.delete(
//         `${API_BASE_URL}/course/${course._id}/removeLecture/${lectureId}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         setLectures(prev => prev.filter(lecture => lecture._id !== lectureId));
//         setSuccessMessage('✅ Lecture removed successfully!');
        
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError('Failed to remove lecture');
//       }
//     } catch (err) {
//       console.error('Error removing lecture:', err);
//       setError(err.response?.data?.message || 'Failed to remove lecture');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Add Assignment using separate endpoint
//   const handleAddAssignment = async () => {
//     if (!newAssignment.title.trim() || newAssignment.resources.length === 0) {
//       setError('Please provide assignment title and at least one resource');
//       return;
//     }

//     // Validate file sizes (max 20MB per file)
//     const maxFileSize = 20 * 1024 * 1024; // 20MB
//     for (const file of newAssignment.resources) {
//       if (file.size > maxFileSize) {
//         setError(`File "${file.name}" is too large. Maximum size is 20MB`);
//         return;
//       }
//     }

//     setLoading(true);
//     setError('');
//     setSuccessMessage('');

//     try {
//       const token = getAuthToken();
//       const formData = new FormData();
      
//       // Add assignment data
//       formData.append('title', newAssignment.title);
//       formData.append('description', newAssignment.description || '');
//       if (newAssignment.dueDate) {
//         formData.append('dueDate', newAssignment.dueDate);
//       }

//       // Add resources files
//       newAssignment.resources.forEach((file) => {
//         formData.append('resources', file);
//       });

//       const response = await axios.post(
//         `${API_BASE_URL}/course/${course._id}/addAssignment`,
//         formData,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'multipart/form-data',
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         const addedAssignment = response.data.data;
//         setAssignments(prev => [...prev, addedAssignment]);
        
//         // Reset form
//         setNewAssignment({
//           title: '',
//           description: '',
//           dueDate: '',
//           resources: []
//         });
        
//         // Show success
//         setSuccessMessage('✅ Assignment added successfully!');
//         setError('');
        
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError(response.data?.message || 'Failed to add assignment');
//       }
//     } catch (err) {
//       console.error('Error adding assignment:', err);
//       setError(err.response?.data?.message || 'Failed to add assignment');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Remove Assignment using separate endpoint
//   const handleRemoveAssignment = async (assignmentId) => {
//     if (!window.confirm('Are you sure you want to remove this assignment?')) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const token = getAuthToken();
//       const response = await axios.delete(
//         `${API_BASE_URL}/course/${course._id}/removeAssignment/${assignmentId}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.data && response.data.success) {
//         setAssignments(prev => prev.filter(assignment => assignment._id !== assignmentId));
//         setSuccessMessage('✅ Assignment removed successfully!');
        
//         if (typeof onSuccess === 'function') {
//           setTimeout(() => {
//             onSuccess();
//           }, 1500);
//         }
//       } else {
//         setError('Failed to remove assignment');
//       }
//     } catch (err) {
//       console.error('Error removing assignment:', err);
//       setError(err.response?.data?.message || 'Failed to remove assignment');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBackdropClick = (e) => {
//     if (e.target === e.currentTarget) {
//       onClose();
//     }
//   };

//   const formatDuration = (minutes) => {
//     if (!minutes || isNaN(minutes) || minutes === 0) return 'N/A';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//   };

//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'N/A';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   const getFileTypeIcon = (type) => {
//     const iconMap = {
//       video: '🎥',
//       pdf: '📄',
//       ppt: '📊',
//       note: '📝'
//     };
//     return iconMap[type] || '📎';
//   };

//   // File input accept attribute based on lecture type
//   const getFileAcceptAttribute = (type) => {
//     const acceptMap = {
//       video: 'video/*,.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.m4v',
//       pdf: '.pdf',
//       ppt: '.ppt,.pptx,.odp,.key',
//       note: '.txt,.doc,.docx,.md,.rtf,.pdf'
//     };
//     return acceptMap[type] || '*/*';
//   };

//   // File input description based on lecture type
//   const getFileDescription = (type) => {
//     const descriptionMap = {
//       video: 'Video files (MP4, AVI, MOV, WMV, FLV, MKV, WebM) - Max 250MB',
//       pdf: 'PDF files - Max 10MB',
//       ppt: 'Presentation files (PPT, PPTX, ODP, KEY) - Max 20MB',
//       note: 'Text/Document files (TXT, DOC, DOCX, MD, RTF) - Max 5MB'
//     };
//     return descriptionMap[type] || 'Any file';
//   };

//   // Handle lecture type change
//   const handleLectureTypeChange = (type) => {
//     setNewLecture(prev => ({ 
//       ...prev, 
//       type: type,
//       file: null // Clear previously selected file when type changes
//     }));
//   };

//   return (
//     <div 
//       className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
//       onClick={handleBackdropClick}
//     >
//       <div className="bg-card rounded-xl border border-border shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-border">
//           <div>
//             <h2 className="text-xl sm:text-2xl font-bold text-foreground">
//               Manage Course Content
//             </h2>
//             <p className="text-muted-foreground mt-1">
//               {course?.title} - Add and manage lectures & assignments
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-muted rounded-lg transition-colors duration-200"
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
//               onClick={() => setActiveTab('lectures')}
//               className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
//                 activeTab === 'lectures'
//                   ? 'border-blue-500 text-blue-600'
//                   : 'border-transparent text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               📚 Lectures ({lectures.length})
//             </button>
//             <button
//               onClick={() => setActiveTab('assignments')}
//               className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
//                 activeTab === 'assignments'
//                   ? 'border-blue-500 text-blue-600'
//                   : 'border-transparent text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               📝 Assignments ({assignments.length})
//             </button>
//           </div>
//         </div>

//         {/* Success Message */}
//         {successMessage && (
//           <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
//             {successMessage}
//           </div>
//         )}

//         {/* Error Message */}
//         {error && (
//           <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
//             {error}
//           </div>
//         )}

//         <div className="p-6">
//           {/* Lectures Tab */}
//           {activeTab === 'lectures' && (
//             <div className="space-y-6">
//               {/* Add Lecture Form */}
//               <div className="bg-muted/20 p-4 rounded-lg border border-border">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">Add New Lecture</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Lecture Title *
//                     </label>
//                     <input
//                       type="text"
//                       value={newLecture.title}
//                       onChange={(e) => setNewLecture(prev => ({ ...prev, title: e.target.value }))}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                       placeholder="Enter lecture title"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Type *
//                     </label>
//                     <select
//                       value={newLecture.type}
//                       onChange={(e) => handleLectureTypeChange(e.target.value)}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                     >
//                       <option value="video">Video</option>
//                       <option value="pdf">PDF</option>
//                       <option value="ppt">Presentation</option>
//                       <option value="note">Notes</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Duration (minutes)
//                     </label>
//                     <input
//                       type="text"
//                       inputMode="numeric"
//                       value={newLecture.duration}
//                       onChange={(e) => handleDurationChange(e.target.value)}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                       placeholder="Duration in minutes (e.g., 45)"
//                     />
//                     <p className="text-xs text-muted-foreground mt-1">
//                       Optional. Enter duration in minutes
//                     </p>
//                   </div>
//                   <div className="flex items-center">
//                     <label className="flex items-center space-x-2">
//                       <input
//                         type="checkbox"
//                         checked={newLecture.isPreviewFree}
//                         onChange={(e) => setNewLecture(prev => ({ ...prev, isPreviewFree: e.target.checked }))}
//                         className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
//                       />
//                       <span className="text-sm font-medium text-foreground">Free Preview</span>
//                     </label>
//                   </div>
//                 </div>
//                 <div className="mt-4">
//                   <label className="block text-sm font-medium text-foreground mb-2">
//                     Lecture File *
//                     <span className="ml-2 text-xs text-muted-foreground">
//                       ({getFileDescription(newLecture.type)})
//                     </span>
//                   </label>
//                   <input
//                     type="file"
//                     onChange={(e) => setNewLecture(prev => ({ ...prev, file: e.target.files[0] }))}
//                     accept={getFileAcceptAttribute(newLecture.type)}
//                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                   {newLecture.file && (
//                     <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <span className="text-sm font-medium text-blue-800">
//                             Selected: {newLecture.file.name}
//                           </span>
//                           <span className="ml-2 text-xs text-blue-600">
//                             ({formatFileSize(newLecture.file.size)})
//                           </span>
//                         </div>
//                         <button
//                           type="button"
//                           onClick={() => setNewLecture(prev => ({ ...prev, file: null }))}
//                           className="text-red-600 hover:text-red-800"
//                         >
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                           </svg>
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//                 <button
//                   onClick={handleAddLecture}
//                   disabled={loading || !newLecture.title.trim() || !newLecture.file}
//                   className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
//                 >
//                   {loading ? 'Adding...' : 'Add Lecture'}
//                 </button>
//               </div>

//               {/* Lectures List */}
//               <div>
//                 <div className="flex items-center justify-between mb-4">
//                   <h3 className="text-lg font-semibold text-foreground">Existing Lectures</h3>
//                   <div className="flex items-center space-x-2">
//                     <span className="text-sm text-muted-foreground">Filter:</span>
//                     <select
//                       value={selectedLectureType}
//                       onChange={(e) => setSelectedLectureType(e.target.value)}
//                       className="px-3 py-1 border border-border rounded-lg bg-background text-foreground text-sm"
//                     >
//                       <option value="all">All Types</option>
//                       <option value="video">Video</option>
//                       <option value="pdf">PDF</option>
//                       <option value="ppt">Presentation</option>
//                       <option value="note">Notes</option>
//                     </select>
//                   </div>
//                 </div>
//                 {lectures.length === 0 ? (
//                   <p className="text-muted-foreground text-center py-8">No lectures added yet.</p>
//                 ) : (
//                   <div className="space-y-3">
//                     {lectures
//                       .filter(lecture => selectedLectureType === 'all' || lecture.type === selectedLectureType)
//                       .map((lecture) => (
//                       <div key={lecture._id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors duration-200">
//                         <div className="flex items-center space-x-4">
//                           <span className="text-2xl">{getFileTypeIcon(lecture.type)}</span>
//                           <div>
//                             <h4 className="font-medium text-foreground">{lecture.title}</h4>
//                             <p className="text-sm text-muted-foreground">
//                               Type: <span className="font-medium">{lecture.type}</span> • 
//                               Duration: {formatDuration(lecture.duration)}
//                               {lecture.isPreviewFree && ' • Free Preview'}
//                             </p>
//                             {lecture.url && (
//                               <a 
//                                 href={lecture.url} 
//                                 target="_blank" 
//                                 rel="noopener noreferrer"
//                                 className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
//                               >
//                                 View File
//                               </a>
//                             )}
//                           </div>
//                         </div>
//                         <button
//                           onClick={() => handleRemoveLecture(lecture._id)}
//                           disabled={loading}
//                           className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors duration-200"
//                           title="Remove Lecture"
//                         >
//                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                           </svg>
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Assignments Tab */}
//           {activeTab === 'assignments' && (
//             <div className="space-y-6">
//               {/* Add Assignment Form */}
//               <div className="bg-muted/20 p-4 rounded-lg border border-border">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">Add New Assignment</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Assignment Title *
//                     </label>
//                     <input
//                       type="text"
//                       value={newAssignment.title}
//                       onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                       placeholder="Enter assignment title"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-foreground mb-2">
//                       Due Date
//                     </label>
//                     <input
//                       type="date"
//                       value={newAssignment.dueDate}
//                       onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
//                       className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                       min={new Date().toISOString().split('T')[0]}
//                     />
//                   </div>
//                 </div>
//                 <div className="mt-4">
//                   <label className="block text-sm font-medium text-foreground mb-2">
//                     Description
//                   </label>
//                   <textarea
//                     value={newAssignment.description}
//                     onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
//                     rows={3}
//                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
//                     placeholder="Enter assignment description"
//                   />
//                 </div>
//                 <div className="mt-4">
//                   <label className="block text-sm font-medium text-foreground mb-2">
//                     Resources *
//                     <span className="ml-2 text-xs text-muted-foreground">
//                       (Multiple files allowed, max 20MB each)
//                     </span>
//                   </label>
//                   <input
//                     type="file"
//                     multiple
//                     onChange={(e) => setNewAssignment(prev => ({ 
//                       ...prev, 
//                       resources: Array.from(e.target.files) 
//                     }))}
//                     className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                   {newAssignment.resources.length > 0 && (
//                     <div className="mt-2 space-y-2">
//                       {newAssignment.resources.map((file, index) => (
//                         <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                           <div className="flex items-center space-x-3">
//                             <span className="text-sm text-blue-800">
//                               {file.name} ({formatFileSize(file.size)})
//                             </span>
//                             <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
//                               {file.type || 'Unknown type'}
//                             </span>
//                           </div>
//                           <button
//                             type="button"
//                             onClick={() => {
//                               const newFiles = [...newAssignment.resources];
//                               newFiles.splice(index, 1);
//                               setNewAssignment(prev => ({ ...prev, resources: newFiles }));
//                             }}
//                             className="text-red-600 hover:text-red-800"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                             </svg>
//                           </button>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//                 <button
//                   onClick={handleAddAssignment}
//                   disabled={loading || !newAssignment.title.trim() || newAssignment.resources.length === 0}
//                   className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
//                 >
//                   {loading ? 'Adding...' : 'Add Assignment'}
//                 </button>
//               </div>

//               {/* Assignments List */}
//               <div>
//                 <h3 className="text-lg font-semibold text-foreground mb-4">Existing Assignments</h3>
//                 {assignments.length === 0 ? (
//                   <p className="text-muted-foreground text-center py-8">No assignments added yet.</p>
//                 ) : (
//                   <div className="space-y-4">
//                     {assignments.map((assignment) => (
//                       <div key={assignment._id} className="p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors duration-200">
//                         <div className="flex justify-between items-start">
//                           <div className="flex-1">
//                             <div className="flex items-center space-x-3 mb-2">
//                               <h4 className="font-medium text-foreground">{assignment.title}</h4>
//                               <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
//                                 {assignment.resources?.length || 0} file(s)
//                               </span>
//                             </div>
//                             {assignment.description && (
//                               <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
//                             )}
//                             <div className="flex flex-wrap gap-3">
//                               {assignment.dueDate && (
//                                 <div className="flex items-center space-x-1">
//                                   <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                                   </svg>
//                                   <span className="text-sm text-muted-foreground">
//                                     Due: {new Date(assignment.dueDate).toLocaleDateString()}
//                                   </span>
//                                 </div>
//                               )}
//                               <div className="flex items-center space-x-1">
//                                 <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                                 </svg>
//                                 <span className="text-sm text-muted-foreground">
//                                   {assignment.resources?.length || 0} resource(s)
//                                 </span>
//                               </div>
//                             </div>
//                             {assignment.resources && assignment.resources.length > 0 && (
//                               <div className="mt-3 pt-3 border-t border-border">
//                                 <p className="text-sm font-medium text-foreground mb-2">Resources:</p>
//                                 <div className="space-y-2">
//                                   {assignment.resources.map((resource, index) => (
//                                     <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
//                                       <span className="text-sm text-muted-foreground truncate">
//                                         {typeof resource === 'string' ? resource.split('/').pop() : `Resource ${index + 1}`}
//                                       </span>
//                                       {typeof resource === 'string' && (
//                                         <a 
//                                           href={resource} 
//                                           target="_blank" 
//                                           rel="noopener noreferrer"
//                                           className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
//                                         >
//                                           Download
//                                         </a>
//                                       )}
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                           <button
//                             onClick={() => handleRemoveAssignment(assignment._id)}
//                             disabled={loading}
//                             className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-50 ml-4 transition-colors duration-200"
//                             title="Remove Assignment"
//                           >
//                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex justify-end space-x-3 p-6 border-t border-border">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContentManagementModal;










// src/pages/Courses/components/ContentManagementModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const ContentManagementModal = ({ course, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('lectures');
  const [lectures, setLectures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('all');

  // New lecture form
  const [newLecture, setNewLecture] = useState({
    title: '',
    type: 'video',
    duration: '',
    isPreviewFree: false,
    file: null
  });

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    resources: []
  });

  useEffect(() => {
    if (course) {
      setLectures(course.lectures || []);
      setAssignments(course.assignments || []);
    }
  }, [course]);

  // Clear success message on tab change
  useEffect(() => {
    setSuccessMessage('');
  }, [activeTab]);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Handle duration input change
  const handleDurationChange = (value) => {
    if (value === '') {
      setNewLecture(prev => ({ ...prev, duration: '' }));
      return;
    }
    
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (numericValue === '') {
      setNewLecture(prev => ({ ...prev, duration: '' }));
    } else {
      const num = parseInt(numericValue, 10);
      if (num <= 9999) {
        setNewLecture(prev => ({ ...prev, duration: num }));
      }
    }
  };

  // 🔥 NEW: S3 Upload helper function
  const uploadToS3 = async (file, folder = 'course-content') => {
    try {
      const token = getAuthToken();
      
      // 1. Get pre-signed URL from backend
      const presignedResponse = await axios.post(
        `${API_BASE_URL}/file/presigned-url`,
        {
          fileName: file.name,
          fileType: file.type,
          folder: folder
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!presignedResponse.data.success) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl } = presignedResponse.data.data;

      // 2. Use XMLHttpRequest for CORS compatibility
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            // Extract clean file URL
            const cleanUrl = uploadUrl.split('?')[0];
            resolve(cleanUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error during upload'));
        };
        
        xhr.send(file);
      });
      
    } catch (error) {
      console.error('❌ S3 Upload Error:', error);
      throw error;
    }
  };

  // 🔥 NEW: Bulk upload for multiple files
  const uploadMultipleToS3 = async (files, folder = 'assignments') => {
    try {
      const uploadPromises = files.map(file => uploadToS3(file, folder));
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('❌ Bulk upload error:', error);
      throw error;
    }
  };

  // File validation based on lecture type
  const validateLectureFile = (file, lectureType) => {
    const allowedTypes = {
      video: [
        'video/mp4', 'video/x-m4v', 'video/avi', 'video/mov', 
        'video/wmv', 'video/flv', 'video/mkv', 'video/webm',
        'video/quicktime'
      ],
      pdf: ['application/pdf'],
      ppt: [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.presentation'
      ],
      note: [
        'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown', 'application/rtf'
      ]
    };

    if (allowedTypes[lectureType] && !allowedTypes[lectureType].includes(file.type)) {
      const typeNames = {
        video: 'video (MP4, AVI, MOV, WMV, etc)',
        pdf: 'PDF',
        ppt: 'presentation (PPT, PPTX)',
        note: 'text/document (DOC, DOCX, TXT)'
      };
      return `Please select a valid ${typeNames[lectureType]} file. Selected: ${file.type}`;
    }

    // File size validation (250MB max for videos, 20MB for others)
    const maxSizes = {
      video: 250 * 1024 * 1024, // 250MB
      pdf: 20 * 1024 * 1024,   // 20MB
      ppt: 20 * 1024 * 1024,   // 20MB
      note: 5 * 1024 * 1024    // 5MB
    };

    if (file.size > maxSizes[lectureType]) {
      const maxSizeMB = maxSizes[lectureType] / (1024 * 1024);
      return `File too large. Maximum size for ${lectureType} is ${maxSizeMB}MB`;
    }

    return null; // No error
  };

  // 🔥 UPDATED: Add Lecture with S3 upload
  const handleAddLecture = async () => {
    if (!newLecture.title.trim() || !newLecture.file) {
      setError('Please provide lecture title and file');
      return;
    }

    // Validate duration
    const durationValue = newLecture.duration === '' ? 0 : parseInt(newLecture.duration, 10);
    if (durationValue < 0) {
      setError('Duration cannot be negative');
      return;
    }

    // Validate file
    const fileError = validateLectureFile(newLecture.file, newLecture.type);
    if (fileError) {
      setError(fileError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = getAuthToken();
      
      // 1. Upload file to S3
      const s3Url = await uploadToS3(newLecture.file, 'course-lectures');
      
      // 2. Send lecture data to backend with S3 URL
      const lectureData = {
        title: newLecture.title.trim(),
        type: newLecture.type,
        duration: durationValue,
        isPreviewFree: newLecture.isPreviewFree,
        url: s3Url // S3 URL instead of file
      };

      const response = await axios.post(
        `${API_BASE_URL}/course/${course._id}/addLecture`,
        lectureData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success) {
        // Add new lecture to state
        const addedLecture = response.data.data;
        setLectures(prev => [...prev, addedLecture]);
        
        // Reset form
        setNewLecture({
          title: '',
          type: 'video',
          duration: '',
          isPreviewFree: false,
          file: null
        });
        
        // Show success message
        setSuccessMessage('✅ Lecture added successfully!');
        toast.success('Lecture added successfully!');
        setError('');
        
        // Refresh parent component
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to add lecture';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error adding lecture:', err);
      
      let errorMessage = 'Failed to add lecture';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Remove Lecture using separate endpoint
  const handleRemoveLecture = async (lectureId) => {
    if (!window.confirm('Are you sure you want to remove this lecture?')) {
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.delete(
        `${API_BASE_URL}/course/${course._id}/removeLecture/${lectureId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.success) {
        setLectures(prev => prev.filter(lecture => lecture._id !== lectureId));
        setSuccessMessage('✅ Lecture removed successfully!');
        toast.success('Lecture removed successfully!');
        
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to remove lecture';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error removing lecture:', err);
      const errorMessage = err.response?.data?.message || 'Failed to remove lecture';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 UPDATED: Add Assignment with S3 upload
  const handleAddAssignment = async () => {
    if (!newAssignment.title.trim() || newAssignment.resources.length === 0) {
      setError('Please provide assignment title and at least one resource');
      toast.error('Please provide assignment title and resources');
      return;
    }

    // Validate file sizes (max 20MB per file)
    const maxFileSize = 20 * 1024 * 1024; // 20MB
    for (const file of newAssignment.resources) {
      if (file.size > maxFileSize) {
        setError(`File "${file.name}" is too large. Maximum size is 20MB`);
        toast.error(`File "${file.name}" is too large. Maximum size is 20MB`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = getAuthToken();
      
      // 1. Upload all resource files to S3
      const resourceUrls = await uploadMultipleToS3(newAssignment.resources, 'course-assignments');
      
      // 2. Send assignment data to backend with S3 URLs
      const assignmentData = {
        title: newAssignment.title.trim(),
        description: newAssignment.description || '',
        dueDate: newAssignment.dueDate || null,
        resources: resourceUrls // Array of S3 URLs
      };

      const response = await axios.post(
        `${API_BASE_URL}/course/${course._id}/addAssignment`,
        assignmentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success) {
        const addedAssignment = response.data.data;
        setAssignments(prev => [...prev, addedAssignment]);
        
        // Reset form
        setNewAssignment({
          title: '',
          description: '',
          dueDate: '',
          resources: []
        });
        
        // Show success
        setSuccessMessage('✅ Assignment added successfully!');
        toast.success('Assignment added successfully!');
        setError('');
        
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to add assignment';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error adding assignment:', err);
      
      let errorMessage = 'Failed to add assignment';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Remove Assignment using separate endpoint
  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.delete(
        `${API_BASE_URL}/course/${course._id}/removeAssignment/${assignmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.success) {
        setAssignments(prev => prev.filter(assignment => assignment._id !== assignmentId));
        setSuccessMessage('✅ Assignment removed successfully!');
        toast.success('Assignment removed successfully!');
        
        if (typeof onSuccess === 'function') {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to remove assignment';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error removing assignment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to remove assignment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || isNaN(minutes) || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type) => {
    const iconMap = {
      video: '🎥',
      pdf: '📄',
      ppt: '📊',
      note: '📝'
    };
    return iconMap[type] || '📎';
  };

  // File input accept attribute based on lecture type
  const getFileAcceptAttribute = (type) => {
    const acceptMap = {
      video: 'video/*,.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.m4v',
      pdf: '.pdf',
      ppt: '.ppt,.pptx,.odp,.key',
      note: '.txt,.doc,.docx,.md,.rtf,.pdf'
    };
    return acceptMap[type] || '*/*';
  };

  // File input description based on lecture type
  const getFileDescription = (type) => {
    const descriptionMap = {
      video: 'Video files (MP4, AVI, MOV, WMV, FLV, MKV, WebM) - Max 250MB',
      pdf: 'PDF files - Max 20MB',
      ppt: 'Presentation files (PPT, PPTX, ODP, KEY) - Max 20MB',
      note: 'Text/Document files (TXT, DOC, DOCX, MD, RTF) - Max 5MB'
    };
    return descriptionMap[type] || 'Any file';
  };

  // Handle lecture type change
  const handleLectureTypeChange = (type) => {
    setNewLecture(prev => ({ 
      ...prev, 
      type: type,
      file: null // Clear previously selected file when type changes
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Manage Course Content
            </h2>
            <p className="text-muted-foreground mt-1">
              {course?.title} - Add and manage lectures & assignments
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('lectures')}
              disabled={loading}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 disabled:opacity-50 ${
                activeTab === 'lectures'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📚 Lectures ({lectures.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              disabled={loading}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 disabled:opacity-50 ${
                activeTab === 'assignments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📝 Assignments ({assignments.length})
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 animate-fadeIn">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-fadeIn">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Lectures Tab */}
          {activeTab === 'lectures' && (
            <div className="space-y-6">
              {/* Add Lecture Form */}
              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add New Lecture</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Lecture Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLecture.title}
                      onChange={(e) => setNewLecture(prev => ({ ...prev, title: e.target.value }))}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                      placeholder="Enter lecture title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newLecture.type}
                      onChange={(e) => handleLectureTypeChange(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    >
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="ppt">Presentation</option>
                      <option value="note">Notes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newLecture.duration}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                      placeholder="Duration in minutes (e.g., 45)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Enter duration in minutes
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 p-3 border border-border rounded-lg bg-background w-full">
                      <input
                        type="checkbox"
                        checked={newLecture.isPreviewFree}
                        onChange={(e) => setNewLecture(prev => ({ ...prev, isPreviewFree: e.target.checked }))}
                        disabled={loading}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">Free Preview</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Students can view for free
                      </span>
                    </label>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Lecture File <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({getFileDescription(newLecture.type)})
                    </span>
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      onChange={(e) => setNewLecture(prev => ({ ...prev, file: e.target.files[0] }))}
                      accept={getFileAcceptAttribute(newLecture.type)}
                      disabled={loading}
                      className="hidden"
                      id="lecture-file-upload"
                    />
                    <label
                      htmlFor="lecture-file-upload"
                      className={`cursor-pointer inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors duration-200 ${
                        loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Choose Lecture File
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      {getFileDescription(newLecture.type)}
                    </p>
                  </div>
                  
                  {newLecture.file && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              {newLecture.file.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              Size: {formatFileSize(newLecture.file.size)} • Type: {newLecture.file.type || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewLecture(prev => ({ ...prev, file: null }))}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAddLecture}
                    disabled={loading || !newLecture.title.trim() || !newLecture.file}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Lecture</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lectures List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Existing Lectures ({lectures.length})</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Filter by type:</span>
                    <select
                      value={selectedLectureType}
                      onChange={(e) => setSelectedLectureType(e.target.value)}
                      disabled={loading}
                      className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm disabled:opacity-50"
                    >
                      <option value="all">All Types</option>
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="ppt">Presentation</option>
                      <option value="note">Notes</option>
                    </select>
                  </div>
                </div>
                {lectures.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <div className="text-muted-foreground text-lg mb-4">
                      No lectures added yet.
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add your first lecture using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lectures
                      .filter(lecture => selectedLectureType === 'all' || lecture.type === selectedLectureType)
                      .map((lecture) => (
                      <div key={lecture._id || lecture.title} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <span className="text-2xl">{getFileTypeIcon(lecture.type)}</span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-foreground">{lecture.title}</h4>
                              {lecture.isPreviewFree && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                  Free Preview
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span className="font-medium capitalize">{lecture.type}</span>
                              <span>•</span>
                              <span>Duration: {formatDuration(lecture.duration)}</span>
                              {lecture.createdAt && (
                                <>
                                  <span>•</span>
                                  <span>Added: {formatDate(lecture.createdAt)}</span>
                                </>
                              )}
                            </div>
                            {lecture.url && (
                              <a 
                                href={lecture.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2 inline-flex items-center space-x-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>View/Download File</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveLecture(lecture._id)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors duration-200 ml-4"
                          title="Remove Lecture"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Add Assignment Form */}
              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add New Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Assignment Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                      placeholder="Enter assignment title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                    disabled={loading}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical disabled:opacity-50"
                    placeholder="Enter assignment description and instructions..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Resources <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Multiple files allowed, max 20MB each)
                    </span>
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setNewAssignment(prev => ({ 
                        ...prev, 
                        resources: Array.from(e.target.files) 
                      }))}
                      disabled={loading}
                      className="hidden"
                      id="assignment-files-upload"
                    />
                    <label
                      htmlFor="assignment-files-upload"
                      className={`cursor-pointer inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors duration-200 ${
                        loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Choose Resource Files
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select one or more files (PDF, DOC, PPT, ZIP, etc.)
                    </p>
                  </div>
                  
                  {newAssignment.resources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Selected Files ({newAssignment.resources.length}):
                      </p>
                      {newAssignment.resources.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
                          <div className="flex items-center space-x-3">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm text-blue-800 font-medium">
                                {file.name}
                              </p>
                              <p className="text-xs text-blue-600">
                                {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = [...newAssignment.resources];
                              newFiles.splice(index, 1);
                              setNewAssignment(prev => ({ ...prev, resources: newFiles }));
                            }}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAddAssignment}
                    disabled={loading || !newAssignment.title.trim() || newAssignment.resources.length === 0}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Assignments List */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Existing Assignments ({assignments.length})</h3>
                {assignments.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <div className="text-muted-foreground text-lg mb-4">
                      No assignments added yet.
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add your first assignment using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment._id || assignment.title} className="p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors duration-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-foreground">{assignment.title}</h4>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {assignment.resources?.length || 0} file(s)
                              </span>
                              {assignment.dueDate && new Date(assignment.dueDate) > new Date() && (
                                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                  Due: {formatDate(assignment.dueDate)}
                                </span>
                              )}
                            </div>
                            
                            {assignment.description && (
                              <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
                            )}

                            <div className="flex flex-wrap gap-3 text-sm">
                              {assignment.dueDate && (
                                <div className="flex items-center space-x-1 text-muted-foreground">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Due: {formatDate(assignment.dueDate)}</span>
                                </div>
                              )}
                              {assignment.createdAt && (
                                <div className="flex items-center space-x-1 text-muted-foreground">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Added: {formatDate(assignment.createdAt)}</span>
                                </div>
                              )}
                            </div>
                            
                            {assignment.resources && assignment.resources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-sm font-medium text-foreground mb-2">Resources:</p>
                                <div className="space-y-2">
                                  {assignment.resources.map((resource, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm text-muted-foreground">
                                          {typeof resource === 'string' 
                                            ? resource.split('/').pop() 
                                            : `Resource ${index + 1}`}
                                        </span>
                                      </div>
                                      {typeof resource === 'string' && (
                                        <a 
                                          href={resource} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                                          </svg>
                                          <span>Download</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(assignment._id)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg disabled:opacity-50 ml-4 transition-colors duration-200"
                            title="Remove Assignment"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 disabled:opacity-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentManagementModal;