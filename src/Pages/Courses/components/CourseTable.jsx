// import React from 'react';

// const CourseTable = ({ courses, onEdit, onDelete, onView, onManageContent, onManageLiveClasses, loading }) => {
//   const formatDuration = (minutes) => {
//     if (!minutes || isNaN(minutes)) return 'N/A';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//   };

//   const formatPrice = (price) => {
//     if (price === 0 || price === '0') return 'Free';
//     return `$${Number(price).toFixed(2)}`;
//   };

//   const getLevelBadgeColor = (level) => {
//     const levelMap = {
//       beginner: 'green',
//       intermediate: 'yellow',
//       advanced: 'red',
//       expert: 'purple'
//     };
//     return levelMap[level?.toLowerCase()] || 'gray';
//   };

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full">
//         <thead>
//           <tr className="border-b border-border bg-muted/50">
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Course</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden md:table-cell">Category</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden lg:table-cell">Level</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden sm:table-cell">Price</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden xl:table-cell">Duration</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-border">
//           {courses.map((course) => (
//             <tr 
//               key={course._id} 
//               className="hover:bg-muted/30 transition-colors duration-150 group"
//             >
//               {/* Course Info */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-start space-x-3 sm:space-x-4">
//                   {course.thumbnail ? (
//                     <img
//                       src={course.thumbnail}
//                       alt={course.title}
//                       className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
//                       onError={(e) => {
//                         e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.title)}&background=random`;
//                       }}
//                     />
//                   ) : (
//                     <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
//                       <span className="text-white font-bold text-sm">
//                         {course.title?.charAt(0)?.toUpperCase() || 'C'}
//                       </span>
//                     </div>
//                   )}
//                   <div className="min-w-0 flex-1">
//                     <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
//                       {course.title || 'Untitled Course'}
//                     </h3>
//                     <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
//                       <p className="text-xs text-muted-foreground truncate sm:hidden">
//                         {course.category} • {formatPrice(course.price)}
//                       </p>
//                       <p className="text-xs text-muted-foreground hidden sm:block">
//                         {course.description?.substring(0, 70) || 'No description available'}...
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-2 mt-1">
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.lectures?.length > 0 
//                           ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         📚 {course.lectures?.length || 0} lectures
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.assignments?.length > 0 
//                           ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         📝 {course.assignments?.length || 0} assignments
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.liveClasses?.length > 0 
//                           ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         🔴 {course.liveClasses?.length || 0} live
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </td>

//               {/* Category */}
//               <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 capitalize">
//                   {course.category || 'Uncategorized'}
//                 </span>
//               </td>

//               {/* Level */}
//               <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
//                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
//                   ${getLevelBadgeColor(course.level) === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
//                   ${getLevelBadgeColor(course.level) === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
//                   ${getLevelBadgeColor(course.level) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
//                   ${getLevelBadgeColor(course.level) === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : ''}
//                   ${getLevelBadgeColor(course.level) === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' : ''}
//                 `}>
//                   {course.level?.toLowerCase() || 'beginner'}
//                 </span>
//               </td>

//               {/* Price */}
//               <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
//                 <span className={`font-semibold text-sm ${
//                   course.price === 0 || course.price === '0' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
//                 }`}>
//                   {formatPrice(course.price)}
//                 </span>
//               </td>

//               {/* Duration */}
//               <td className="py-4 px-4 sm:px-6 hidden xl:table-cell">
//                 <span className="text-muted-foreground text-sm">
//                   {course.duration} days
//                 </span>
//               </td>

//               {/* Actions */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-center justify-start sm:justify-center space-x-1 sm:space-x-2">
//                   {/* View Button */}
//                   <button
//                     onClick={() => onView(course)}
//                     className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 dark:text-gray-400 dark:hover:bg-gray-800"
//                     title="View course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   </button>

//                   {/* Live Classes Button */}
//                   <button
//                     onClick={() => onManageLiveClasses(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 dark:hover:bg-red-900/20"
//                     title="Manage live classes"
//                   >
//                     <span className="text-sm">🔴</span>
//                   </button>

//                   {/* Manage Content Button */}
//                   <button
//                     onClick={() => onManageContent(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200 disabled:opacity-50 dark:hover:bg-purple-900/20"
//                     title="Manage lectures & assignments"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </button>

//                   {/* Edit Button */}
//                   <button
//                     onClick={() => onEdit(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 dark:hover:bg-blue-900/20"
//                     title="Edit course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                     </svg>
//                   </button>

//                   {/* Delete Button */}
//                   <button
//                     onClick={() => onDelete(course._id)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 dark:hover:bg-red-900/20"
//                     title="Delete course"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                     </svg>
//                   </button>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default CourseTable;





// import React from 'react';

// const CourseTable = ({ courses, onEdit, onDelete, onView, onManageContent, onManageLiveClasses, loading }) => {
//   const formatDuration = (minutes) => {
//     if (!minutes || isNaN(minutes)) return 'N/A';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//   };

//   const formatPrice = (price) => {
//     if (price === 0 || price === '0') return 'Free';
//     return `$${Number(price).toFixed(2)}`;
//   };

//   const getLevelBadgeColor = (level) => {
//     const levelMap = {
//       beginner: 'green',
//       intermediate: 'yellow',
//       advanced: 'red',
//       expert: 'purple'
//     };
//     return levelMap[level?.toLowerCase()] || 'gray';
//   };

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full">
//         <thead>
//           <tr className="border-b border-border bg-muted/50">
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Course</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden md:table-cell">Category</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden lg:table-cell">Level</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden sm:table-cell">Price</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden xl:table-cell">Duration</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-border">
//           {courses.map((course) => (
//             <tr 
//               key={course._id} 
//               className="hover:bg-muted/30 group"
//             >
//               {/* Course Info */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-start space-x-3 sm:space-x-4">
//                   {course.thumbnail ? (
//                     <img
//                       src={course.thumbnail}
//                       alt={course.title}
//                       className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
//                       onError={(e) => {
//                         e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.title)}&background=random`;
//                       }}
//                     />
//                   ) : (
//                     <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
//                       <span className="text-white font-bold text-sm">
//                         {course.title?.charAt(0)?.toUpperCase() || 'C'}
//                       </span>
//                     </div>
//                   )}
//                   <div className="min-w-0 flex-1">
//                     <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
//                       {course.title || 'Untitled Course'}
//                     </h3>
//                     <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
//                       <p className="text-xs text-muted-foreground truncate sm:hidden">
//                         {course.category} • {formatPrice(course.price)}
//                       </p>
//                       <p className="text-xs text-muted-foreground hidden sm:block">
//                         {course.description?.substring(0, 70) || 'No description available'}...
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-2 mt-1">
//                       <span className={`text-xs px-1.5 py-0.5 rounded border border-border ${
//                         course.lectures?.length > 0 
//                           ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'
//                       }`}>
//                         📚 {course.lectures?.length || 0} lectures
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded border border-border ${
//                         course.assignments?.length > 0 
//                           ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'
//                       }`}>
//                         📝 {course.assignments?.length || 0} assignments
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded border border-border ${
//                         course.liveClasses?.length > 0 
//                           ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'
//                       }`}>
//                         🔴 {course.liveClasses?.length || 0} live
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </td>

//               {/* Category */}
//               <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 capitalize">
//                   {course.category || 'Uncategorized'}
//                 </span>
//               </td>

//               {/* Level */}
//               <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
//                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border
//                   ${getLevelBadgeColor(course.level) === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800' : ''}
//                   ${getLevelBadgeColor(course.level) === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800' : ''}
//                   ${getLevelBadgeColor(course.level) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800' : ''}
//                   ${getLevelBadgeColor(course.level) === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800' : ''}
//                   ${getLevelBadgeColor(course.level) === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700' : ''}
//                 `}>
//                   {course.level?.toLowerCase() || 'beginner'}
//                 </span>
//               </td>

//               {/* Price */}
//               <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
//                 <span className={`font-semibold text-sm ${
//                   course.price === 0 || course.price === '0' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
//                 }`}>
//                   {formatPrice(course.price)}
//                 </span>
//               </td>

//               {/* Duration */}
//               <td className="py-4 px-4 sm:px-6 hidden xl:table-cell">
//                 <span className="text-muted-foreground text-sm">
//                   {course.duration} days
//                 </span>
//               </td>

//               {/* Actions */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-center justify-start sm:justify-center space-x-1 sm:space-x-2">
//                   {/* View Button */}
//                   <button
//                     onClick={() => onView(course)}
//                     className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg dark:hover:bg-accent/50"
//                     title="View course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   </button>

//                   {/* Live Classes Button */}
//                   <button
//                     onClick={() => onManageLiveClasses(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
//                     title="Manage live classes"
//                   >
//                     <span className="text-sm">🔴</span>
//                   </button>

//                   {/* Manage Content Button */}
//                   <button
//                     onClick={() => onManageContent(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50"
//                     title="Manage lectures & assignments"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </button>

//                   {/* Edit Button */}
//                   <button
//                     onClick={() => onEdit(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
//                     title="Edit course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                     </svg>
//                   </button>

//                   {/* Delete Button */}
//                   <button
//                     onClick={() => onDelete(course._id)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
//                     title="Delete course"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                     </svg>
//                   </button>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default CourseTable;



// import React from 'react';

// const CourseTable = ({ courses, onEdit, onDelete, onView, onManageContent, onManageLiveClasses, loading }) => {
//   const formatDuration = (minutes) => {
//     if (!minutes || isNaN(minutes)) return 'N/A';
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
//   };

//   const formatPrice = (price) => {
//     if (price === 0 || price === '0') return 'Free';
//     return `$${Number(price).toFixed(2)}`;
//   };

//   const getLevelBadgeColor = (level) => {
//     const levelMap = {
//       beginner: 'green',
//       intermediate: 'yellow',
//       advanced: 'red',
//       expert: 'purple'
//     };
//     return levelMap[level?.toLowerCase()] || 'gray';
//   };

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full">
//         <thead>
//           <tr className="border-b border-border bg-muted/50">
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Course</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden md:table-cell">Category</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden lg:table-cell">Level</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden sm:table-cell">Price</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden xl:table-cell">Duration</th>
//             <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-border">
//           {courses.map((course) => (
//             <tr 
//               key={course._id} 
//               className="hover:bg-muted/30 group"
//             >
//               {/* Course Info */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-start space-x-3 sm:space-x-4">
//                   {course.thumbnail ? (
//                     <img
//                       src={course.thumbnail}
//                       alt={course.title}
//                       className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
//                       onError={(e) => {
//                         e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.title)}&background=random`;
//                       }}
//                     />
//                   ) : (
//                     <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
//                       <span className="text-white font-bold text-sm">
//                         {course.title?.charAt(0)?.toUpperCase() || 'C'}
//                       </span>
//                     </div>
//                   )}
//                   <div className="min-w-0 flex-1">
//                     <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
//                       {course.title || 'Untitled Course'}
//                     </h3>
//                     <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
//                       <p className="text-xs text-muted-foreground truncate sm:hidden">
//                         {course.category} • {formatPrice(course.price)}
//                       </p>
//                       <p className="text-xs text-muted-foreground hidden sm:block">
//                         {course.description?.substring(0, 70) || 'No description available'}...
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-2 mt-1">
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.lectures?.length > 0 
//                           ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         📚 {course.lectures?.length || 0} lectures
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.assignments?.length > 0 
//                           ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         📝 {course.assignments?.length || 0} assignments
//                       </span>
//                       <span className={`text-xs px-1.5 py-0.5 rounded ${
//                         course.liveClasses?.length > 0 
//                           ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
//                           : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
//                       }`}>
//                         🔴 {course.liveClasses?.length || 0} live
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </td>

//               {/* Category */}
//               <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
//                   {course.category || 'Uncategorized'}
//                 </span>
//               </td>

//               {/* Level */}
//               <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
//                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
//                   ${getLevelBadgeColor(course.level) === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
//                   ${getLevelBadgeColor(course.level) === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
//                   ${getLevelBadgeColor(course.level) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
//                   ${getLevelBadgeColor(course.level) === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
//                   ${getLevelBadgeColor(course.level) === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' : ''}
//                 `}>
//                   {course.level?.toLowerCase() || 'beginner'}
//                 </span>
//               </td>

//               {/* Price */}
//               <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
//                 <span className={`font-semibold text-sm ${
//                   course.price === 0 || course.price === '0' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
//                 }`}>
//                   {formatPrice(course.price)}
//                 </span>
//               </td>

//               {/* Duration */}
//               <td className="py-4 px-4 sm:px-6 hidden xl:table-cell">
//                 <span className="text-muted-foreground text-sm">
//                   {course.duration} days
//                 </span>
//               </td>

//               {/* Actions */}
//               <td className="py-4 px-4 sm:px-6">
//                 <div className="flex items-center justify-start sm:justify-center space-x-1 sm:space-x-2">
//                   {/* View Button */}
//                   <button
//                     onClick={() => onView(course)}
//                     className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg dark:hover:bg-accent/50 cursor-pointer"
//                     title="View course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   </button>

//                   {/* Live Classes Button */}
//                   <button
//                     onClick={() => onManageLiveClasses(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
//                     title="Manage live classes"
//                   >
//                     <span className="text-sm">🔴</span>
//                   </button>

//                   {/* Manage Content Button */}
//                   <button
//                     onClick={() => onManageContent(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
//                     title="Manage lectures & assignments"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </button>

//                   {/* Edit Button */}
//                   <button
//                     onClick={() => onEdit(course)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
//                     title="Edit course details"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                     </svg>
//                   </button>

//                   {/* Delete Button */}
//                   <button
//                     onClick={() => onDelete(course._id)}
//                     disabled={loading}
//                     className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
//                     title="Delete course"
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                     </svg>
//                   </button>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default CourseTable;








import React from 'react';

const CourseTable = ({ 
  courses, 
  onEdit, 
  onDelete, 
  onView, 
  onManageContent, 
  onManageLiveClasses, 
  onViewRecordings,  // Add this prop
  loading 
}) => {
  const formatDuration = (minutes) => {
    if (!minutes || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPrice = (price) => {
    if (price === 0 || price === '0') return 'Free';
    return `₹${Number(price).toFixed(2)}`; // Rupee symbol added
  };

  const getLevelBadgeColor = (level) => {
    const levelMap = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
      expert: 'purple'
    };
    return levelMap[level?.toLowerCase()] || 'gray';
  };

  // Check if course has recordings
  const hasRecordings = (course) => {
    return course.recordings && course.recordings.length > 0;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Course</th>
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden md:table-cell">Category</th>
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden lg:table-cell">Level</th>
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden sm:table-cell">Price</th>
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm hidden xl:table-cell">Duration</th>
            <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {courses.map((course) => (
            <tr 
              key={course._id} 
              className="hover:bg-muted/30 group"
            >
              {/* Course Info */}
              <td className="py-4 px-4 sm:px-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.title)}&background=random`;
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {course.title?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                      {course.title || 'Untitled Course'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                      <p className="text-xs text-muted-foreground truncate sm:hidden">
                        {course.category} • {formatPrice(course.price)}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {course.description?.substring(0, 70) || 'No description available'}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        course.lectures?.length > 0 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        📚 {course.lectures?.length || 0} lectures
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        course.assignments?.length > 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        📝 {course.assignments?.length || 0} assignments
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        course.liveClasses?.length > 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        🔴 {course.liveClasses?.length || 0} live
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        hasRecordings(course)
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        📹 {course.recordings?.length || 0} recordings
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              {/* Category */}
              <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                  {course.category || 'Uncategorized'}
                </span>
              </td>

              {/* Level */}
              <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${getLevelBadgeColor(course.level) === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                  ${getLevelBadgeColor(course.level) === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                  ${getLevelBadgeColor(course.level) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                  ${getLevelBadgeColor(course.level) === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
                  ${getLevelBadgeColor(course.level) === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' : ''}
                `}>
                  {course.level?.toLowerCase() || 'beginner'}
                </span>
              </td>

              {/* Price */}
              <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
                <span className={`font-semibold text-sm ${
                  course.price === 0 || course.price === '0' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                }`}>
                  {formatPrice(course.price)}
                </span>
              </td>

              {/* Duration */}
              <td className="py-4 px-4 sm:px-6 hidden xl:table-cell">
                <span className="text-muted-foreground text-sm">
                  {course.duration} days
                </span>
              </td>

              {/* Actions */}
              <td className="py-4 px-4 sm:px-6">
                <div className="flex items-center justify-start sm:justify-center space-x-1 sm:space-x-2">
                  {/* View Button */}
                  <button
                    onClick={() => onView(course)}
                    className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg dark:hover:bg-accent/50 cursor-pointer"
                    title="View course details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  {/* Recordings Button */}
                  <button
                    onClick={() => onViewRecordings(course._id)}
                    disabled={loading}
                    className={`p-1.5 sm:p-2 rounded-lg disabled:opacity-50 cursor-pointer ${
                      hasRecordings(course)
                        ? 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20'
                    }`}
                    title={hasRecordings(course) ? "View recordings" : "No recordings available"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Live Classes Button */}
                  <button
                    onClick={() => onManageLiveClasses(course)}
                    disabled={loading}
                    className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
                    title="Manage live classes"
                  >
                    <span className="text-sm">🔴</span>
                  </button>

                  {/* Manage Content Button */}
                  <button
                    onClick={() => onManageContent(course)}
                    disabled={loading}
                    className="p-1.5 sm:p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
                    title="Manage lectures & assignments"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(course)}
                    disabled={loading}
                    className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
                    title="Edit course details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(course._id)}
                    disabled={loading}
                    className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 cursor-pointer"
                    title="Delete course"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseTable;