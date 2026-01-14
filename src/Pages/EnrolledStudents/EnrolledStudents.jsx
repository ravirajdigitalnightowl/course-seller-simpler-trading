// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import DashboardLayout from '../../utils/layout/DashboardLayout';
// import SearchBar from '../../Components/SearchBar';
// import Pagination from '../../Components/Pagination';
// import LoadingSpinner from '../../Components/LoadingSpinner';
// import { toast } from 'react-toastify';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// // User Row Component
// const UserRow = ({ enrollment }) => {
//   const [showStudentModal, setShowStudentModal] = useState(false);

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const getProgressColor = (progress) => {
//     if (progress >= 75) return 'bg-green-500';
//     if (progress >= 50) return 'bg-blue-500';
//     if (progress >= 25) return 'bg-yellow-500';
//     return 'bg-red-500';
//   };

//   const StudentModal = () => (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowStudentModal(false)}>
//       <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
//         <div className="flex items-center justify-between p-6 border-b border-border">
//           <h2 className="text-xl font-bold text-foreground">Student Details</h2>
//           <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-muted rounded-lg">
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>
        
//         <div className="p-6">
//           {/* Student Profile */}
//           <div className="flex items-center space-x-4 mb-6">
//             {enrollment.userProfilePic ? (
//               <img
//                 src={enrollment.userProfilePic}
//                 alt={enrollment.userName}
//                 className="w-16 h-16 rounded-full object-cover"
//                 onError={(e) => {
//                   e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.userName)}&background=random&color=fff`;
//                 }}
//               />
//             ) : (
//               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
//                 <span className="text-white font-bold text-xl">
//                   {enrollment.userName?.charAt(0)?.toUpperCase() || 'U'}
//                 </span>
//               </div>
//             )}
//             <div>
//               <h3 className="text-lg font-bold text-foreground">{enrollment.userName}</h3>
//               <p className="text-muted-foreground">{enrollment.userEmail}</p>
//               <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
//                 enrollment.userRole === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
//                 enrollment.userRole === 'instructor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
//                 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
//               }`}>
//                 {enrollment.userRole?.charAt(0).toUpperCase() + enrollment.userRole?.slice(1) || 'Student'}
//               </span>
//             </div>
//           </div>

//           {/* Important Info Grid */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
//             <div className="space-y-3">
//               <div>
//                 <p className="text-xs text-muted-foreground">USER ID</p>
//                 <p className="text-sm font-medium text-foreground truncate">{enrollment.userId}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">PHONE</p>
//                 <p className="text-sm font-medium text-foreground">{enrollment.userPhone || 'Not provided'}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">ENROLLED DATE</p>
//                 <p className="text-sm font-medium text-foreground">{formatDate(enrollment.enrolledAt)}</p>
//               </div>
//             </div>
            
//             <div className="space-y-3">
//               <div>
//                 <p className="text-xs text-muted-foreground">LAST ACTIVITY</p>
//                 <p className="text-sm font-medium text-foreground">
//                   {enrollment.lastAccessed ? formatDate(enrollment.lastAccessed) : 'Never'}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">ENROLLMENT ID</p>
//                 <p className="text-sm font-medium text-foreground truncate">{enrollment.enrollmentId}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">COURSE ID</p>
//                 <p className="text-sm font-medium text-foreground truncate">{enrollment.courseId}</p>
//               </div>
//             </div>
//           </div>

//           {/* Course Info */}
//           <div className="border-t border-border pt-6">
//             <h4 className="font-semibold text-foreground mb-4">Course Information</h4>
//             <div className="space-y-4">
//               <div className="flex items-start space-x-3">
//                 {enrollment.courseThumbnail ? (
//                   <img
//                     src={enrollment.courseThumbnail}
//                     alt={enrollment.courseTitle}
//                     className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
//                   />
//                 ) : (
//                   <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
//                     <span className="text-white font-bold">
//                       {enrollment.courseTitle?.charAt(0)?.toUpperCase() || 'C'}
//                     </span>
//                   </div>
//                 )}
//                 <div>
//                   <p className="font-medium text-foreground">{enrollment.courseTitle}</p>
//                   <div className="flex flex-wrap gap-1 mt-1">
//                     <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
//                       {enrollment.courseCategory}
//                     </span>
//                     <span className={`text-xs px-2 py-0.5 rounded ${
//                       enrollment.courseLevel === 'Beginner' ? 'bg-green-100 text-green-800' :
//                       enrollment.courseLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
//                       'bg-red-100 text-red-800'
//                     }`}>
//                       {enrollment.courseLevel}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* Progress Section */}
//               <div className="space-y-2">
//                 <div className="flex justify-between items-center">
//                   <p className="text-sm text-muted-foreground">Progress</p>
//                   <span className="text-sm font-bold text-foreground">{enrollment.progress}%</span>
//                 </div>
//                 <div className="w-full bg-muted rounded-full h-2">
//                   <div 
//                     className={`h-2 rounded-full ${getProgressColor(enrollment.progress)} transition-all duration-500`}
//                     style={{ width: `${enrollment.progress}%` }}
//                   />
//                 </div>
//                 <p className="text-xs text-muted-foreground">
//                   {enrollment.completedLectures} lectures completed
//                 </p>
//               </div>

//               {/* Course Duration & Price */}
//               <div className="grid grid-cols-2 gap-4 pt-2">
//                 <div>
//                   <p className="text-xs text-muted-foreground">DURATION</p>
//                   <p className="text-sm font-medium text-foreground">{enrollment.courseDuration} minutes</p>
//                 </div>
//                 <div>
//                   <p className="text-xs text-muted-foreground">PRICE</p>
//                   <p className="text-sm font-medium text-foreground">
//                     {enrollment.coursePrice === 0 ? 'Free' : `$${enrollment.coursePrice}`}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <>
//       <tr className="border-b border-border hover:bg-muted/30 transition-colors duration-150">
//         {/* User Info */}
//         <td className="py-4 px-4">
//           <div className="flex items-center space-x-3">
//             {enrollment.userProfilePic ? (
//               <img
//                 src={enrollment.userProfilePic}
//                 alt={enrollment.userName}
//                 className="w-10 h-10 rounded-full object-cover"
//                 onError={(e) => {
//                   e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.userName)}&background=random&color=fff`;
//                 }}
//               />
//             ) : (
//               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
//                 <span className="text-white font-bold text-sm">
//                   {enrollment.userName?.charAt(0)?.toUpperCase() || 'U'}
//                 </span>
//               </div>
//             )}
//             <div>
//               <h4 className="font-medium text-foreground">{enrollment.userName}</h4>
//               <p className="text-sm text-muted-foreground">{enrollment.userEmail}</p>
//             </div>
//           </div>
//         </td>

//         {/* Course Info */}
//         <td className="py-4 px-4">
//           <div className="flex items-center space-x-3">
//             {enrollment.courseThumbnail ? (
//               <img
//                 src={enrollment.courseThumbnail}
//                 alt={enrollment.courseTitle}
//                 className="w-10 h-10 rounded-lg object-cover"
//               />
//             ) : (
//               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
//                 <span className="text-white font-bold text-sm">
//                   {enrollment.courseTitle?.charAt(0)?.toUpperCase() || 'C'}
//                 </span>
//               </div>
//             )}
//             <div>
//               <p className="font-medium text-foreground">{enrollment.courseTitle}</p>
//               <div className="flex items-center gap-2 mt-1">
//                 <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
//                   {enrollment.courseCategory}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </td>

//         {/* Enrollment Date */}
//         <td className="py-4 px-4">
//           <span className="text-sm text-foreground">{formatDate(enrollment.enrolledAt)}</span>
//         </td>

//         {/* Progress */}
//         <td className="py-4 px-4">
//           <div className="space-y-1">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-foreground">{enrollment.progress}%</span>
//               <span className="text-xs text-muted-foreground">{enrollment.completedLectures} lectures</span>
//             </div>
//             <div className="w-full bg-muted rounded-full h-2">
//               <div 
//                 className={`h-2 rounded-full ${getProgressColor(enrollment.progress)} transition-all duration-500`}
//                 style={{ width: `${enrollment.progress}%` }}
//               />
//             </div>
//           </div>
//         </td>

//         {/* Last Accessed */}
//         <td className="py-4 px-4">
//           <span className="text-sm text-foreground">
//             {enrollment.lastAccessed ? formatDate(enrollment.lastAccessed) : 'Never'}
//           </span>
//         </td>

//         {/* Actions - Only View Button */}
//         <td className="py-4 px-4">
//           <button
//             onClick={() => setShowStudentModal(true)}
//             className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm flex items-center space-x-1"
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//             </svg>
//             <span>View</span>
//           </button>
//         </td>
//       </tr>

//       {/* Student Details Modal */}
//       {showStudentModal && <StudentModal />}
//     </>
//   );
// };

// // Stats Card Component
// const StatsCard = ({ title, value, icon, color, description }) => {
//   const colorMap = {
//     blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/20', darkBorder: 'dark:border-blue-800', darkText: 'dark:text-blue-400' },
//     green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', darkBg: 'dark:bg-green-900/20', darkBorder: 'dark:border-green-800', darkText: 'dark:text-green-400' },
//     purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', darkBg: 'dark:bg-purple-900/20', darkBorder: 'dark:border-purple-800', darkText: 'dark:text-purple-400' },
//     yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', darkBg: 'dark:bg-yellow-900/20', darkBorder: 'dark:border-yellow-800', darkText: 'dark:text-yellow-400' }
//   };

//   const currentColor = colorMap[color] || colorMap.blue;

//   return (
//     <div className={`${currentColor.bg} ${currentColor.darkBg} border ${currentColor.border} ${currentColor.darkBorder} rounded-xl p-4 sm:p-6`}>
//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-sm text-muted-foreground">{title}</p>
//           <p className={`text-2xl sm:text-3xl font-bold ${currentColor.text} ${currentColor.darkText} mt-1`}>{value}</p>
//           {description && (
//             <p className="text-xs text-muted-foreground mt-2">{description}</p>
//           )}
//         </div>
//         <div className={`${currentColor.text} ${currentColor.darkText}`}>
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// };

// // All Enrollments Page
// const EnrolledStudents = () => {
//   const [enrollments, setEnrollments] = useState([]);
//   const [filteredEnrollments, setFilteredEnrollments] = useState([]);
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [filters, setFilters] = useState({
//     course: '',
//     progress: '',
//     sortBy: 'enrolledAt'
//   });
//   const [stats, setStats] = useState({
//     totalCourses: 0,
//     totalEnrollments: 0,
//     totalUniqueStudents: 0,
//     averageEnrollmentsPerCourse: 0,
//     enrollmentByLevel: {
//       beginner: 0,
//       intermediate: 0,
//       advanced: 0
//     }
//   });

//   const itemsPerPage = 10;

//   // Get auth token
//   const getAuthToken = () => {
//     return localStorage.getItem('token');
//   };

//   // Fetch all enrollments data
//   const fetchAllEnrollments = async () => {
//     try {
//       setLoading(true);
//       setError('');
      
//       const token = getAuthToken();
      
//       // Fetch all enrollments
//       const response = await axios.get(`${API_BASE_URL}/course/all-enrollments`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
      
//       if (response.data?.success) {
//         const data = response.data.data;
//         const enrollmentsData = data.enrollments || [];
        
//         setEnrollments(enrollmentsData);
//         setFilteredEnrollments(enrollmentsData);
//         setStats(data.stats || {});
//         setCourses(data.courses || []);
//         setTotalPages(Math.ceil(enrollmentsData.length / itemsPerPage));
//       } else {
//         setError('Failed to fetch enrollment data');
//       }
//     } catch (err) {
//       console.error('Error fetching enrollments:', err);
//       setError(err.response?.data?.message || 'Failed to fetch enrollment data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllEnrollments();
//   }, []);

//   // Handle search and filtering
//   useEffect(() => {
//     let filtered = [...enrollments];

//     // Search filter
//     if (searchTerm) {
//       const searchLower = searchTerm.toLowerCase();
//       filtered = filtered.filter(enrollment =>
//         enrollment.userName?.toLowerCase().includes(searchLower) ||
//         enrollment.userEmail?.toLowerCase().includes(searchLower) ||
//         enrollment.courseTitle?.toLowerCase().includes(searchLower) ||
//         enrollment.courseCategory?.toLowerCase().includes(searchLower)
//       );
//     }

//     // Course filter
//     if (filters.course) {
//       filtered = filtered.filter(enrollment => enrollment.courseId === filters.course);
//     }

//     // Progress filter
//     if (filters.progress) {
//       switch (filters.progress) {
//         case 'high':
//           filtered = filtered.filter(enrollment => enrollment.progress >= 75);
//           break;
//         case 'medium':
//           filtered = filtered.filter(enrollment => enrollment.progress >= 25 && enrollment.progress < 75);
//           break;
//         case 'low':
//           filtered = filtered.filter(enrollment => enrollment.progress < 25);
//           break;
//       }
//     }

//     // Sort
//     filtered.sort((a, b) => {
//       switch (filters.sortBy) {
//         case 'enrolledAt':
//           return new Date(b.enrolledAt) - new Date(a.enrolledAt);
//         case 'progress':
//           return b.progress - a.progress;
//         case 'userName':
//           return a.userName.localeCompare(b.userName);
//         case 'courseTitle':
//           return a.courseTitle.localeCompare(b.courseTitle);
//         default:
//           return 0;
//       }
//     });

//     setFilteredEnrollments(filtered);
//     setTotalPages(Math.ceil(filtered.length / itemsPerPage));
//     setCurrentPage(1);
//   }, [searchTerm, filters, enrollments]);

//   // Get current page enrollments
//   const getCurrentPageEnrollments = () => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     return filteredEnrollments.slice(startIndex, endIndex);
//   };

//   const currentEnrollments = getCurrentPageEnrollments();

//   return (
//     <DashboardLayout activePage="/enrolled">
//       <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//           <div>
//             <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Course Enrollments</h1>
//             <p className="text-muted-foreground mt-1 text-sm sm:text-base">
//               View all student enrollments across all courses
//             </p>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatsCard
//             title="Total Courses"
//             value={stats.totalCourses}
//             icon={
//               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
//               </svg>
//             }
//             color="blue"
//           />

//           <StatsCard
//             title="Total Enrollments"
//             value={stats.totalEnrollments}
//             icon={
//               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//               </svg>
//             }
//             color="green"
//           />

//           <StatsCard
//             title="Unique Students"
//             value={stats.totalUniqueStudents}
//             icon={
//               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a4 4 0 110 5.292m0 0H9m13 0v1a6 6 0 01-12 0v-1m0 0H3" />
//               </svg>
//             }
//             color="purple"
//           />

//           <StatsCard
//             title="Avg. per Course"
//             value={stats.averageEnrollmentsPerCourse}
//             icon={
//               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//               </svg>
//             }
//             color="yellow"
//           />
//         </div>

//         {/* Search and Filters */}
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//           {/* Search Bar */}
//           <div className="lg:col-span-2">
//             <SearchBar 
//               onSearch={setSearchTerm}
//               placeholder="Search by student name, email, or course..."
//               variant="default"
//               size="md"
//             />
//           </div>

//           {/* Course Filter */}
//           <div>
//             <select
//               value={filters.course}
//               onChange={(e) => setFilters({...filters, course: e.target.value})}
//               className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">All Courses</option>
//               {courses.map(course => (
//                 <option key={course._id} value={course._id}>
//                   {course.title}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Sort Filter */}
//           <div>
//             <select
//               value={filters.sortBy}
//               onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
//               className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="enrolledAt">Sort by: Recent</option>
//               <option value="progress">Sort by: Progress</option>
//               <option value="userName">Sort by: Student Name</option>
//               <option value="courseTitle">Sort by: Course Title</option>
//             </select>
//           </div>
//         </div>

//         {/* Progress Filter */}
//         <div className="flex flex-wrap gap-2">
//           <button
//             onClick={() => setFilters({...filters, progress: ''})}
//             className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
//               !filters.progress 
//                 ? 'bg-blue-600 text-white' 
//                 : 'bg-muted text-foreground hover:bg-muted/80'
//             }`}
//           >
//             All Progress
//           </button>
//           <button
//             onClick={() => setFilters({...filters, progress: 'high'})}
//             className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
//               filters.progress === 'high' 
//                 ? 'bg-green-600 text-white' 
//                 : 'bg-muted text-foreground hover:bg-muted/80'
//             }`}
//           >
//             High (≥75%)
//           </button>
//           <button
//             onClick={() => setFilters({...filters, progress: 'medium'})}
//             className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
//               filters.progress === 'medium' 
//                 ? 'bg-yellow-600 text-white' 
//                 : 'bg-muted text-foreground hover:bg-muted/80'
//             }`}
//           >
//             Medium (25-75%)
//           </button>
//           <button
//             onClick={() => setFilters({...filters, progress: 'low'})}
//             className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
//               filters.progress === 'low' 
//                 ? 'bg-red-600 text-white' 
//                 : 'bg-muted text-foreground hover:bg-muted/80'
//             }`}
//           >
//             Low ({'<'}25%)
//           </button>
//         </div>

//         {/* Error Message */}
//         {error && (
//           <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 flex items-center justify-between">
//             <span>{error}</span>
//             <button 
//               onClick={() => setError('')}
//               className="text-red-500 hover:text-red-700"
//             >
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         )}

//         {/* Loading State */}
//         {loading ? (
//           <div className="flex items-center justify-center min-h-96">
//             <div className="text-center">
//               <LoadingSpinner size="lg" />
//               <p className="text-muted-foreground mt-4">Loading all enrollments...</p>
//             </div>
//           </div>
//         ) : (
//           <>
//             {/* Enrollments Table */}
//             {currentEnrollments.length > 0 ? (
//               <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/50">
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Student</th>
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Course</th>
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Enrolled Date</th>
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Progress</th>
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Last Accessed</th>
//                         <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {currentEnrollments.map((enrollment, index) => (
//                         <UserRow
//                           key={`${enrollment.courseId}-${enrollment.userId}-${index}`}
//                           enrollment={enrollment}
//                         />
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 {/* Pagination */}
//                 {filteredEnrollments.length > itemsPerPage && (
//                   <div className="p-4 border-t border-border">
//                     <Pagination
//                       currentPage={currentPage}
//                       totalPages={totalPages}
//                       onPageChange={setCurrentPage}
//                       variant="default"
//                       size="md"
//                       showPageInfo={true}
//                     />
//                   </div>
//                 )}
//               </div>
//             ) : (
//               /* Empty State */
//               <div className="text-center py-12 sm:py-16 border-2 border-dashed border-border rounded-xl bg-card">
//                 <div className="max-w-md mx-auto">
//                   <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
//                     <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-xl font-bold text-foreground mb-2">
//                     {searchTerm || filters.course || filters.progress 
//                       ? 'No enrollments found' 
//                       : 'No enrollments yet'}
//                   </h3>
//                   <p className="text-muted-foreground mb-6">
//                     {searchTerm || filters.course || filters.progress
//                       ? 'Try adjusting your search or filters'
//                       : 'Students will appear here once they enroll in courses'}
//                   </p>
//                   {(searchTerm || filters.course || filters.progress) && (
//                     <button
//                       onClick={() => {
//                         setSearchTerm('');
//                         setFilters({
//                           course: '',
//                           progress: '',
//                           sortBy: 'enrolledAt'
//                         });
//                       }}
//                       className="bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors duration-200"
//                     >
//                       Clear Filters
//                     </button>
//                   )}
//                 </div>
//               </div>
//             )}

//             {/* Summary Info */}
//             {filteredEnrollments.length > 0 && (
//               <div className="text-sm text-muted-foreground">
//                 Showing {currentEnrollments.length} of {filteredEnrollments.length} enrollments
//                 {searchTerm && ` matching "${searchTerm}"`}
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default EnrolledStudents;








import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../utils/layout/DashboardLayout';
import SearchBar from '../../Components/SearchBar';
import Pagination from '../../Components/Pagination';
import LoadingSpinner from '../../Components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// User Row Component
const UserRow = ({ enrollment }) => {
  const [showStudentModal, setShowStudentModal] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const StudentModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowStudentModal(false)}>
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Student Details</h2>
          <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-muted rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Student Profile */}
          <div className="flex items-center space-x-4 mb-6">
            {enrollment.userProfilePic ? (
              <img
                src={enrollment.userProfilePic}
                alt={enrollment.userName}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.userName)}&background=random&color=fff`;
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {enrollment.userName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">{enrollment.userName}</h3>
              <p className="text-muted-foreground">{enrollment.userEmail}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                enrollment.userRole === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                enrollment.userRole === 'instructor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              }`}>
                {enrollment.userRole?.charAt(0).toUpperCase() + enrollment.userRole?.slice(1) || 'Student'}
              </span>
            </div>
          </div>

          {/* Important Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">USER ID</p>
                <p className="text-sm font-medium text-foreground truncate">{enrollment.userId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PHONE</p>
                <p className="text-sm font-medium text-foreground">{enrollment.userPhone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ENROLLED DATE</p>
                <p className="text-sm font-medium text-foreground">{formatDate(enrollment.enrolledAt)}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">LAST ACTIVITY</p>
                <p className="text-sm font-medium text-foreground">
                  {enrollment.lastAccessed ? formatDate(enrollment.lastAccessed) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ENROLLMENT ID</p>
                <p className="text-sm font-medium text-foreground truncate">{enrollment.enrollmentId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">COURSE ID</p>
                <p className="text-sm font-medium text-foreground truncate">{enrollment.courseId}</p>
              </div>
            </div>
          </div>

          {/* Course Info */}
          <div className="border-t border-border pt-6">
            <h4 className="font-semibold text-foreground mb-4">Course Information</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                {enrollment.courseThumbnail ? (
                  <img
                    src={enrollment.courseThumbnail}
                    alt={enrollment.courseTitle}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">
                      {enrollment.courseTitle?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{enrollment.courseTitle}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {enrollment.courseCategory}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      enrollment.courseLevel === 'Beginner' ? 'bg-green-100 text-green-800' :
                      enrollment.courseLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {enrollment.courseLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <span className="text-sm font-bold text-foreground">{enrollment.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(enrollment.progress)} transition-all duration-500`}
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {enrollment.completedLectures} lectures completed
                </p>
              </div>

              {/* Course Duration & Price */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">DURATION</p>
                  <p className="text-sm font-medium text-foreground">{enrollment.courseDuration} minutes</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PRICE</p>
                  <p className="text-sm font-medium text-foreground">
                    {enrollment.coursePrice === 0 ? 'Free' : `$${enrollment.coursePrice}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors duration-150">
        {/* User Info */}
        <td className="py-4 px-4">
          <div className="flex items-center space-x-3">
            {enrollment.userProfilePic ? (
              <img
                src={enrollment.userProfilePic}
                alt={enrollment.userName}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.userName)}&background=random&color=fff`;
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {enrollment.userName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div>
              <h4 className="font-medium text-foreground">{enrollment.userName}</h4>
              <p className="text-sm text-muted-foreground">{enrollment.userEmail}</p>
            </div>
          </div>
        </td>

        {/* Course Info */}
        <td className="py-4 px-4">
          <div className="flex items-center space-x-3">
            {enrollment.courseThumbnail ? (
              <img
                src={enrollment.courseThumbnail}
                alt={enrollment.courseTitle}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {enrollment.courseTitle?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{enrollment.courseTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {enrollment.courseCategory}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* Enrollment Date */}
        <td className="py-4 px-4">
          <span className="text-sm text-foreground">{formatDate(enrollment.enrolledAt)}</span>
        </td>

        {/* Progress */}
        <td className="py-4 px-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{enrollment.progress}%</span>
              <span className="text-xs text-muted-foreground">{enrollment.completedLectures} lectures</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressColor(enrollment.progress)} transition-all duration-500`}
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
          </div>
        </td>

        {/* Last Accessed */}
        <td className="py-4 px-4">
          <span className="text-sm text-foreground">
            {enrollment.lastAccessed ? formatDate(enrollment.lastAccessed) : 'Never'}
          </span>
        </td>

        {/* Actions - Only View Button */}
        <td className="py-4 px-4">
          <button
            onClick={() => setShowStudentModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View</span>
          </button>
        </td>
      </tr>

      {/* Student Details Modal */}
      {showStudentModal && <StudentModal />}
    </>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, description }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/20', darkBorder: 'dark:border-blue-800', darkText: 'dark:text-blue-400' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', darkBg: 'dark:bg-green-900/20', darkBorder: 'dark:border-green-800', darkText: 'dark:text-green-400' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', darkBg: 'dark:bg-purple-900/20', darkBorder: 'dark:border-purple-800', darkText: 'dark:text-purple-400' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', darkBg: 'dark:bg-yellow-900/20', darkBorder: 'dark:border-yellow-800', darkText: 'dark:text-yellow-400' }
  };

  const currentColor = colorMap[color] || colorMap.blue;

  return (
    <div className={`${currentColor.bg} ${currentColor.darkBg} border ${currentColor.border} ${currentColor.darkBorder} rounded-xl p-4 sm:p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${currentColor.text} ${currentColor.darkText} mt-1`}>{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <div className={`${currentColor.text} ${currentColor.darkText}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// All Enrollments Page
const EnrolledStudents = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const {token,logout} = useAuth();
  const [filters, setFilters] = useState({
    course: '',
    progress: '',
    sortBy: 'enrolledAt'
  });
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalEnrollments: 0,
    totalUniqueStudents: 0,
    averageEnrollmentsPerCourse: 0,
    enrollmentByLevel: {
      beginner: 0,
      intermediate: 0,
      advanced: 0
    }
  });

  const itemsPerPage = 10;



  // Fetch all enrollments data
  const fetchAllEnrollments = async () => {
    try {
      setLoading(true);
      setError('');
            
      // Fetch all enrollments
      const response = await axios.get(`${API_BASE_URL}/course/all-enrollments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data?.success) {
        const data = response.data.data;
        const enrollmentsData = data.enrollments || [];
        
        setEnrollments(enrollmentsData);
        setFilteredEnrollments(enrollmentsData);
        setStats(data.stats || {});
        setCourses(data.courses || []);
        setTotalPages(Math.ceil(enrollmentsData.length / itemsPerPage));
      } else {
        setError('Failed to fetch enrollment data');
      }
    } 
    
    catch (err) {

      if (err.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection.');
        setError('Request timeout.');
        return;
      }

      // 🌐 Network
      if (!err.response) {
        toast.error('Network error. Please check your internet.');
        setError('Network error.');
        return;
      }
         if (err.response.status === 401 || err.response.status === 403) {
        toast.error(
          err.response.status === 401
            ? 'Session expired. Please login again.'
            : 'Access denied. Please login again.',
          {
            autoClose: 3000, // यह जरूरी है
            onClose: () => {
              logout?.();
              navigate('/signin');
            }
          }
        );
        return;
      }

       const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to load courses';

      setError(msg);
      toast.error(msg);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEnrollments();
  }, []);

  // Handle search and filtering
  useEffect(() => {
    let filtered = [...enrollments];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(enrollment =>
        enrollment.userName?.toLowerCase().includes(searchLower) ||
        enrollment.userEmail?.toLowerCase().includes(searchLower) ||
        enrollment.courseTitle?.toLowerCase().includes(searchLower) ||
        enrollment.courseCategory?.toLowerCase().includes(searchLower)
      );
    }

    // Course filter
    if (filters.course) {
      filtered = filtered.filter(enrollment => enrollment.courseId === filters.course);
    }

    // Progress filter
    if (filters.progress) {
      switch (filters.progress) {
        case 'high':
          filtered = filtered.filter(enrollment => enrollment.progress >= 75);
          break;
        case 'medium':
          filtered = filtered.filter(enrollment => enrollment.progress >= 25 && enrollment.progress < 75);
          break;
        case 'low':
          filtered = filtered.filter(enrollment => enrollment.progress < 25);
          break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'enrolledAt':
          return new Date(b.enrolledAt) - new Date(a.enrolledAt);
        case 'progress':
          return b.progress - a.progress;
        case 'userName':
          return a.userName.localeCompare(b.userName);
        case 'courseTitle':
          return a.courseTitle.localeCompare(b.courseTitle);
        default:
          return 0;
      }
    });

    setFilteredEnrollments(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  }, [searchTerm, filters, enrollments]);

  // Get current page enrollments
  const getCurrentPageEnrollments = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEnrollments.slice(startIndex, endIndex);
  };

  const currentEnrollments = getCurrentPageEnrollments();

  return (
    <DashboardLayout activePage="/enrolled">
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Course Enrollments</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              View all student enrollments across all courses
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Courses"
            value={stats.totalCourses}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            color="blue"
          />

          <StatsCard
            title="Total Enrollments"
            value={stats.totalEnrollments}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="green"
          />

          <StatsCard
            title="Unique Students"
            value={stats.totalUniqueStudents}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a4 4 0 110 5.292m0 0H9m13 0v1a6 6 0 01-12 0v-1m0 0H3" />
              </svg>
            }
            color="purple"
          />

          <StatsCard
            title="Avg. per Course"
            value={stats.averageEnrollmentsPerCourse}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="yellow"
          />
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <SearchBar 
              onSearch={setSearchTerm}
              placeholder="Search by student name, email, or course..."
              variant="default"
              size="md"
            />
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={filters.course}
              onChange={(e) => setFilters({...filters, course: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="enrolledAt">Sort by: Recent</option>
              <option value="progress">Sort by: Progress</option>
              <option value="userName">Sort by: Student Name</option>
              <option value="courseTitle">Sort by: Course Title</option>
            </select>
          </div>
        </div>

        {/* Progress Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters({...filters, progress: ''})}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              !filters.progress 
                ? 'bg-blue-600 text-white' 
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            All Progress
          </button>
          <button
            onClick={() => setFilters({...filters, progress: 'high'})}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filters.progress === 'high' 
                ? 'bg-green-600 text-white' 
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            High (≥75%)
          </button>
          <button
            onClick={() => setFilters({...filters, progress: 'medium'})}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filters.progress === 'medium' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Medium (25-75%)
          </button>
          <button
            onClick={() => setFilters({...filters, progress: 'low'})}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filters.progress === 'low' 
                ? 'bg-red-600 text-white' 
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Low ({'<'}25%)
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground mt-4">Loading all enrollments...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Enrollments Table */}
            {currentEnrollments.length > 0 ? (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Student</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Course</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Enrolled Date</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Progress</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Last Accessed</th>
                        <th className="text-left py-4 px-4 font-semibold text-foreground text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEnrollments.map((enrollment, index) => (
                        <UserRow
                          key={`${enrollment.courseId}-${enrollment.userId}-${index}`}
                          enrollment={enrollment}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredEnrollments.length > itemsPerPage && (
                  <div className="p-4 border-t border-border">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      variant="default"
                      size="md"
                      showPageInfo={true}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12 sm:py-16 border-2 border-dashed border-border rounded-xl bg-card">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {searchTerm || filters.course || filters.progress 
                      ? 'No enrollments found' 
                      : 'No enrollments yet'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filters.course || filters.progress
                      ? 'Try adjusting your search or filters'
                      : 'Students will appear here once they enroll in courses'}
                  </p>
                  {(searchTerm || filters.course || filters.progress) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({
                          course: '',
                          progress: '',
                          sortBy: 'enrolledAt'
                        });
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Summary Info */}
            {filteredEnrollments.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {currentEnrollments.length} of {filteredEnrollments.length} enrollments
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnrolledStudents;