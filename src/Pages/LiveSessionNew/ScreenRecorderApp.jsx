import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiVideo,
  FiSquare,
  FiLoader,
  FiPlay,
  FiPause,
  FiStopCircle,
  FiDownload,
  FiSettings,
  FiMonitor,
  FiMic,
  FiMicOff,
  FiVolume2,
  FiVolumeX,
  FiSave,
  FiList,
  FiTrash2,
  FiHardDrive
} from 'react-icons/fi';
import { BsFillRecordFill } from "react-icons/bs";
import { MdOutlineScreenShare, MdStopScreenShare } from "react-icons/md";

const ScreenRecorderApp = () => {
  // 🔴 रिकॉर्डिंग स्टेट्स
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  // 🎥 मीडिया स्टेट्स
  const [screenStream, setScreenStream] = useState(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // ⚙️ ऑडियो सेटिंग्स
  const [audioSettings, setAudioSettings] = useState({
    systemAudio: true,
    microphone: true,
    microphoneMuted: false
  });
  
  // 💾 लोकल स्टोरेज
  const [savedRecordings, setSavedRecordings] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  
  // 📦 रेफरेंस
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const chunksRef = useRef([]);
  
  // माउंट होने पर लोकल स्टोरेज से डेटा लोड करें
  useEffect(() => {
    loadSavedRecordings();
  }, []);
  
  // टाइमर फॉर्मेट
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // लोकल स्टोरेज से रिकॉर्डिंग्स लोड करें
  const loadSavedRecordings = () => {
    try {
      const saved = localStorage.getItem('screenRecordings');
      if (saved) {
        const recordings = JSON.parse(saved);
        setSavedRecordings(recordings);
        
        // स्टोरेज यूसेज कैलकुलेट करें
        const totalSize = recordings.reduce((total, recording) => {
          return total + (recording.size || 0);
        }, 0);
        setStorageUsed(totalSize);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };
  
  // रिकॉर्डिंग को लोकल स्टोरेज में सेव करें
  const saveRecordingToLocalStorage = (blob, duration) => {
    try {
      // ब्लॉब को Base64 में कन्वर्ट करें
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        
        const newRecording = {
          id: Date.now(),
          name: `Recording_${new Date().toLocaleString()}`,
          data: base64Data,
          duration: duration,
          size: blob.size,
          timestamp: new Date().toISOString(),
          format: blob.type
        };
        
        // मौजूदा रिकॉर्डिंग्स लोड करें
        const existingRecordings = JSON.parse(localStorage.getItem('screenRecordings') || '[]');
        
        // नई रिकॉर्डिंग एड करें
        const updatedRecordings = [newRecording, ...existingRecordings];
        
        // स्टोरेज में सेव करें (लिमिट: 500MB)
        const totalSize = updatedRecordings.reduce((total, rec) => total + (rec.size || 0), 0);
        const MAX_STORAGE = 500 * 1024 * 1024; // 500MB
        
        if (totalSize > MAX_STORAGE) {
          // पुरानी रिकॉर्डिंग्स डिलीट करें
          while (totalSize > MAX_STORAGE && updatedRecordings.length > 1) {
            const removed = updatedRecordings.pop();
            totalSize -= (removed.size || 0);
          }
        }
        
        localStorage.setItem('screenRecordings', JSON.stringify(updatedRecordings));
        setSavedRecordings(updatedRecordings);
        setStorageUsed(totalSize);
        
        toast.success(`Recording saved locally (${formatFileSize(blob.size)})`);
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
    }
  };
  
  // फाइल साइज फॉर्मेट
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // स्क्रीन कैप्चर शुरू करें
  const startScreenCapture = async () => {
    try {
      setIsLoading(true);
      
      const displayOptions = {
        video: {
          cursor: "always",
          displaySurface: "monitor",
          frameRate: { ideal: 30, max: 60 }
        },
        audio: audioSettings.systemAudio ? {
          suppressLocalAudioPlayback: false,
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false
        } : false
      };
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      
      // माइक्रोफोन स्ट्रीम
      let microphoneStream = null;
      if (audioSettings.microphone) {
        try {
          microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 2
            }
          });
        } catch (micError) {
          console.warn('Microphone access denied');
        }
      }
      
      // सभी स्ट्रीम्स को कॉम्बाइन करें
      const combinedStream = new MediaStream();
      
      // स्क्रीन वीडियो
      screenStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // सिस्टम ऑडियो
      if (audioSettings.systemAudio) {
        screenStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
      
      // माइक्रोफोन ऑडियो
      if (microphoneStream && !audioSettings.microphoneMuted) {
        microphoneStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
      
      setScreenStream(screenStream);
      setPreviewStream(combinedStream);
      
      // प्रिव्यू सेट करें
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
        previewVideoRef.current.play().catch(console.log);
      }
      
      // स्क्रीन शेयर बंद होने पर हैंडल
      screenStream.getVideoTracks()[0].onended = () => {
        if (isRecording) {
          stopRecording();
        }
        toast.info('Screen sharing stopped');
        cleanupStreams();
      };
      
      setIsLoading(false);
      return combinedStream;
      
    } catch (error) {
      console.error('Screen capture error:', error);
      setIsLoading(false);
      toast.error('Failed to capture screen');
      return null;
    }
  };
  
  // स्ट्रीम्स क्लीनअप
  const cleanupStreams = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setPreviewStream(null);
  };
  
  // रिकॉर्डिंग शुरू करें
  const startRecording = async () => {
    try {
      const stream = await startScreenCapture();
      if (!stream) return;
      
      // सपोर्टेड mimeTypes
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        toast.error('No supported recording format found');
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: 3000000 // 3 Mbps
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // डेटा कलेक्ट
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // रिकॉर्डिंग स्टॉप होने पर
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        const duration = recordingTime;
        
        // लोकल स्टोरेज में सेव करें
        saveRecordingToLocalStorage(blob, duration);
        
        // ऑटो डाउनलोड भी ऑफर करें
        offerDownload(blob, duration);
        
        // क्लीनअप
        cleanupStreams();
        chunksRef.current = [];
      };
      
      // रिकॉर्डिंग शुरू
      mediaRecorder.start(1000); // 1 सेकंड के chunks
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // टाइमर
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started!');
      
    } catch (error) {
      console.error('Recording start error:', error);
      toast.error('Failed to start recording');
    }
  };
  
  // ऑटो डाउनलोड ऑफर
  const offerDownload = (blob, duration) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.info(`Recording ready! Duration: ${formatTime(duration)}`);
  };
  
  // रिकॉर्डिंग पॉज/रिज्यूम
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.info('Recording resumed');
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info('Recording paused');
    }
  };
  
  // रिकॉर्डिंग रोकें
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsPaused(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    toast.info('Recording stopped and saved locally');
  };
  
  // रिकॉर्डिंग डाउनलोड करें
  const downloadRecording = (recording) => {
    try {
      const byteCharacters = atob(recording.data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: recording.format });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.name}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Recording downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download recording');
    }
  };
  
  // रिकॉर्डिंग डिलीट करें
  const deleteRecording = (id) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      const updatedRecordings = savedRecordings.filter(rec => rec.id !== id);
      localStorage.setItem('screenRecordings', JSON.stringify(updatedRecordings));
      setSavedRecordings(updatedRecordings);
      
      // स्टोरेज यूसेज अपडेट करें
      const totalSize = updatedRecordings.reduce((total, rec) => total + (rec.size || 0), 0);
      setStorageUsed(totalSize);
      
      toast.success('Recording deleted');
    }
  };
  
  // ऑडियो सेटिंग टॉगल
  const toggleAudioSetting = (setting) => {
    setAudioSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  // माइक्रोफोन म्यूट टॉगल
  const toggleMicrophoneMute = () => {
    if (!previewStream) return;
    
    const newMuteState = !audioSettings.microphoneMuted;
    setAudioSettings(prev => ({
      ...prev,
      microphoneMuted: newMuteState
    }));
    
    // माइक्रोफोन ट्रैक म्यूट करें
    if (previewStream) {
      previewStream.getAudioTracks()
        .filter(track => track.label.toLowerCase().includes('audio'))
        .forEach(track => {
          track.enabled = !newMuteState;
        });
    }
    
    toast.info(`Microphone ${newMuteState ? 'muted' : 'unmuted'}`);
  };
  
  // क्लीनअप
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupStreams();
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      {/* हेडर */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center space-x-3">
            <BsFillRecordFill className="h-8 w-8 text-red-500 animate-pulse" />
            <span>Screen Recorder</span>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">Local Storage</span>
          </h1>
          <p className="text-gray-400 mt-1">Record screen + audio in new tab</p>
        </div>
        
        {/* स्टोरेज इनफो */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl">
          <div className="flex items-center space-x-4">
            <FiHardDrive className="h-5 w-5 text-blue-400" />
            <div className="text-sm">
              <div className="font-medium">{formatFileSize(storageUsed)} used</div>
              <div className="text-xs text-gray-400">
                {savedRecordings.length} recordings saved
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* मुख्य कंटेंट */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* कंट्रोल्स पैनल */}
        <div className="lg:col-span-1 bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <FiSettings className="h-5 w-5 text-blue-400" />
            <span>Controls</span>
          </h2>
          
          {/* ऑडियो सेटिंग्स */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Audio Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiVolume2 className="h-5 w-5 text-green-400" />
                  <div>
                    <div className="font-medium">System Audio</div>
                    <div className="text-sm text-gray-400">Record computer sound</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAudioSetting('systemAudio')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    audioSettings.systemAudio ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    audioSettings.systemAudio ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiMic className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="font-medium">Microphone</div>
                    <div className="text-sm text-gray-400">Record your voice</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAudioSetting('microphone')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    audioSettings.microphone ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    audioSettings.microphone ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              {audioSettings.microphone && (
                <button
                  onClick={toggleMicrophoneMute}
                  className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg ${
                    audioSettings.microphoneMuted 
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400' 
                      : 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  }`}
                >
                  {audioSettings.microphoneMuted ? (
                    <>
                      <FiMicOff className="h-4 w-4" />
                      <span>Microphone Muted</span>
                    </>
                  ) : (
                    <>
                      <FiMic className="h-4 w-4" />
                      <span>Microphone Active</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* रिकॉर्डिंग टाइमर */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Timer</h3>
              <div className="text-2xl font-mono bg-gray-900 px-4 py-2 rounded-lg">
                {formatTime(recordingTime)}
              </div>
            </div>
            {isRecording && (
              <div className={`text-sm p-3 rounded-lg ${isPaused ? 'bg-yellow-900/30' : 'bg-red-900/30'}`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isPaused ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                  <span>{isPaused ? 'Recording Paused' : 'Recording in Progress'}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* कंट्रोल बटन्स */}
          <div className="space-y-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="h-5 w-5 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <BsFillRecordFill className="h-6 w-6" />
                    <span>Start Recording</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={togglePauseRecording}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      isPaused
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <FiPlay className="h-5 w-5" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <FiPause className="h-5 w-5" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200"
                  >
                    <FiStopCircle className="h-5 w-5" />
                    <span>Stop</span>
                  </button>
                </div>
                
                <div className="text-sm text-gray-400 text-center">
                  Recording will auto-save to local storage when stopped
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* प्रिव्यू पैनल */}
        <div className="lg:col-span-2 bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <FiMonitor className="h-5 w-5 text-purple-400" />
            <span>Screen Preview</span>
          </h2>
          
          {/* प्रिव्यू विंडो */}
          <div className="relative bg-black rounded-xl overflow-hidden border-2 border-gray-700 aspect-video mb-6">
            {previewStream ? (
              <video
                ref={previewVideoRef}
                autoPlay
                muted={true}
                className="w-full h-full object-contain"
                playsInline
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center">
                  <FiMonitor className="h-20 w-20 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Record</h3>
                  <p className="text-gray-400 max-w-md">
                    Click "Start Recording" to begin. You'll be prompted to select a screen or window.
                  </p>
                </div>
              </div>
            )}
            
            {/* ऑडियो इंडिकेटर */}
            {previewStream && (
              <div className="absolute bottom-4 left-4 flex items-center space-x-3">
                {audioSettings.systemAudio && (
                  <div className="flex items-center space-x-2 bg-green-900/70 px-3 py-1 rounded-full">
                    <FiVolume2 className="h-4 w-4" />
                    <span className="text-sm">System Audio</span>
                  </div>
                )}
                {audioSettings.microphone && !audioSettings.microphoneMuted && (
                  <div className="flex items-center space-x-2 bg-blue-900/70 px-3 py-1 rounded-full">
                    <FiMic className="h-4 w-4" />
                    <span className="text-sm">Mic Live</span>
                  </div>
                )}
              </div>
            )}
            
            {/* रिकॉर्डिंग इंडिकेटर */}
            {isRecording && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-2 bg-red-900/80 backdrop-blur-sm px-4 py-2 rounded-full animate-pulse">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="font-semibold">REC</span>
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* सेव्ड रिकॉर्डिंग्स */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <FiSave className="h-5 w-5 text-green-400" />
              <span>Saved Recordings ({savedRecordings.length})</span>
            </h3>
            
            {savedRecordings.length > 0 ? (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-700">
                {savedRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between p-4 border-b border-gray-700 hover:bg-gray-800/50"
                  >
                    <div className="flex items-center space-x-3">
                      <FiVideo className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="font-medium">{recording.name}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(recording.timestamp).toLocaleString()} • {formatTime(recording.duration)} • {formatFileSize(recording.size)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadRecording(recording)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors"
                        title="Download"
                      >
                        <FiDownload className="h-4 w-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-800/30 rounded-lg">
                <FiList className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No recordings saved yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Recordings will appear here after you stop recording
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* फुटर */}
      <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm text-gray-500">
        <p>
          ⚡ This recorder opens in a new tab and saves recordings to your browser's local storage.
          Recordings are automatically saved when you stop recording.
        </p>
      </div>
    </div>
  );
};

export default ScreenRecorderApp;