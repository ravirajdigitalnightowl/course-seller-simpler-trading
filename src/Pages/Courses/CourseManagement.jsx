
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../utils/layout/DashboardLayout';
import CourseTable from './components/CourseTable';
import CourseModal from './components/CourseModal';
import ContentManagementModal from './components/ContentManagementModal';
import LiveClassesModal from './components/LiveClassesModal';
import SearchBar from '../../Components/SearchBar';
import Pagination from '../../Components/Pagination';
import LoadingSpinner from '../../Components/LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// View Modal Component
const ViewModal = ({ course, onClose }) => {
  const navigate = useNavigate();
  const [showShareLink, setShowShareLink] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const formatDuration = (minutes) => {
    if (!minutes || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPrice = (price) => {
    if (price === 0 || price === '0') return 'Free';
    return `₹${Number(price).toFixed(2)}`;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartLiveClass = (liveClass) => {
    if (!liveClass.joinLink) {
      toast.error('No join link available');
      return;
    }

    try {
      // Extract sessionId and roomCode from joinLink
      let sessionId = liveClass.sessionId || liveClass._id;
      let roomCode = liveClass.roomCode;

      // If joinLink is a relative path
      if (liveClass.joinLink.startsWith('/')) {
        const pathParts = liveClass.joinLink.split('/');
        if (pathParts.length >= 3) {
          sessionId = pathParts[1] || sessionId;
          roomCode = pathParts[2] || roomCode;
        }
      } 
      // If joinLink is a full URL with /live/ path
      else if (liveClass.joinLink.includes('/live/')) {
        const url = new URL(liveClass.joinLink);
        const pathSegments = url.pathname.split('/');
        const liveSessionId = pathSegments[pathSegments.length - 1];
        
        const urlParams = new URLSearchParams(url.search);
        const roomId = urlParams.get('room');

        if (liveSessionId) sessionId = liveSessionId;
        if (roomId) roomCode = roomId;
      }

      // Navigate to the live session
      if (sessionId && roomCode) {
        navigate(`/livesession/${sessionId}/${roomCode}`);
        onClose();
      } else {
        // Fallback to original link
        window.open(liveClass.joinLink, '_blank');
      }
    } catch (error) {
      console.error('Error parsing join link:', error);
      
      // Last resort: use the original link
      toast.error('Unable to parse join link. Opening original link.');
      window.open(liveClass.joinLink, '_blank');
    }
  };

  // Generate share link for viewers
  const generateShareLink = (liveClass) => {
    if (!liveClass) return '';
    
    const baseUrl = 'https://simpler-trading.digitalnightowl.shop';
    // const baseUrl = 'http://localhost:5174';

    const sessionId = liveClass.sessionId || liveClass._id;
    const roomCode = liveClass.roomCode;
    
    if (sessionId && roomCode) {
      return `${baseUrl}/live-session/${sessionId}/${roomCode}`;
    }
    return '';
  };

  // Handle share link generation and display
  const handleShareLiveClass = (liveClass) => {
    const link = generateShareLink(liveClass);
    if (!link) {
      toast.error('Unable to generate share link. Missing session information.');
      return;
    }
    
    setShareLink(link);
    setShowShareLink(true);
    
    // Copy to clipboard automatically
    navigator.clipboard.writeText(link)
      .then(() => {
        toast.success('Share link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.info('Share link generated. You can copy it manually.');
      });
  };

  // Close share link modal
  const handleCloseShareLink = () => {
    setShowShareLink(false);
    setShareLink('');
  };

  // Get latest live class
  const getLatestLiveClass = () => {
    if (!course.liveClasses || course.liveClasses.length === 0) return null;
    
    // Sort live classes by createdAt in descending order (newest first)
    const sortedLiveClasses = [...course.liveClasses].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Return the latest one
    return sortedLiveClasses[0];
  };

  if (!course) return null;

  const latestLiveClass = getLatestLiveClass();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn"
        onClick={handleBackdropClick}
      >
        <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Course Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Course Thumbnail */}
              {course.thumbnail && (
                <div className="flex justify-center">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-32 h-32 rounded-lg object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.title)}&background=random`;
                    }}
                  />
                </div>
              )}

              {/* Course Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Title
                  </label>
                  <p className="text-foreground font-semibold">{course.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Category
                  </label>
                  <p className="text-foreground capitalize">{course.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Level
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${course.level?.toLowerCase() === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                    ${course.level?.toLowerCase() === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
                    ${course.level?.toLowerCase() === 'advanced' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
                  `}>
                    {course.level?.toLowerCase() || 'beginner'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Price
                  </label>
                  <p className={`font-semibold ${
                    course.price === 0 || course.price === '0' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                  }`}>
                    {formatPrice(course.price)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Duration
                  </label>
                  <p className="text-foreground">{course.duration} days</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Language
                  </label>
                  <p className="text-foreground">{course.language || 'English'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <p className="text-foreground leading-relaxed">
                  {course.description || 'No description available.'}
                </p>
              </div>

              {/* Content Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800">📚 Lectures</h4>
                  <p className="text-2xl font-bold text-blue-600">{course.lectures?.length || 0}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800">📝 Assignments</h4>
                  <p className="text-2xl font-bold text-green-600">{course.assignments?.length || 0}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800">🔴 Live Classes</h4>
                  <p className="text-2xl font-bold text-red-600">{course.liveClasses?.length || 0}</p>
                </div>
              </div>

              {/* Latest Live Class Section */}
              {latestLiveClass && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <h3 className="font-semibold text-red-800 flex items-center">
                      <span className="mr-2">🔴 Latest Live Class</span>
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{latestLiveClass.sessionTitle}</h4>
                        {latestLiveClass.description && (
                          <p className="text-sm text-gray-600 mt-1">{latestLiveClass.description}</p>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center mb-1">
                          <span className="mr-2">Room Code:</span>
                          <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                            {latestLiveClass.roomCode}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">Duration:</span>
                          <span className="font-medium">{formatDuration(latestLiveClass.duration)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => handleStartLiveClass(latestLiveClass)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Join Live Class</span>
                        </button>
                        
                        <button
                          onClick={() => handleShareLiveClass(latestLiveClass)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span>Share Link</span>
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Note: Development mode - You can join regardless of schedule time
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(course.tags) ? (
                      course.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {course.tags}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-6 mt-6 border-t border-border">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Link Modal */}
      {showShareLink && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] animate-fadeIn"
          onClick={handleCloseShareLink}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Share Live Class Link
              </h2>
              <button
                onClick={handleCloseShareLink}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Share this link with viewers to allow them to join the live class:
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-700 dark:text-gray-300 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink)
                          .then(() => toast.success('Link copied to clipboard!'))
                          .catch(err => {
                            console.error('Failed to copy:', err);
                            toast.error('Failed to copy link');
                          });
                      }}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p className="mb-1">• This link is for viewers to join the live class</p>
                  <p className="mb-1">• Hosts should use the "Join Live Class" button</p>
                  <p>• Link format: https://simpler-trading.digitalnightowl.shop/live-session/[sessionId]/[roomCode]</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCloseShareLink}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${course.title} - Live Class`,
                        text: `Join the live class: ${latestLiveClass?.sessionTitle}`,
                        url: shareLink,
                      }).catch(err => console.error('Error sharing:', err));
                    } else {
                      navigator.clipboard.writeText(shareLink)
                        .then(() => toast.success('Link copied to clipboard!'))
                        .catch(err => {
                          console.error('Failed to copy:', err);
                          toast.error('Failed to copy link');
                        });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isLiveClassesModalOpen, setIsLiveClassesModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  // Axios instance with auth
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Fetch all courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.get('/course/getAllCourses');
      
      if (response.data && response.data.success) {
        // Handle the response structure properly
        const responseData = response.data.data;
        
        // Check if responseData has courses property
        const allCourses = responseData.courses || responseData || [];
        
        // Ensure allCourses is an array
        if (!Array.isArray(allCourses)) {
          throw new Error('Invalid courses data format');
        }
        
        setCourses(allCourses);
        setFilteredCourses(allCourses);
        
        // Use pagination data from response if available
        if (responseData.pagination && responseData.pagination.totalPages) {
          setTotalPages(responseData.pagination.totalPages);
        } else {
          setTotalPages(Math.ceil(allCourses.length / itemsPerPage));
        }
        
        if (responseData.pagination && responseData.pagination.currentPage) {
          setCurrentPage(responseData.pagination.currentPage);
        }
      } else {
        setError('Failed to fetch courses');
        setCourses([]);
        setFilteredCourses([]);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch courses';
      setError(errorMessage);
      setCourses([]);
      setFilteredCourses([]);

      if (err.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection.');
        setError('Request timeout.');
        return;
      }

      // Network error
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
            autoClose: 3000,
            onClose: () => {
              logout?.();
              navigate('/signin');
            }
          }
        );
        return;
      }

      const msg = err.response?.data?.message || err.message || 'Failed to load courses';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate, itemsPerPage]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Frontend-side search functionality
  useEffect(() => {
    // Ensure courses is an array
    const coursesArray = Array.isArray(courses) ? courses : [];
    
    if (!searchTerm.trim()) {
      setFilteredCourses(coursesArray);
      setTotalPages(Math.ceil(coursesArray.length / itemsPerPage));
      setCurrentPage(1);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = coursesArray.filter(course => {
      if (!course) return false;
      
      return (
        course.title?.toLowerCase().includes(searchLower) ||
        course.category?.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        course.level?.toLowerCase().includes(searchLower) ||
        (Array.isArray(course.tags) && course.tags.some(tag => 
          tag?.toLowerCase().includes(searchLower)
        ))
      );
    });

    setFilteredCourses(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  }, [searchTerm, courses, itemsPerPage]);

  // Get current page courses
  const getCurrentPageCourses = () => {
    // Ensure filteredCourses is an array
    if (!Array.isArray(filteredCourses)) {
      return [];
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCourses.slice(startIndex, endIndex);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = () => {
    setSelectedCourse(null);
    setIsModalOpen(true);
  };

  const handleView = (course) => {
    setSelectedCourse(course);
    setIsViewModalOpen(true);
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleManageContent = (course) => {
    setSelectedCourse(course);
    setIsContentModalOpen(true);
  };

  const handleManageLiveClasses = (course) => {
    setSelectedCourse(course);
    setIsLiveClassesModalOpen(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await apiClient.delete(`/course/deleteCourse/${courseId}`);
      
      setSuccessMessage('Course deleted successfully!');
      toast.success('Course deleted successfully!');
      await fetchCourses();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection.');
        setError('Request timeout.');
        return;
      }

      // Network error
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
            autoClose: 3000,
            onClose: () => {
              logout?.();
              navigate('/signin');
            }
          }
        );
        return;
      }

      const msg = err.response?.data?.message || err.message || 'Failed to delete course';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCourse(null);
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setSelectedCourse(null);
  };

  const handleContentModalClose = () => {
    setIsContentModalOpen(false);
    setSelectedCourse(null);
  };

  const handleLiveClassesModalClose = () => {
    setIsLiveClassesModalOpen(false);
    setSelectedCourse(null);
  };

  const handleModalSuccess = () => {
    const message = selectedCourse ? 'Course updated successfully!' : 'Course created successfully!';
    setSuccessMessage(message);
    toast.success(message);
    handleModalClose();
    fetchCourses();
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleContentModalSuccess = () => {
    setSuccessMessage('Content updated successfully!');
    toast.success('Content updated successfully!');
    handleContentModalClose();
    fetchCourses();
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleLiveClassesModalSuccess = () => {
    setSuccessMessage('Live classes updated successfully!');
    toast.success('Live classes updated successfully!');
    handleLiveClassesModalClose();
    fetchCourses();
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const currentCourses = getCurrentPageCourses();

  return (
    <DashboardLayout activePage="/courses">
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your courses, content, and live classes
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleCreate}
              disabled={actionLoading || loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{actionLoading ? 'Creating...' : 'Create Course'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search courses by title, category..."
            variant="default"
            size="md"
          />
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 flex items-center justify-between animate-fadeIn">
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 flex items-center justify-between animate-fadeIn">
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && courses.length === 0 ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground mt-4">Loading courses...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Course Table */}
            {currentCourses.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <CourseTable
                  courses={currentCourses}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                  onManageContent={handleManageContent}
                  onManageLiveClasses={handleManageLiveClasses}
                  loading={actionLoading}
                />
              </div>
            )}

            {/* Pagination */}
            {filteredCourses.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                variant="default"
                size="md"
                showPageInfo={true}
              />
            )}

            {/* No Results */}
            {!loading && filteredCourses.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <div className="text-muted-foreground text-lg mb-4">
                  {searchTerm ? 'No courses found matching your search.' : 'No courses available.'}
                </div>
                {!searchTerm && (
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Create Your First Course
                  </button>
                )}
              </div>
            )}

            {/* Search Results Info */}
            {searchTerm && filteredCourses.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Found {filteredCourses.length} course(s) matching "{searchTerm}"
              </div>
            )}
          </>
        )}

        {/* Edit/Create Course Modal */}
        {isModalOpen && (
          <CourseModal
            course={selectedCourse}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
            loading={actionLoading}
          />
        )}

        {/* View Course Modal */}
        {isViewModalOpen && (
          <ViewModal
            course={selectedCourse}
            onClose={handleViewModalClose}
          />
        )}

        {/* Content Management Modal */}
        {isContentModalOpen && (
          <ContentManagementModal
            course={selectedCourse}
            onClose={handleContentModalClose}
            onSuccess={handleContentModalSuccess}
          />
        )}

        {/* Live Classes Management Modal */}
        {isLiveClassesModalOpen && (
          <LiveClassesModal
            course={selectedCourse}
            onClose={handleLiveClassesModalClose}
            onSuccess={handleLiveClassesModalSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;