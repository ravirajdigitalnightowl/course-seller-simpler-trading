import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
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
  FaComment,
  FaChalkboard,
  FaCheckCircle,
  FaTimesCircle,
  FaRegCalendarCheck,
  FaBook,
  FaFilter,
  FaSearch,
  FaSort,
  FaEye,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import DashboardLayout from '../../utils/layout/DashboardLayout';

const AllCourseRecordingsPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecordings, setSessionRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedSessions, setExpandedSessions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch all courses
  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/course/getAllCourses`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: {
              page: 1,
              limit: 50 // Increased limit to get more courses
            }
          }
        );

        if (response.data.success) {
          const coursesData = response.data.data.courses;
          setCourses(coursesData);
          
          // Set first course as selected by default
          if (coursesData.length > 0) {
            const firstCourse = coursesData[0];
            setSelectedCourse(firstCourse);
            // Set first session as selected by default if exists
            if (firstCourse.liveClasses && firstCourse.liveClasses.length > 0) {
              const firstSession = firstCourse.liveClasses[0];
              setSelectedSession(firstSession);
              fetchSessionRecordings(firstSession.sessionId);
            }
          }
        } else {
          setError('Failed to fetch courses');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err.response?.data?.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAllCourses();
    }
  }, [token]);

  // Fetch recordings for a specific session
  const fetchSessionRecordings = async (sessionId) => {
    if (!sessionId) return;
    
    try {
      setLoadingRecordings(true);
      setSessionRecordings([]);
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/recording/session/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSessionRecordings(response.data.data.recordings || []);
      } else {
        setSessionRecordings([]);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setSessionRecordings([]);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Handle course selection
  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setSelectedSession(null);
    setSessionRecordings([]);
    
    // Expand the selected course
    setExpandedCourses(prev => ({
      ...prev,
      [course._id]: true
    }));
  };

  // Handle session selection
  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    fetchSessionRecordings(session.sessionId);
    
    // Expand the selected session
    setExpandedSessions(prev => ({
      ...prev,
      [session._id]: true
    }));
  };

  // Toggle course expansion
  const toggleCourseExpansion = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Toggle session expansion
  const toggleSessionExpansion = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format full date time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate session duration
  const getSessionDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get session status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'LIVE':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <FaCheckCircle className="inline mr-1 h-3 w-3" />;
      case 'SCHEDULED':
        return <FaRegCalendarCheck className="inline mr-1 h-3 w-3" />;
      case 'LIVE':
        return <FaVideo className="inline mr-1 h-3 w-3" />;
      case 'CANCELLED':
        return <FaTimesCircle className="inline mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  // Filter and sort courses
  const filteredCourses = courses.filter(course => {
    // Filter by search term
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by sessions status
    if (filterStatus !== 'all') {
      const hasMatchingSessions = course.liveClasses?.some(
        session => session.status === filterStatus
      );
      return matchesSearch && hasMatchingSessions;
    }
    
    return matchesSearch;
  });

  // Sort sessions based on selected criteria
  const getSortedSessions = (sessions) => {
    if (!sessions) return [];
    
    return [...sessions].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.scheduleAt) - new Date(a.scheduleAt);
        case 'title':
          return a.sessionTitle.localeCompare(b.sessionTitle);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  };

  // Calculate total statistics
  const calculateStats = () => {
    let totalCourses = courses.length;
    let totalSessions = 0;
    let totalRecordings = 0;
    let upcomingSessions = 0;
    let completedSessions = 0;
    
    courses.forEach(course => {
      if (course.liveClasses) {
        totalSessions += course.liveClasses.length;
        
        course.liveClasses.forEach(session => {
          if (session.status === 'SCHEDULED') upcomingSessions++;
          if (session.status === 'COMPLETED') completedSessions++;
        });
      }
    });
    
    return {
      totalCourses,
      totalSessions,
      totalRecordings,
      upcomingSessions,
      completedSessions
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading all courses and recordings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <DashboardLayout activePage="/recordings/all">
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
     
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                <FaBook className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalCourses}</div>
                <div className="text-sm text-gray-600">Total Courses</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3">
                <FaVideo className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
                <div className="text-sm text-gray-600">Live Sessions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg mr-3">
                <FaCheckCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.completedSessions}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                <FaRegCalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.upcomingSessions}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3">
                <FaFileVideo className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalRecordings}</div>
                <div className="text-sm text-gray-600">Recordings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div className="relative flex-1 max-w-lg">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search courses, instructors, or sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <FaFilter className="h-4 w-4 text-gray-500 mr-2" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="LIVE">Live</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <FaSort className="h-4 w-4 text-gray-500 mr-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="date">Sort by Date</option>
                  <option value="title">Sort by Title</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Courses List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaBook className="h-5 w-5 mr-2 text-blue-600" />
                  All Courses ({filteredCourses.length})
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Click on a course to view its sessions
                </p>
              </div>
              
              <div className="overflow-y-auto max-h-[700px]">
                {filteredCourses.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredCourses.map((course) => (
                      <div
                        key={course._id}
                        className={`transition-colors duration-200 ${
                          selectedCourse?._id === course._id 
                            ? 'bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Course Header */}
                        <button
                          onClick={() => handleCourseSelect(course)}
                          className="w-full text-left p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-gray-900 text-sm md:text-base">
                                {course.title}
                              </h4>
                              <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded-full ml-2">
                                {course.liveClasses?.length || 0} sessions
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <div className="flex items-center text-xs text-gray-600">
                                <FaUser className="h-3 w-3 mr-1" />
                                {course.instructor}
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <FaUsers className="h-3 w-3 mr-1" />
                                {course.enrolledCount || 0} enrolled
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <FaClock className="h-3 w-3 mr-1" />
                                {course.duration || 0}h total
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            {expandedCourses[course._id] ? (
                              <FaChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <FaChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </button>
                        
                        {/* Course Sessions (Expanded) */}
                        {expandedCourses[course._id] && course.liveClasses && course.liveClasses.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="ml-4 pl-4 border-l-2 border-gray-200">
                              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Live Sessions
                              </h5>
                              <div className="space-y-3">
                                {getSortedSessions(course.liveClasses)
                                  .filter(session => filterStatus === 'all' || session.status === filterStatus)
                                  .map((session) => (
                                    <div
                                      key={session._id}
                                      className={`rounded-lg border p-3 transition-all duration-200 ${
                                        selectedSession?._id === session._id
                                          ? 'border-blue-300 bg-blue-25 shadow-sm'
                                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                      }`}
                                    >
                                      <button
                                        onClick={() => handleSessionSelect(session)}
                                        className="w-full text-left"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h6 className="font-medium text-gray-900 text-sm">
                                              {session.sessionTitle}
                                            </h6>
                                            <div className="flex items-center flex-wrap gap-2 mt-1">
                                              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center ${getStatusColor(session.status)}`}>
                                                {getStatusIcon(session.status)}
                                                {session.status}
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                {formatDateTime(session.scheduleAt)}
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                <FaHashtag className="inline h-3 w-3 mr-1" />
                                                {session.roomCode}
                                              </span>
                                            </div>
                                          </div>
                                          <FaEye className={`h-4 w-4 ml-2 ${
                                            selectedSession?._id === session._id
                                              ? 'text-blue-600'
                                              : 'text-gray-400'
                                          }`} />
                                        </div>
                                        
                                        {session.description && (
                                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                            {session.description}
                                          </p>
                                        )}
                                      </button>
                                      
                                      {/* Session Recordings (if expanded and selected) */}
                                      {expandedSessions[session._id] && selectedSession?._id === session._id && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          {loadingRecordings ? (
                                            <div className="flex items-center justify-center py-2">
                                              <FaSpinner className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                                              <span className="text-xs text-gray-600">Loading recordings...</span>
                                            </div>
                                          ) : sessionRecordings.length > 0 ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center text-xs font-medium text-gray-700">
                                                <FaFileVideo className="h-3 w-3 mr-2" />
                                                Recordings ({sessionRecordings.length})
                                              </div>
                                              <div className="space-y-2">
                                                {sessionRecordings.map((recording, index) => (
                                                  <a
                                                    key={index}
                                                    href={recording.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs text-gray-700 transition-colors"
                                                  >
                                                    <div className="flex items-center">
                                                      <FaPlayCircle className="h-3 w-3 mr-2 text-blue-600" />
                                                      <span>
                                                        {recording.title || `Recording ${index + 1}`}
                                                      </span>
                                                    </div>
                                                    <FaExternalLinkAlt className="h-3 w-3 text-gray-400" />
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-center py-2">
                                              <p className="text-xs text-gray-500">
                                                No recordings available for this session
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FaBook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">No Courses Found</h4>
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? 'Try adjusting your search terms' : 'No courses available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Session Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden sticky top-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaFileVideo className="h-5 w-5 mr-2 text-purple-600" />
                  Session Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSession ? 'View recording details' : 'Select a session to view details'}
                </p>
              </div>
              
              <div className="p-6">
                {selectedSession ? (
                  <div className="space-y-6">
                    {/* Session Header */}
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg mb-2">
                        {selectedSession.sessionTitle}
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(selectedSession.status)}`}>
                          {getStatusIcon(selectedSession.status)}
                          {selectedSession.status}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                          {getSessionDuration(selectedSession.duration)}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium font-mono">
                          <FaHashtag className="inline h-3 w-3 mr-1" />
                          {selectedSession.roomCode}
                        </span>
                      </div>
                    </div>

                    {/* Session Info */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FaCalendarAlt className="h-4 w-4 mr-2 text-gray-500" />
                          Schedule Information
                        </h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Scheduled Date:</span>
                            <span className="font-medium">{formatDate(selectedSession.scheduleAt)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Scheduled Time:</span>
                            <span className="font-medium">{formatTime(selectedSession.scheduleAt)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Participants:</span>
                            <span className="font-medium">
                              {selectedSession.currentParticipants || 0} / {selectedSession.maxParticipants || 100}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Course Info */}
                      {selectedCourse && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <FaBook className="h-4 w-4 mr-2 text-blue-600" />
                            Course Information
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Course:</span>
                              <span className="font-medium">{selectedCourse.title}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Instructor:</span>
                              <span className="font-medium">{selectedCourse.instructor}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Enrolled Students:</span>
                              <span className="font-medium">{selectedCourse.enrolledCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Session Description */}
                      {selectedSession.description && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <FaFileVideo className="h-4 w-4 mr-2 text-gray-500" />
                            Session Description
                          </h5>
                          <p className="text-sm text-gray-600 whitespace-pre-line">
                            {selectedSession.description}
                          </p>
                        </div>
                      )}

                      {/* Recordings Section */}
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FaFileVideo className="h-4 w-4 mr-2 text-purple-600" />
                          Available Recordings
                        </h5>
                        
                        {loadingRecordings ? (
                          <div className="flex items-center justify-center py-4">
                            <FaSpinner className="h-5 w-5 animate-spin text-purple-600 mr-3" />
                            <span className="text-gray-600">Loading recordings...</span>
                          </div>
                        ) : sessionRecordings.length > 0 ? (
                          <div className="space-y-3">
                            {sessionRecordings.map((recording, index) => (
                              <a
                                key={index}
                                href={recording.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-3 transition-all duration-200 hover:shadow-md hover:border-purple-300 group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3 group-hover:bg-purple-200 transition-colors">
                                      <FaPlayCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h6 className="font-medium text-gray-900 text-sm">
                                        {recording.title || `Recording ${index + 1}`}
                                      </h6>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Added: {recording.createdAt ? formatDate(recording.createdAt) : 'Recently'}
                                      </p>
                                    </div>
                                  </div>
                                  <FaExternalLinkAlt className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <FaFileVideo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">
                              {selectedSession.status === 'COMPLETED'
                                ? 'No recordings available for this session'
                                : selectedSession.status === 'SCHEDULED'
                                ? 'Recordings will be available after session completion'
                                : 'This session has no recordings'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Session Features */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FaVideo className="h-4 w-4 mr-2 text-gray-500" />
                          Session Features
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`flex items-center p-2 rounded ${
                            selectedSession.chatEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <FaComment className={`h-3 w-3 mr-2 ${
                              selectedSession.chatEnabled ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <span className="text-xs">Chat {selectedSession.chatEnabled ? '✓' : '✗'}</span>
                          </div>
                          <div className={`flex items-center p-2 rounded ${
                            selectedSession.whiteboardEnabled
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <FaChalkboard className={`h-3 w-3 mr-2 ${
                              selectedSession.whiteboardEnabled ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <span className="text-xs">Whiteboard {selectedSession.whiteboardEnabled ? '✓' : '✗'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaVideo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">No Session Selected</h4>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      Select a session from the courses list to view its details and recordings
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default AllCourseRecordingsPage;