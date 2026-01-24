import React, { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for recording timer functionality
 */
export const useRecordingTimer = () => {
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingInterval, setRecordingInterval] = useState(null);

  // Timer cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [recordingInterval]);

  const startRecordingTimer = useCallback(() => {
    const startTime = Date.now();
    setRecordingStartTime(startTime);
    setRecordingTimer(0);

    const interval = setInterval(() => {
      setRecordingTimer(prev => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        return elapsed;
      });
    }, 1000);

    setRecordingInterval(interval);
  }, []);

  const stopRecordingTimer = useCallback(() => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    setRecordingTimer(0);
    setRecordingStartTime(null);
  }, [recordingInterval]);

  const resetRecordingTimer = useCallback(() => {
    stopRecordingTimer();
    setRecordingTimer(0);
    setRecordingStartTime(null);
  }, [stopRecordingTimer]);

  const formatRecordingTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    recordingTimer,
    recordingStartTime,
    isRecordingActive: recordingStartTime !== null,
    startRecordingTimer,
    stopRecordingTimer,
    resetRecordingTimer,
    formatRecordingTime
  };
};

/**
 * Utility function for formatting time (without hook)
 */
export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Recording timer display component
 */
export const RecordingTimerDisplay = ({ 
  timer, 
  isRecording = true, 
  showLabel = true, 
  className = '' 
}) => {
  if (!isRecording || timer === 0) return null;

  return (
    <div className={`flex items-center space-x-2 bg-red-600/80 text-sm text-white px-3 py-1.5 rounded-lg backdrop-blur-sm animate-pulse ${className}`}>
      <div className="w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
      <span className="font-mono font-bold">{formatTime(timer)}</span>
      {showLabel && <span className="text-xs text-red-100">REC</span>}
    </div>
  );
};

/**
 * Recording status badge component
 */
export const RecordingStatusBadge = ({ 
  isRecording, 
  timer, 
  size = 'sm' 
}) => {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  if (!isRecording) return null;

  return (
    <div className={`flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-red-700 rounded-full ${sizes[size]}`}>
      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
      <span className="font-mono font-bold">{formatTime(timer)}</span>
      <span className="text-xs opacity-90">REC</span>
    </div>
  );
};

// Optional: Default export bhi add kar sakte hain
export default {
  useRecordingTimer,
  RecordingTimerDisplay,
  RecordingStatusBadge,
  formatTime
};