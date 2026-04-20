import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSquare, 
  FiPause, 
  FiPlay, 
  FiSave, 
  FiUpload, 
  FiDownload, 
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiHardDrive,
  FiCloud
} from 'react-icons/fi';
import { BsFillRecordFill } from "react-icons/bs";
import { toast } from 'react-toastify';
import RecordRTC from 'recordrtc';

const ScreenRecorderComponent = ({ 
  sessionId, 
  roomCode, 
  user, 
  onClose,
  autoStart = false
}) => {
  // Main states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorder, setRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  // Save options
  const [saveOptions, setSaveOptions] = useState({
    local: true,
    backend: false,
    title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
  });
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const previewRef = useRef(null);
  const hasStartedRef = useRef(false);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dummy API for backend save
  const uploadRecordingToBackend = async (blob, metadata) => {
    setIsUploading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // In real implementation, replace with actual API call
      const mockResponse = {
        success: true,
        fileUrl: `https://your-backend.com/recordings/${Date.now()}.webm`,
        fileId: `rec_${Date.now()}`,
        message: 'Recording uploaded successfully'
      };
      
      toast.success('Recording uploaded to backend!');
      return mockResponse;
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload to backend');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Start recording - browser's built-in modal will open automatically
  const startRecording = async () => {
    // Prevent multiple starts
    if (isRecording || isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      toast.info('Starting screen recording...');
      
      // Browser will show its own modal for screen selection
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          frameRate: 60,
        },
        audio: true,
      }).catch(error => {
        // Handle user cancellation or permission denial
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          toast.info('Screen sharing cancelled or permission denied');
          throw new Error('SCREEN_SHARE_CANCELLED');
        }
        throw error;
      });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      }).catch(error => {
        // Stop screen stream if mic permission is denied
        screenStream.getTracks().forEach(track => track.stop());
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone permission is required for recording');
        }
        throw error;
      });

      // Combine streams
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...micStream.getAudioTracks(),
      ]);

      mediaStreamRef.current = combinedStream;

      // Create recorder with simple settings
      const recorderInstance = RecordRTC(combinedStream, {
        type: 'video',
        mimeType: 'video/webm',
        recorderType: RecordRTC.MediaStreamRecorder,
        disableLogs: true,
        timeSlice: 1000,
        ondataavailable: (blob) => {
          // Optional: handle chunks if needed
        },
      });

      setRecorder(recorderInstance);
      recorderInstance.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setIsInitializing(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started!');

      // Handle screen share stop (when user clicks "Stop sharing" in browser)
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
        toast.info('Screen sharing stopped by user');
      };

      // Handle microphone track ending
      micStream.getAudioTracks()[0].onended = () => {
        stopRecording();
        toast.info('Microphone access was revoked');
      };

      // Show preview
      if (previewRef.current) {
        previewRef.current.srcObject = combinedStream;
        previewRef.current.play().catch(console.error);
      }

    } catch (error) {
      console.error('Recording error:', error);
      setIsInitializing(false);
      
      if (error.message === 'SCREEN_SHARE_CANCELLED') {
        // If user cancelled screen share, close the modal
        onClose();
      } else {
        toast.error(`Failed to start recording: ${error.message}`);
      }
      
      // Clean up any tracks that might have been created
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (recorder && isRecording && !isPaused) {
      recorder.pauseRecording();
      setIsPaused(true);
      clearInterval(timerRef.current);
      toast.info('Recording paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (recorder && isRecording && isPaused) {
      recorder.resumeRecording();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      toast.info('Recording resumed');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (recorder && isRecording) {
      clearInterval(timerRef.current);
      
      return new Promise((resolve) => {
        recorder.stopRecording(() => {
          const blob = recorder.getBlob();
          setRecordedBlob(blob);
          setIsRecording(false);
          setIsPaused(false);
          
          // Stop all media tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
              track.stop();
              track.enabled = false;
            });
            mediaStreamRef.current = null;
          }
          
          // Clear preview
          if (previewRef.current) {
            previewRef.current.srcObject = null;
          }
          
          toast.success('Recording stopped');
          resolve(blob);
        });
      });
    }
  };

  // Save recording locally
  const saveRecordingLocally = (blob) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = saveOptions.title 
        ? `${saveOptions.title}.webm`
        : `recording_${sessionId || 'session'}_${Date.now()}.webm`;
      
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Recording saved locally!');
      return true;
    } catch (error) {
      console.error('Local save error:', error);
      toast.error('Failed to save recording locally');
      return false;
    }
  };

  // Handle save
  const handleSaveRecording = async () => {
    if (!recordedBlob) return;

    setIsSaving(true);
    const metadata = {
      title: saveOptions.title,
      duration: recordingTime,
      size: recordedBlob.size,
      timestamp: new Date().toISOString(),
      sessionId,
      roomCode,
      userId: user?.id,
      userName: user?.name,
    };

    let success = true;

    try {
      // Save locally if selected
      if (saveOptions.local) {
        const localSuccess = saveRecordingLocally(recordedBlob);
        if (!localSuccess) success = false;
      }

      // Save to backend if selected
      if (saveOptions.backend) {
        try {
          const uploadResult = await uploadRecordingToBackend(recordedBlob, metadata);
          console.log('Upload result:', uploadResult);
          
        } catch (uploadError) {
          console.error('Backend save failed:', uploadError);
          if (saveOptions.local) {
            toast.error('Backend save failed, but local save completed');
          } else {
            toast.error('Backend save failed');
            success = false;
          }
        }
      }

      if (success) {
        toast.success('Recording saved successfully!');
        resetRecording();
        onClose(); // Close modal after saving
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Reset recording
  const resetRecording = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setSaveOptions({
      local: true,
      backend: false,
      title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Auto-start recording when component mounts with autoStart prop
  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      // Small delay to ensure component is mounted
      setTimeout(() => {
        startRecording();
      }, 100);
    }
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      if (recordedBlob) {
        URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
      }
    };
  }, [recordedBlob]);

  // Handle component close
  const handleClose = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    // Close the modal
    onClose();
  };

  // Manual start recording button handler
  const handleManualStart = () => {
    startRecording();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <BsFillRecordFill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Screen Recorder</h2>
              <p className="text-xs text-gray-400">Record your screen</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isSaving || isUploading || isInitializing}
          >
            <FiX className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video relative mb-4">
            {isRecording ? (
              <video
                ref={previewRef}
                autoPlay
                muted
                className="w-full h-full object-contain"
              />
            ) : recordedBlob ? (
              <video
                src={URL.createObjectURL(recordedBlob)}
                controls
                className="w-full h-full object-contain"
                onLoad={() => URL.revokeObjectURL(URL.createObjectURL(recordedBlob))}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                {isInitializing ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                    <p className="text-sm text-white">Starting recording...</p>
                    <p className="text-xs mt-1 text-gray-400">
                      Select screen/window when prompted
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <BsFillRecordFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Recording preview will appear here</p>
                    <p className="text-xs mt-1 text-gray-600">
                      Click Start Recording to begin
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <div className="flex items-center space-x-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  <FiClock className="h-3 w-3" />
                  <span>{formatTime(recordingTime)}</span>
                  {isPaused && (
                    <span className="text-yellow-400 ml-1">(PAUSED)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center space-x-3 mb-4">
            {!isRecording && !recordedBlob ? (
              <button
                onClick={handleManualStart}
                className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRecording || isSaving || isUploading || isInitializing}
              >
                {isInitializing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <BsFillRecordFill className="h-4 w-4" />
                    <span className="font-medium">Start Recording</span>
                  </>
                )}
              </button>
            ) : isRecording ? (
              <>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <FiSquare className="h-4 w-4" />
                  <span>Stop</span>
                </button>
                
                {!isPaused ? (
                  <button
                    onClick={pauseRecording}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    <FiPause className="h-4 w-4" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <FiPlay className="h-4 w-4" />
                    <span>Resume</span>
                  </button>
                )}
              </>
            ) : null}
          </div>

          {/* Save Options (after recording) */}
          {recordedBlob && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-3">Save Recording</h3>
                
                {/* Recording Info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-900/50 p-3 rounded">
                    <p className="text-xs text-gray-400">Duration</p>
                    <p className="text-sm font-semibold text-white">{formatTime(recordingTime)}</p>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded">
                    <p className="text-xs text-gray-400">Size</p>
                    <p className="text-sm font-semibold text-white">{formatFileSize(recordedBlob.size)}</p>
                  </div>
                </div>

                {/* Title Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Recording Title
                  </label>
                  <input
                    type="text"
                    value={saveOptions.title}
                    onChange={(e) => setSaveOptions(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter recording title"
                  />
                </div>

                {/* Save Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FiHardDrive className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Save Locally</p>
                        <p className="text-xs text-gray-400">Download to your computer</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveOptions.local}
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, local: e.target.checked }))}
                        className="sr-only peer"
                        disabled={isUploading}
                      />
                      <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FiCloud className="h-4 w-4 text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Save to Backend</p>
                        <p className="text-xs text-gray-400">Upload to server</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveOptions.backend}
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, backend: e.target.checked }))}
                        className="sr-only peer"
                        disabled={isUploading}
                      />
                      <div className={`w-10 h-5 ${isUploading ? 'bg-gray-800' : 'bg-gray-700'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600`}></div>
                    </label>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleSaveRecording}
                    disabled={isSaving || isUploading || (!saveOptions.local && !saveOptions.backend)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving || isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-sm">{isUploading ? 'Uploading...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="h-4 w-4" />
                        <span className="font-medium">Save Recording</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={resetRecording}
                    className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    disabled={isSaving || isUploading}
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions - only show when not auto-starting */}
          {!recordedBlob && !isRecording && !isInitializing && !autoStart && (
            <div className="text-center text-gray-500 text-sm">
              <p>Click "Start Recording" to begin</p>
              <p className="text-xs mt-1">
                Browser will prompt you to select screen/window to record
              </p>
              <p className="text-xs mt-1">Recording includes screen and microphone audio</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              {isInitializing && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                  <span>Starting...</span>
                </>
              )}
              {isRecording && !isPaused && (
                <>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span>Recording</span>
                </>
              )}
              {isRecording && isPaused && (
                <>
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <span>Paused</span>
                </>
              )}
              {!isRecording && recordedBlob && (
                <>
                  <FiCheckCircle className="h-3 w-3 text-green-500" />
                  <span>Ready to save</span>
                </>
              )}
            </div>
            <div>
              {isRecording && (
                <span className="text-gray-400">{formatTime(recordingTime)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenRecorderComponent; 






// import React, { useState, useEffect, useRef } from 'react';
// import { 
//   FiSquare, 
//   FiPause, 
//   FiPlay, 
//   FiSave, 
//   FiUpload, 
//   FiDownload, 
//   FiX,
//   FiCheckCircle,
//   FiAlertCircle,
//   FiClock,
//   FiHardDrive,
//   FiCloud
// } from 'react-icons/fi';
// import { BsFillRecordFill } from "react-icons/bs";
// import { toast } from 'react-toastify';
// import RecordRTC from 'recordrtc';

// const ScreenRecorderComponent = ({ 
//   sessionId, 
//   roomCode, 
//   user, 
//   onClose,
//   autoStart = false // New prop for auto-starting recording
// }) => {
//   // Main states
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [recorder, setRecorder] = useState(null);
//   const [recordedBlob, setRecordedBlob] = useState(null);
  
//   // Save options
//   const [saveOptions, setSaveOptions] = useState({
//     local: true,
//     backend: false,
//     title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
//   });
  
//   // UI states
//   const [isSaving, setIsSaving] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);
//   const [isInitializing, setIsInitializing] = useState(false);
  
//   // Refs
//   const timerRef = useRef(null);
//   const mediaStreamRef = useRef(null);
//   const previewRef = useRef(null);
//   const hasStartedRef = useRef(false);

//   // Format time display
//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Dummy API for backend save
//   const uploadRecordingToBackend = async (blob, metadata) => {
//     setIsUploading(true);
    
//     // Simulate API delay
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     try {
//       // In real implementation, replace with actual API call
//       const mockResponse = {
//         success: true,
//         fileUrl: `https://your-backend.com/recordings/${Date.now()}.webm`,
//         fileId: `rec_${Date.now()}`,
//         message: 'Recording uploaded successfully'
//       };
      
//       toast.success('Recording uploaded to backend!');
//       return mockResponse;
      
//     } catch (error) {
//       console.error('Upload error:', error);
//       toast.error('Failed to upload to backend');
//       throw error;
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // Start recording - browser's built-in modal will open automatically
//   const startRecording = async () => {
//     // Prevent multiple starts
//     if (isRecording || isInitializing) return;
    
//     setIsInitializing(true);
    
//     try {
//       toast.info('Starting screen recording...');
      
//       // Browser will show its own modal for screen selection
//       const screenStream = await navigator.mediaDevices.getDisplayMedia({
//         video: {
//           cursor: "always",
//           frameRate: 30,
//         },
//         audio: true,
//       }).catch(error => {
//         // Handle user cancellation or permission denial
//         if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
//           toast.info('Screen sharing cancelled or permission denied');
//           throw new Error('SCREEN_SHARE_CANCELLED');
//         }
//         throw error;
//       });

//       // If we get here, user has selected a screen to share
//       // Get microphone audio
//       const micStream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//         },
//       }).catch(error => {
//         // Stop screen stream if mic permission is denied
//         screenStream.getTracks().forEach(track => track.stop());
//         if (error.name === 'NotAllowedError') {
//           toast.error('Microphone permission is required for recording');
//         }
//         throw error;
//       });

//       // Combine streams
//       const combinedStream = new MediaStream([
//         ...screenStream.getVideoTracks(),
//         ...screenStream.getAudioTracks(),
//         ...micStream.getAudioTracks(),
//       ]);

//       mediaStreamRef.current = combinedStream;

//       // Create recorder with simple settings
//       const recorderInstance = RecordRTC(combinedStream, {
//         type: 'video',
//         mimeType: 'video/webm',
//         recorderType: RecordRTC.MediaStreamRecorder,
//         disableLogs: true,
//         timeSlice: 1000,
//         ondataavailable: (blob) => {
//           // Optional: handle chunks if needed
//         },
//       });

//       setRecorder(recorderInstance);
//       recorderInstance.startRecording();
//       setIsRecording(true);
//       setIsPaused(false);
//       setIsInitializing(false);
      
//       // Start timer
//       timerRef.current = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);

//       toast.success('Recording started!');

//       // Handle screen share stop (when user clicks "Stop sharing" in browser)
//       screenStream.getVideoTracks()[0].onended = () => {
//         stopRecording();
//         toast.info('Screen sharing stopped by user');
//       };

//       // Handle microphone track ending
//       micStream.getAudioTracks()[0].onended = () => {
//         stopRecording();
//         toast.info('Microphone access was revoked');
//       };

//       // Show preview
//       if (previewRef.current) {
//         previewRef.current.srcObject = combinedStream;
//         previewRef.current.play().catch(console.error);
//       }

//     } catch (error) {
//       console.error('Recording error:', error);
//       setIsInitializing(false);
      
//       if (error.message === 'SCREEN_SHARE_CANCELLED') {
//         // If user cancelled screen share, close the modal
//         onClose();
//       } else {
//         toast.error(`Failed to start recording: ${error.message}`);
//       }
      
//       // Clean up any tracks that might have been created
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => track.stop());
//         mediaStreamRef.current = null;
//       }
//     }
//   };

//   // Pause recording
//   const pauseRecording = () => {
//     if (recorder && isRecording && !isPaused) {
//       recorder.pauseRecording();
//       setIsPaused(true);
//       clearInterval(timerRef.current);
//       toast.info('Recording paused');
//     }
//   };

//   // Resume recording
//   const resumeRecording = () => {
//     if (recorder && isRecording && isPaused) {
//       recorder.resumeRecording();
//       setIsPaused(false);
//       timerRef.current = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);
//       toast.info('Recording resumed');
//     }
//   };

//   // Stop recording
//   const stopRecording = async () => {
//     if (recorder && isRecording) {
//       clearInterval(timerRef.current);
      
//       return new Promise((resolve) => {
//         recorder.stopRecording(() => {
//           const blob = recorder.getBlob();
//           setRecordedBlob(blob);
//           setIsRecording(false);
//           setIsPaused(false);
          
//           // Stop all media tracks
//           if (mediaStreamRef.current) {
//             mediaStreamRef.current.getTracks().forEach(track => {
//               track.stop();
//               track.enabled = false;
//             });
//             mediaStreamRef.current = null;
//           }
          
//           // Clear preview
//           if (previewRef.current) {
//             previewRef.current.srcObject = null;
//           }
          
//           toast.success('Recording stopped');
//           resolve(blob);
//         });
//       });
//     }
//   };

//   // Save recording locally
//   const saveRecordingLocally = (blob) => {
//     try {
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       const fileName = saveOptions.title 
//         ? `${saveOptions.title}.webm`
//         : `recording_${sessionId || 'session'}_${Date.now()}.webm`;
      
//       a.href = url;
//       a.download = fileName;
//       a.style.display = 'none';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
      
//       toast.success('Recording saved locally!');
//       return true;
//     } catch (error) {
//       console.error('Local save error:', error);
//       toast.error('Failed to save recording locally');
//       return false;
//     }
//   };

//   // Handle save
//   const handleSaveRecording = async () => {
//     if (!recordedBlob) return;

//     setIsSaving(true);
//     const metadata = {
//       title: saveOptions.title,
//       duration: recordingTime,
//       size: recordedBlob.size,
//       timestamp: new Date().toISOString(),
//       sessionId,
//       roomCode,
//       userId: user?.id,
//       userName: user?.name,
//     };

//     let success = true;

//     try {
//       // Save locally if selected
//       if (saveOptions.local) {
//         const localSuccess = saveRecordingLocally(recordedBlob);
//         if (!localSuccess) success = false;
//       }

//       // Save to backend if selected
//       if (saveOptions.backend) {
//         try {
//           const uploadResult = await uploadRecordingToBackend(recordedBlob, metadata);
//           console.log('Upload result:', uploadResult);
          
//         } catch (uploadError) {
//           console.error('Backend save failed:', uploadError);
//           if (saveOptions.local) {
//             toast.error('Backend save failed, but local save completed');
//           } else {
//             toast.error('Backend save failed');
//             success = false;
//           }
//         }
//       }

//       if (success) {
//         toast.success('Recording saved successfully!');
//         resetRecording();
//         onClose(); // Close modal after saving
//       }
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // Reset recording
//   const resetRecording = () => {
//     setRecordedBlob(null);
//     setRecordingTime(0);
//     setSaveOptions({
//       local: true,
//       backend: false,
//       title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
//     });
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   // Auto-start recording when component mounts with autoStart prop
//   useEffect(() => {
//     if (autoStart && !hasStartedRef.current) {
//       hasStartedRef.current = true;
//       // Small delay to ensure component is mounted
//       setTimeout(() => {
//         startRecording();
//       }, 100);
//     }
//   }, [autoStart]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//       }
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => {
//           track.stop();
//           track.enabled = false;
//         });
//       }
//       if (recordedBlob) {
//         URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
//       }
//     };
//   }, [recordedBlob]);

//   // Handle component close
//   const handleClose = () => {
//     // Stop recording if active
//     if (isRecording) {
//       stopRecording();
//     }
//     // Close the modal
//     onClose();
//   };

//   // Manual start recording button handler
//   const handleManualStart = () => {
//     startRecording();
//   };

//   return (
//     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
//       <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-700">
//           <div className="flex items-center space-x-3">
//             <div className="p-2 bg-red-600 rounded-lg">
//               <BsFillRecordFill className="h-5 w-5 text-white" />
//             </div>
//             <div>
//               <h2 className="text-lg font-bold text-white">Screen Recorder</h2>
//               <p className="text-xs text-gray-400">Record your screen</p>
//             </div>
//           </div>
          
//           <button
//             onClick={handleClose}
//             className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
//             disabled={isSaving || isUploading || isInitializing}
//           >
//             <FiX className="h-5 w-5 text-gray-400" />
//           </button>
//         </div>

//         {/* Preview Area */}
//         <div className="p-4">
//           <div className="bg-black rounded-lg overflow-hidden aspect-video relative mb-4">
//             {isRecording ? (
//               <video
//                 ref={previewRef}
//                 autoPlay
//                 muted
//                 className="w-full h-full object-contain"
//               />
//             ) : recordedBlob ? (
//               <video
//                 src={URL.createObjectURL(recordedBlob)}
//                 controls
//                 className="w-full h-full object-contain"
//                 onLoad={() => URL.revokeObjectURL(URL.createObjectURL(recordedBlob))}
//               />
//             ) : (
//               <div className="flex flex-col items-center justify-center h-full p-4">
//                 {isInitializing ? (
//                   <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
//                     <p className="text-sm text-white">Starting recording...</p>
//                     <p className="text-xs mt-1 text-gray-400">
//                       Select screen/window when prompted
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="text-center text-gray-500">
//                     <BsFillRecordFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
//                     <p className="text-sm">Recording preview will appear here</p>
//                     <p className="text-xs mt-1 text-gray-600">
//                       Click Start Recording to begin
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {/* Recording indicator */}
//             {isRecording && (
//               <div className="absolute top-3 left-3 flex items-center space-x-2">
//                 <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
//                 <div className="flex items-center space-x-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
//                   <FiClock className="h-3 w-3" />
//                   <span>{formatTime(recordingTime)}</span>
//                   {isPaused && (
//                     <span className="text-yellow-400 ml-1">(PAUSED)</span>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Recording Controls */}
//           <div className="flex justify-center space-x-3 mb-4">
//             {!isRecording && !recordedBlob ? (
//               <button
//                 onClick={handleManualStart}
//                 className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 disabled={isRecording || isSaving || isUploading || isInitializing}
//               >
//                 {isInitializing ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                     <span>Starting...</span>
//                   </>
//                 ) : (
//                   <>
//                     <BsFillRecordFill className="h-4 w-4" />
//                     <span className="font-medium">Start Recording</span>
//                   </>
//                 )}
//               </button>
//             ) : isRecording ? (
//               <>
//                 <button
//                   onClick={stopRecording}
//                   className="flex items-center space-x-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
//                 >
//                   <FiSquare className="h-4 w-4" />
//                   <span>Stop</span>
//                 </button>
                
//                 {!isPaused ? (
//                   <button
//                     onClick={pauseRecording}
//                     className="flex items-center space-x-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
//                   >
//                     <FiPause className="h-4 w-4" />
//                     <span>Pause</span>
//                   </button>
//                 ) : (
//                   <button
//                     onClick={resumeRecording}
//                     className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
//                   >
//                     <FiPlay className="h-4 w-4" />
//                     <span>Resume</span>
//                   </button>
//                 )}
//               </>
//             ) : null}
//           </div>

//           {/* Save Options (after recording) */}
//           {recordedBlob && (
//             <div className="space-y-4 animate-fadeIn">
//               <div className="bg-gray-800/50 p-4 rounded-lg">
//                 <h3 className="font-semibold text-white mb-3">Save Recording</h3>
                
//                 {/* Recording Info */}
//                 <div className="grid grid-cols-2 gap-3 mb-4">
//                   <div className="bg-gray-900/50 p-3 rounded">
//                     <p className="text-xs text-gray-400">Duration</p>
//                     <p className="text-sm font-semibold text-white">{formatTime(recordingTime)}</p>
//                   </div>
//                   <div className="bg-gray-900/50 p-3 rounded">
//                     <p className="text-xs text-gray-400">Size</p>
//                     <p className="text-sm font-semibold text-white">{formatFileSize(recordedBlob.size)}</p>
//                   </div>
//                 </div>

//                 {/* Title Input */}
//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-300 mb-1">
//                     Recording Title
//                   </label>
//                   <input
//                     type="text"
//                     value={saveOptions.title}
//                     onChange={(e) => setSaveOptions(prev => ({ ...prev, title: e.target.value }))}
//                     className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
//                     placeholder="Enter recording title"
//                   />
//                 </div>

//                 {/* Save Options */}
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-3">
//                       <FiHardDrive className="h-4 w-4 text-blue-400" />
//                       <div>
//                         <p className="text-sm font-medium text-white">Save Locally</p>
//                         <p className="text-xs text-gray-400">Download to your computer</p>
//                       </div>
//                     </div>
//                     <label className="relative inline-flex items-center cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={saveOptions.local}
//                         onChange={(e) => setSaveOptions(prev => ({ ...prev, local: e.target.checked }))}
//                         className="sr-only peer"
//                         disabled={isUploading}
//                       />
//                       <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
//                     </label>
//                   </div>

//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-3">
//                       <FiCloud className="h-4 w-4 text-green-400" />
//                       <div>
//                         <p className="text-sm font-medium text-white">Save to Backend</p>
//                         <p className="text-xs text-gray-400">Upload to server</p>
//                       </div>
//                     </div>
//                     <label className="relative inline-flex items-center cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={saveOptions.backend}
//                         onChange={(e) => setSaveOptions(prev => ({ ...prev, backend: e.target.checked }))}
//                         className="sr-only peer"
//                         disabled={isUploading}
//                       />
//                       <div className={`w-10 h-5 ${isUploading ? 'bg-gray-800' : 'bg-gray-700'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600`}></div>
//                     </label>
//                   </div>
//                 </div>

//                 {/* Save Buttons */}
//                 <div className="flex space-x-3 mt-6">
//                   <button
//                     onClick={handleSaveRecording}
//                     disabled={isSaving || isUploading || (!saveOptions.local && !saveOptions.backend)}
//                     className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isSaving || isUploading ? (
//                       <>
//                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                         <span className="text-sm">{isUploading ? 'Uploading...' : 'Saving...'}</span>
//                       </>
//                     ) : (
//                       <>
//                         <FiSave className="h-4 w-4" />
//                         <span className="font-medium">Save Recording</span>
//                       </>
//                     )}
//                   </button>

//                   <button
//                     onClick={resetRecording}
//                     className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
//                     disabled={isSaving || isUploading}
//                   >
//                     <FiX className="h-4 w-4" />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Instructions - only show when not auto-starting */}
//           {!recordedBlob && !isRecording && !isInitializing && !autoStart && (
//             <div className="text-center text-gray-500 text-sm">
//               <p>Click "Start Recording" to begin</p>
//               <p className="text-xs mt-1">
//                 Browser will prompt you to select screen/window to record
//               </p>
//               <p className="text-xs mt-1">Recording includes screen and microphone audio</p>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
//           <div className="flex items-center justify-between text-xs text-gray-500">
//             <div className="flex items-center space-x-1">
//               {isInitializing && (
//                 <>
//                   <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
//                   <span>Starting...</span>
//                 </>
//               )}
//               {isRecording && !isPaused && (
//                 <>
//                   <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
//                   <span>Recording</span>
//                 </>
//               )}
//               {isRecording && isPaused && (
//                 <>
//                   <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
//                   <span>Paused</span>
//                 </>
//               )}
//               {!isRecording && recordedBlob && (
//                 <>
//                   <FiCheckCircle className="h-3 w-3 text-green-500" />
//                   <span>Ready to save</span>
//                 </>
//               )}
//             </div>
//             <div>
//               {isRecording && (
//                 <span className="text-gray-400">{formatTime(recordingTime)}</span>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ScreenRecorderComponent;













// import React, { useState, useEffect, useRef } from 'react';
// import { 
//   FiSquare, FiPause, FiPlay, FiSave, FiX,
//   FiCheckCircle, FiClock, FiHardDrive, FiCloud
// } from 'react-icons/fi';
// import { BsFillRecordFill } from "react-icons/bs";
// import { toast } from 'react-toastify';
// import RecordRTC from 'recordrtc';

// const ScreenRecorderComponent = ({ 
//   sessionId, 
//   roomCode, 
//   user, 
//   onClose,
//   autoStart = false,
//   existingMediaStream = null // ✅ Added prop to receive main stream
// }) => {
//   // Main states
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [recorder, setRecorder] = useState(null);
//   const [recordedBlob, setRecordedBlob] = useState(null);
  
//   // Save options
//   const [saveOptions, setSaveOptions] = useState({
//     local: true,
//     backend: false,
//     title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
//   });
  
//   // UI states
//   const [isSaving, setIsSaving] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);
//   const [isInitializing, setIsInitializing] = useState(false);
  
//   // Refs
//   const timerRef = useRef(null);
//   const mediaStreamRef = useRef(null);
//   const previewRef = useRef(null);
//   const hasStartedRef = useRef(false);

//   // Format time display
//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Dummy API for backend save
//   const uploadRecordingToBackend = async (blob, metadata) => {
//     setIsUploading(true);
//     await new Promise(resolve => setTimeout(resolve, 2000));
//     try {
//       const mockResponse = {
//         success: true,
//         fileUrl: `https://your-backend.com/recordings/${Date.now()}.webm`,
//         fileId: `rec_${Date.now()}`,
//         message: 'Recording uploaded successfully'
//       };
//       toast.success('Recording uploaded to backend!');
//       return mockResponse;
//     } catch (error) {
//       console.error('Upload error:', error);
//       toast.error('Failed to upload to backend');
//       throw error;
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // Start recording
//   const startRecording = async () => {
//     if (isRecording || isInitializing) return;
    
//     setIsInitializing(true);
    
//     try {
//       toast.info('Starting screen recording...');
      
//       // 1. Get Screen Stream (This is independent/separate call as requested)
//       const screenStream = await navigator.mediaDevices.getDisplayMedia({
//         video: {
//           cursor: "always",
//           frameRate: 30,
//         },
//         audio: true, // System audio capture
//       }).catch(error => {
//         if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
//           throw new Error('SCREEN_SHARE_CANCELLED');
//         }
//         throw error;
//       });

//       // 2. Handle Microphone Logic (CRITICAL FIX)
//       let micTracks = [];
//       let micStreamForStop = null; // To keep track if we created a NEW stream

//       // Check if main session has audio we can clone
//       if (existingMediaStream && existingMediaStream.getAudioTracks().length > 0) {
//         console.log("🎤 Cloning existing microphone track...");
//         // Clone the track so stopping it doesn't affect the main camera
//         const clonedTrack = existingMediaStream.getAudioTracks()[0].clone();
//         micTracks = [clonedTrack];
//       } else {
//         // Fallback: Only request new mic if main session has none
//         console.log("🎤 Requesting new microphone permission...");
//         try {
//           const micStream = await navigator.mediaDevices.getUserMedia({
//             audio: {
//               echoCancellation: true,
//               noiseSuppression: true,
//             },
//           });
//           micTracks = micStream.getAudioTracks();
//           micStreamForStop = micStream; // We own this stream, so we can stop it later
//         } catch (err) {
//           console.warn("Could not get microphone:", err);
//           toast.warn("Recording without microphone audio");
//         }
//       }

//       // 3. Combine Screen + Mic
//       const combinedStream = new MediaStream([
//         ...screenStream.getVideoTracks(),
//         ...screenStream.getAudioTracks(), // System audio
//         ...micTracks // Cloned Mic audio
//       ]);

//       mediaStreamRef.current = combinedStream;

//       // 4. Initialize Recorder
//       const recorderInstance = RecordRTC(combinedStream, {
//         type: 'video',
//         mimeType: 'video/webm',
//         recorderType: RecordRTC.MediaStreamRecorder,
//         disableLogs: true,
//         timeSlice: 1000,
//       });

//       setRecorder(recorderInstance);
//       recorderInstance.startRecording();
//       setIsRecording(true);
//       setIsPaused(false);
//       setIsInitializing(false);
      
//       // Start timer
//       timerRef.current = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);

//       toast.success('Recording started!');

//       // Handle screen share stop (System UI)
//       screenStream.getVideoTracks()[0].onended = () => {
//         stopRecording();
//         toast.info('Screen sharing stopped by user');
//       };

//       // Preview setup
//       if (previewRef.current) {
//         previewRef.current.srcObject = combinedStream;
//         previewRef.current.play().catch(console.error);
//       }

//     } catch (error) {
//       console.error('Recording error:', error);
//       setIsInitializing(false);
      
//       if (error.message === 'SCREEN_SHARE_CANCELLED') {
//         onClose();
//       } else {
//         toast.error(`Failed to start: ${error.message}`);
//       }
      
//       // Cleanup on error
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => track.stop());
//         mediaStreamRef.current = null;
//       }
//     }
//   };

//   // Pause recording
//   const pauseRecording = () => {
//     if (recorder && isRecording && !isPaused) {
//       recorder.pauseRecording();
//       setIsPaused(true);
//       clearInterval(timerRef.current);
//       toast.info('Recording paused');
//     }
//   };

//   // Resume recording
//   const resumeRecording = () => {
//     if (recorder && isRecording && isPaused) {
//       recorder.resumeRecording();
//       setIsPaused(false);
//       timerRef.current = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);
//       toast.info('Recording resumed');
//     }
//   };

//   // Stop recording
//   const stopRecording = async () => {
//     if (recorder && isRecording) {
//       clearInterval(timerRef.current);
      
//       return new Promise((resolve) => {
//         recorder.stopRecording(() => {
//           const blob = recorder.getBlob();
//           setRecordedBlob(blob);
//           setIsRecording(false);
//           setIsPaused(false);
          
//           // Stop tracks safely
//           if (mediaStreamRef.current) {
//             mediaStreamRef.current.getTracks().forEach(track => {
//               // Only stop tracks that we created/cloned. 
//               // Since we cloned the audio, calling stop() here destroys the clone, 
//               // leaving the original camera audio intact.
//               track.stop();
//               track.enabled = false;
//             });
//             mediaStreamRef.current = null;
//           }
          
//           // Clear preview
//           if (previewRef.current) {
//             previewRef.current.srcObject = null;
//           }
          
//           toast.success('Recording stopped');
//           resolve(blob);
//         });
//       });
//     }
//   };

//   // Save recording locally
//   const saveRecordingLocally = (blob) => {
//     try {
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       const fileName = saveOptions.title 
//         ? `${saveOptions.title}.webm`
//         : `recording_${sessionId || 'session'}_${Date.now()}.webm`;
      
//       a.href = url;
//       a.download = fileName;
//       a.style.display = 'none';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
      
//       toast.success('Recording saved locally!');
//       return true;
//     } catch (error) {
//       console.error('Local save error:', error);
//       toast.error('Failed to save recording locally');
//       return false;
//     }
//   };

//   // Handle save
//   const handleSaveRecording = async () => {
//     if (!recordedBlob) return;

//     setIsSaving(true);
//     const metadata = {
//       title: saveOptions.title,
//       duration: recordingTime,
//       size: recordedBlob.size,
//       timestamp: new Date().toISOString(),
//       sessionId,
//       roomCode,
//       userId: user?.id,
//       userName: user?.name,
//     };

//     let success = true;

//     try {
//       // Save locally if selected
//       if (saveOptions.local) {
//         const localSuccess = saveRecordingLocally(recordedBlob);
//         if (!localSuccess) success = false;
//       }

//       // Save to backend if selected
//       if (saveOptions.backend) {
//         try {
//           await uploadRecordingToBackend(recordedBlob, metadata);
//         } catch (uploadError) {
//           console.error('Backend save failed:', uploadError);
//           if (saveOptions.local) {
//             toast.error('Backend save failed, but local save completed');
//           } else {
//             toast.error('Backend save failed');
//             success = false;
//           }
//         }
//       }

//       if (success) {
//         toast.success('Recording saved successfully!');
//         resetRecording();
//         onClose();
//       }
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   // Reset recording
//   const resetRecording = () => {
//     setRecordedBlob(null);
//     setRecordingTime(0);
//     setSaveOptions({
//       local: true,
//       backend: false,
//       title: `Recording_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
//     });
//   };

//   // Format file size
//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   // Auto-start recording
//   useEffect(() => {
//     if (autoStart && !hasStartedRef.current) {
//       hasStartedRef.current = true;
//       setTimeout(() => {
//         startRecording();
//       }, 100);
//     }
//   }, [autoStart]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//       }
//       if (mediaStreamRef.current) {
//         mediaStreamRef.current.getTracks().forEach(track => {
//           track.stop();
//           track.enabled = false;
//         });
//       }
//       if (recordedBlob) {
//         URL.revokeObjectURL(URL.createObjectURL(recordedBlob));
//       }
//     };
//   }, [recordedBlob]);

//   // Handle component close
//   const handleClose = () => {
//     if (isRecording) {
//       stopRecording();
//     }
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
//       <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-700">
//           <div className="flex items-center space-x-3">
//             <div className="p-2 bg-red-600 rounded-lg">
//               <BsFillRecordFill className="h-5 w-5 text-white" />
//             </div>
//             <div>
//               <h2 className="text-lg font-bold text-white">Screen Recorder</h2>
//               <p className="text-xs text-gray-400">Record your screen</p>
//             </div>
//           </div>
          
//           <button
//             onClick={handleClose}
//             className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
//             disabled={isSaving || isUploading || isInitializing}
//           >
//             <FiX className="h-5 w-5 text-gray-400" />
//           </button>
//         </div>

//         {/* Preview Area */}
//         <div className="p-4">
//           <div className="bg-black rounded-lg overflow-hidden aspect-video relative mb-4">
//             {isRecording ? (
//               <video
//                 ref={previewRef}
//                 autoPlay
//                 muted
//                 className="w-full h-full object-contain"
//               />
//             ) : recordedBlob ? (
//               <video
//                 src={URL.createObjectURL(recordedBlob)}
//                 controls
//                 className="w-full h-full object-contain"
//                 onLoad={() => URL.revokeObjectURL(URL.createObjectURL(recordedBlob))}
//               />
//             ) : (
//               <div className="flex flex-col items-center justify-center h-full p-4">
//                 {isInitializing ? (
//                   <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
//                     <p className="text-sm text-white">Starting recording...</p>
//                     <p className="text-xs mt-1 text-gray-400">
//                       Select screen/window when prompted
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="text-center text-gray-500">
//                     <BsFillRecordFill className="h-12 w-12 mx-auto mb-3 opacity-50" />
//                     <p className="text-sm">Recording preview will appear here</p>
//                     <p className="text-xs mt-1 text-gray-600">
//                       Click Start Recording to begin
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {/* Recording indicator */}
//             {isRecording && (
//               <div className="absolute top-3 left-3 flex items-center space-x-2">
//                 <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
//                 <div className="flex items-center space-x-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
//                   <FiClock className="h-3 w-3" />
//                   <span>{formatTime(recordingTime)}</span>
//                   {isPaused && (
//                     <span className="text-yellow-400 ml-1">(PAUSED)</span>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Recording Controls */}
//           <div className="flex justify-center space-x-3 mb-4">
//             {!isRecording && !recordedBlob ? (
//               <button
//                 onClick={startRecording}
//                 className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 disabled={isRecording || isSaving || isUploading || isInitializing}
//               >
//                 {isInitializing ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                     <span>Starting...</span>
//                   </>
//                 ) : (
//                   <>
//                     <BsFillRecordFill className="h-4 w-4" />
//                     <span className="font-medium">Start Recording</span>
//                   </>
//                 )}
//               </button>
//             ) : isRecording ? (
//               <>
//                 <button
//                   onClick={stopRecording}
//                   className="flex items-center space-x-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
//                 >
//                   <FiSquare className="h-4 w-4" />
//                   <span>Stop</span>
//                 </button>
                
//                 {!isPaused ? (
//                   <button
//                     onClick={pauseRecording}
//                     className="flex items-center space-x-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
//                   >
//                     <FiPause className="h-4 w-4" />
//                     <span>Pause</span>
//                   </button>
//                 ) : (
//                   <button
//                     onClick={resumeRecording}
//                     className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
//                   >
//                     <FiPlay className="h-4 w-4" />
//                     <span>Resume</span>
//                   </button>
//                 )}
//               </>
//             ) : null}
//           </div>

//           {/* Save Options */}
//           {recordedBlob && (
//             <div className="space-y-4 animate-fadeIn">
//               <div className="bg-gray-800/50 p-4 rounded-lg">
//                 <h3 className="font-semibold text-white mb-3">Save Recording</h3>
                
//                 <div className="grid grid-cols-2 gap-3 mb-4">
//                   <div className="bg-gray-900/50 p-3 rounded">
//                     <p className="text-xs text-gray-400">Duration</p>
//                     <p className="text-sm font-semibold text-white">{formatTime(recordingTime)}</p>
//                   </div>
//                   <div className="bg-gray-900/50 p-3 rounded">
//                     <p className="text-xs text-gray-400">Size</p>
//                     <p className="text-sm font-semibold text-white">{formatFileSize(recordedBlob.size)}</p>
//                   </div>
//                 </div>

//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-300 mb-1">
//                     Recording Title
//                   </label>
//                   <input
//                     type="text"
//                     value={saveOptions.title}
//                     onChange={(e) => setSaveOptions(prev => ({ ...prev, title: e.target.value }))}
//                     className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
//                     placeholder="Enter recording title"
//                   />
//                 </div>

//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-3">
//                       <FiHardDrive className="h-4 w-4 text-blue-400" />
//                       <div>
//                         <p className="text-sm font-medium text-white">Save Locally</p>
//                         <p className="text-xs text-gray-400">Download to your computer</p>
//                       </div>
//                     </div>
//                     <label className="relative inline-flex items-center cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={saveOptions.local}
//                         onChange={(e) => setSaveOptions(prev => ({ ...prev, local: e.target.checked }))}
//                         className="sr-only peer"
//                         disabled={isUploading}
//                       />
//                       <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
//                     </label>
//                   </div>

//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-3">
//                       <FiCloud className="h-4 w-4 text-green-400" />
//                       <div>
//                         <p className="text-sm font-medium text-white">Save to Backend</p>
//                         <p className="text-xs text-gray-400">Upload to server</p>
//                       </div>
//                     </div>
//                     <label className="relative inline-flex items-center cursor-pointer">
//                       <input
//                         type="checkbox"
//                         checked={saveOptions.backend}
//                         onChange={(e) => setSaveOptions(prev => ({ ...prev, backend: e.target.checked }))}
//                         className="sr-only peer"
//                         disabled={isUploading}
//                       />
//                       <div className={`w-10 h-5 ${isUploading ? 'bg-gray-800' : 'bg-gray-700'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600`}></div>
//                     </label>
//                   </div>
//                 </div>

//                 <div className="flex space-x-3 mt-6">
//                   <button
//                     onClick={handleSaveRecording}
//                     disabled={isSaving || isUploading || (!saveOptions.local && !saveOptions.backend)}
//                     className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isSaving || isUploading ? (
//                       <>
//                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                         <span className="text-sm">{isUploading ? 'Uploading...' : 'Saving...'}</span>
//                       </>
//                     ) : (
//                       <>
//                         <FiSave className="h-4 w-4" />
//                         <span className="font-medium">Save Recording</span>
//                       </>
//                     )}
//                   </button>

//                   <button
//                     onClick={resetRecording}
//                     className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
//                     disabled={isSaving || isUploading}
//                   >
//                     <FiX className="h-4 w-4" />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {!recordedBlob && !isRecording && !isInitializing && !autoStart && (
//             <div className="text-center text-gray-500 text-sm">
//               <p>Click "Start Recording" to begin</p>
//               <p className="text-xs mt-1">
//                 Browser will prompt you to select screen/window to record
//               </p>
//               <p className="text-xs mt-1">Recording includes screen and microphone audio</p>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
//           <div className="flex items-center justify-between text-xs text-gray-500">
//             <div className="flex items-center space-x-1">
//               {isInitializing && (
//                 <>
//                   <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
//                   <span>Starting...</span>
//                 </>
//               )}
//               {isRecording && !isPaused && (
//                 <>
//                   <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
//                   <span>Recording</span>
//                 </>
//               )}
//               {isRecording && isPaused && (
//                 <>
//                   <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
//                   <span>Paused</span>
//                 </>
//               )}
//               {!isRecording && recordedBlob && (
//                 <>
//                   <FiCheckCircle className="h-3 w-3 text-green-500" />
//                   <span>Ready to save</span>
//                 </>
//               )}
//             </div>
//             <div>
//               {isRecording && (
//                 <span className="text-gray-400">{formatTime(recordingTime)}</span>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ScreenRecorderComponent;