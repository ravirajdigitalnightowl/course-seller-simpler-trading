// // src/pages/Courses/components/CourseModal.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// const CourseModal = ({ course, onClose, onSuccess, loading }) => {
//   const [formData, setFormData] = useState({
//     title: '',
//     description: '',
//     category: '',
//     level: 'Beginner',
//     price: 0,
//     language: 'English',
//     duration: 0,
//     tags: [],
//     thumbnail: null,
//     isActive: true
//   });
//   const [tagInput, setTagInput] = useState('');
//   const [formLoading, setFormLoading] = useState(false);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (course) {
//       setFormData({
//         title: course.title || '',
//         description: course.description || '',
//         category: course.category || '',
//         level: course.level || 'Beginner',
//         price: course.price || 0,
//         language: course.language || 'English',
//         duration: course.duration || 0,
//         tags: Array.isArray(course.tags) ? course.tags : [],
//         thumbnail: course.thumbnail || null,
//         isActive: course.isActive !== undefined ? course.isActive : true
//       });
//     }
//   }, [course]);

//   const getAuthToken = () => {
//     return localStorage.getItem('token');
//   };

//   // Tags functionality
//   const handleAddTag = () => {
//     const trimmedTag = tagInput.trim();
//     if (trimmedTag && !formData.tags.includes(trimmedTag)) {
//       setFormData(prev => ({
//         ...prev,
//         tags: [...prev.tags, trimmedTag]
//       }));
//       setTagInput('');
//     }
//   };

//   const handleRemoveTag = (tagToRemove) => {
//     setFormData(prev => ({
//       ...prev,
//       tags: prev.tags.filter(tag => tag !== tagToRemove)
//     }));
//   };

//   const handleTagInputKeyPress = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       handleAddTag();
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setFormLoading(true);
//     setError('');

//     try {
//       const token = getAuthToken();
      
//       // Create FormData for file uploads
//       const formDataToSend = new FormData();
      
//       // Add text fields
//       formDataToSend.append('title', formData.title.trim());
//       formDataToSend.append('description', formData.description.trim());
//       formDataToSend.append('category', formData.category.trim());
//       formDataToSend.append('level', formData.level);
//       formDataToSend.append('price', Number(formData.price));
//       formDataToSend.append('language', formData.language);
//       formDataToSend.append('duration', Number(formData.duration));
//       formDataToSend.append('isActive', formData.isActive);
      
//       // Add tags as JSON string
//       formDataToSend.append('tags', JSON.stringify(formData.tags));
      
//       // Add empty arrays for other fields
//       formDataToSend.append('liveClasses', JSON.stringify([]));
//       formDataToSend.append('quizzes', JSON.stringify([]));
//       formDataToSend.append('lectures', JSON.stringify([]));
//       formDataToSend.append('assignments', JSON.stringify([]));

//       // Add thumbnail if provided
//       if (formData.thumbnail) {
//         formDataToSend.append('thumbnail', formData.thumbnail);
//       }

//       let response;
//       if (course) {
//         // Update course
//         response = await axios.put(`${API_BASE_URL}/course/updateCourse/${course._id}`, formDataToSend, {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'multipart/form-data',
//           },
//         });
//       } else {
//         // Create course
//         response = await axios.post(`${API_BASE_URL}/course/createCourse`, formDataToSend, {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'multipart/form-data',
//           },
//         });
//       }

//       if (response.data && response.data.success) {
//         onSuccess();
//       } else {
//         setError(response.data?.message || 'Failed to save course');
//       }
//     } catch (err) {
//       console.error('Error saving course:', err);
//       const errorMessage = err.response?.data?.message || err.message || 'Failed to save course';
//       setError(errorMessage);
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value
//     }));
//   };

//   const handleFileChange = (e) => {
//     setFormData(prev => ({
//       ...prev,
//       thumbnail: e.target.files[0]
//     }));
//   };

//   const handleBackdropClick = (e) => {
//     if (e.target === e.currentTarget) {
//       onClose();
//     }
//   };

//   return (
//     <div 
//       className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
//       onClick={handleBackdropClick}
//     >
//       <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-border">
//           <h2 className="text-xl sm:text-2xl font-bold text-foreground">
//             {course ? 'Edit Course' : 'Create New Course'}
//           </h2>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 cursor-pointer"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>
        
//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6">
//           {error && (
//             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
//               {error}
//             </div>
//           )}

//           <div className="space-y-6">
//             {/* Basic Information */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Title */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Course Title *
//                 </label>
//                 <input
//                   type="text"
//                   name="title"
//                   value={formData.title}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="Enter course title"
//                 />
//               </div>

//               {/* Description */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Description *
//                 </label>
//                 <textarea
//                   name="description"
//                   value={formData.description}
//                   onChange={handleChange}
//                   required
//                   rows={3}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
//                   placeholder="Enter course description"
//                 />
//               </div>

//               {/* Category */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Category *
//                 </label>
//                 <input
//                   type="text"
//                   name="category"
//                   value={formData.category}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="e.g., Web Development"
//                 />
//               </div>

//               {/* Level */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Level *
//                 </label>
//                 <select
//                   name="level"
//                   value={formData.level}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                 >
//                   <option value="Beginner">Beginner</option>
//                   <option value="Intermediate">Intermediate</option>
//                   <option value="Advanced">Advanced</option>
//                 </select>
//               </div>

//               {/* Price */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Price ($)
//                 </label>
//                 <input
//                   type="number"
//                   name="price"
//                   value={formData.price}
//                   onChange={handleChange}
//                   min="0"
//                   step="0.01"
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="0.00"
//                 />
//               </div>

//               {/* Duration in Days */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Duration (Days) *
//                 </label>
//                 <input
//                   type="number"
//                   name="duration"
//                   value={formData.duration}
//                   onChange={handleChange}
//                   min="0"
//                   required
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="30"
//                 />
//               </div>

//               {/* Language */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Language
//                 </label>
//                 <input
//                   type="text"
//                   name="language"
//                   value={formData.language}
//                   onChange={handleChange}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="English"
//                 />
//               </div>

//               {/* Thumbnail */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Course Thumbnail
//                 </label>
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleFileChange}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                 />
//               </div>
//             </div>

//             {/* Tags Section */}
//             <div>
//               <label className="block text-sm font-medium text-foreground mb-2">
//                 Tags
//               </label>
//               <div className="flex gap-2 mb-2">
//                 <input
//                   type="text"
//                   value={tagInput}
//                   onChange={(e) => setTagInput(e.target.value)}
//                   onKeyPress={handleTagInputKeyPress}
//                   className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
//                   placeholder="Enter a tag"
//                 />
//                 <button
//                   type="button"
//                   onClick={handleAddTag}
//                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
//                 >
//                   Add
//                 </button>
//               </div>
              
//               {/* Tags Display */}
//               {formData.tags.length > 0 && (
//                 <div className="flex flex-wrap gap-2 mt-2">
//                   {formData.tags.map((tag, index) => (
//                     <span
//                       key={index}
//                       className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
//                     >
//                       {tag}
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveTag(tag)}
//                         className="ml-2 text-blue-600 hover:text-blue-800"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </span>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Active Status */}
//             {course && (
//               <div>
//                 <label className="flex items-center space-x-2">
//                   <input
//                     type="checkbox"
//                     name="isActive"
//                     checked={formData.isActive}
//                     onChange={handleChange}
//                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
//                   />
//                   <span className="text-sm font-medium text-foreground">Course is active</span>
//                 </label>
//               </div>
//             )}

//             {/* Note about Content Management */}
//             {course && (
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                 <p className="text-sm text-blue-800">
//                   💡 <strong>Note:</strong> You can manage lectures and assignments separately using the "Manage Content" button on the course table.
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* Form Actions */}
//           <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-border">
//             <button
//               type="button"
//               onClick={onClose}
//               disabled={formLoading}
//               className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 disabled:opacity-50 cursor-pointer"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={formLoading}
//               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
//             >
//               {formLoading ? (
//                 <>
//                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                   <span>Saving...</span>
//                 </>
//               ) : (
//                 <span>{course ? 'Update Course' : 'Create Course'}</span>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default CourseModal;

















// src/pages/Courses/components/CourseModal.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { toast } from 'react-toastify';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// const CourseModal = ({ course, onClose, onSuccess, loading }) => {
//   const [formData, setFormData] = useState({
//     title: '',
//     description: '',
//     category: '',
//     level: 'Beginner',
//     price: 0,
//     language: 'English',
//     duration: 0,
//     tags: [],
//     thumbnail: '', // 🔥 अब यह S3 URL होगा
//     isActive: true
//   });
  
//   const [tagInput, setTagInput] = useState('');
//   const [formLoading, setFormLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
//   const [thumbnailFile, setThumbnailFile] = useState(null);
//   const [thumbnailPreview, setThumbnailPreview] = useState('');

//   useEffect(() => {
//     if (course) {
//       setFormData({
//         title: course.title || '',
//         description: course.description || '',
//         category: course.category || '',
//         level: course.level || 'Beginner',
//         price: course.price || 0,
//         language: course.language || 'English',
//         duration: course.duration || 0,
//         tags: Array.isArray(course.tags) ? course.tags : [],
//         thumbnail: course.thumbnail || '',
//         isActive: course.isActive !== undefined ? course.isActive : true
//       });
      
//       if (course.thumbnail) {
//         setThumbnailPreview(course.thumbnail);
//       }
//     }
//   }, [course]);

//   const getAuthToken = () => {
//     return localStorage.getItem('token');
//   };

//   // Tags functionality
//   const handleAddTag = () => {
//     const trimmedTag = tagInput.trim();
//     if (trimmedTag && !formData.tags.includes(trimmedTag)) {
//       setFormData(prev => ({
//         ...prev,
//         tags: [...prev.tags, trimmedTag]
//       }));
//       setTagInput('');
//     }
//   };

//   const handleRemoveTag = (tagToRemove) => {
//     setFormData(prev => ({
//       ...prev,
//       tags: prev.tags.filter(tag => tag !== tagToRemove)
//     }));
//   };

//   const handleTagInputKeyPress = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       handleAddTag();
//     }
//   };

//   // 🔥 NEW: Upload thumbnail to S3 using pre-signed URL
//   const uploadToS3 = async (file, folder = 'course-thumbnails') => {
//     try {
//       const token = getAuthToken();
      
//       // 1. Get pre-signed URL from backend
//       const presignedResponse = await axios.post(
//         `${API_BASE_URL}/file/presigned-url`,
//         {
//           fileName: file.name,
//           fileType: file.type,
//           folder: folder
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`
//           }
//         }
//       );

//       if (!presignedResponse.data.success) {
//         throw new Error('Failed to get upload URL');
//       }

//       const { uploadUrl, fileUrl } = presignedResponse.data.data;

//       // 2. Upload file directly to S3
//       const uploadResponse = await axios.put(uploadUrl, file, {
//         headers: {
//           'Content-Type': file.type
//         }
//       });

//       if (uploadResponse.status !== 200) {
//         throw new Error('Failed to upload to S3');
//       }

//       // 3. Return the public URL
//       return fileUrl;
      
//     } catch (error) {
//       console.error('S3 Upload Error:', error);
//       throw error;
//     }
//   };

//   // Handle file selection
//   const handleFileChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     // Validate file type
//     const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
//     if (!allowedTypes.includes(file.type)) {
//       toast.error('Only JPG, PNG, WebP and GIF images are allowed');
//       return;
//     }

//     // Validate file size (max 5MB)
//     if (file.size > 5 * 1024 * 1024) {
//       toast.error('Image size should be less than 5MB');
//       return;
//     }

//     setThumbnailFile(file);
    
//     // Create preview
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       setThumbnailPreview(reader.result);
//     };
//     reader.readAsDataURL(file);

//     // Auto-upload to S3
//     try {
//       setUploadingThumbnail(true);
//       const uploadedUrl = await uploadToS3(file, 'course-thumbnails');
//       setFormData(prev => ({
//         ...prev,
//         thumbnail: uploadedUrl
//       }));
//       toast.success('Thumbnail uploaded successfully!');
//     } catch (error) {
//       console.error('Upload failed:', error);
//       toast.error('Failed to upload thumbnail');
//       setThumbnailFile(null);
//       setThumbnailPreview('');
//     } finally {
//       setUploadingThumbnail(false);
//     }
//   };

//   // Remove thumbnail
//   const handleRemoveThumbnail = () => {
//     setThumbnailFile(null);
//     setThumbnailPreview('');
//     setFormData(prev => ({
//       ...prev,
//       thumbnail: ''
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setFormLoading(true);
//     setError('');

//     // Validate required fields
//     if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim()) {
//       setError('Please fill all required fields');
//       setFormLoading(false);
//       return;
//     }

//     // Validate thumbnail (required for new courses)
//     if (!course && !formData.thumbnail) {
//       setError('Please upload a thumbnail image');
//       setFormLoading(false);
//       return;
//     }

//     try {
//       const token = getAuthToken();
      
//       // Prepare course data according to backend structure
//       const courseData = {
//         title: formData.title.trim(),
//         description: formData.description.trim(),
//         category: formData.category.trim(),
//         level: formData.level,
//         price: Number(formData.price),
//         language: formData.language,
//         duration: Number(formData.duration),
//         tags: formData.tags,
//         thumbnail: formData.thumbnail, // S3 URL
//         isActive: formData.isActive,
//         // Add empty arrays for other fields
//         lectures: [],
//         assignments: [],
//         liveClasses: []
//       };

//       let response;
//       if (course) {
//         // Update course
//         response = await axios.put(
//           `${API_BASE_URL}/course/updateCourse/${course._id}`,
//           courseData,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           }
//         );
//       } else {
//         // Create course
//         response = await axios.post(
//           `${API_BASE_URL}/course/createCourse`,
//           courseData,
//           {
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           }
//         );
//       }

//       if (response.data && response.data.success) {
//         toast.success(course ? 'Course updated successfully!' : 'Course created successfully!');
//         onSuccess();
//       } else {
//         const errorMsg = response.data?.message || 'Failed to save course';
//         setError(errorMsg);
//         toast.error(errorMsg);
//       }
//     } catch (err) {
//       console.error('Error saving course:', err);
      
//       let errorMessage = 'Failed to save course';
//       if (err.response?.status === 401) {
//         errorMessage = 'Session expired. Please login again.';
//       } else if (err.response?.status === 403) {
//         errorMessage = 'You do not have permission to perform this action';
//       } else if (err.response?.data?.message) {
//         errorMessage = err.response.data.message;
//       } else if (err.message) {
//         errorMessage = err.message;
//       }
      
//       setError(errorMessage);
//       toast.error(errorMessage);
//     } finally {
//       setFormLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value
//     }));
//   };

//   const handleBackdropClick = (e) => {
//     if (e.target === e.currentTarget) {
//       onClose();
//     }
//   };

//   return (
//     <div 
//       className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
//       onClick={handleBackdropClick}
//     >
//       <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-border">
//           <h2 className="text-xl sm:text-2xl font-bold text-foreground">
//             {course ? 'Edit Course' : 'Create New Course'}
//           </h2>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 cursor-pointer"
//             disabled={formLoading}
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>
        
//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6">
//           {error && (
//             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-fadeIn">
//               {error}
//             </div>
//           )}

//           <div className="space-y-6">
//             {/* Thumbnail Preview */}
//             {(thumbnailPreview || formData.thumbnail) && (
//               <div className="flex flex-col items-center">
//                 <div className="relative">
//                   <img
//                     src={thumbnailPreview || formData.thumbnail}
//                     alt="Thumbnail preview"
//                     className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
//                   />
//                   <button
//                     type="button"
//                     onClick={handleRemoveThumbnail}
//                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
//                     disabled={uploadingThumbnail}
//                   >
//                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   </button>
//                 </div>
//                 {uploadingThumbnail && (
//                   <div className="mt-2 text-sm text-blue-600 animate-pulse">
//                     Uploading thumbnail...
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Basic Information */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Title */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Course Title *
//                 </label>
//                 <input
//                   type="text"
//                   name="title"
//                   value={formData.title}
//                   onChange={handleChange}
//                   required
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                   placeholder="Enter course title"
//                 />
//               </div>

//               {/* Description */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Description *
//                 </label>
//                 <textarea
//                   name="description"
//                   value={formData.description}
//                   onChange={handleChange}
//                   required
//                   rows={3}
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical disabled:opacity-50"
//                   placeholder="Enter course description"
//                 />
//               </div>

//               {/* Category */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Category *
//                 </label>
//                 <input
//                   type="text"
//                   name="category"
//                   value={formData.category}
//                   onChange={handleChange}
//                   required
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                   placeholder="e.g., Web Development"
//                 />
//               </div>

//               {/* Level */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Level *
//                 </label>
//                 <select
//                   name="level"
//                   value={formData.level}
//                   onChange={handleChange}
//                   required
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                 >
//                   <option value="Beginner">Beginner</option>
//                   <option value="Intermediate">Intermediate</option>
//                   <option value="Advanced">Advanced</option>
//                 </select>
//               </div>

//               {/* Price */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Price (₹)
//                 </label>
//                 <div className="relative">
//                   <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
//                   <input
//                     type="number"
//                     name="price"
//                     value={formData.price}
//                     onChange={handleChange}
//                     min="0"
//                     step="1"
//                     disabled={formLoading}
//                     className="w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                     placeholder="0"
//                   />
//                 </div>
//               </div>

//               {/* Duration in Days */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Duration (Days) *
//                 </label>
//                 <input
//                   type="number"
//                   name="duration"
//                   value={formData.duration}
//                   onChange={handleChange}
//                   min="0"
//                   required
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                   placeholder="30"
//                 />
//               </div>

//               {/* Language */}
//               <div>
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Language
//                 </label>
//                 <select
//                   name="language"
//                   value={formData.language}
//                   onChange={handleChange}
//                   disabled={formLoading}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                 >
//                   <option value="English">English</option>
//                   <option value="Hindi">Hindi</option>
//                   <option value="Marathi">Marathi</option>
//                   <option value="Gujarati">Gujarati</option>
//                   <option value="Tamil">Tamil</option>
//                   <option value="Telugu">Telugu</option>
//                   <option value="Kannada">Kannada</option>
//                   <option value="Malayalam">Malayalam</option>
//                 </select>
//               </div>

//               {/* Thumbnail Upload */}
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-foreground mb-2">
//                   Course Thumbnail {!course && '*'}
//                 </label>
//                 <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleFileChange}
//                     disabled={formLoading || uploadingThumbnail}
//                     className="hidden"
//                     id="thumbnail-upload"
//                   />
//                   <label
//                     htmlFor="thumbnail-upload"
//                     className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
//                       formLoading || uploadingThumbnail
//                         ? 'bg-gray-400 cursor-not-allowed'
//                         : 'bg-blue-600 hover:bg-blue-700 text-white'
//                     } transition-colors duration-200`}
//                   >
//                     {uploadingThumbnail ? (
//                       <>
//                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
//                         Uploading...
//                       </>
//                     ) : (
//                       'Choose Thumbnail Image'
//                     )}
//                   </label>
//                   <p className="text-xs text-muted-foreground mt-2">
//                     Recommended: Square image, JPG/PNG/WebP, max 5MB
//                   </p>
//                 </div>
//               </div>
//             </div>

//             {/* Tags Section */}
//             <div>
//               <label className="block text-sm font-medium text-foreground mb-2">
//                 Tags
//               </label>
//               <div className="flex gap-2 mb-2">
//                 <input
//                   type="text"
//                   value={tagInput}
//                   onChange={(e) => setTagInput(e.target.value)}
//                   onKeyPress={handleTagInputKeyPress}
//                   disabled={formLoading}
//                   className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
//                   placeholder="Enter a tag (e.g., JavaScript, React, etc.)"
//                 />
//                 <button
//                   type="button"
//                   onClick={handleAddTag}
//                   disabled={formLoading || !tagInput.trim()}
//                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
//                 >
//                   Add
//                 </button>
//               </div>
              
//               {/* Tags Display */}
//               {formData.tags.length > 0 && (
//                 <div className="flex flex-wrap gap-2 mt-2">
//                   {formData.tags.map((tag, index) => (
//                     <span
//                       key={index}
//                       className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
//                     >
//                       {tag}
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveTag(tag)}
//                         disabled={formLoading}
//                         className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                         </svg>
//                       </button>
//                     </span>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Active Status */}
//             {course && (
//               <div className="flex items-center p-3 border border-border rounded-lg">
//                 <input
//                   type="checkbox"
//                   name="isActive"
//                   checked={formData.isActive}
//                   onChange={handleChange}
//                   disabled={formLoading}
//                   id="isActive"
//                   className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
//                 />
//                 <label htmlFor="isActive" className="ml-2 text-sm font-medium text-foreground">
//                   Course is active and visible to users
//                 </label>
//               </div>
//             )}

//             {/* Note about Content Management */}
//             {course && (
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                 <p className="text-sm text-blue-800 flex items-start">
//                   <span className="mr-2">💡</span>
//                   <span>
//                     <strong>Note:</strong> You can manage lectures, assignments, and live classes separately 
//                     using the respective action buttons on the course table.
//                   </span>
//                 </p>
//               </div>
//             )}
//           </div>

//           {/* Form Actions */}
//           <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-border">
//             <button
//               type="button"
//               onClick={onClose}
//               disabled={formLoading}
//               className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={formLoading || uploadingThumbnail || (!course && !formData.thumbnail)}
//               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
//             >
//               {formLoading ? (
//                 <>
//                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                   <span>Saving...</span>
//                 </>
//               ) : (
//                 <span>{course ? 'Update Course' : 'Create Course'}</span>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default CourseModal;










// src/pages/Courses/components/CourseModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CourseModal = ({ course, onClose, onSuccess, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    price: 0,
    language: 'English',
    duration: 0,
    tags: [],
    thumbnail: '', // S3 URL
    isActive: true
  });
  
  const [tagInput, setTagInput] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        level: course.level || 'Beginner',
        price: course.price || 0,
        language: course.language || 'English',
        duration: course.duration || 0,
        tags: Array.isArray(course.tags) ? course.tags : [],
        thumbnail: course.thumbnail || '',
        isActive: course.isActive !== undefined ? course.isActive : true
      });
      
      if (course.thumbnail) {
        setThumbnailPreview(course.thumbnail);
      }
    }
  }, [course]);

  const getAuthToken = () => {
    return localStorage.getItem('trainertoken');
  };

  // Tags functionality
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 🔥 UPDATED: S3 Upload with XMLHttpRequest for CORS compatibility
  const uploadToS3 = async (file, folder = 'course-thumbnails') => {
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
        
        // Progress tracking
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded * 100) / event.total);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        };
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            // Extract clean file URL (remove query parameters)
            const cleanUrl = uploadUrl.split('?')[0];
            console.log('✅ File uploaded successfully to:', cleanUrl);
            resolve(cleanUrl);
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error during upload. Please check CORS configuration.'));
        };
        
        xhr.send(file);
      });
      
    } catch (error) {
      console.error('❌ S3 Upload Error:', error);
      
      // Provide detailed error message
      let errorMessage = 'Failed to upload file';
      if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection and S3 CORS configuration.';
      } else if (error.message.includes('Upload failed')) {
        errorMessage = 'Upload failed. Please try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, WebP and GIF images are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setThumbnailFile(file);
    
    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Auto-upload to S3
    try {
      setUploadingThumbnail(true);
      toast.info('Uploading thumbnail...');
      
      const uploadedUrl = await uploadToS3(file, 'course-thumbnails');
      
      setFormData(prev => ({
        ...prev,
        thumbnail: uploadedUrl
      }));
      
      toast.success('Thumbnail uploaded successfully!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload thumbnail');
      
      // Reset on failure
      setThumbnailFile(null);
      setThumbnailPreview('');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Remove thumbnail
  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    setFormData(prev => ({
      ...prev,
      thumbnail: ''
    }));
    toast.info('Thumbnail removed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim()) {
      setError('Please fill all required fields');
      toast.error('Please fill all required fields');
      setFormLoading(false);
      return;
    }

    // Validate thumbnail (required for new courses)
    if (!course && !formData.thumbnail) {
      setError('Please upload a thumbnail image');
      toast.error('Please upload a thumbnail image');
      setFormLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      
      // Prepare course data according to backend structure
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        level: formData.level,
        price: Number(formData.price),
        language: formData.language,
        duration: Number(formData.duration),
        tags: formData.tags,
        thumbnail: formData.thumbnail, // S3 URL
        isActive: formData.isActive,
        // Add empty arrays for other fields
        lectures: [],
        assignments: [],
        liveClasses: []
      };

      console.log('📤 Sending course data:', courseData);

      let response;
      if (course) {
        // Update course
        response = await axios.put(
          `${API_BASE_URL}/course/updateCourse/${course._id}`,
          courseData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        // Create course
        response = await axios.post(
          `${API_BASE_URL}/course/createCourse`,
          courseData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (response.data && response.data.success) {
        const successMsg = course ? 'Course updated successfully!' : 'Course created successfully!';
        toast.success(successMsg);
        console.log('✅ Course saved:', response.data);
        onSuccess();
      } else {
        const errorMsg = response.data?.message || 'Failed to save course';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error saving course:', err);
      
      let errorMessage = 'Failed to save course';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !formLoading) {
      onClose();
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
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            {course ? 'Edit Course' : 'Create New Course'}
          </h2>
          <button
            onClick={onClose}
            disabled={formLoading}
            className="p-2 hover:bg-muted rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-fadeIn">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Thumbnail Preview Section */}
            <div className="border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-3">
                Course Thumbnail {!course && <span className="text-red-500">*</span>}
              </label>
              
              {thumbnailPreview || formData.thumbnail ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <img
                      src={thumbnailPreview || formData.thumbnail}
                      alt="Thumbnail preview"
                      className="w-40 h-40 rounded-lg object-cover border-2 border-gray-300 shadow-sm"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.title || 'Course')}&background=random&size=160`;
                      }}
                    />
                    {!uploadingThumbnail && (
                      <button
                        type="button"
                        onClick={handleRemoveThumbnail}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                        disabled={formLoading}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {uploadingThumbnail && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Uploading to S3...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="border-2 border-dashed border-border rounded-lg p-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-4">
                      Upload a thumbnail image for your course
                    </p>
                  </div>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={formLoading || uploadingThumbnail}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className={`cursor-pointer inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg transition-colors duration-200 ${
                    formLoading || uploadingThumbnail
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  {uploadingThumbnail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {thumbnailPreview || formData.thumbnail ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Recommended: Square image, JPG/PNG/WebP, max 5MB
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  placeholder="Enter course title"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical disabled:opacity-50"
                  placeholder="Describe what students will learn in this course..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  placeholder="e.g., Web Development, Marketing, Finance"
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    disabled={formLoading}
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {formData.price === 0 ? 'Free' : ''}
                  </div>
                </div>
              </div>

              {/* Duration in Days */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="0"
                  required
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  placeholder="30"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  disabled={formLoading}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Bengali">Bengali</option>
                </select>
              </div>
            </div>

            {/* Tags Section */}
            <div className="border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-3">
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  disabled={formLoading}
                  className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  placeholder="Enter a tag (e.g., JavaScript, React, Finance, etc.)"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={formLoading || !tagInput.trim()}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  Add
                </button>
              </div>
              
              {/* Tags Display */}
              {formData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        disabled={formLoading}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Add tags to help students find your course (optional)
                </p>
              )}
            </div>

            {/* Active Status (for edit only) */}
            {course && (
              <div className="flex items-center p-4 border border-border rounded-lg bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={formLoading}
                    id="isActive"
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isActive" className="font-medium text-foreground">
                    Course is active
                  </label>
                  <p className="text-gray-500">
                    Active courses are visible to users. Inactive courses are hidden.
                  </p>
                </div>
              </div>
            )}

            {/* Note about Content Management */}
            {course && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                      Content Management
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <p>
                        You can manage lectures, assignments, and live classes separately using the respective action buttons on the course table.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={formLoading || uploadingThumbnail}
              className="px-5 py-2.5 border border-border rounded-lg text-foreground hover:bg-muted transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading || uploadingThumbnail || (!course && !formData.thumbnail)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2 font-medium"
            >
              {formLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{course ? 'Update Course' : 'Create Course'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseModal;