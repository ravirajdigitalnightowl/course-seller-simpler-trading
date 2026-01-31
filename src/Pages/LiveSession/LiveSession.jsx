// ye perfect chal rha hai aur isme camera quality ko kam kiya gya hai taki lag na kre.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
import ChatComponent from './ChatComponent';
import AudioPermissionModal from './AudioPermissionModal';

import { 
  getRecordingUploadUrl, 
  saveRecordingMetadata,
  getRecordingDownloadUrl,
  formatFileSize
} from './recordingService';

import { toast } from 'react-toastify';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiShare2, FiSquare, FiUsers, FiMessageSquare, FiSettings, FiUser, FiUserCheck,
  FiUserX, FiAirplay, FiCamera, FiCameraOff, FiCheck, FiX, FiLoader, FiLogOut, FiRefreshCw, FiPlay, FiPause, FiStopCircle,
  FiArrowUpRight, FiChevronDown, FiSend, FiAlertCircle, FiWifi, FiWifiOff, FiCircle, FiRadio, FiMenu, FiGrid, FiList,
  FiMonitor, FiMaximize2, FiMinimize2, FiImage, FiSmile, FiFile, FiDownload} from 'react-icons/fi';
import { IoVideocam, IoVideocamOff, IoShareOutline, IoStop, IoExitOutline, IoPeople, IoChatbubbleEllipses,
  IoCog, IoPlay, IoPause, IoExpand, IoContract} from 'react-icons/io5';
import { MdOutlineScreenShare , MdStopScreenShare, MdPlayArrow, MdPause, MdStop, MdGroup, MdChat, MdSettings, MdExitToApp, MdRefresh,
  MdWarning,
  MdError
} from 'react-icons/md';
import { FiChevronRight,FiChevronLeft,FiMaximize,FiSearch  } from "react-icons/fi";


import { BsFillRecordFill } from "react-icons/bs";
import { 
  useRecordingTimer, 
  RecordingTimerDisplay, 
  RecordingStatusBadge,
  formatTime 
} from './RecordingTimer';

import {
  ActiveViewerAudioPanel,
  ActiveScreenSharesPanel,
  ProducerStatus,
  ParticipantsModal,
  ViewerVideoRequestsPanel,
  ViewerAudioRequestsPanel,
  ScreenShareRequestsPanel,
  MobileHeader,
  MobileNavigation,
  MobileRequestsPanel,
  MobileControls,
  MobileParticipantsView,
  MobileChatView,
  MobileVideoView,
  ThumbnailVideo
} from './components';


const LiveSession = () => {
  const [showAudioModal, setShowAudioModal] = useState(false);
  // Existing states में add करें:
const [screenCaptureStream, setScreenCaptureStream] = useState(null);
const [screenCaptureActive, setScreenCaptureActive] = useState(false);
const [recordingSource, setRecordingSource] = useState(null); // 'screen' or 'camera'
  const [pendingScreenShare, setPendingScreenShare] = useState(null);
  const { sessionId, roomCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
const [recordings, setRecordings] = useState([]);
const [showRecordingsModal, setShowRecordingsModal] = useState(false);
const [isRecordingLoading, setIsRecordingLoading] = useState(false);
const [isRecordingStopping, setIsRecordingStopping] = useState(false); // ✅ नया state add करें
const [recordingInterval, setRecordingInterval] = useState(null); // ✅ नया state
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);
const [fullScreenThumbnails, setFullScreenThumbnails] = useState(false);
const [autoStartRecording, setAutoStartRecording] = useState(false);

const [recordingStream, setRecordingStream] = useState(null);

const { 
  recordingTimer,
  recordingStartTime,
  isRecordingActive,
  startRecordingTimer,
  stopRecordingTimer,
  resetRecordingTimer,
  formatRecordingTime 
} = useRecordingTimer();

const [isLandscape, setIsLandscape] = useState(false);

const [recorder, setRecorder] = useState(null);
const [recordedBlob, setRecordedBlob] = useState(null);
const [recordingChunks, setRecordingChunks] = useState([]);

   const [showAudioPermissionModal, setShowAudioPermissionModal] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [pendingAudioStreams, setPendingAudioStreams] = useState(new Map());
   const [uploadingFile, setUploadingFile] = useState(false);
  const [chatInput, setChatInput] = useState('');
const [thumbnailsPosition, setThumbnailsPosition] = useState('right');
const [streamerThumbnailVisible, setStreamerThumbnailVisible] = useState(true);
const [sidebarView, setSidebarView] = useState('participants');
const [isWebSocketInitialized, setIsWebSocketInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [showRequests, setShowRequests] = useState(false);
  const [mobileView, setMobileView] = useState('video');
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [mediaError, setMediaError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [localPausedState, setLocalPausedState] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [iceServers, setIceServers] = useState([]);
  const [isMediaInitialized, setIsMediaInitialized] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [producersState, setProducersState] = useState(new Map());
  const [consumersState, setConsumersState] = useState(new Map());
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeSpeakers, setActiveSpeakers] = useState(new Map());
  const [viewerAudioRequests, setViewerAudioRequests] = useState([]);
  const [screenShareRequests, setScreenShareRequests] = useState([]);
  const [activeViewerAudio, setActiveViewerAudio] = useState(new Map());
  const [activeScreenShare, setActiveScreenShare] = useState(null);
   const [audioRemoveTarget, setAudioRemoveTarget] = useState(null);
   const [zoomed, setZoomed] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [viewerAudios, setViewerAudios] = useState(new Map());
const [viewerVideoRequests, setViewerVideoRequests] = useState([]);
const [viewerCameras, setViewerCameras] = useState(new Map()); 
  const streamerMediaRef = useRef(new MediaStream());
  const viewerAudiosRef = useRef(new Map());
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const transports = useRef(new Map());
  const producers = useRef(new Map());
  const consumers = useRef(new Map());
  const userGestureHandlerRef = useRef(null);
  const isMountedRef = useRef(true);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const audioElementsRef = useRef(new Map());
  const pendingAudioQueueRef = useRef(new Map());
  const socketRef = useRef(null);
  const zoomedVideoRef = useRef(null); // ✅ Add this near other refs
  const recordingStopResolveRef = useRef(null);

  const audioContextRef = useRef(null);
const audioDestinationRef = useRef(null);
  const [device] = useState(new mediasoupClient.Device());
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);

  const [roomState, setRoomState] = useState({
    isStreaming: false,
    isPaused: false,
    whiteboardEnabled: true
  });
  const emitSocketEvent = (event, data, callback) => {
    if (socketRef.current && socketRef.current.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
      addDebugLog(`📤 Emitted ${event} event`);
      return true;
    } else {
      addDebugLog(`❌ Cannot emit ${event}: Socket not connected`);
      return false;
    }
  };

  const getSocket = () => {
    return socketRef.current;
  };
  const toggleZoom = (type, stream, userId) => {
  setZoomed((prev) => {
    if (prev && prev.type === type && prev.userId === userId) {
      return null; // unzoom
    }
    return { type, stream, userId };
  });
};

  const addDebugLog = (message) => {
    console.log(message);
    setDebugLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // ========== SOCKET EVENT HANDLERS ==========


  const startScreenCapture = async (purpose = 'share') => {
  try {
    // Agar pehle se screen capture चल रहा है, to usi ko return करें
    if (screenCaptureStream) {
      addDebugLog(`✅ Reusing existing screen capture for ${purpose}`);
      return screenCaptureStream;
    }

    addDebugLog(`🖥️ Starting new screen capture for ${purpose}`);
    
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        frameRate: { ideal: 60, max: 70 },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: true, // System audio capture
    });

    // Track ended handlers
    stream.getVideoTracks()[0].onended = () => {
      addDebugLog('🛑 Screen capture ended by system');
      
      // Agar recording चल रही है to stop करें
      if (isRecording) {
        stopRecording();
      }
      
      // Agar screen share चल रहा है to stop करें
      if (activeScreenShare?.source === "streamer") {
        stopScreenShare();
      }
      
      // Cleanup screen capture
      cleanupScreenCapture();
    };

    setScreenCaptureStream(stream);
    setScreenCaptureActive(true);
    addDebugLog(`✅ Screen capture started successfully for ${purpose}`);
    
    return stream;

  } catch (error) {
    console.error('❌ Screen capture failed:', error);
    toast.error(`Failed to capture screen for ${purpose}`);
    return null;
  }
};

const cleanupScreenCapture = () => {
  if (screenCaptureStream) {
    screenCaptureStream.getTracks().forEach(track => {
      if (track.readyState === 'live') {
        track.stop();
      }
    });
  }
  setScreenCaptureStream(null);
  setScreenCaptureActive(false);
  addDebugLog('🧹 Screen capture cleaned up');
};



const handleRecordingToggle = async () => {
  if (isRecordingLoading || isRecordingStopping) {
    toast.info('Recording operation is already in progress. Please wait...');
    return;
  }

  if (!isRecording) {
    await startRecording();
  } else {
    await stopRecording();
  }
};


const startRecording = async () => {
  try {
    setIsRecordingLoading(true);
    
    // Agar active screen share hai to usi se record karen
    if (activeScreenShare?.stream) {
      addDebugLog(`📺 Recording from existing screen share: ${activeScreenShare.userName}`);
      await startRecordingFromScreenShare(activeScreenShare.stream);
    } else {
      // Naya screen share se record karen
      addDebugLog('🎬 Starting new screen recording...');
      await startNewScreenShareWithRecording();
    }
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    toast.error('Failed to start recording');
    setIsRecording(false);
    setIsRecordingLoading(false);
  }
};

const startRecordingFromScreenShare = async (screenShareStream) => {
  try {
    setIsRecordingLoading(true);

    // 1. Get Streamer Mic
    let currentMicStream = null;
    if (mediaStream && mediaStream.getAudioTracks().length > 0) {
      currentMicStream = mediaStream;
    } else {
      // Agar mic nahi hai to request karein
      try {
        currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.warn("Mic not found for recording");
      }
    }

    // 2. 🔥 Get Mixed Audio (Streamer + Screen + Viewers)
    const mixedAudioTrack = getMixedAudioStream(screenShareStream, currentMicStream);

    // 3. Prepare Recording Stream
    const recordingStream = new MediaStream();

    // Add Video
    const videoTrack = screenShareStream.getVideoTracks()[0];
    
    // ✅ ORIGINAL SCREEN VIDEO TRACK PE CONTENT HINT
    if (videoTrack && 'contentHint' in videoTrack) {
      videoTrack.contentHint = 'motion';
      addDebugLog("🎬 Screen video: Applied contentHint 'motion' for recording");
    }
    
    if (videoTrack) {
      // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
      recordingStream.addTrack(videoTrack); // ✅ Original track
    }

    // ✅ SCREEN AUDIO TRACK PE OPTIMIZATION (if exists)
    const screenAudioTrack = screenShareStream.getAudioTracks()[0];
    if (screenAudioTrack && 'contentHint' in screenAudioTrack) {
      screenAudioTrack.contentHint = 'music';
      addDebugLog("🎬 Screen audio: Applied contentHint 'music' for recording");
    }

    // Add Mixed Audio
    if (mixedAudioTrack) {
      recordingStream.addTrack(mixedAudioTrack);
    } else if (currentMicStream) {
      // Fallback agar mixing fail hui
      const micAudioTrack = currentMicStream.getAudioTracks()[0];
      if (micAudioTrack) {
        // ✅ MIC AUDIO TRACK PE OPTIMIZATION
        if ('contentHint' in micAudioTrack) {
          micAudioTrack.contentHint = 'speech';
          addDebugLog("🎬 Mic audio: Applied contentHint 'speech' for recording");
        }
        recordingStream.addTrack(micAudioTrack);
      }
    }

    // 4. Start Recording
    startMediaRecorder(recordingStream, screenShareStream, null);

    setRecordingStream(recordingStream);
    setIsRecording(true);
    setIsRecordingLoading(false);
    startRecordingTimer();

    toast.success('🎬 Recording Started (All Audio Included)!');

  } catch (error) {
    console.error('Error starting recording:', error);
    toast.error('Failed to start recording');
    setIsRecordingLoading(false);
  }
};

const startNewScreenShareWithRecording = async () => {
  try {
    // 1. Screen Share Stream Start karein
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        frameRate: { ideal: 60, max: 60 },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: true, // System audio capture karne ke liye
    });

    // 2. Microphone Audio Setup (CRITICAL FIX FOR BLACK CAMERA)
    let micTrack = null;

    // Check karein agar main mediaStream (Camera+Mic) already chal raha hai
    if (mediaStream && mediaStream.getAudioTracks().length > 0) {
      addDebugLog('🎤 Using existing microphone track for recording');
      
      // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
      micTrack = mediaStream.getAudioTracks()[0];
      
    } else {
      // Agar mic pehle se on nahi hai, tabhi naya request karein
      try {
        addDebugLog('🎤 Requesting new microphone permission');
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micTrack = micStream.getAudioTracks()[0];
      } catch (micError) {
        addDebugLog('⚠️ Mic permission denied or not available for recording');
      }
    }

    // 3. Participants ke liye Screen Share setup karein (Updated version without cloning)
    if (user?.role === 'streamer' || !user?.role) {
      try {
        await startScreenShareForParticipants(screenStream);
      } catch (shareError) {
        addDebugLog('⚠️ Could not share with participants, but recording will continue');
      }
    }

    // 4. Recording ke liye Final Stream banayein
    const recordingStream = new MediaStream();

    // Screen Video add karein (Original tracks)
    screenStream.getVideoTracks().forEach(track => recordingStream.addTrack(track));
    
    // Screen Audio add karein (Original tracks)
    screenStream.getAudioTracks().forEach(track => recordingStream.addTrack(track));

    // Mic Audio add karein (Original track)
    if (micTrack) {
      recordingStream.addTrack(micTrack);
    }

    // 5. Recording Start Karein
    startMediaRecorder(recordingStream, screenStream, null);

    // State Updates
    setRecordingStream(recordingStream);
    setIsRecording(true);
    setIsRecordingLoading(false);
    startRecordingTimer();

    toast.success('🎬 Screen recording started! (Camera remains visible)');

    // 6. Handle Stop (Jab user "Stop Sharing" click kare browser mein)
    screenStream.getVideoTracks()[0].onended = () => {
      addDebugLog('🖥️ Screen share ended by system UI');
      stopRecording();
      
      // Agar streamer share kar raha tha, to socket se bhi stop karein
      if (activeScreenShare?.source === "streamer") {
        stopScreenShare();
      }
      
      // Mic track cleanup
      if (micTrack && micTrack.readyState === 'live') {
        micTrack.stop();
      }
    };

  } catch (error) {
    console.error('Error starting new screen share with recording:', error);
    toast.error('Failed to start recording');
    setIsRecording(false);
    setIsRecordingLoading(false);
  }
};

// const startScreenShareForParticipants = async (screenStream) => {
//   if (!sendTransportRef.current || !user) return;
  
//   try {
//     // ✅ DIRECT TRACK - NO CLONING
//     const videoTrack = screenStream.getVideoTracks()[0];
//     if (!videoTrack) return;
    
//     // ✅ ORIGINAL TRACK PE HI CONTENT HINT LAGAO
//     if ('contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion';
//       addDebugLog("✅ Screen video track: Applied contentHint 'motion'");
//     }
    
//     // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//     const videoProducer = await sendTransportRef.current.produce({
//       track: videoTrack, // ✅ Original track directly
//       appData: {
//         source: "screen",
//         userId: user.id,
//         userName: user.name || "Streamer",
//       },
//     });

//     addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);
    
//     // Audio track भी direct - NO CLONING
//     const audioTrack = screenStream.getAudioTracks()[0];
//     if (audioTrack) {
//       // ✅ ORIGINAL AUDIO TRACK PE HI OPTIMIZATION
//       if ('contentHint' in audioTrack) {
//         audioTrack.contentHint = 'music';
//         addDebugLog("✅ Screen audio track: Applied contentHint 'music'");
//       }
      
//       // ✅ USE ORIGINAL AUDIO TRACK DIRECTLY - NO CLONING
//       const audioProducer = await sendTransportRef.current.produce({
//         track: audioTrack, // ✅ Original track directly
//         appData: {
//           source: "screen-audio",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });
      
//       addDebugLog(`✅ Screen share audio producer created: ${audioProducer.id}`);
//     }

//     // ✅ Screen share stream के लिए original stream ही use करें
//     // No need to create new MediaStream - use the existing one
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenStream, // ✅ Original stream directly
//       source: "streamer",
//     });

//     // Notify server
//     if (socket) {
//       socket.emit("screen-share-started", {
//         sessionId: sessionId || roomCode,
//         userId: user.id,
//         userName: user.name || "Streamer",
//         hasAudio: !!audioTrack,
//         source: "screen",
//       });
//     }
    
//   } catch (error) {
//     console.error('Error sharing screen with participants:', error);
//     // Recording continue rahegi, bas sharing fail hua
//   }
// };
const startScreenShareForParticipants = async (screenStream) => {
  if (!sendTransportRef.current || !user) return;

  try {
    const videoTrack = screenStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // ✅ Content hint (already in your code)
    if ("contentHint" in videoTrack) {
      videoTrack.contentHint = "motion";
      addDebugLog("✅ Screen video track: Applied contentHint 'motion'");
    }

    // ✅ IMPORTANT: Mobile latency fix = cap FPS (and keep res stable)
    try {
      await videoTrack.applyConstraints({
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        resizeMode: "crop-and-scale",
      });
      addDebugLog("✅ Screen video constraints locked to 1280x720 @ 30fps");
    } catch (e) {
      addDebugLog(`⚠️ Screen constraint lock failed: ${e.message}`);
    }

    // =========================
    // ✅ PRODUCE VIDEO (2-layer SIMULCAST)
    // =========================
    let videoProducer;
    try {
      videoProducer = await sendTransportRef.current.produce({
        track: videoTrack,
        appData: {
          source: "screen",
          userId: user.id,
          userName: user.name || "Streamer",
        },

        // ✅ 2-LAYER SIMULCAST (low + high)
        encodings: [
          // LOW layer (mobile-friendly)
          { maxBitrate: 350_000, scaleResolutionDownBy: 2 },
          // HIGH layer (laptop/desktop)
          { maxBitrate: 1_500_000, scaleResolutionDownBy: 1 },
        ],

        // ✅ Helps Chrome start faster at a stable bitrate
        codecOptions: {
          videoGoogleStartBitrate: 800, // kbps
        },
      });

      addDebugLog(`✅ Screen share VIDEO producer (2-layer simulcast): ${videoProducer.id}`);
    } catch (simulcastErr) {
      // ✅ Fallback: some devices/browsers may not like simulcast for screen
      addDebugLog(`⚠️ Simulcast failed, falling back to single layer: ${simulcastErr.message}`);

      videoProducer = await sendTransportRef.current.produce({
        track: videoTrack,
        appData: {
          source: "screen",
          userId: user.id,
          userName: user.name || "Streamer",
        },
        encodings: [{ maxBitrate: 900_000 }], // single layer cap
        codecOptions: { videoGoogleStartBitrate: 600 },
      });

      addDebugLog(`✅ Screen share VIDEO producer (single layer fallback): ${videoProducer.id}`);
    }

    // =========================
    // 🔊 PRODUCE AUDIO (same as your code, direct)
    // =========================
    const audioTrack = screenStream.getAudioTracks()[0];
    if (audioTrack) {
      if ("contentHint" in audioTrack) {
        audioTrack.contentHint = "music";
        addDebugLog("✅ Screen audio track: Applied contentHint 'music'");
      }

      const audioProducer = await sendTransportRef.current.produce({
        track: audioTrack,
        appData: {
          source: "screen-audio",
          userId: user.id,
          userName: user.name || "Streamer",
        },
      });

      addDebugLog(`✅ Screen share AUDIO producer: ${audioProducer.id}`);
    }

    // ✅ keep original stream reference
    setActiveScreenShare({
      userId: user.id,
      userName: user.name || "Streamer",
      stream: screenStream,
      source: "streamer",
    });

    // notify server
    if (socket) {
      socket.emit("screen-share-started", {
        sessionId: sessionId || roomCode,
        userId: user.id,
        userName: user.name || "Streamer",
        hasAudio: !!audioTrack,
        source: "screen",
      });
    }
  } catch (error) {
    console.error("Error sharing screen with participants:", error);
    addDebugLog(`❌ startScreenShareForParticipants error: ${error.message}`);
  }
};


const startMediaRecorder = (recordingStream, screenStream, micStream_UNUSED) => {
  try {
    const videoTrack = recordingStream.getVideoTracks()[0];

    // ✅ 1. GPU Acceleration Preference
    // H.264 (Hardware Accelerated) -> VP8 (CPU Light) -> VP9 (CPU Heavy)
    const mimeTypes = [
      'video/webm;codecs=h264,opus', // 🚀 BEST: Uses GPU (Intel/Nvidia/Mobile)
      'video/webm;codecs=vp8,opus',  // Good Balance
      'video/webm'                   // Fallback
    ];

    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        console.log(`✅ GPU Optimization: Using Codec ${mime}`);
        break;
      }
    }

    // ✅ 2. Optimized Bitrate (2.5 Mbps is enough for 720p)
    const options = {
      mimeType: selectedMimeType || 'video/webm',
      videoBitsPerSecond: 2500000, 
      audioBitsPerSecond: 128000,
    };

    // ✅ 3. Lock Resolution & FPS (Crucial for performance)
    if (videoTrack) {
      try {
        videoTrack.applyConstraints({
          frameRate: { ideal: 40, max: 60 }, // 60fps causes lag, use 30
          width: { ideal: 1280, max: 1920 }, // 720p is efficient
          height: { ideal: 720, max: 1080 },
          resizeMode: "crop-and-scale"
        });
      } catch (e) {
        console.warn('Constraint error:', e);
      }
    }

    const mediaRecorder = new MediaRecorder(recordingStream, options);
    const chunks = [];
    setRecordingChunks(chunks);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
        setRecordingChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = async () => {
        // ... (Apka purana save logic yahan same rahega) ...
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadRecordingToServer(blob);
        
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
        }
        setRecordingStream(null);
        setRecordingChunks([]);
        setIsRecordingStopping(false);
        addDebugLog(`✅ Recording saved using ${selectedMimeType}`);
    };

    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      toast.error('Recording failed');
      setIsRecording(false);
      stopRecordingTimer();
    };

    // ✅ 4. TimeSlice = 2000ms (Relaxes the CPU)
    mediaRecorder.start(2000);
    setRecorder(mediaRecorder);

  } catch (error) {
    console.error("Failed to start recorder:", error);
    toast.error("Recording failed to start");
    setIsRecording(false);
    setIsRecordingLoading(false);
  }
};
const stopRecording = useCallback(async () => {
  if (!recorder || recorder.state === 'inactive') return;

  try {
    addDebugLog('⏹️ Stopping recording...');
    setIsRecordingStopping(true);
    
    if (recorder.state === 'recording') {
      recorder.stop();
    }
    
    stopRecordingTimer();
    
    // Recording stream cleanup
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }
    
    // Audio mixer cleanup
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      audioDestinationRef.current = null;
    }
    
    // Agar screen share नहीं चल रहा, to screen capture भी cleanup करें
    if (!activeScreenShare && screenCaptureActive) {
      addDebugLog('🧹 Cleaning up screen capture (no active screen share)');
      cleanupScreenCapture();
    }
    
    setIsRecording(false);
    setRecordingSource(null);
    stopScreenShare()
    
    toast.info('Processing recording...');
    
  } catch (error) {
    console.error('Error stopping recording:', error);
    toast.error('Error stopping recording');
  } finally {
    setIsRecordingStopping(false);
  }
}, [recorder, recordingStream, activeScreenShare, screenCaptureActive]);

const stopScreenShare = useCallback(() => {
  addDebugLog("🛑 Stopping screen share...");
  
  // Agar recording चल रही है, to continue रहने दें
  if (isRecording) {
    addDebugLog("🎬 Recording will continue after screen share stops");
    
    // Only stop sharing with participants
    if (socket && activeScreenShare?.source === "streamer") {
      socket.emit("screen-share-stop", {
        sessionId: sessionId || roomCode,
        userId: user?.id,
        source: "streamer"
      });
    }
    
    // Cleanup producers
    producers.current.forEach((producer, id) => {
      if (producer.appData?.source === "screen" || producer.appData?.source === "screen-audio") {
        try {
          producer.close();
          producers.current.delete(id);
          
          setProducersState(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
        } catch (err) {
          addDebugLog(`⚠️ Error closing producer: ${err.message}`);
        }
      }
    });
    
    // Reset active screen share state
    setActiveScreenShare(null);
    
    // Agar recording नहीं चल रही, to screen capture cleanup करें
    if (!isRecording && screenCaptureActive) {
      addDebugLog('🧹 Cleaning up screen capture (no active recording)');
      cleanupScreenCapture();
    }
    
    toast.info('Screen share stopped (recording continues)');
  } else {
    // Agar recording नहीं चल रही, to full cleanup
    addDebugLog("🛑 Full cleanup - no recording active");
    
    // Socket notification
    if (socket && activeScreenShare?.source === "streamer") {
      socket.emit("screen-share-stop", {
        sessionId: sessionId || roomCode,
        userId: user?.id,
        source: "streamer"
      });
    }
    
    // Cleanup producers
    producers.current.forEach((producer, id) => {
      if (producer.appData?.source === "screen" || producer.appData?.source === "screen-audio") {
        try {
          producer.close();
          producers.current.delete(id);
          
          setProducersState(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
        } catch (err) {
          addDebugLog(`⚠️ Error closing producer: ${err.message}`);
        }
      }
    });
    
    // Cleanup screen capture
    if (screenCaptureActive) {
      cleanupScreenCapture();
    }
    
    // Reset state
    setActiveScreenShare(null);
    
    toast.success('Screen share stopped');
  }
  
  // Reset zoom
  setZoomed(prev => {
    if (prev && prev.type === "screen") {
      return null;
    }
    return prev;
  });
  
}, [isRecording, socket, activeScreenShare, screenCaptureActive, sessionId, roomCode, user]);
const uploadRecordingToServer = async (blob) => {
  try {
    addDebugLog('📤 Uploading recording to backend (NEW API)...');
    
    // ✅ Generate filename with session info
    const fileName = `recording_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    
    // ✅ Step 1: Get pre-signed URL from NEW API
    const presignedData = await getRecordingUploadUrl(
      sessionId,
      fileName,
      blob.type,
      blob.size
    );
    
    if (!presignedData?.uploadUrl) {
      throw new Error('Failed to get upload URL from new API');
    }
    
    addDebugLog(`📁 Uploading to S3: ${fileName} (${formatFileSize(blob.size)})`);
    
    // ✅ Step 2: Upload to S3 using presigned URL
    const uploadResponse = await fetch(presignedData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': blob.type,
      },
      body: blob,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    addDebugLog('✅ Recording uploaded to S3 successfully');
    
    // ✅ Step 3: Save recording metadata to NEW API
    const saveData = {
      fileUrl: presignedData.fileUrl,
      fileName: fileName,
      fileType: blob.type,
      duration: recordingTimer,
      fileSize: blob.size,
      s3Key: presignedData.fileKey || presignedData.fileUrl,
      thumbnailUrl: '', // You can add thumbnail generation later
      recordingTitle: `Recording ${new Date().toLocaleDateString()}`,
      description: `Recording of session ${sessionId}`,
      recordedAt: new Date().toISOString()
    };
    
    const saveResponse = await saveRecordingMetadata(sessionId, saveData);
    
    if (saveResponse.success) {
      addDebugLog(`✅ Recording saved to database via new API: ${fileName}`);
      
      // Get the recording ID from response
      const recordingId = saveResponse.data?.recording?._id || 
                         saveResponse.data?.id || 
                         Date.now().toString();
      
      toast.success(`🎉 Recording saved successfully! (${formatRecordingTime(recordingTimer)})`);
      
      // Emit socket event
      const socket = getSocket();
      if (socket) {
        socket.emit('recording_completed', {
          sessionId,
          recording: {
            ...saveData,
            id: recordingId
          }
        });
      }
      
      // ✅ Reset states
      setIsRecording(false);
      setRecorder(null);
      setRecordedBlob(null);
      resetRecordingTimer();
      
      return { success: true, recordingId };
      
    } else {
      throw new Error('Failed to save recording metadata via new API');
    }
    
  } catch (error) {
    console.error('❌ Recording upload error:', error);
    
    // Try local fallback
    try {
      addDebugLog('⚠️ Upload failed, attempting local save...');
      const localSuccess = saveRecordingLocally(blob);
      if (localSuccess) {
        toast.warning('Recording saved locally (backend upload failed)');
        return { success: false, savedLocally: true };
      } else {
        toast.error('Failed to save recording anywhere');
        return { success: false, savedLocally: false };
      }
    } catch (localError) {
      console.error('Local save error:', localError);
      toast.error('Failed to save recording anywhere');
      return { success: false, savedLocally: false };
    }
  } finally {
    setIsRecordingStopping(false);
  }
};
// Helper function for local fallback
const saveRecordingLocally = (blob) => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `recording_${sessionId}_${Date.now()}.webm`;
    
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Local save error:', error);
    return false;
  }
};

// Format file size helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Cleanup on component unmount
useEffect(() => {
  return () => {
    // Cleanup recording
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    
    // Cleanup media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Cleanup window tracks
    if (window.recordingTracks) {
      window.recordingTracks.forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      window.recordingTracks = null;
    }
  };
}, []);


const getMixedAudioStream = (screenStream, micStream) => {
  try {
    addDebugLog("🎚️ Starting Audio Mixing...");
    
    // 1. Create Audio Context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Refs mein save karein (Cleanup ke liye)
    audioContextRef.current = audioContext;
    audioDestinationRef.current = destination;

    // 2. Add Streamer Mic 🎤
    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      // Optional: Volume Boost for Streamer
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0; 
      micSource.connect(gainNode).connect(destination);
      addDebugLog("✅ Streamer Mic mixed");
    }

    // 3. Add Screen Audio 🖥️
    if (screenStream && screenStream.getAudioTracks().length > 0) {
      const screenSource = audioContext.createMediaStreamSource(screenStream);
      screenSource.connect(destination);
      addDebugLog("✅ Screen Audio mixed");
    }

    // 4. Add All Existing Viewers 👥
    viewerAudiosRef.current.forEach((stream, userId) => {
      if (stream.getAudioTracks().length > 0) {
        try {
          const viewerSource = audioContext.createMediaStreamSource(stream);
          viewerSource.connect(destination);
          addDebugLog(`✅ Viewer ${userId} mixed`);
        } catch (err) {
          console.warn(`Could not mix viewer ${userId}`, err);
        }
      }
    });

    return destination.stream.getAudioTracks()[0]; // Mixed Track

  } catch (error) {
    console.error("Audio mixing failed:", error);
    return null;
  }
};

  const handleClose = () => {
    setShowRecorder(false);
    setIsRecording(false);
  };

// Permission check useEffect ko update karo
useEffect(() => {
  const checkPermissions = async () => {
    try {
      addDebugLog('🔍 Checking camera and microphone permissions...');
      setPermissionStatus('checking');
      
      // Mobile devices ke liye direct request karo
      if (isMobile) {
        addDebugLog('📱 Mobile device detected, requesting permissions directly...');
        await initializeCamera();
        return;
      }
      
      // Desktop ke liye existing logic
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
      const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
      
      if (hasVideoPermission && hasAudioPermission) {
        addDebugLog('✅ Camera and microphone permissions already granted');
        setPermissionStatus('granted');
        initializeCamera();
      } else {
        addDebugLog('ℹ️ Need to request camera/microphone permissions');
        setPermissionStatus('denied');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      addDebugLog(`❌ Error checking permissions: ${error.message}`);
      setPermissionStatus('denied');
      setIsLoading(false);
    }
  };

  checkPermissions();
}, [isMobile]); // isMobile add karo dependency

useEffect(() => {
  if (activeScreenShare?.stream) {
    // Check if not already zoomed on this screen
    if (!zoomed || zoomed.userId !== activeScreenShare.userId) {
      addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
      
      setZoomed({
        type: "screen",
        stream: activeScreenShare.stream,
        userId: activeScreenShare.userId
      });
    }
  }
}, [activeScreenShare]);

useEffect(() => {
  const resumeAll = () => {
    document.querySelectorAll("audio").forEach((el) => {
      el.play().catch(() => {});
    });
    document.removeEventListener("click", resumeAll);
    document.removeEventListener("touchstart", resumeAll);
  };

  document.addEventListener("click", resumeAll, { once: true });
  document.addEventListener("touchstart", resumeAll, { once: true });

  return () => {
    document.removeEventListener("click", resumeAll);
    document.removeEventListener("touchstart", resumeAll);
  };
}, []);


useEffect(() => {
  const checkOrientation = () => {
    // Check if mobile and landscape
    const isLandscapeMode = window.innerWidth > window.innerHeight;
    setIsLandscape(isLandscapeMode);
    
    if (isMobile) {
      addDebugLog(`📱 Mobile orientation: ${isLandscapeMode ? 'Landscape' : 'Portrait'} (${window.innerWidth}x${window.innerHeight})`);
    }
  };

  // Initial check
  checkOrientation();

  // Listen for orientation changes
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  return () => {
    window.removeEventListener('resize', checkOrientation);
    window.removeEventListener('orientationchange', checkOrientation);
  };
}, [isMobile]);
useEffect(() => {
  const handleFirstUserInteraction = () => {
    addDebugLog('🎵 User interaction detected - enabling all audio');
    setUserInteracted(true);
    setShowAudioPermissionModal(false);
    playAllAudio();
    document.removeEventListener('click', handleFirstUserInteraction);
    document.removeEventListener('touchstart', handleFirstUserInteraction);
  };
  if (!userInteracted) {
    document.addEventListener('click', handleFirstUserInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
  }
  return () => {
    document.removeEventListener('click', handleFirstUserInteraction);
    document.removeEventListener('touchstart', handleFirstUserInteraction);
  };
}, [userInteracted]);

  useEffect(() => {
    viewerAudios.forEach((stream, userId) => {
      let audioEl = document.getElementById(`viewer-audio-${userId}`);
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.id = `viewer-audio-${userId}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.controls = false;
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = stream;
      audioEl.play().catch(err => {
        console.warn(`Autoplay prevented for ${userId}, waiting for user gesture`, err);
      });
    });
  }, [viewerAudios]);

  
const openRemoveAudioModal = (participant) => {
  setAudioRemoveTarget(participant);
};

const confirmRemoveAudio = () => {
  if (audioRemoveTarget) {
    handleMuteViewerAudio(audioRemoveTarget.socketId);
    setAudioRemoveTarget(null);
  }
}; 
  const handleNewViewerScreenProducer = useCallback((data) => {
    addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
    const socket = getSocket();
    if (socket) {
      createConsumer(sessionId || roomCode, data.producerId, data.kind);
    } else {
      addDebugLog('❌ Cannot create consumer: Socket not available');
    }
  }, [sessionId, roomCode]);

  const handleViewerAudioPermissionGranted = useCallback((data) => {
    addDebugLog(`Viewer audio permission granted: ${data.userId}`);
    const socket = getSocket();
    if (socket && data.userId !== user?.id) {
      createConsumer(sessionId || roomCode, data.producerId, 'audio');
    }
  }, [sessionId, roomCode, user]);

  const handleViewerAudioRequest = useCallback((data) => {
    addDebugLog(`Viewer audio request from: ${data.requestedUserId}`);
    setViewerAudioRequests(prev => [...prev, {
      requestedUserId: data.requestedUserId,
      requesterSocketId: data.requesterSocketId,
      requesterName: data.requesterName || 'Viewer',
      timestamp: new Date()
    }]);
  }, []);

const playAllAudio = () => {
  addDebugLog('🔊 Playing all audio elements...');
  setTimeout(() => {
    // Play all existing audio elements
    audioElementsRef.current.forEach((audioEl, userId) => {
      if (audioEl.paused && audioEl.srcObject) {
        audioEl.play().catch(err => {
          // Log but don't worry about autoplay errors
          if (err.name !== 'NotAllowedError') {
            addDebugLog(`⚠️ Failed to play audio for ${userId}: ${err.message}`);
          }
        });
      }
    });
    pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
      createAndPlayAudioElement(userId, streamInfo.audioStream, streamInfo.userName);
    });

    // Clear pending queue
    pendingAudioQueueRef.current.clear();
    setPendingAudioStreams(new Map());
    
    addDebugLog('✅ All audio processing completed');
  }, 200);
};

const createAndPlayAudioElement = (userId, audioStream, userName) => {
  try {
    let audioEl = document.getElementById(`viewer-audio-${userId}`);
        if (audioEl) {
      // Agar same stream already hai to kuch nahi karo
      if (audioEl.srcObject === audioStream) {
        addDebugLog(`✅ Audio already playing for user ${userId}`);
        return audioEl;
      }
      
      // Old stream ko stop karo
      if (audioEl.srcObject) {
        audioEl.srcObject.getTracks().forEach(track => track.stop());
      }
      audioEl.pause();
      audioEl.srcObject = null;
    } else {
      // Naya audio element create karo
      audioEl = document.createElement("audio");
      audioEl.id = `viewer-audio-${userId}`;
      audioEl.playsInline = true;
      audioEl.controls = false;
      audioEl.muted = false;
      audioEl.setAttribute('data-user-id', userId);
      audioEl.setAttribute('data-user-name', userName);
      document.body.appendChild(audioEl);
    }
    audioEl.srcObject = audioStream;
        const playAudio = () => {
      if (audioEl.paused) {
        audioEl.play()
          .then(() => {
            addDebugLog(`✅ Audio playing for user ${userId}`);
          })
          .catch(error => {
            // Agar play fail ho jaye to retry after short delay
            if (error.name === 'NotAllowedError') {
              addDebugLog(`⚠️ Audio play blocked for ${userId}, waiting for user gesture`);
              // User interaction ke baad automatically play hoga
            } else {
              console.warn(`Audio play failed for ${userId}:`, error);
              // Retry after 500ms
              setTimeout(() => {
                if (audioEl.srcObject === audioStream && audioEl.paused) {
                  audioEl.play().catch(e => {
                    addDebugLog(`❌ Retry also failed for ${userId}: ${e.message}`);
                  });
                }
              }, 500);
            }
          });
      }
    };
    if (userInteracted) {
      // Small delay to avoid race condition
      setTimeout(playAudio, 100);
    }
    audioElementsRef.current.set(userId, audioEl);
    viewerAudiosRef.current.set(userId, audioStream);
        setViewerAudios((prev) => {
      const newMap = new Map(prev);
      newMap.set(userId, audioStream);
      return newMap;
    });
    addDebugLog(`🎤 Audio element ready for user ${userId}`);
    return audioEl;
  } catch (err) {
    addDebugLog(`❌ Error creating audio element: ${err?.message || err}`);
    return null;
  }
};
const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
  const audioStream = new MediaStream([audioTrack]);
  const userId = producerInfo.userId;
  const userName = producerInfo.userName || `User ${userId}`;
  addDebugLog(`🎵 New audio consumer: ${userId} (${sourceType})`);
  const existingAudioEl = audioElementsRef.current.get(userId);
  if (existingAudioEl && existingAudioEl.srcObject === audioStream) {
    addDebugLog(`⏩ Already have same audio stream for ${userId}, skipping`);
    return;
  }

  if (userInteracted) {
    createAndPlayAudioElement(userId, audioStream, userName);
  } else {
    pendingAudioQueueRef.current.set(userId, {
      userId,
      userName,
      audioStream,
      sourceType,
      producerInfo,
      timestamp: Date.now()
    });
    
    setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    
    // Show permission modal if not already shown
    if (!showAudioPermissionModal) {
      setShowAudioPermissionModal(true);
    }
    
    addDebugLog(`⏳ Audio queued for user interaction: ${userName}`);

    if (isRecording && audioContextRef.current && audioDestinationRef.current) {
    try {
      const newStream = new MediaStream([audioTrack]);
      const newSource = audioContextRef.current.createMediaStreamSource(newStream);
      newSource.connect(audioDestinationRef.current);
      addDebugLog(`➕ New viewer ${producerInfo.userId} added to active recording`);
    } catch (err) {
      console.warn("Failed to add new viewer to recording mix", err);
    }
  }
  }
};
const handleEnableAudio = () => {
  addDebugLog('🎵 User manually enabled audio');
  setUserInteracted(true);
  setShowAudioPermissionModal(false);
  
  // Small delay to ensure state update
  setTimeout(() => {
    playAllAudio();
  }, 100);
};

  const handleScreenShareRequest = useCallback((data) => {
    addDebugLog(`Screen share request from: ${data.requestedUserId}`);
    setScreenShareRequests(prev => [...prev, {
      requestedUserId: data.requestedUserId,
      requesterSocketId: data.requesterSocketId,
      requesterName: data.requesterName || 'Viewer',
      timestamp: new Date()
    }]);
  }, []);

  const handleViewerAudioStarted = useCallback((data) => {
    addDebugLog(`Viewer audio started: ${data.userId}`);
    setActiveViewerAudio(prev => new Map(prev).set(data.socketId, {
      userId: data.userId,
      socketId: data.socketId,
      producerId: data.producerId
    }));
  }, []);

  const handleViewerAudioMuted = useCallback((data) => {
    addDebugLog(`Viewer audio muted: ${data.userId}`);
    setActiveViewerAudio(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.socketId);
      return newMap;
    });
  }, []);

 // ✅ Viewer screen share started handler
const handleScreenShareStarted = useCallback((data) => {
  addDebugLog(`Screen share started by viewer: ${data.userId}`);

  setActiveScreenShare(prev => {
    if (prev?.source === "streamer") return prev;
    return {
      userId: data.userId,
      userName: data.userName,
      stream: null, // stream consumer banne ke baad attach hoga
      source: "viewer-screen"
    };
  });
}, [addDebugLog]);


const handleScreenShareStopped = useCallback((data) => {
  addDebugLog(
    `🛑 Screen share stopped by viewer: ${data.userId}, source: ${data.source}`
  );

  // ✅ Reset zoom if same user's screen was zoomed
  setZoomed((prev) => {
    if (prev && prev.type === "screen" && prev.userId === data.userId) {
      addDebugLog(`🔄 Resetting zoom for stopped user: ${data.userId}`);
      return null;
    }
    return prev;
  });

  // ✅ Forcefully clear active screen share
  setActiveScreenShare((prev) => {
    if (prev && prev.stream) {
      try {
        prev.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping viewer screen tracks", e);
      }
    }

    if (screenRef.current) {
      try {
        screenRef.current.srcObject = null;
        screenRef.current.load?.();
      } catch (e) {
        console.warn("Error clearing screenRef", e);
      }
    }
    addDebugLog(`✅ Forced reset of active screen share (viewer: ${data.userId})`);
    return null;
  });
}, [screenRef]);

  const handleStopViewerScreenShare = useCallback((targetUserId) => {
    emitSocketEvent('screen-share-force-stop', {
      sessionId: sessionId || roomCode,
      targetUserId
    });
    addDebugLog(`Stopped screen share for user: ${targetUserId}`);
  }, [sessionId, roomCode]);

  const handleViewerAudioResponse = useCallback((requesterSocketId, allow) => {
    emitSocketEvent('viewer-audio-response', {
      sessionId: sessionId || roomCode,
      requesterSocketId,
      allow
    });
    
    setViewerAudioRequests(prev => 
      prev.filter(req => req.requesterSocketId !== requesterSocketId)
    );
    
    if (allow) {
      addDebugLog(`Allowed audio for viewer: ${requesterSocketId}`);
    } else {
      addDebugLog(`Denied audio for viewer: ${requesterSocketId}`);
    }
  }, [sessionId, roomCode]);

  const handleScreenShareResponse = useCallback((requesterUserId, allow) => {
    emitSocketEvent('screen-share-response', {
      sessionId: sessionId || roomCode,
      requesterUserId,
      allow
    });
    
    setScreenShareRequests(prev => 
      prev.filter(req => req.requestedUserId !== requesterUserId)
    );
    
    if (allow) {
      addDebugLog(`Allowed screen share for viewer: ${requesterUserId}`);
    } else {
      addDebugLog(`Denied screen share for viewer: ${requesterUserId}`);
    }
  }, [sessionId, roomCode]);

  const handleMuteViewerAudio = useCallback((targetSocketId) => {
    emitSocketEvent('streamer-stop-viewer-audio', {
  sessionId: sessionId || roomCode,
  targetSocketId
});

    addDebugLog(`Muted viewer audio: ${targetSocketId}`);
  }, [sessionId, roomCode]);

  const handleBanParticipant = useCallback((userId) => {
    emitSocketEvent('ban-participant', {
      sessionId: sessionId || roomCode,
      userId
    });
    addDebugLog(`Banned participant: ${userId}`);
  }, [sessionId, roomCode]);


const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
  try {
    const socket = getSocket();
    if (!socket) {
      addDebugLog("❌ No socket available for creating consumer");
      return;
    }

    addDebugLog(`🎯 Creating consumer for producer: ${producerId}`);

    // Skip if already have consumer
    const existingConsumer = Array.from(consumers.current.values()).find(
      (c) => c.producerId === producerId
    );
    if (existingConsumer) {
      addDebugLog(`⚠️ Already have consumer for producer ${producerId}, skipping`);
      return;
    }

    socket.emit(
      "getProducerInfo",
      { sessionId: currentSessionId, producerId },
      async (info) => {
        if (!info) {
          addDebugLog(`❌ No producer info for producer: ${producerId}`);
          return;
        }

        addDebugLog(
          `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}`
        );

        // ✅ DEBUG LOG - देखें क्या info आ रहा है
        console.log("PRODUCER INFO RECEIVED:", {
          producerId,
          source: info.source,
          userId: info.userId,
          userName: info.userName,
          currentUser: user?.id
        });
        const isViewerScreenAudio = info.source === "viewer-screen-audio";
        const isViewerMic = info.source === "viewer-mic";
        const isViewerSource = isViewerScreenAudio || isViewerMic;
        if (isViewerSource) {
          addDebugLog(`🎤 Processing viewer audio (${info.source}) from user ${info.userId}`);
        } else {
          // अन्य sources के लिए self check करें
          const isSelfProducer = info.userId?.toString() === user?.id?.toString();
          const isStreamerAudio = info.source === 'streamer-mic' || info.source === 'mic' || info.source === 'screen-audio';
          const isStreamerCamera = info.source === 'streamer-camera' || info.source === 'camera';
          
          if (isSelfProducer) {
            addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
            return;
          }
          if ((isStreamerAudio || isStreamerCamera) && isSelfProducer) {
            addDebugLog(`⏩ Skipping streamer media: ${info.source}`);
            return;
          }
        }

        // store producer state
        setProducersState((prev) =>
          new Map(prev).set(producerId, {
            id: producerId,
            kind: info.kind,
            userId: info.userId,
            userName: info.userName,
            source: info.source || "camera",
            paused: false,
          })
        );

        if (!transportId && recvTransportRef.current)
          transportId = recvTransportRef.current.id;
        if (!transportId) {
          addDebugLog("❌ No recv transport available for consumer");
          return;
        }

        socket.emit(
          "consume",
          {
            sessionId: currentSessionId,
            transportId,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
          },
          async (response) => {
            if (response.error || !response.params) {
              addDebugLog(`❌ Failed to consume: ${response.error}`);
              return;
            }

            const consumerParams = response.params;
            const transport = transports.current.get(transportId);
            if (!transport) {
              addDebugLog(`❌ No transport found for ID: ${transportId}`);
              return;
            }

            try {
              const consumer = await transport.consume({
                id: consumerParams.id,
                producerId: consumerParams.producerId,
                kind: consumerParams.kind,
                rtpParameters: consumerParams.rtpParameters,
                appData: { 
                  source: info.source || "camera",
                  userId: info.userId,
                  userName: info.userName
                },
              });

              consumers.current.set(consumer.id, consumer);
              addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source})`);

              // ✅ DEBUG: consumer details
              console.log("CONSUMER CREATED:", {
                id: consumer.id,
                kind: consumer.kind,
                source: info.source,
                track: consumer.track ? "Has track" : "No track",
                trackKind: consumer.track?.kind,
                trackReadyState: consumer.track?.readyState
              });

              // === Handle sources ===
              if (consumer.track) {
                if (info.source === "screen" || info.source === "viewer-screen") {
                  // 🔹 Screen share VIDEO
                  const screenStream = new MediaStream([consumer.track]);
                  setActiveScreenShare({
                    userId: info.userId,
                    userName: info.userName || (info.source === "screen" ? "Streamer" : "Viewer"),
                    stream: screenStream,
                    source: info.source,
                  });
                  addDebugLog(`🖥️ Active screen set (${info.source})`);

                } else if (info.source === "viewer-screen-audio") {
                  // 🔹 Screen share AUDIO - Simplified permission system
                  console.log("🎵 Handling viewer-screen-audio for user:", info.userId);
                  handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                  
                } else if (info.source === "viewer-mic") {
                  // 🔹 Viewer MIC audio - Simplified permission system
                  console.log("🎤 Handling viewer-mic for user:", info.userId);
                  handleAudioConsumer(consumer.track, info, "viewer-mic");
                  
                } else if (info.source === "viewer-camera") {
                  // 🔹 Viewer camera
                  try {
                    const videoStream = new MediaStream([consumer.track]);
                    setViewerCameras((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(info.userId, videoStream);
                      return newMap;
                    });
                    addDebugLog(`📷 Viewer camera stored for ${info.userId}`);
                  } catch (err) {
                    addDebugLog(`❌ Error storing viewer camera: ${err?.message || err}`);
                  }

                } else if (consumer.track.kind === "video") {
                  // Streamer video skip
                  addDebugLog(`⏩ Skipping streamer video: ${info.source}`);

                } else if (consumer.track.kind === "audio") {
                  // Streamer audio skip
                  addDebugLog(`⏩ Skipping streamer audio: ${info.source}`);

                } else {
                  addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
                }
              } else {
                addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
              }
              socket.emit(
                "consumer-resume",
                { sessionId: currentSessionId, consumerId: consumer.id },
                (resumeResponse) => {
                  if (resumeResponse?.success) {
                    addDebugLog(`✅ Consumer ${consumer.id} resumed`);
                  } else {
                    addDebugLog(`❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error}`);
                  }
                }
              );
            } catch (error) {
              addDebugLog(`❌ Error creating consumer: ${error.message}`);
              console.error("Consumer creation error:", error);
            }
          }
        );
      }
    );
  } catch (error) {
    addDebugLog(`❌ Error in createConsumer: ${error.message}`);
    console.error("createConsumer error:", error);
  }
};

const cleanupViewerAudio = (userId) => {
  addDebugLog(`🧹 Starting audio cleanup for user: ${userId}`);
  if (pendingAudioQueueRef.current.has(userId)) {
    const pendingStream = pendingAudioQueueRef.current.get(userId)?.audioStream;
    if (pendingStream) {
      try {
        pendingStream.getTracks().forEach((t) => {
          if (t.readyState === 'live') {
            t.stop();
            addDebugLog(`🛑 Stopped pending audio track: ${t.id}`);
          }
        });
        addDebugLog(`🗑️ Stopped pending audio tracks for user: ${userId}`);
      } catch (e) {
        addDebugLog(`⚠️ Error stopping pending audio tracks: ${e.message}`);
      }
    }
    pendingAudioQueueRef.current.delete(userId);
    
    // Update pending streams state
    setPendingAudioStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    
    addDebugLog(`✅ Removed from pending audio queue: ${userId}`);
  }

  const cleanupAudioElement = () => {
    const audioEl = audioElementsRef.current.get(userId);
    if (audioEl) {
      try {
        // Pause and clean up the audio element
        if (!audioEl.paused) {
          audioEl.pause();
          addDebugLog(`⏸️ Paused audio element for user: ${userId}`);
        }
        
        // Clear srcObject and stop tracks if they exist
        if (audioEl.srcObject) {
          const stream = audioEl.srcObject;
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
              addDebugLog(`🛑 Stopped audio track: ${track.id}`);
            }
          });
          audioEl.srcObject = null;
        }
        
        // Remove from DOM with delay to avoid race conditions
        setTimeout(() => {
          try {
            if (audioEl.parentNode) {
              audioEl.parentNode.removeChild(audioEl);
              addDebugLog(`🗑️ Removed audio element from DOM for user: ${userId}`);
            }
          } catch (domError) {
            addDebugLog(`⚠️ Error removing audio element from DOM: ${domError.message}`);
          }
        }, 100);
        
      } catch (e) {
        addDebugLog(`⚠️ Error in audio element cleanup: ${e.message}`);
      }
      
      // Remove from refs
      audioElementsRef.current.delete(userId);
    }
  };

  // ✅ Step 3: Clean up from viewerAudiosRef
  const audioStream = viewerAudiosRef.current.get(userId);
  if (audioStream) {
    try {
      audioStream.getTracks().forEach((t) => {
        if (t.readyState === 'live') {
          t.stop();
          addDebugLog(`🛑 Stopped active audio track: ${t.id}`);
        }
      });
    } catch (e) {
      addDebugLog(`⚠️ Error stopping active audio stream: ${e.message}`);
    }
    viewerAudiosRef.current.delete(userId);
  }

  cleanupAudioElement();
  setTimeout(() => {
    const domAudioElements = document.querySelectorAll(`[data-user-id="${userId}"], #viewer-audio-${userId}`);
    domAudioElements.forEach(el => {
      try {
        if (el.paused === false) {
          el.pause();
        }
        if (el.srcObject) {
          el.srcObject.getTracks().forEach(track => track.stop());
          el.srcObject = null;
        }
        if (el.parentNode) {
          el.parentNode.removeChild(el);
          addDebugLog(`🗑️ Backup cleanup for audio element: ${userId}`);
        }
      } catch (e) {
        addDebugLog(`⚠️ Error in backup DOM cleanup: ${e.message}`);
      }
    });
  }, 200);

  // ✅ Step 5: Remove screen share audio if exists
  if (userId === activeScreenShare?.userId) {
    setTimeout(() => {
      const screenAudioElements = document.querySelectorAll(`[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`);
      screenAudioElements.forEach(screenAudioEl => {
        try {
          screenAudioEl.pause();
          screenAudioEl.srcObject = null;
          if (screenAudioEl.parentNode) {
            screenAudioEl.parentNode.removeChild(screenAudioEl);
          }
          addDebugLog(`🗑️ Cleaned up screen share audio for user: ${userId}`);
        } catch (e) {
          addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
        }
      });
    }, 100);
  }

  // ✅ Step 6: Update viewerAudios state (with delay to ensure cleanup is done)
  setTimeout(() => {
    setViewerAudios((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(userId)) {
        newMap.delete(userId);
        addDebugLog(`🔄 Removed from viewerAudios state: ${userId}`);
      }
      return newMap;
    });

    // ✅ Step 7: Check if we need to hide the audio modal
    if (pendingAudioStreams.size === 0 && showAudioPermissionModal) {
      setTimeout(() => {
        setShowAudioPermissionModal(false);
        addDebugLog(`🔕 No more pending audio - hiding modal`);
      }, 300);
    }

    addDebugLog(`✅ Completed audio cleanup for user: ${userId}`);
  }, 300);
};

const cleanupViewerCamera = (userId) => {
  addDebugLog(`📷 Cleaning up camera for user: ${userId}`);
    setViewerCameras((prev) => {
    const newMap = new Map(prev);
    if (newMap.has(userId)) {
      const stream = newMap.get(userId);
      if (stream) {
        try {
          stream.getTracks().forEach((track) => {
            if (track.kind === 'video') {
              track.stop();
            }
          });
        } catch (e) {
          console.warn("Error stopping viewer camera tracks", e);
        }
      }
      newMap.delete(userId);
      addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
    }
    return newMap;
  });
};

const cleanupViewerMedia = (userId) => {
  // 🖥️ Screen share cleanup
  if (activeScreenShare?.userId === userId) {
    if (activeScreenShare.stream) {
      try {
        activeScreenShare.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping viewer screen tracks", e);
      }
    }

    setActiveScreenShare(null);

    if (screenRef.current) {
      try {
        screenRef.current.srcObject = null;
        screenRef.current.load?.();
      } catch (e) {
        console.warn("Error clearing screenRef", e);
      }
    }

    addDebugLog(`🖥️ Viewer screen share stopped & cleaned for user: ${userId}`);
  }

  // 🎤 Audio cleanup
  if (viewerAudiosRef.current.has(userId)) {
    const stream = viewerAudiosRef.current.get(userId);
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping viewer audio tracks", e);
      }
    }
    viewerAudiosRef.current.delete(userId);

    setViewerAudios((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    addDebugLog(`🎤 Viewer audio stopped for user: ${userId}`);
  }

  setViewerCameras((prev) => {
    const newMap = new Map(prev);
    if (newMap.has(userId)) {
      const stream = newMap.get(userId);
      if (stream) {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn("Error stopping viewer camera tracks", e);
        }
      }
      newMap.delete(userId);
      addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
    }
    return newMap;
  });

  addDebugLog(`✅ Fully cleaned up media for user: ${userId}`);
};

useEffect(() => {
  if (!videoRef.current) return;

  if (!zoomed && mediaStream) {
    videoRef.current.srcObject = mediaStream;
    videoRef.current.play().catch(err =>
      console.warn("Autoplay prevented for camera video:", err)
    );
  } else if (zoomed && zoomed.type !== "streamer") {
    // jab zoomed viewer/screen hai to streamer video hide
    videoRef.current.srcObject = null;
  }
}, [zoomed, mediaStream]);


// ✅ Add this useEffect to handle Zoomed Video without flickering
useEffect(() => {
  if (zoomedVideoRef.current && zoomed?.stream) {
    const videoEl = zoomedVideoRef.current;
    
    // Only update if stream ID is different to prevent flickering
    if (videoEl.srcObject?.id !== zoomed.stream.id) {
      videoEl.srcObject = zoomed.stream;
      videoEl.play().catch(e => console.warn("Zoomed video play error", e));
    }
  } else if (zoomedVideoRef.current && !zoomed) {
    zoomedVideoRef.current.srcObject = null;
  }
}, [zoomed, zoomed?.stream?.id]); // Only runs when zoomed user/stream changes

  const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
    return new Promise((resolve, reject) => {
      emitSocketEvent('transport-connect', {
        sessionId: currentSessionId,
        transportId,
        dtlsParameters
      }, (response) => {
        if (response && response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Transport connect failed'));
        }
      });
    });
  };

  const handleTransportProduce = (currentSessionId, transportId, kind, rtpParameters, appData) => {
    return new Promise((resolve, reject) => {
      emitSocketEvent('transport-produce', {
        sessionId: currentSessionId,
        transportId,
        kind,
        rtpParameters,
        appData,
      }, (response) => {
        if (response && response.id) {
          resolve(response.id);
        } else {
          reject(new Error(response?.error || 'Produce failed'));
        }
      });
    });
  };

  const handlePauseProducer = async (producerId) => {
    emitSocketEvent('producer-pause', {
      sessionId: sessionId || roomCode,
      producerId: producerId
    });
    
    setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(producerId);
      if (producer) {
        newState.set(producerId, { ...producer, paused: true });
      }
      return newState;
    });
  };

  const handleResumeProducer = async (producerId) => {
    emitSocketEvent('producer-resume', {
      sessionId: sessionId || roomCode,
      producerId: producerId
    });
    
    setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(producerId);
      if (producer) {
        newState.set(producerId, { ...producer, paused: false });
      }
      return newState;
    });
  };

  const handleCloseProducer = async (producerId) => {
    emitSocketEvent('producer-close', {
      sessionId: sessionId || roomCode,
      producerId: producerId
    });
    
    setProducersState(prev => {
      const newState = new Map(prev);
      newState.delete(producerId);
      return newState;
    });
    
    producers.current.delete(producerId);
  };

  // ========== STREAMING CONTROL FUNCTIONS ==========
  const startStreaming = async () => {
    const socket = getSocket();
    if (socket) {
      const hasProducers = producers.current.size > 0;
      
      if (hasProducers) {
        addDebugLog('ℹ️ Producers already exist, resuming if paused...');
        Array.from(producersState.entries()).forEach(([id, producer]) => {
          if (producer.paused) {
            handleResumeProducer(id);
          }
        });
      } else {
        addDebugLog('🔄 No producers found, initializing media...');
        await initializeMedia(sessionId || roomCode, iceServers);
      }
      
      emitSocketEvent('streamer_control', { 
        sessionId: sessionId || roomCode, 
        status: 'ACTIVE', 
        emitEvent: 'streamer_started' 
      });
      
      setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
      setIsStreamPaused(false);
      setLocalPausedState(false);
    }
  };

  const pauseStreaming = () => {
    const socket = getSocket();
    if (socket) {
      Array.from(producersState.entries()).forEach(([id, producer]) => {
        if (!producer.paused) {
          handlePauseProducer(id);
        }
      });
      
      emitSocketEvent('streamer_control', { 
        sessionId: sessionId || roomCode, 
        status: 'PAUSED', 
        emitEvent: 'streamer_paused' 
      });
      
      setRoomState(prev => ({ ...prev, isPaused: true }));
      setIsStreamPaused(true);
      setLocalPausedState(true);
      
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  };

  const resumeStreaming = () => {
    const socket = getSocket();
    if (socket) {
      Array.from(producersState.entries()).forEach(([id, producer]) => {
        if (producer.paused) {
          handleResumeProducer(id);
        }
      });
      
      emitSocketEvent('streamer_control', { 
        sessionId: sessionId || roomCode, 
        status: 'ACTIVE', 
        emitEvent: 'streamer_resumed' 
      });
      
      setRoomState(prev => ({ ...prev, isPaused: false }));
      setIsStreamPaused(false);
      setLocalPausedState(false);
      
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(error => {
          console.log('Resume play prevented:', error);
          setShowPlayButton(true);
          setLocalPausedState(true);
        });
      }
    }
  };

  const endStreaming = async () => {
  if (window.confirm('Are you sure you want to end the session for all participants?')) {
    
    // Agar recording chal rahi hai to pehle stop karen
    // if (isRecording) {
    //   const stopSuccess = await stopRecordingAPI();
    //   if (!stopSuccess) {
    //     // Agar recording stop nahi hui to user ko confirm karen
    //     const proceed = window.confirm('Recording stop failed. Still end session?');
    //     if (!proceed) return;
    //   }
    // }
    
    // Phir session end karen
    emitSocketEvent('streamer_control', { 
      sessionId: sessionId || roomCode, 
      status: 'ENDED', 
      emitEvent: 'session_ended' 
    });
  }
};

 const toggleAudio = () => {
  if (mediaStream) {
    const audioTrack = mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);

      Array.from(producersState.entries()).forEach(([id, producer]) => {
        if (producer.source === 'mic') {
          if (audioTrack.enabled) {
            handleResumeProducer(id);
          } else {
            handlePauseProducer(id);
          }
        }
      });

      addDebugLog(`🎤 Streamer mic ${audioTrack.enabled ? "on" : "off"} (local playback muted)`);
    }
  }
};

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        
        Array.from(producersState.entries()).forEach(([id, producer]) => {
          if (producer.source === 'camera') {
            if (videoTrack.enabled) {
              handleResumeProducer(id);
            } else {
              handlePauseProducer(id);
            }
          }
        });
        
        addDebugLog(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };


  const startScreenShare = async () => {
  try {
    // Agar recording चल रही है, to usi stream se share करें
    if (isRecording && screenCaptureStream) {
      addDebugLog('🔄 Starting screen share from existing recording stream');
      
      // Start sharing with participants
      await startScreenShareForParticipants(screenCaptureStream);
      
      setActiveScreenShare({
        userId: user.id,
        userName: user.name || "Streamer",
        stream: screenCaptureStream,
        source: "streamer",
      });
      
      toast.success('📺 Screen sharing started (from recording)');
      return;
    }
    
    // Agar screen capture पहले से active है
    if (screenCaptureActive && screenCaptureStream) {
      addDebugLog('🔄 Starting screen share from existing capture');
      
      await startScreenShareForParticipants(screenCaptureStream);
      
      setActiveScreenShare({
        userId: user.id,
        userName: user.name || "Streamer",
        stream: screenCaptureStream,
        source: "streamer",
      });
      
      toast.success('📺 Screen sharing started');
      return;
    }
    
    // Fresh screen capture start करें
    addDebugLog('🆕 Starting fresh screen capture for sharing');
    
    const screenStream = await startScreenCapture('share');
    if (!screenStream) {
      throw new Error('Screen capture failed');
    }
    
    await startScreenShareForParticipants(screenStream);
    
    setActiveScreenShare({
      userId: user.id,
      userName: user.name || "Streamer",
      stream: screenStream,
      source: "streamer",
    });
    
    toast.success('📺 Screen sharing started!');
    
  } catch (error) {
    console.error('Screen share error:', error);
    toast.error('Failed to start screen sharing');
  }
};


const sendMessage = useCallback(async (text = '', file = null) => {
  try {
    let fileData = null;
    let fileName = null;
    let fileType = null;
    let fileSize = null;
    
    // Agar file hai to base64 mein convert karen (database ke bina direct transfer)
    if (file) {
      setUploadingFile(true);
      
      // File size check (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        setUploadingFile(false);
        return;
      }

      // File type check
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only images, PDF and text files are allowed');
        setUploadingFile(false);
        return;
      }

      // File ko base64 mein convert karen for direct transfer
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Base64 data (data:image/png;base64,XXXXXXXX ke format se prefix hata denge)
          const base64String = e.target.result;
          fileData = base64String.split(',')[1]; // Sirf base64 data le rahe hain
          fileName = file.name;
          fileType = file.type;
          fileSize = file.size;
          
          const messageData = {
            sessionId: sessionId || roomCode,
            message: text,
            fileData: fileData, // Direct base64 data
            fileName: fileName,
            fileType: fileType,
            fileSize: fileSize,
            timestamp: new Date().toISOString(),
            type: 'file' // Identify file message
          };

          emitSocketEvent('file_message', messageData);
          setUploadingFile(false);
          
          // Success feedback
          toast.success('File sent successfully!');
          resolve();
        };
        
        reader.onerror = () => {
          console.error('File reading error');
          setUploadingFile(false);
          toast.error('Failed to read file');
          resolve();
        };
        
        reader.readAsDataURL(file);
      });
    } else {
      // Normal text message
      const messageData = {
        sessionId: sessionId || roomCode,
        message: text,
        timestamp: new Date().toISOString(),
        type: 'text' // Identify text message
      };

      emitSocketEvent('chat_message', messageData);
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    setUploadingFile(false);
    toast.error('Failed to send message');
  }
}, [sessionId, roomCode]);

  // ========== TRANSPORT CREATION ==========

  const createSendTransport = async (currentSessionId) => {
    return new Promise((resolve, reject) => {
      emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
        if (response.error || !response.params) {
          console.error("❌ createSendTransport error:", response.error);
          return reject(response.error);
        }

        try {
          const transport = device.createSendTransport(response.params);
          transports.current.set(transport.id, transport);
          sendTransportRef.current = transport;

          transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
              await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
              callback();
            } catch (err) {
              errback(err);
            }
          });

          transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
              const producerId = await handleTransportProduce(
                currentSessionId,
                transport.id,
                kind,
                rtpParameters,
                appData
              );
              callback({ id: producerId });
            } catch (err) {
              errback(err);
            }
          });

          addDebugLog("✅ SendTransport created:", transport.id);
          resolve(transport);
        } catch (err) {
          console.error("❌ Error creating send transport:", err);
          reject(err);
        }
      });
    });
  };

  const createRecvTransport = async (currentSessionId) => {
    return new Promise((resolve, reject) => {
      emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
        if (response.error || !response.params) {
          console.error("❌ createRecvTransport error:", response.error);
          return reject(response.error);
        }

        try {
          const transport = device.createRecvTransport(response.params);
          transports.current.set(transport.id, transport);
          recvTransportRef.current = transport;

          transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
              await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
              callback();
            } catch (err) {
              errback(err);
            }
          });

          addDebugLog("✅ RecvTransport created:", transport.id);
          resolve(transport);
        } catch (err) {
          console.error("❌ Error creating recv transport:", err);
          reject(err);
        }
      });
    });
  };

  // ========== MEDIA INITIALIZATION ==========

  const setupStreamerMedia = async (currentSessionId) => {
    try {
      if (producers.current.size > 0) {
        addDebugLog('ℹ️ Producers already exist, skipping setup');
        return;
      }

      if (!mediaStream) {
        throw new Error('No mediaStream available');
      }      
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (videoTrack && "contentHint" in videoTrack) {
  videoTrack.contentHint = "motion";
}
      const audioTrack = mediaStream.getAudioTracks()[0];
      
      if (!videoTrack) {
        throw new Error('No video track available');
      }
      
      if (!audioTrack) {
        throw new Error('No audio track available');
      }
      
      addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
      addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

      emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
        if (!response || response.error || !response.params) {
          console.error('Failed to create send transport:', response?.error);
          setMediaError('Failed to create media transport');
          addDebugLog(`❌ Transport creation error: ${response?.error}`);
          return;
        }

        const transport = device.createSendTransport(response.params);
        transports.current.set(transport.id, transport);
        sendTransportRef.current = transport;

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
            callback();
          } catch (error) {
            console.error('Transport connect error:', error);
            errback(error);
          }
        });
transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
  try {
    const producerId = await handleTransportProduce(
      currentSessionId,
      transport.id,
      kind,
      rtpParameters,
      appData
    );
    callback({ id: producerId });
  } catch (error) {
    console.error('Transport produce error:', error);
    errback(error);
  }
});

try {
  setMediaError(null);
  addDebugLog('✅ Using existing camera/microphone stream');

//  const videoProducer = await transport.produce({
//   track: videoTrack,
//   appData: { source: 'camera', userId: user?.id }   // 🔥 add userId
// });

const videoProducer = await transport.produce({
  track: videoTrack,
  appData: { source: "camera", userId: user?.id },
  encodings: [
    { maxBitrate: 600_000 }, // 640x360 @ 40fps ke liye good starting point
  ],
  codecOptions: {
    videoGoogleStartBitrate: 600, // kbps
  },
});

  producers.current.set(videoProducer.id, videoProducer);
  setProducersState(prev => new Map(prev).set(videoProducer.id, {
    id: videoProducer.id,
    kind: 'video',
    paused: false,
    source: 'camera'
  }));
  addDebugLog(`✅ Video producer created: ${videoProducer.id}`);
  
  const audioProducer = await transport.produce({
  track: audioTrack,
  appData: { source: 'mic', userId: user?.id }      // 🔥 add userId
});

  producers.current.set(audioProducer.id, audioProducer);
  setProducersState(prev => new Map(prev).set(audioProducer.id, {
    id: audioProducer.id,
    kind: 'audio',
    paused: false,
    source: 'mic'
  }));
  addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

  setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
  setIsInitializing(false);
  setIsLoading(false);
  
  setTimeout(() => {
    if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
      videoRef.current.play().catch(error => {
        console.log('Post-producer autoplay prevented:', error);
        setShowPlayButton(true);
      });
    }
  }, 500);
  
} catch (error) {
  console.error('Error creating producers:', error);
  addDebugLog(`❌ Producer creation error: ${error.message}`);
  setIsInitializing(false);
  setIsLoading(false);
}
      });
    } catch (error) {
      console.error('Error setting up streamer media:', error);
      setMediaError('Failed to set up media streaming');
      addDebugLog(`❌ Media setup error: ${error.message}`);
      setIsInitializing(false);
      setIsLoading(false);
    }
  };
  
const initializeMedia = async (currentSessionId, initialIceServers = []) => {
  try {
    if (isMediaInitialized) {
      addDebugLog('ℹ️ Media already initialized, skipping');
      return;
    }
    
    if (!mediaStream) {
      addDebugLog('❌ No media stream available for initialization');
      return;
    }
    
    setIsMediaInitialized(true);
    addDebugLog('Initializing media with existing stream...');
    
    const socket = getSocket();
    if (!socket) {
      addDebugLog('❌ No socket available for media initialization');
      return;
    }
    
    socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
      if (response.error || !response.rtpCapabilities) {
        addDebugLog(`❌ Failed to get router capabilities: ${response.error}`);
        setMediaError('Failed to initialize media server');
        setIsMediaInitialized(false);
        return;
      }

      try {
        await device.load({ routerRtpCapabilities: response.rtpCapabilities });
        addDebugLog(`✅ Device loaded successfully`);

        // Create transports
        await createRecvTransport(currentSessionId);
        await createSendTransport(currentSessionId);

        // Setup streamer media
        await setupStreamerMedia(currentSessionId);

      } catch (error) {
        console.error('Error loading device:', error);
        setMediaError('Failed to initialize media device');
        setIsMediaInitialized(false);
        addDebugLog(`❌ Device load error: ${error.message}`);
      }
    });
  } catch (error) {
    console.error('Error initializing media:', error);
    setMediaError('Failed to initialize media');
    setIsMediaInitialized(false);
    addDebugLog(`❌ Media init error: ${error.message}`);
  }
};

  const joinRoomWithRetry = (retries = 3) => {
    const socket = getSocket();
    if (!socket) {
      addDebugLog('❌ No socket available for joining room');
      return;
    }
    
    if (retries === 0) {
      console.error('Failed to join room after multiple attempts');
      addDebugLog('Failed to join room after multiple attempts');
      alert('Failed to join the session. Please try again.');
      return;
    }

    addDebugLog(`Joining room (attempt ${4 - retries}/3)...`);
    
    socket.emit('join_room', { 
      token, 
      sessionId: sessionId || null,
      roomCode: roomCode || null,
    }, (response) => {
      if (response && response.error) {
        console.warn(`Join room failed: ${response.error}, retrying... (${retries - 1} attempts left)`);
        addDebugLog(`Join room failed: ${response.error}, retrying...`);
        setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
      }
    });
  };
  // ========== CAMERA AND PERMISSION FUNCTIONS ==========

const initializeCamera = async () => {
  try {
    addDebugLog('🔄 Initializing camera with smart audio optimization...');
    setIsLoading(true);
    setIsInitializing(true);
    setCameraVisible(false);
    setShowPlayButton(false); // Reset play button
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // ✅ SMART AUDIO CONSTRAINTS with complete optimization
    const audioConstraints = await getOptimizedAudioConstraints(); // ✅ await add karo
    
    // ✅ EARPHONE DETECTION aur optimization
    const earphoneInfo = await detectEarphones();
    
    // ✅ EARPHONE ADJUSTMENT - Force stereo if earphone detected
    if (earphoneInfo.hasEarphone) {
      audioConstraints.channelCount = 2;
      audioConstraints.sampleRate = 48000; // High quality for earphones
      
      if (earphoneInfo.isBluetooth) {
        // Bluetooth earphones need special handling
        audioConstraints.latency = 0.02; // Slightly higher latency for BT
        addDebugLog('🎧 Bluetooth earphone detected - using optimized settings');
      } else if (earphoneInfo.isWiredHeadphone) {
        addDebugLog('🎧 Wired headphone detected - using high quality audio');
      }
      
      addDebugLog(`🎧 Earphone detected: ${earphoneInfo.deviceLabels.join(', ')}`);
    }

    addDebugLog(`🎵 Using optimized audio: ${audioConstraints.channelCount} channels, ${audioConstraints.sampleRate || 'default'}Hz`);

const constraints = {
  video: {
    facingMode: { ideal: "user" },     // ✅ front camera
    width: { ideal: 640, max: 640 },   // ✅ viewer-like
    height: { ideal: 360, max: 360 },  // ✅ viewer-like
    frameRate: { ideal: 40, max: 40 }, // ✅ 40 fps
  },
  audio: audioConstraints
};

    addDebugLog('🎯 Requesting media with constraints:', {
      video: constraints.video,
      audio: constraints.audio
    });

    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('📱 Camera stream obtained with optimized audio');

    // ✅ VERIFY AUDIO SETTINGS
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    if (videoTracks.length === 0) {
      throw new Error('No video track found in stream');
    }

    // Log actual audio settings
    if (audioTracks.length > 0) {
      const audioSettings = audioTracks[0].getSettings();
      addDebugLog(`🎵 Actual audio settings: ${audioSettings.channelCount} channels, ${audioSettings.sampleRate || 'default'}Hz, sampleSize: ${audioSettings.sampleSize || 'N/A'}`);
      
      // Warn if we got mono but wanted stereo
      if (earphoneInfo.hasEarphone && audioSettings.channelCount === 1) {
        addDebugLog('⚠️ Earphone connected but got MONO audio - device limitation');
      }
      
      // Log all audio track details
      audioTracks.forEach((track, index) => {
        const settings = track.getSettings();
        addDebugLog(`🎤 Audio Track ${index + 1}:`, {
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          channelCount: settings.channelCount,
          sampleRate: settings.sampleRate,
          sampleSize: settings.sampleSize,
          latency: settings.latency
        });
      });
    }

    // Log video track details
    videoTracks.forEach((track, index) => {
      const settings = track.getSettings();
      addDebugLog(`📹 Video Track ${index + 1}:`, {
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        aspectRatio: settings.aspectRatio
      });
    });
    
    setMediaStream(stream);
    setMediaError(null);
    setPermissionStatus('granted');
    setCameraReady(true);
    
    addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
    
    // Setup video element properly
    setTimeout(() => {
      if (videoRef.current) {
        const videoEl = videoRef.current;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('webkit-playsinline', '');
        videoEl.srcObject = stream;
        
        // Video event listeners for better debugging
        videoEl.onloadedmetadata = () => {
          addDebugLog('📹 Video metadata loaded');
        };
        
        videoEl.oncanplay = () => {
          addDebugLog('📹 Video can play');
        };
        
        videoEl.onerror = (e) => {
          console.error('📹 Video error:', e);
          addDebugLog(`❌ Video error: ${e.message}`);
        };

        // Auto-play attempt with better timing
        setTimeout(() => {
          videoEl.play().then(() => {
            addDebugLog('✅ Mobile autoplay successful');
            setIsPlaying(true);
            setShowPlayButton(false);
            setIsLoading(false);
            setIsInitializing(false);
          }).catch(error => {
            console.log('📱 Mobile autoplay blocked, waiting for user gesture');
            addDebugLog(`📱 Autoplay blocked: ${error.message}`);
            setShowPlayButton(true);
            setIsLoading(false);
            setIsInitializing(false);
          });
        }, 800); // Slightly longer delay for mobile
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Error accessing camera:', error);
    addDebugLog(`❌ Camera access error: ${error.message}`);
    
    let errorMessage = `Camera error: ${error.message}`;
    
    // Specific error handling
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
      setPermissionStatus('denied');
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found. Please check if camera is connected.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Camera not supported on this device/browser.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...';
      // Fallback to basic constraints
      
    }
    
    setMediaError(errorMessage);
    setIsLoading(false);
    setIsInitializing(false);
    setShowPlayButton(true);
  }
};


  const requestCameraPermissions = async () => {
    try {
      addDebugLog('🔄 Manually requesting camera permissions...');
      setPermissionStatus('checking');
      setIsLoading(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setMediaError(null);
      setPermissionStatus('granted');
      addDebugLog('✅ Camera permissions granted manually');
      
      initializeCamera();
    } catch (error) {
      console.error('Failed to request camera permissions:', error);
      setMediaError('Failed to get camera permissions. Please allow access in browser settings.');
      setPermissionStatus('denied');
      addDebugLog(`❌ Manual permission request failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const retryCamera = async () => {
    try {
      setMediaError(null);
      setPermissionStatus('checking');
      setIsLoading(true);
      
      Array.from(producersState.keys()).forEach(producerId => {
        handleCloseProducer(producerId);
      });
      
      transports.current.forEach(transport => {
        try {
          transport.close();
        } catch (error) {
          console.error('Error closing transport:', error);
        }
      });
      transports.current.clear();
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      
      setIsMediaInitialized(false);
      setCameraReady(false);
      setCameraVisible(false);
      setIsWebSocketInitialized(false);
      setProducersState(new Map());
      
      initializeCamera();
      
      addDebugLog('Camera retry initiated');
    } catch (error) {
      console.error('Failed to retry camera:', error);
      setMediaError('Failed to restart camera');
      setPermissionStatus('denied');
      addDebugLog(`Camera retry failed: ${error.message}`);
      setIsLoading(false);
    }
  };
  // ========== WEBSOCKET INITIALIZATION ==========
  const initializeWebSocket = () => {
    if (permissionStatus !== 'granted') {
      addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
      return;
    }

    addDebugLog('Setting up socket connection...');
    addDebugLog(`Socket URL: ${import.meta.env.VITE_SOCKET_URL}`);
    addDebugLog(`Session ID: ${sessionId}`);
    addDebugLog(`Room Code: ${roomCode}`);

    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    transports: ['websocket', 'polling'], 
    upgrade: true,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
    });

    newSocket.on('connect', () => {
      addDebugLog('✅ Socket connected, emitting join_room...');
      setIsConnected(true);
      
      joinRoomWithRetry();
    });


    newSocket.on('disconnect', () => {
      addDebugLog('❌ Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      addDebugLog(`Connection error: ${error.message}`);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      addDebugLog(`Socket error: ${error.message}`);
    });

    newSocket.on('error_message', (data) => {
      console.error('Error:', data);
      addDebugLog(`Error message: ${JSON.stringify(data)}`);
      alert(data.message || data);
    });

    // ========== SOCKET EVENT LISTENERS ==========
    newSocket.on('new-viewer-screen-producer', (data) => {
      addDebugLog('📩 Direct new-viewer-screen-producer event received');
      handleNewViewerScreenProducer(data);
    });

    // Recording status events
newSocket.on('recording_started', (data) => {
  addDebugLog(`🎬 Recording started: ${data.sessionId}`);
  setIsRecording(true);
});

newSocket.on('recording_stopped', (data) => {
  addDebugLog(`⏹ Recording stopped: ${data.sessionId}`);
  setIsRecording(false);
});

    newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
    newSocket.on('viewer-audio-request', handleViewerAudioRequest);
    newSocket.on('screen-share-request', handleScreenShareRequest);
    newSocket.on('viewer-audio-started', handleViewerAudioStarted);
    newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
    newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
    newSocket.on('screen-share-stopped-by-viewer', handleScreenShareStopped);
    newSocket.on("viewer-video-request", handleViewerVideoRequest);


    newSocket.on("viewer-audio-stopped", ({ userId }) => {
  cleanupViewerAudio(userId);

   newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
  addDebugLog(`🛑 Viewer audio force-stopped: ${userId}`);
   cleanupViewerAudio(userId); // remove their audio element

   // Participants list update bhi karo
   setParticipants(prev =>
     prev.map(p =>
       p.userId === userId ? { ...p, hasAudio: false } : p
     )
   );
 });
});

newSocket.on("user_left", (data) => {
  // keep your existing cleanup, but also ensure audio element removed
  cleanupViewerAudio(data.userId);
  cleanupViewerMedia(data.userId); // if you already had this
});


    // Viewer audio status events
    newSocket.on('viewer-audio-enabled', (data) => {
      addDebugLog(`Viewer audio enabled: ${data.userId}`);
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, hasAudio: true } : p
      ));
    });

    newSocket.on('viewer-audio-started-global', (data) => {
      addDebugLog(`Viewer audio started globally: ${data.userId}`);
      setActiveSpeakers(prev => new Map(prev).set(data.socketId, {
        userId: data.userId,
        socketId: data.socketId,
        userName: data.userName
      }));
    });

    newSocket.on('viewer-audio-muted-global', (data) => {
      addDebugLog(`Viewer audio muted globally: ${data.userId}`);
      setActiveSpeakers(prev => {
        const newMap = new Map(prev);
        Array.from(newMap.entries()).forEach(([key, value]) => {
          if (value.userId === data.userId) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    });

    newSocket.on('joined_room', (data) => {
      addDebugLog('✅ Joined room successfully');
      setSession(data);
      setParticipants(data.participants || []);
      setIceServers(data.iceServers || []);
      setIsLoading(false);
      
      if (!isMediaInitialized) {
        initializeMedia(data.sessionId, data.iceServers);
      }
    });

    newSocket.on('ice_servers', (servers) => {
      addDebugLog(`Received ${servers.length} ICE servers`);
      setIceServers(servers);
    });

    newSocket.on('user_joined', (data) => {
      addDebugLog(`User joined: ${data.userId}`);
      setParticipants(prev => [...prev, data]);
    });

    newSocket.on('user_left', (data) => {
      addDebugLog(`User left: ${data.userId}`);
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      
      // Clean up viewer media
      cleanupViewerMedia(data.userId);
      
      // Clean up remote videos
      const videoToRemove = Array.from(remoteVideosRef.current.entries())
        .find(([_, video]) => video.dataset?.socketId === data.socketId);
      
      if (videoToRemove) {
        const [producerId, video] = videoToRemove;
        video.remove();
        remoteVideosRef.current.delete(producerId);
      }
    });
    // Socket event handlers mein ye add karen
newSocket.on('chat_message', (message) => {
  addDebugLog(`Chat message from ${message.userId}`);
  
  // Agar file message hai to usko process karen
  if (message.type === 'file') {
    addDebugLog(`File received: ${message.fileName} (${message.fileType})`);
  }
  
  setMessages(prev => [...prev, {
    ...message,
    id: Date.now() + Math.random(), // Unique ID
    timestamp: message.timestamp || new Date().toISOString()
  }]);
});
    newSocket.on('streamer_started', () => {
      addDebugLog('Streamer started streaming');
      setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
      setLocalPausedState(false);
    });

    newSocket.on('streamer_paused', () => {
      addDebugLog('Streamer paused streaming');
      setRoomState(prev => ({ ...prev, isPaused: true }));
      setLocalPausedState(true);
    });

    newSocket.on('streamer_resumed', () => {
      addDebugLog('Streamer resumed streaming');
      setRoomState(prev => ({ ...prev, isPaused: false }));
      setLocalPausedState(false);
      
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(error => {
          console.log('Resume play prevented:', error);
          setShowPlayButton(true);
        });
      }
    });
    // 🛑 Streamer ne ya viewer ne camera stop kiya
newSocket.on("viewer-video-force-stopped-global", ({ userId }) => {
  addDebugLog(`🛑 Camera stopped globally for user: ${userId}`);
  cleanupViewerMedia(userId); // tumhare paas already hai
});

newSocket.on("viewer-camera-stopped", ({ userId }) => {
  addDebugLog(`📷 Viewer camera stopped: ${userId}`);

  setZoomed((prev) => {
    if (prev && prev.type === "viewer" && prev.userId === userId) {
      addDebugLog(`🔄 Resetting zoom for stopped viewer camera: ${userId}`);
      return null;
    }
    return prev;
  });
    cleanupViewerCamera(userId);
});

newSocket.on("viewer-camera-paused-global", ({ userId }) => {
  addDebugLog(`⏸️ Viewer camera paused: ${userId}`);
  setParticipants(prev =>
    prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))
  );
});

newSocket.on("viewer-camera-resumed-global", ({ userId }) => {
  addDebugLog(`▶️ Viewer camera resumed: ${userId}`);
  setParticipants(prev =>
    prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))
  );
});
    newSocket.on('session_ended', () => {
      addDebugLog('Session ended by streamer');
      setRoomState(prev => ({ ...prev, isStreaming: false, isPaused: true }));
      alert('Session has been ended by the streamer.');
      navigate('/dashboard');
    });

    newSocket.on('session_paused', () => {
      addDebugLog('Session paused by streamer');
      setRoomState(prev => ({ ...prev, isPaused: true }));
      setLocalPausedState(true);
      alert('Session has been paused by the streamer.');
    });

    newSocket.on('producer-paused', (data) => {
      addDebugLog(`Producer paused: ${data.producerId}`);
      setProducersState(prev => {
        const newState = new Map(prev);
        const producer = newState.get(data.producerId);
        if (producer) {
          newState.set(data.producerId, { ...producer, paused: true });
        }
        return newState;
      });
    });

    newSocket.on('producer-resumed', (data) => {
      addDebugLog(`Producer resumed: ${data.producerId}`);
      setProducersState(prev => {
        const newState = new Map(prev);
        const producer = newState.get(data.producerId);
        if (producer) {
          newState.set(data.producerId, { ...producer, paused: false });
        }
        return newState;
      });
    });

newSocket.on("producer-closed", (data) => {
  addDebugLog(
    `❌ Producer closed: ${data.producerId}, source: ${data.source}, user: ${data.userId}`
  );

  // 🖥️ Screen share cleanup (streamer OR viewer)
  if (data.source === "screen" || data.source === "viewer-screen") {
    // 🔴 Forcefully clear state
    setActiveScreenShare(null);

    // 🔴 Stop only video tracks from screen share
    try {
      if (screenRef.current?.srcObject) {
        const tracks = screenRef.current.srcObject.getTracks?.() || [];
        tracks.forEach((t) => {
          if (t.kind === 'video') {
            t.stop(); // Only stop video tracks
          }
        });
      }
    } catch (e) {
      console.warn("Error stopping screen share tracks on producer-closed", e);
    }

    // 🔴 Clear video ref
    if (screenRef.current) {
      try {
        screenRef.current.srcObject = null;
        screenRef.current.load?.();
      } catch (e) {
        console.warn("Error clearing screenRef on producer-closed", e);
      }
    }

    addDebugLog(
      `✅ Producer closed → forced activeScreenShare reset for ${data.userId}`
    );
  }

  // 🎤 Audio cleanup - ONLY for audio sources
  if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
    cleanupViewerAudio(data.userId);
    addDebugLog(`🎤 Viewer audio stopped for user: ${data.userId}`);
  }

  // 📷 Camera cleanup - ONLY for camera video
  if (data.source === "viewer-camera") {
    setViewerCameras((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(data.userId)) {
        const stream = newMap.get(data.userId);
        if (stream) {
          try {
            // ✅ ONLY stop VIDEO tracks, leave audio tracks alone
            stream.getTracks().forEach((t) => {
              if (t.kind === 'video') {
                t.stop();
                addDebugLog(`📹 Stopped video track for user ${data.userId}`);
              }
              // Audio tracks continue playing
            });
          } catch (e) {
            console.warn("Error stopping camera tracks", e);
          }
        }
        newMap.delete(data.userId);
      }
      return newMap;
    });
    addDebugLog(`📷 Viewer camera removed for user ${data.userId}`);
  }

  // 🔊 Streamer audio cleanup - if needed
  if (data.source === "mic" || data.source === "streamer-mic") {
    addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
    // Don't cleanup viewer audio here, this is streamer's audio
  }
});


    newSocket.on("new-producer", (data) => {
      addDebugLog("📡 New producer available:", data);

      // Track producer in state
      setProducersState((prev) => {
        const updated = new Map(prev);
        updated.set(data.producerId, {
          id: data.producerId,
          kind: data.kind,
          userId: data.userId,
          source: data.source || "camera",
          paused: false,
        });
        return updated;
      });

      // Handle viewer screen video
      if (data.source === "viewer-screen") {
        addDebugLog("🖥️ Consuming viewer screen producer:", data.producerId);
        createConsumer(sessionId || roomCode, data.producerId, data.kind);
      }

      // Handle viewer mic OR viewer screen audio
      if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
        addDebugLog("🎤 Consuming viewer audio producer:", data.producerId);
        createConsumer(sessionId || roomCode, data.producerId, data.kind);
      }
      if (data.source === "viewer-camera") {
  addDebugLog("📷 Consuming viewer camera producer:", data.producerId);
  createConsumer(sessionId || roomCode, data.producerId, data.kind);
}
    });
    
    newSocket.on('participant_updated', (data) => {
      addDebugLog(`Participant updated: ${data.userId}`);
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, ...data.updates } : p
      ));
    });

 newSocket.on("participants_list_updated", (data) => {
  addDebugLog("📋 Participants list updated (snapshot)");
  console.log("participants list:", data.participants || []);
  setParticipants(data.participants || []);
});
    setSocket(newSocket);
    socketRef.current = newSocket;
  };

  // ========== USE EFFECT HOOKS ==========

useEffect(() => {
  // Initialize media stream refs
  streamerMediaRef.current = new MediaStream();
  viewerAudiosRef.current = new Map();

  return () => {
    isMountedRef.current = false;

    // 🎬 RECORDING CLEANUP (FIRST - most important)
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
        addDebugLog('🛑 Recorder stopped on unmount');
      } catch (error) {
        console.error('Error stopping recorder:', error);
      }
    }
    
    // 📺 SCREEN CAPTURE CLEANUP
    if (screenCaptureStream) {
      try {
        screenCaptureStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
            addDebugLog(`🛑 Stopped screen capture track: ${track.kind}`);
          }
        });
      } catch (error) {
        console.error('Error stopping screen capture:', error);
      }
    }
    
    // 🧹 RECORDING STREAM CLEANUP
    if (recordingStream) {
      try {
        recordingStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        setRecordingStream(null);
        addDebugLog('🧹 Recording stream cleaned up');
      } catch (error) {
        console.error('Error cleaning recording stream:', error);
      }
    }

    // 🎥 Clean up main camera/microphone stream
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        addDebugLog('🎥 Main camera stream cleaned up');
      } catch (error) {
        console.error('Error stopping media stream:', error);
      }
    }

    // 🖥️ Clean up active screen share (only one can be active)
    if (activeScreenShare?.stream && activeScreenShare.stream !== screenCaptureStream) {
      try {
        activeScreenShare.stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        addDebugLog(`🖥️ Active screen share cleaned up: ${activeScreenShare.userName}`);
      } catch (error) {
        console.error('Error stopping active screen share:', error);
      }
    }

    // 🎤 Clean up all viewer audio streams
    viewerAudiosRef.current.forEach((stream, userId) => {
      try {
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (error) {
        console.error(`Error stopping viewer audio for ${userId}:`, error);
      }
    });

    // 🎥 Clean up remote video elements
    remoteVideosRef.current.forEach((video, producerId) => {
      try {
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      } catch (error) {
        console.error(`Error cleaning remote video ${producerId}:`, error);
      }
    });

    // 🔥 AUDIO MIXER CLEANUP
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
        audioDestinationRef.current = null;
        addDebugLog('🔊 Audio mixer cleaned up');
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }

    // 🖱️ Remove gesture handlers
    if (userGestureHandlerRef.current) {
      try {
        document.removeEventListener("click", userGestureHandlerRef.current);
        document.removeEventListener("touchstart", userGestureHandlerRef.current);
        addDebugLog('🖱️ Gesture handlers removed');
      } catch (error) {
        console.error('Error removing gesture handlers:', error);
      }
    }

    // 🔌 Close all transports
    transports.current.forEach((transport, id) => {
      try {
        transport.close();
        addDebugLog(`🔌 Transport closed: ${id}`);
      } catch (error) {
        console.error(`Error closing transport ${id}:`, error);
      }
    });

    // 🔗 Close socket connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
        addDebugLog('🔗 Socket connection closed');
      } catch (error) {
        console.error('Error closing socket:', error);
      }
    }

    // 🧹 CLEANUP PENDING AUDIO QUEUE
    pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
      try {
        if (streamInfo.audioStream) {
          streamInfo.audioStream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
        }
      } catch (error) {
        console.error(`Error cleaning pending audio for ${userId}:`, error);
      }
    });
    pendingAudioQueueRef.current.clear();

    // 🧹 CLEANUP AUDIO ELEMENTS FROM DOM
    audioElementsRef.current.forEach((audioEl, userId) => {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
        if (audioEl.parentNode) {
          audioEl.parentNode.removeChild(audioEl);
        }
      } catch (error) {
        console.error(`Error cleaning audio element for ${userId}:`, error);
      }
    });
    audioElementsRef.current.clear();

    // 🧹 CLEANUP VIEWER CAMERAS
    viewerCameras.forEach((stream, userId) => {
      try {
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (error) {
        console.error(`Error cleaning viewer camera for ${userId}:`, error);
      }
    });

    // 🧹 STATE RESET LOG
    addDebugLog('✅ Component cleanup completed');
    
    // TIMER CLEANUP (if any interval running)
    if (recordingInterval) {
      clearInterval(recordingInterval);
    }
    
    // 🚨 EMERGENCY: Stop any remaining MediaRecorder
    if (window.MediaRecorder && window.recordingInstances) {
      window.recordingInstances.forEach(recorder => {
        if (recorder.state === 'recording') {
          try {
            recorder.stop();
          } catch (e) {
            // Ignore
          }
        }
      });
    }
  };
}, []); // Empty dependency array - runs only on unmount

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        addDebugLog('🔍 Checking camera and microphone permissions...');
        setPermissionStatus('checking');
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
        const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
        
        if (hasVideoPermission && hasAudioPermission) {
          addDebugLog('✅ Camera and microphone permissions already granted');
          setPermissionStatus('granted');
          initializeCamera();
        } else {
          addDebugLog('ℹ️ Need to request camera/microphone permissions');
          setPermissionStatus('denied');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        addDebugLog(`❌ Error checking permissions: ${error.message}`);
        setPermissionStatus('denied');
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, []);


  useEffect(() => {
  return () => {
    // Cleanup recording
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    
    // Cleanup recording stream
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
  };
}, [recorder, recordingStream]);

  useEffect(() => {
    if (permissionStatus === 'granted' && !isWebSocketInitialized) {
      addDebugLog('🔄 Initializing WebSocket connection...');
      setIsWebSocketInitialized(true);
      initializeWebSocket();
    }
  }, [permissionStatus, isWebSocketInitialized]);

  useEffect(() => {
    const checkCameraVisibility = () => {
      if (videoRef.current && mediaStream) {
        const videoTracks = mediaStream.getVideoTracks();
        const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        
        if (hasVideo && videoRef.current.readyState >= 2) {
          setCameraVisible(true);
          setIsLoading(false);
          addDebugLog('✅ Camera video is visible on screen');
        }
      }
    };

    if (mediaStream) {
      checkCameraVisibility();
      const interval = setInterval(checkCameraVisibility, 500);
      return () => clearInterval(interval);
    }
  }, [mediaStream]);

  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (!videoElement || !mediaStream) {
      setIsPlaying(false);
      return;
    }

    if (videoElement.srcObject !== mediaStream) {
      videoElement.srcObject = mediaStream;
      videoElement.muted = true;
    }

    const handlePlay = () => {
      console.log('Video started playing');
      setIsPlaying(true);
      setShowPlayButton(false);
      setMediaError(false);
      setLocalPausedState(false);
      setIsLoading(false);
    };

    const handlePause = () => {
      console.log('Video paused');
      setIsPlaying(false);
      setLocalPausedState(true);
      
      if (!roomState.isPaused) {
        setShowPlayButton(true);
      }
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      setMediaError(true);
      setIsPlaying(false);
      setShowPlayButton(true);
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded');
      setIsLoading(false);
      if (!roomState.isPaused && !localPausedState) {
        videoElement.play().catch(error => {
          console.log('Autoplay prevented:', error);
          setShowPlayButton(true);
        });
      }
    };

    const handleLoadedData = () => {
      console.log('Video data loaded');
      setIsLoading(false);
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        setCameraVisible(true);
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      console.log('Video can play');
      setIsLoading(false);
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('canplay', handleCanPlay);

    if (videoElement.readyState >= 2) {
      if (!videoElement.paused && !videoElement.ended) {
        setIsPlaying(true);
        setShowPlayButton(false);
        setLocalPausedState(false);
        setIsLoading(false);
      } else if (roomState.isPaused) {
        setIsPlaying(false);
        setShowPlayButton(false);
        setLocalPausedState(true);
      } else {
        videoElement.play().catch(error => {
          console.log('Initial play prevented:', error);
          setShowPlayButton(true);
          setLocalPausedState(true);
        });
      }
    }

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [mediaStream, roomState.isPaused]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !mediaStream) return;

    if (roomState.isPaused && !videoElement.paused) {
      videoElement.pause();
      setIsPlaying(false);
      setShowPlayButton(false);
      setLocalPausedState(true);
    } else if (!roomState.isPaused && videoElement.paused && roomState.isStreaming) {
      videoElement.play().catch(error => {
        console.log('Play after resume prevented:', error);
        setShowPlayButton(true);
        setLocalPausedState(true);
      });
    }
  }, [roomState.isPaused, roomState.isStreaming, mediaStream]);

// ✅ always keep PiP screen video in sync, even after zoom toggle
useEffect(() => {
  if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
    screenRef.current.srcObject = activeScreenShare.stream;
    screenRef.current.play().catch(() => {
      console.warn("Autoplay blocked for screen PiP");
    });
  } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
    screenRef.current.srcObject = null;
  }
}, [activeScreenShare?.stream, zoomed]);

  useEffect(() => {
    if (mediaStream) {
      const tracks = mediaStream.getTracks();
      tracks.forEach(track => {
        addDebugLog(`Track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
        if (track.kind === 'video') {
          const settings = track.getSettings();
          addDebugLog(`Video settings: ${JSON.stringify({
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            deviceId: settings.deviceId
          })}`);
        }
      });
      
      const status = checkStreamStatus();
      if (status.hasVideo && status.hasAudio) {
        addDebugLog('✅ Stream has both audio and video tracks');
      } else {
        addDebugLog('❌ Stream is missing audio or video tracks');
      }
    }
  }, [mediaStream]);
// 👇 ye effect tumhare component me daal do
// ✅ Streamer video ke liye
useEffect(() => {
  if (!videoRef.current) return;

  if (!zoomed && mediaStream) {
    videoRef.current.srcObject = mediaStream;
    videoRef.current.play().catch(err =>
      console.warn("Autoplay prevented for camera video:", err)
    );
  } else if (zoomed && zoomed.type !== "streamer") {
    // jab zoomed viewer/screen hai to streamer video hide
    videoRef.current.srcObject = null;
  }
}, [zoomed, mediaStream]);
  // ========== UI COMPONENTS ==========

const handlePlayClick = async (e) => {
  try {
    e.stopPropagation();
    console.log('📱 User triggered play');
    
    if (videoRef.current && mediaStream) {
      // Ensure video element is properly set up
      const videoEl = videoRef.current;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('webkit-playsinline', '');
      
      // Set source only if needed
      if (videoEl.srcObject !== mediaStream) {
        videoEl.srcObject = mediaStream;
      }
      
      // User gesture ke saath play
      await videoEl.play();
      console.log('✅ Mobile video started via user gesture');
      setIsPlaying(true);
      setShowPlayButton(false);
      setMediaError(false);
      setLocalPausedState(false);
      
    }
  } catch (error) {
    console.error('❌ Failed to play video on mobile:', error);
    
    // Specific error handling
    if (error.name === 'NotAllowedError') {
      setMediaError('Autoplay blocked. Please tap to play.');
    } else {
      setMediaError('Failed to play video');
    }
    
    setShowPlayButton(true);
    setLocalPausedState(true);
  }
};

  // 📷 Jab viewer camera request bhejta hai
const handleViewerVideoRequest = useCallback((data) => {
  addDebugLog(`📷 Viewer requested camera: ${data.requesterName} (${data.requestedUserId})`);
  
  setViewerVideoRequests((prev) => [
    ...prev,
    {
      userId: data.requestedUserId,
      userName: data.requesterName,
      socketId: data.socketId
    }
  ]);
}, []);

// Replace old handleViewerVideoResponse with this:
const handleViewerVideoResponse = useCallback((requesterSocketId, allow) => {
  // Use socketRef (safer) or emitSocketEvent helper
  if (!socketRef.current || !socketRef.current.connected) {
    addDebugLog('❌ Socket not connected — cannot send viewer-video-response');
    return;
  }

  socketRef.current.emit('viewer-video-response', {
    sessionId: sessionId || roomCode,
    requesterSocketId,    // <-- IMPORTANT: server expects this key
    allow                  // <-- IMPORTANT: server expects `allow` (boolean)
  });

  // remove the request UI
  setViewerVideoRequests(prev => prev.filter(r => r.userId !== requesterSocketId && r.socketId !== requesterSocketId));

  addDebugLog(`${allow ? '✅' : '❌'} Camera ${allow ? 'approved' : 'denied'} for requester socket: ${requesterSocketId}`);
}, [sessionId, roomCode]);

  const checkStreamStatus = useCallback(() => {
    if (!mediaStream) return false;
    
    const videoTracks = mediaStream.getVideoTracks();
    const audioTracks = mediaStream.getAudioTracks();
    
    const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
    const hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
    addDebugLog(`Stream status - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
    return { hasVideo, hasAudio };
  }, [mediaStream]);

useEffect(() => {
  if (!isMobile) return;

  const handleFirstUserInteraction = () => {
    addDebugLog('📱 Mobile user interaction detected');
    
    // Video play try karo user gesture ke baad
    if (videoRef.current && mediaStream && showPlayButton) {
      setTimeout(() => {
        videoRef.current.play().catch(() => {
          // Still blocked, play button show karo
          setShowPlayButton(true);
        });
      }, 100);
    }
  };

  // Multiple events pe listen karo
  document.addEventListener('click', handleFirstUserInteraction, { once: true });
  document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
  document.addEventListener('touchend', handleFirstUserInteraction, { once: true });

  return () => {
    document.removeEventListener('click', handleFirstUserInteraction);
    document.removeEventListener('touchstart', handleFirstUserInteraction);
    document.removeEventListener('touchend', handleFirstUserInteraction);
  };
}, [isMobile, mediaStream, showPlayButton]);


// Mobile detection and handlers
useEffect(() => {
  const checkMobile = () => {
    const mobile = window.innerWidth < 768 || 
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    if (mobile) {
      setMobileView('video');
      setShowThumbnails(false);
      addDebugLog(`📱 Mobile device detected: ${window.innerWidth}px`);
    }
  };

  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);

  // Full screen handling
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Full screen error:', err);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  // Mobile main render
  if (isMobile) {
      const mobileHeight = isLandscape ? 'h-[160vh]' : 'h-screen';

    return (
      <div className={`flex flex-col ${mobileHeight} bg-black text-white overflow-hidden`}>
        <MobileHeader
      session={session}
      participants={participants}
      isConnected={isConnected}
      viewerAudioRequests={viewerAudioRequests}
      screenShareRequests={screenShareRequests}
      viewerVideoRequests={viewerVideoRequests}
      setMobileView={setMobileView}
      toggleFullScreen={toggleFullScreen}
      isFullScreen={isFullScreen}
      showRequests={showRequests}
      setShowRequests={setShowRequests}
    />
    
    <MobileRequestsPanel
      viewerAudioRequests={viewerAudioRequests}
      screenShareRequests={screenShareRequests}
      viewerVideoRequests={viewerVideoRequests}
      handleViewerAudioResponse={handleViewerAudioResponse}
      handleScreenShareResponse={handleScreenShareResponse}
      handleViewerVideoResponse={handleViewerVideoResponse}
    />
        
        {mobileView === 'video' && (
        <MobileVideoView
          zoomed={zoomed}
          setZoomed={setZoomed}
          mediaStream={mediaStream}
          participants={participants}
          activeScreenShare={activeScreenShare}
          setIsPlaying={setIsPlaying}
          setShowPlayButton={setShowPlayButton}
          showPlayButton={showPlayButton}
          setMediaError={setMediaError}
          mediaError={mediaError}
          isLoading={isLoading}
          isInitializing={isInitializing}
          roomState={roomState}
          localPausedState={localPausedState}
          user={user}
          videoEnabled={videoEnabled}
          viewerCameras={viewerCameras}
          showMobileControls={showMobileControls}
          setShowMobileControls={setShowMobileControls}
          handlePlayClick={handlePlayClick}
          isPlaying={isPlaying}
        />
      )}
        {mobileView === 'participants' && <MobileParticipantsView
        participants={participants}
        activeSpeakers={activeSpeakers}
        handleMuteViewerAudio={handleMuteViewerAudio}
        emitSocketEvent={emitSocketEvent}
        sessionId={sessionId}
        roomCode={roomCode}
        addDebugLog={addDebugLog}
        handleStopViewerScreenShare={handleStopViewerScreenShare}
        handleBanParticipant={handleBanParticipant}
      />}
        {mobileView === 'chat' && <MobileChatView
        messages={messages}
        user={user}
        sendMessage={sendMessage}
        uploadingFile={uploadingFile}
      />}
        
       <MobileNavigation
      mobileView={mobileView}
      setMobileView={setMobileView}
      toggleFullScreen={toggleFullScreen}
      isFullScreen={isFullScreen}
    />
    
    <MobileControls
  toggleAudio={toggleAudio}
  audioEnabled={audioEnabled}
  toggleVideo={toggleVideo}
  videoEnabled={videoEnabled}
  roomState={roomState}
  startStreaming={startStreaming}
  resumeStreaming={resumeStreaming}
  pauseStreaming={pauseStreaming}
  endStreaming={endStreaming}
  // ✅ New props for recording
  handleRecordingToggle={handleRecordingToggle}
  isRecording={isRecording}
  isRecordingLoading={isRecordingLoading}
  isRecordingStopping={isRecordingStopping}
/>

        {/* Mobile Modals */}
        {showParticipantsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manage Participants</h3>
                <button 
                  onClick={() => setShowParticipantsModal(false)}
                  className="text-gray-400"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-sm">{participant.name || 'User'}</span>
                    <div className="flex space-x-1">
                      {participant.hasAudio && (
                        <button
                          onClick={() => handleMuteViewerAudio(participant.socketId)}
                          className="bg-red-500 text-white p-1 rounded text-xs"
                        >
                          Mute
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== MAIN RENDER ==========

  if (isLoading && permissionStatus !== 'denied') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Requesting camera access...</p>
          {mediaError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p>{mediaError}</p>
              <button 
                onClick={initializeCamera}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied' && !isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-4xl mb-4">🎥</div>
          <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-gray-600 mb-6">
            To join this live session, you need to allow camera and microphone access.
          </p>
          <button
            onClick={requestCameraPermissions}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Allow Camera & Microphone
          </button>
          <p className="text-sm text-gray-500 mt-4">
            If you've previously denied access, please check your browser settings.
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to session...</p>
          <div className="mt-4 w-64 mx-auto">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted={true}
              className="w-full rounded-lg shadow-lg"
            />
            <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
          </div>
        </div>
      </div>
    );
  }
return (
  <div className="flex flex-col h-[115vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
    {/* Enhanced Header */}
    <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
          <FiVideo className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stream Control Center
          </h1>
          <p className="text-sm text-gray-300 flex items-center space-x-1">
            <FiRadio className="h-3 w-3 text-green-400" />
            <span>Room: {session?.roomCode}</span>
          </p>
        </div>
        
        {/* RECORDING TIMER DISPLAY */}
        {isRecording && (
          <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
            <div className="relative">
              <BsFillRecordFill className="h-4 w-4 text-red-200" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-bold text-white font-mono">
              {formatRecordingTime(recordingTimer)}
            </span>
            <span className="text-xs text-red-100 font-medium">REC</span>
            
            {/* Recording status dot */}
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {/* Participants Count */}
        <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 px-4 py-2 rounded-full backdrop-blur-sm">
          <FiUsers className="h-4 w-4 text-white" />
          <span className="text-sm font-medium">
            {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
          </span>
        </div>

        {/* Additional Recording Info (Optional) */}
        {isRecording && (
          <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
            <span className="text-xs text-red-200 font-medium">Recording Active</span>
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
          </div>
        )}

        {/* Notification Badge for Pending Requests */}
        {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
          <div className="relative">
            <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
              <FiAlertCircle className="h-5 w-5 text-white" />
            </button>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
              {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
            </span>
          </div>
        )}

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
          title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
        >
          {sidebarCollapsed ? 
            <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
            <FiChevronRight className="h-5 w-5 text-blue-400" />
          }
          <span className="text-sm font-medium">
            {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
          </span>
        </button>

        {/* End Session Button */}
        <button
          onClick={endStreaming}
          className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
        >
          <FiLogOut className="h-4 w-4" />
          <span>End Session</span>
        </button>
      </div>
    </header>

    {/* Main Content Area */}
    <div className="flex-1 overflow-hidden relative">
      {/* Thumbnails Overlay - Will cover entire screen when expanded */}
      {thumbnailsExpanded && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/90">
            <h2 className="text-xl font-bold flex items-center space-x-3">
              <FiVideo className="h-6 w-6 text-blue-400" />
              <span>All Cameras ({thumbnailsCount})</span>
            </h2>
            <div className="flex items-center space-x-4">
              {/* Search filter (optional) */}
              
              <button
                onClick={() => setThumbnailsExpanded(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Exit Full Screen"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {/* Streamer thumbnail */}
              {mediaStream && (
                <div className="relative group">
                  <ThumbnailVideo
                    uid="streamer"
                    stream={mediaStream}
                    userName="You"
                    onClick={() => {
                      setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                      setShowPlayButton(false);
                      setThumbnailsExpanded(false);
                    }}
                    isZoomed={zoomed?.type === "streamer"}
                    videoEnabled={videoEnabled}
                    expanded={true}
                  />
                  <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                    Host
                  </div>
                </div>
              )}
              
              {/* Viewer cameras */}
              {[...viewerCameras.entries()].map(([uid, stream]) => (
                <div key={uid} className="relative group">
                  <ThumbnailVideo
                    uid={uid}
                    stream={stream}
                    userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
                    onClick={() => {
                      setZoomed({ type: "viewer", stream, userId: uid });
                      setShowPlayButton(false);
                      setThumbnailsExpanded(false);
                    }}
                    isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
                    videoEnabled={true}
                    expanded={true}
                  />
                  <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
                    Viewer
                  </div>
                </div>
              ))}
              
              {/* Screen share thumbnails */}
              {activeScreenShare && (
                <div className="relative group">
                  <ThumbnailVideo
                    uid={activeScreenShare.userId}
                    stream={activeScreenShare.stream}
                    userName={`${activeScreenShare.userName}'s Screen`}
                    onClick={() => {
                      setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
                      setShowPlayButton(false);
                      setThumbnailsExpanded(false);
                    }}
                    isZoomed={zoomed?.type === "screen"}
                    videoEnabled={true}
                    isScreenShare={true}
                    expanded={true}
                  />
                  <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
                    <FiMonitor className="h-3 w-3 mr-1" />
                    Screen
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700 bg-gray-800/90">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Click on any camera to zoom into it
              </div>
              <button
                onClick={() => setThumbnailsExpanded(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
              >
                Back to Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* When sidebar is collapsed */}
      {sidebarCollapsed ? (
        <div className="flex h-full">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div 
              className="relative flex-1 bg-black overflow-hidden cursor-pointer"
              onClick={() => {
                if (zoomed) {
                  const element = document.querySelector('.main-video-container');
                  if (element) {
                    if (!document.fullscreenElement) {
                      element.requestFullscreen().catch(err => {
                        console.log('Full screen error:', err);
                      });
                    } else {
                      document.exitFullscreen();
                    }
                  }
                }
              }}
            >
              {/* Zoomed Video View */}
              {/* Zoomed Video View */}
{zoomed ? (
  <div className="relative w-full h-full main-video-container">
    <video
      ref={zoomedVideoRef} // ✅ Use the persistent ref here
      autoPlay
      playsInline
      muted={zoomed.type !== "viewer"} // Viewers should have sound
      className="absolute inset-0 w-full h-full object-contain bg-black"
      onError={(e) => {
        console.error('Zoomed video error:', e);
        // Don't reset zoomed immediately on minor errors to prevent UI jumps
      }}
    />
    
    <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
      {zoomed.type === "streamer" ? "Your Camera" : 
       zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
       `${activeScreenShare?.userName}'s Screen`}
    </div>
  </div>
) : (
  // Default view - Streamer's camera
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted={true}
    className="absolute inset-0 w-full h-full object-contain bg-black"
    onError={(e) => {
      console.error('Main video error:', e);
      setMediaError(true);
    }}
  />
)}

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
                <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
                </div>
              </div>

              {/* Loading States */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium text-lg">Loading camera...</p>
                  </div>
                </div>
              )}

              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium text-lg">Initializing stream...</p>
                  </div>
                </div>
              )}

              {/* Play Button */}
              {showPlayButton && !mediaError && !zoomed && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
                  onClick={handlePlayClick}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
                    <FiPlay className="h-16 w-16" />
                  </div>
                </div>
              )}

              {/* Media Error State */}
              {mediaError && !zoomed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
                  <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
                    <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
                    <button 
                      onClick={retryCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Expand Sidebar Button */}
              <div className="absolute right-4 top-4 z-20">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
                  title="Show Sidebar"
                >
                  <FiChevronLeft className="h-5 w-5 text-blue-400" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Thumbnails Column - Always visible */}
          <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
            {/* Thumbnails header with expand button */}
            <div className="p-4 border-b border-gray-600 flex items-center justify-between">
              <h3 className="font-semibold flex items-center space-x-2 text-sm">
                <FiVideo className="h-4 w-4 text-blue-400" />
                <span>Cameras ({thumbnailsCount})</span>
              </h3>
              {thumbnailsCount > 0 && (
                <button
                  onClick={() => setThumbnailsExpanded(true)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="View All Cameras"
                >
                  <FiMaximize className="h-4 w-4 text-gray-300" />
                </button>
              )}
            </div>
            
            {/* Thumbnails container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
              {/* Streamer thumbnail */}
              {mediaStream && (
                <ThumbnailVideo
                  uid="streamer"
                  stream={mediaStream}
                  userName="You"
                  onClick={() => {
                    setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "streamer"}
                  videoEnabled={videoEnabled}
                />
              )}
              
              {/* Viewer cameras */}
              {[...viewerCameras.entries()].map(([uid, stream]) => (
                <ThumbnailVideo
                  key={uid}
                  uid={uid}
                  stream={stream}
                  userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
                  onClick={() => {
                    setZoomed({ type: "viewer", stream, userId: uid });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
                  videoEnabled={true}
                />
              ))}
              
              {/* Screen share thumbnails */}
              {activeScreenShare && (
                <ThumbnailVideo
                  uid={activeScreenShare.userId}
                  stream={activeScreenShare.stream}
                  userName={`${activeScreenShare.userName}'s Screen`}
                  onClick={() => {
                    setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "screen"}
                  videoEnabled={true}
                  isScreenShare={true}
                />
              )}
              
              {/* Empty state */}
              {thumbnailsCount === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <div>
                    <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active cameras</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Original Layout when sidebar is expanded */
        <div className="flex h-full">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div 
              className="relative flex-1 bg-black overflow-hidden cursor-pointer"
              onClick={() => {
                if (zoomed) {
                  const element = document.querySelector('.main-video-container');
                  if (element) {
                    if (!document.fullscreenElement) {
                      element.requestFullscreen().catch(err => {
                        console.log('Full screen error:', err);
                      });
                    } else {
                      document.exitFullscreen();
                    }
                  }
                }
              }}
            >
         {/* Zoomed Video View */}
{zoomed ? (
  <div className="relative w-full h-full main-video-container">
    <video
      ref={zoomedVideoRef} // ✅ Use the persistent ref here
      autoPlay
      playsInline
      muted={zoomed.type !== "viewer"} // Viewers should have sound
      className="absolute inset-0 w-full h-full object-contain bg-black"
      onError={(e) => {
        console.error('Zoomed video error:', e);
        // Don't reset zoomed immediately on minor errors to prevent UI jumps
      }}
    />
    
    <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
      {zoomed.type === "streamer" ? "Your Camera" : 
       zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
       `${activeScreenShare?.userName}'s Screen`}
    </div>
  </div>
) : (
  // Default view - Streamer's camera
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted={true}
    className="absolute inset-0 w-full h-full object-contain bg-black"
    onError={(e) => {
      console.error('Main video error:', e);
      setMediaError(true);
    }}
  />
)}

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
                <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
                  <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
                </div>
              </div>

              {/* Loading States */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium text-lg">Loading camera...</p>
                  </div>
                </div>
              )}

              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium text-lg">Initializing stream...</p>
                  </div>
                </div>
              )}

              {/* Play Button */}
              {showPlayButton && !mediaError && !zoomed && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
                  onClick={handlePlayClick}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
                    <FiPlay className="h-16 w-16" />
                  </div>
                </div>
              )}

              {/* Media Error State */}
              {mediaError && !zoomed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
                  <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
                    <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
                    <button 
                      onClick={retryCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Thumbnails Column */}
          <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
            {/* Thumbnails header with expand button */}
            <div className="p-4 border-b border-gray-600 flex items-center justify-between">
              <h3 className="font-semibold flex items-center space-x-2 text-sm">
                <FiVideo className="h-4 w-4 text-blue-400" />
                <span>Cameras ({thumbnailsCount})</span>
              </h3>
              {thumbnailsCount > 0 && (
                <button
                  onClick={() => setThumbnailsExpanded(true)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="View All Cameras"
                >
                  <FiMaximize className="h-4 w-4 text-gray-300" />
                </button>
              )}
            </div>
            
            {/* Thumbnails container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
              {/* Streamer thumbnail */}
              {mediaStream && (
                <ThumbnailVideo
                  uid="streamer"
                  stream={mediaStream}
                  userName="You"
                  onClick={() => {
                    setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "streamer"}
                  videoEnabled={videoEnabled}
                />
              )}
              
              {/* Viewer cameras */}
              {[...viewerCameras.entries()].map(([uid, stream]) => (
                <ThumbnailVideo
                  key={uid}
                  uid={uid}
                  stream={stream}
                  userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
                  onClick={() => {
                    setZoomed({ type: "viewer", stream, userId: uid });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
                  videoEnabled={true}
                />
              ))}
              
              {/* Screen share thumbnails */}
              {activeScreenShare && (
                <ThumbnailVideo
                  uid={activeScreenShare.userId}
                  stream={activeScreenShare.stream}
                  userName={`${activeScreenShare.userName}'s Screen`}
                  onClick={() => {
                    setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "screen"}
                  videoEnabled={true}
                  isScreenShare={true}
                />
              )}
              
              {/* Empty state */}
              {thumbnailsCount === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <div>
                    <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active cameras</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Expanded */}
          <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
            {/* Sidebar Toggle Header */}
            <div className="flex border-b border-gray-600">
              <button
                onClick={() => setSidebarView('participants')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
                  sidebarView === 'participants' 
                    ? 'bg-gray-700/50 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }`}
              >
                <FiUsers className="h-5 w-5" />
                <span className="text-sm font-medium">Participants</span>
              </button>
              <button
                onClick={() => setSidebarView('chat')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
                  sidebarView === 'chat' 
                    ? 'bg-gray-700/50 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }`}
              >
                <FiMessageSquare className="h-5 w-5" />
                <span className="text-sm font-medium">Chat</span>
              </button>
              
              {/* Collapse button inside sidebar */}
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="px-3 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all duration-200"
                title="Hide Sidebar"
              >
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Participants View */}
            {sidebarView === 'participants' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center space-x-2">
                      <FiUsers className="h-5 w-5 text-blue-400" />
                      <span>Participants ({participants.length})</span>
                    </h3>
                    <button
                      onClick={() => setShowParticipantsModal(true)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Manage Participants"
                    >
                      <FiUsers className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
                  {participants.map((participant, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activeSpeakers.has(participant.socketId)
                              ? "bg-green-400 animate-pulse"
                              : participant.hasAudio
                              ? "bg-blue-400"
                              : "bg-gray-400"
                          }`}
                        ></div>
                        <span className="truncate font-medium">
                          {participant.name || participant.userName || participant.userId || "User"}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Audio permission icon */}
                        {participant.hasAudio && (
                          <button
                            onClick={() => openRemoveAudioModal(participant)}
                            className="p-1 text-blue-400 hover:text-red-400 transition-colors"
                            title="Remove Audio Permission"
                          >
                            <FiMic className="h-4 w-4" />
                          </button>
                        )}

                        {/* Stop Camera icon */}
                        {participant.hasVideo && (
                          <button
                            onClick={() => {
                              emitSocketEvent("streamer-stop-viewer-video", {
                                sessionId: sessionId || roomCode,
                                targetSocketId: participant.socketId,
                              });
                              addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
                            }}
                            className="p-1 text-green-400 hover:text-red-400 transition-colors"
                            title="Stop Camera"
                          >
                            <FiCameraOff className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat View */}
            {sidebarView === 'chat' && (
              <ChatComponent
                messages={messages}
                onSendMessage={sendMessage}
                currentUserId={user?.id}
                uploadingFile={uploadingFile}
                socket={socket}
                sessionId={sessionId}
                roomCode={roomCode}
              />
            )}
          </div>
        </div>
      )}
    </div>

    {/* Audio Permission Modal */}
    <AudioPermissionModal
      isOpen={showAudioPermissionModal}
      onEnableAudio={handleEnableAudio}
    />

    {/* Updated Panels with Proper Z-index */}
    <ViewerAudioRequestsPanel
      viewerAudioRequests={viewerAudioRequests}
      handleViewerAudioResponse={handleViewerAudioResponse}
    />

    <ScreenShareRequestsPanel
      screenShareRequests={screenShareRequests}
      handleScreenShareResponse={handleScreenShareResponse}
    />

    <ActiveViewerAudioPanel
      activeViewerAudio={activeViewerAudio}
      handleMuteViewerAudio={handleMuteViewerAudio}
    />

    <ActiveScreenSharesPanel
      activeScreenShare={activeScreenShare}
      handleStopViewerScreenShare={handleStopViewerScreenShare}
    />

    <ParticipantsModal
      showParticipantsModal={showParticipantsModal}
      setShowParticipantsModal={setShowParticipantsModal}
      participants={participants}
      activeSpeakers={activeSpeakers}
      handleMuteViewerAudio={handleMuteViewerAudio}
      handleStopViewerScreenShare={handleStopViewerScreenShare}
      emitSocketEvent={emitSocketEvent}
      sessionId={sessionId}
      roomCode={roomCode}
      addDebugLog={addDebugLog}
      handleBanParticipant={handleBanParticipant}
    />

    <ViewerVideoRequestsPanel
      viewerVideoRequests={viewerVideoRequests}
      handleViewerVideoResponse={handleViewerVideoResponse}
    />

    <ProducerStatus producersState={producersState} />

    {/* Remove Audio Confirmation Modal */}
    {audioRemoveTarget && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
          <div className="flex items-center space-x-3 mb-4">
            <FiAlertCircle className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Remove Audio?</h3>
          </div>
          <p className="text-gray-700 mb-6">
            Do you want to remove audio for <strong className="text-gray-900">{audioRemoveTarget.name || audioRemoveTarget.userId}</strong>? 
            They will need to request again to speak.
          </p>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setAudioRemoveTarget(null)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <FiX className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button 
              onClick={confirmRemoveAudio}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiCheck className="h-4 w-4" />
              <span>Remove Audio</span>
            </button>
          </div>
        </div>
      </div>
    )}
    
<div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
  <div className="flex justify-center space-x-6">
    {/* Start/Resume/Pause Stream Control */}
    {!roomState.isStreaming ? (
      <button
        onClick={startStreaming}
        className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Start Streaming"
        disabled={isInitializing || isRecordingLoading}
      >
        <FiPlay className="text-xl mb-1" />
        <span className="text-xs font-medium">Start</span>
      </button>
    ) : roomState.isPaused ? (
      <button
        onClick={resumeStreaming}
        className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Resume Streaming"
        disabled={isRecordingLoading}
      >
        <FiPlay className="text-xl mb-1" />
        <span className="text-xs font-medium">Resume</span>
      </button>
    ) : (
      <button
        onClick={pauseStreaming}
        className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="Pause Streaming"
        disabled={isRecordingLoading}
      >
        <FiPause className="text-xl mb-1" />
        <span className="text-xs font-medium">Pause</span>
      </button>
    )}
    
    {/* Audio Toggle */}
    <button
      onClick={toggleAudio}
      className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
        audioEnabled 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
          : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
      }`}
      title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
      disabled={isRecordingLoading || isRecordingStopping}
    >
      {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
      <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
    </button>

    {/* Video Toggle */}
    <button
      onClick={toggleVideo}
      className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
        videoEnabled 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
          : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
      }`}
      title={videoEnabled ? "Disable Video" : "Enable Video"}
      disabled={isInitializing || isRecordingLoading || isRecordingStopping}
    >
      {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
      <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
    </button>
    
    {/* Smart Screen Share Button - UPDATED */}
    {activeScreenShare?.source === "streamer" ? (
      <button
        onClick={stopScreenShare}
        className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title={
          isRecording 
            ? "Stop sharing with viewers (recording continues)" 
            : "Stop Screen Share"
        }
        disabled={isRecordingLoading || isRecordingStopping}
      >
        <div className="relative">
          <MdStopScreenShare className="text-xl mb-1" />
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
          )}
        </div>
        <span className="text-xs font-medium">
          {isRecording ? 'Stop Share' : 'Stop Share'}
        </span>
        {isRecording && (
          <span className="absolute -top-1 -left-1 bg-yellow-500 text-black text-[10px] px-1 rounded font-bold">
            REC
          </span>
        )}
      </button>
    ) : (
      <button
        onClick={startScreenShare}
        className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
          screenCaptureActive || isRecording
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
        }`}
        title={
          screenCaptureActive || isRecording
            ? "Share active screen capture with viewers"
            : "Start screen sharing"
        }
        disabled={isInitializing || isRecordingLoading || isRecordingStopping}
      >
        <MdOutlineScreenShare className="text-xl mb-1" />
        <span className="text-xs font-medium">
          {screenCaptureActive || isRecording ? 'Share Active' : 'Share Screen'}
        </span>
        
        {/* Indicator for existing capture */}
        {(screenCaptureActive || isRecording) && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
            ✓
          </span>
        )}
      </button>
    )}
    
    {/* Smart Recording Button - UPDATED */}
    <button
      onClick={handleRecordingToggle}
      disabled={isRecordingLoading || isRecordingStopping || isInitializing}
      className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
        isRecording 
          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
      }`}
      title={
        isRecording 
          ? `Stop Recording (${formatRecordingTime(recordingTimer)})` 
          : screenCaptureActive || activeScreenShare
            ? "Record from active screen" 
            : "Start screen recording"
      }
    >
      {isRecordingLoading ? (
        <>
          <FiLoader className="text-xl mb-1 animate-spin" />
          <span className="text-xs font-medium">Starting...</span>
        </>
      ) : isRecordingStopping ? (
        <>
          <FiLoader className="text-xl mb-1 animate-spin" />
          <span className="text-xs font-medium">Saving...</span>
        </>
      ) : isRecording ? (
        <>
          <div className="relative">
            <BsFillRecordFill className="text-xl mb-1" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
          <span className="text-xs font-medium">Stop REC</span>
          
          {/* Recording Timer Badge */}
          <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {formatRecordingTime(recordingTimer)}
          </span>
          
          {/* Screen Share Indicator (if sharing) */}
          {activeScreenShare && (
            <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">
              SHARING
            </span>
          )}
          
          {/* Recording Size Indicator */}
          {recordingChunks.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] py-0.5 rounded-b-2xl">
              {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative">
            <BsFillRecordFill className="text-xl mb-1" />
            {(screenCaptureActive || activeScreenShare) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
            )}
          </div>
          <span className="text-xs font-medium">
            {screenCaptureActive || activeScreenShare ? 'Record Active' : 'Record'}
          </span>
          
          {/* Tooltip Indicator for existing capture */}
          {(screenCaptureActive || activeScreenShare) && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
              ✓
            </span>
          )}
        </>
      )}
    </button>

    {/* End Stream Button */}
    {roomState.isStreaming && (
      <button
        onClick={endStreaming}
        className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        title="End Stream for All Participants"
        disabled={isRecordingLoading || isRecordingStopping}
      >
        <FiStopCircle className="text-xl mb-1" />
        <span className="text-xs font-medium">End Stream</span>
        
        {/* Warning Indicator if Recording is Active */}
        {isRecording && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
            !
          </span>
        )}
      </button>
    )}
  </div>
  
  {/* Status Bar - UPDATED */}
  <div className="mt-3 mx-auto max-w-2xl">
    {/* Recording Status */}
    {isRecording && (
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Recording Active</span>
            <span className="text-gray-400">•</span>
            <span>{formatRecordingTime(recordingTimer)}</span>
            <span className="text-gray-400">•</span>
            <span>
              {activeScreenShare 
                ? `Recording ${activeScreenShare.userName}'s screen` 
                : 'Recording screen & audio'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {recordingChunks.length > 0 && (
              <>
                <span className="text-gray-400">Size:</span>
                <span className="font-mono">
                  {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Recording Progress Bar */}
        <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
            style={{ 
              width: `${Math.min((recordingTimer % 60) / 60 * 100, 100)}%`,
              animationDuration: '1s'
            }}
          ></div>
        </div>
      </div>
    )}
    
    {/* Screen Capture Status */}
    {(screenCaptureActive || activeScreenShare) && (
      <div className={`flex items-center justify-between text-xs ${isRecording ? 'text-gray-400' : 'text-gray-300'}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-medium">
            {screenCaptureActive ? 'Screen Capture Active' : 'Screen Sharing Active'}
          </span>
          <span className="text-gray-400">•</span>
          <span>
            {activeScreenShare 
              ? `Sharing with ${participants.length} viewers`
              : 'Ready for recording or sharing'}
          </span>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center space-x-2">
          {screenCaptureActive && !activeScreenShare && (
            <span className="text-blue-400">Capture Ready</span>
          )}
          {activeScreenShare && !isRecording && (
            <span className="text-green-400">Sharing Active</span>
          )}
          {activeScreenShare && isRecording && (
            <span className="text-yellow-400">Sharing + Recording</span>
          )}
        </div>
      </div>
    )}
  </div>
</div>
  </div>
);

};

export default LiveSession;  




// //ye vala better tha
//  import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { io } from 'socket.io-client';
// import * as mediasoupClient from 'mediasoup-client';
// import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
// import ChatComponent from './ChatComponent';
// import AudioPermissionModal from './AudioPermissionModal';

// import { 
//   getRecordingUploadUrl, 
//   saveRecordingMetadata,
//   getRecordingDownloadUrl,
//   formatFileSize
// } from './recordingService';

// import { toast } from 'react-toastify';
// import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiShare2, FiSquare, FiUsers, FiMessageSquare, FiSettings, FiUser, FiUserCheck,
//   FiUserX, FiAirplay, FiCamera, FiCameraOff, FiCheck, FiX, FiLoader, FiLogOut, FiRefreshCw, FiPlay, FiPause, FiStopCircle,
//   FiArrowUpRight, FiChevronDown, FiSend, FiAlertCircle, FiWifi, FiWifiOff, FiCircle, FiRadio, FiMenu, FiGrid, FiList,
//   FiMonitor, FiMaximize2, FiMinimize2, FiImage, FiSmile, FiFile, FiDownload} from 'react-icons/fi';
// import { IoVideocam, IoVideocamOff, IoShareOutline, IoStop, IoExitOutline, IoPeople, IoChatbubbleEllipses,
//   IoCog, IoPlay, IoPause, IoExpand, IoContract} from 'react-icons/io5';
// import { MdOutlineScreenShare , MdStopScreenShare, MdPlayArrow, MdPause, MdStop, MdGroup, MdChat, MdSettings, MdExitToApp, MdRefresh,
//   MdWarning,
//   MdError
// } from 'react-icons/md';
// import { FiChevronRight,FiChevronLeft,FiMaximize,FiSearch  } from "react-icons/fi";


// import { BsFillRecordFill } from "react-icons/bs";
// import { 
//   useRecordingTimer, 
//   RecordingTimerDisplay, 
//   RecordingStatusBadge,
//   formatTime 
// } from './RecordingTimer';

// import {
//   ActiveViewerAudioPanel,
//   ActiveScreenSharesPanel,
//   ProducerStatus,
//   ParticipantsModal,
//   ViewerVideoRequestsPanel,
//   ViewerAudioRequestsPanel,
//   ScreenShareRequestsPanel,
//   MobileHeader,
//   MobileNavigation,
//   MobileRequestsPanel,
//   MobileControls,
//   MobileParticipantsView,
//   MobileChatView,
//   MobileVideoView,
//   ThumbnailVideo
// } from './components';


// const LiveSession = () => {
//   const [showAudioModal, setShowAudioModal] = useState(false);
//   // Existing states में add करें:
// const [screenCaptureStream, setScreenCaptureStream] = useState(null);
// const [screenCaptureActive, setScreenCaptureActive] = useState(false);
// const [recordingSource, setRecordingSource] = useState(null); // 'screen' or 'camera'
//   const [pendingScreenShare, setPendingScreenShare] = useState(null);
//   const { sessionId, roomCode } = useParams();
//   const navigate = useNavigate();
//   const { user, token } = useAuth();
//   const [socket, setSocket] = useState(null);
//   const [showWhiteboard, setShowWhiteboard] = useState(false);
// const [recordings, setRecordings] = useState([]);
// const [showRecordingsModal, setShowRecordingsModal] = useState(false);
// const [isRecordingLoading, setIsRecordingLoading] = useState(false);
// const [isRecordingStopping, setIsRecordingStopping] = useState(false); // ✅ नया state add करें
// const [recordingInterval, setRecordingInterval] = useState(null); // ✅ नया state
// const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);
// const [fullScreenThumbnails, setFullScreenThumbnails] = useState(false);
// const [autoStartRecording, setAutoStartRecording] = useState(false);

// const [recordingStream, setRecordingStream] = useState(null);

// const { 
//   recordingTimer,
//   recordingStartTime,
//   isRecordingActive,
//   startRecordingTimer,
//   stopRecordingTimer,
//   resetRecordingTimer,
//   formatRecordingTime 
// } = useRecordingTimer();

// const [isLandscape, setIsLandscape] = useState(false);

// const [recorder, setRecorder] = useState(null);
// const [recordedBlob, setRecordedBlob] = useState(null);
// const [recordingChunks, setRecordingChunks] = useState([]);

//    const [showAudioPermissionModal, setShowAudioPermissionModal] = useState(false);
//   const [userInteracted, setUserInteracted] = useState(false);
//   const [pendingAudioStreams, setPendingAudioStreams] = useState(new Map());
//    const [uploadingFile, setUploadingFile] = useState(false);
//   const [chatInput, setChatInput] = useState('');
// const [thumbnailsPosition, setThumbnailsPosition] = useState('right');
// const [streamerThumbnailVisible, setStreamerThumbnailVisible] = useState(true);
// const [sidebarView, setSidebarView] = useState('participants');
// const [isWebSocketInitialized, setIsWebSocketInitialized] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);
//    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
// const [showRequests, setShowRequests] = useState(false);
//   const [mobileView, setMobileView] = useState('video');
//   const [showMobileControls, setShowMobileControls] = useState(true);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [showThumbnails, setShowThumbnails] = useState(false);
//   const [session, setSession] = useState(null);
//   const [participants, setParticipants] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [permissionStatus, setPermissionStatus] = useState('checking');
//   const [mediaError, setMediaError] = useState(null);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [cameraVisible, setCameraVisible] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [showPlayButton, setShowPlayButton] = useState(false);
//   const [localPausedState, setLocalPausedState] = useState(false);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [iceServers, setIceServers] = useState([]);
//   const [isMediaInitialized, setIsMediaInitialized] = useState(false);
//   const [debugLog, setDebugLog] = useState([]);
//   const [producersState, setProducersState] = useState(new Map());
//   const [consumersState, setConsumersState] = useState(new Map());
//   const [isStreamPaused, setIsStreamPaused] = useState(false);
//   const [showParticipantsModal, setShowParticipantsModal] = useState(false);
//   const [selectedParticipant, setSelectedParticipant] = useState(null);
//   const [activeSpeakers, setActiveSpeakers] = useState(new Map());
//   const [viewerAudioRequests, setViewerAudioRequests] = useState([]);
//   const [screenShareRequests, setScreenShareRequests] = useState([]);
//   const [activeViewerAudio, setActiveViewerAudio] = useState(new Map());
//   const [activeScreenShare, setActiveScreenShare] = useState(null);
//    const [audioRemoveTarget, setAudioRemoveTarget] = useState(null);
//    const [zoomed, setZoomed] = useState(null);
//   const [mediaStream, setMediaStream] = useState(null);
//   const [viewerAudios, setViewerAudios] = useState(new Map());
// const [viewerVideoRequests, setViewerVideoRequests] = useState([]);
// const [viewerCameras, setViewerCameras] = useState(new Map()); 
//   const streamerMediaRef = useRef(new MediaStream());
//   const viewerAudiosRef = useRef(new Map());
//   const videoRef = useRef(null);
//   const screenRef = useRef(null);
//   const remoteVideosRef = useRef(new Map());
//   const transports = useRef(new Map());
//   const producers = useRef(new Map());
//   const consumers = useRef(new Map());
//   const userGestureHandlerRef = useRef(null);
//   const isMountedRef = useRef(true);
//   const sendTransportRef = useRef(null);
//   const recvTransportRef = useRef(null);
//   const audioElementsRef = useRef(new Map());
//   const pendingAudioQueueRef = useRef(new Map());
//   const socketRef = useRef(null);
//   const zoomedVideoRef = useRef(null); // ✅ Add this near other refs
//   const audioContextRef = useRef(null);
// const audioDestinationRef = useRef(null);
//   const [device] = useState(new mediasoupClient.Device());
//   const [showRecorder, setShowRecorder] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);

//   const [roomState, setRoomState] = useState({
//     isStreaming: false,
//     isPaused: false,
//     whiteboardEnabled: true
//   });
//   const emitSocketEvent = (event, data, callback) => {
//     if (socketRef.current && socketRef.current.connected) {
//       if (callback) {
//         socketRef.current.emit(event, data, callback);
//       } else {
//         socketRef.current.emit(event, data);
//       }
//       addDebugLog(`📤 Emitted ${event} event`);
//       return true;
//     } else {
//       addDebugLog(`❌ Cannot emit ${event}: Socket not connected`);
//       return false;
//     }
//   };

//   const getSocket = () => {
//     return socketRef.current;
//   };
//   const toggleZoom = (type, stream, userId) => {
//   setZoomed((prev) => {
//     if (prev && prev.type === type && prev.userId === userId) {
//       return null; // unzoom
//     }
//     return { type, stream, userId };
//   });
// };

//   const addDebugLog = (message) => {
//     console.log(message);
//     setDebugLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
//   };

//   // ========== SOCKET EVENT HANDLERS ==========


//   const startScreenCapture = async (purpose = 'share') => {
//   try {
//     // Agar pehle se screen capture चल रहा है, to usi ko return करें
//     if (screenCaptureStream) {
//       addDebugLog(`✅ Reusing existing screen capture for ${purpose}`);
//       return screenCaptureStream;
//     }

//     addDebugLog(`🖥️ Starting new screen capture for ${purpose}`);
    
//     const stream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         frameRate: { ideal: 60, max: 70 },
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//       audio: true, // System audio capture
//     });

//     // Track ended handlers
//     stream.getVideoTracks()[0].onended = () => {
//       addDebugLog('🛑 Screen capture ended by system');
      
//       // Agar recording चल रही है to stop करें
//       if (isRecording) {
//         stopRecording();
//       }
      
//       // Agar screen share चल रहा है to stop करें
//       if (activeScreenShare?.source === "streamer") {
//         stopScreenShare();
//       }
      
//       // Cleanup screen capture
//       cleanupScreenCapture();
//     };

//     setScreenCaptureStream(stream);
//     setScreenCaptureActive(true);
//     addDebugLog(`✅ Screen capture started successfully for ${purpose}`);
    
//     return stream;

//   } catch (error) {
//     console.error('❌ Screen capture failed:', error);
//     toast.error(`Failed to capture screen for ${purpose}`);
//     return null;
//   }
// };

// const cleanupScreenCapture = () => {
//   if (screenCaptureStream) {
//     screenCaptureStream.getTracks().forEach(track => {
//       if (track.readyState === 'live') {
//         track.stop();
//       }
//     });
//   }
//   setScreenCaptureStream(null);
//   setScreenCaptureActive(false);
//   addDebugLog('🧹 Screen capture cleaned up');
// };



// const handleRecordingToggle = async () => {
//   if (isRecordingLoading || isRecordingStopping) {
//     toast.info('Recording operation is already in progress. Please wait...');
//     return;
//   }

//   if (!isRecording) {
//     await startRecording();
//   } else {
//     await stopRecording();
//   }
// };


// const startRecording = async () => {
//   try {
//     setIsRecordingLoading(true);
    
//     // Agar active screen share hai to usi se record karen
//     if (activeScreenShare?.stream) {
//       addDebugLog(`📺 Recording from existing screen share: ${activeScreenShare.userName}`);
//       await startRecordingFromScreenShare(activeScreenShare.stream);
//     } else {
//       // Naya screen share se record karen
//       addDebugLog('🎬 Starting new screen recording...');
//       await startNewScreenShareWithRecording();
//     }
    
//   } catch (error) {
//     console.error('Failed to start recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startRecordingFromScreenShare = async (screenShareStream) => {
//   try {
//     setIsRecordingLoading(true);
    
//     // 1. Get fresh mixed audio
//     let currentMicStream = null;
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       currentMicStream = mediaStream;
//       addDebugLog("🎤 Using existing streamer microphone");
//     } else {
//       // Request fresh mic if needed
//       try {
//         currentMicStream = await navigator.mediaDevices.getUserMedia({ 
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//             channelCount: 2,
//             sampleRate: 48000
//           }
//         });
//         addDebugLog("🎤 Requested new microphone for recording");
//       } catch (e) {
//         console.warn("Mic not found for recording", e);
//         addDebugLog("⚠️ No microphone available for recording");
//       }
//     }

//     // 2. Get Mixed Audio (CRITICAL FIX)
//     const mixedAudioTrack = getMixedAudioStream(screenShareStream, currentMicStream);
    
//     if (!mixedAudioTrack) {
//       throw new Error("Failed to create mixed audio track");
//     }

//     // 3. Create Recording Stream
//     const recordingStream = new MediaStream();

//     // Add Video from screen share
//     const videoTrack = screenShareStream.getVideoTracks()[0];
//     if (videoTrack && videoTrack.readyState === 'live') {
//       // Clone the track to avoid stopping original
//       const clonedVideoTrack = videoTrack.clone();
//       recordingStream.addTrack(clonedVideoTrack);
//       addDebugLog("✅ Added screen video to recording");
//     }

//     // Add Mixed Audio
//     recordingStream.addTrack(mixedAudioTrack);
//     addDebugLog("✅ Added mixed audio to recording");

//     // 4. Start MediaRecorder with optimization
//     const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
//       ? 'video/webm;codecs=vp9,opus'
//       : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
//       ? 'video/webm;codecs=vp8,opus'
//       : 'video/webm';

//     const options = {
//       mimeType,
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     };

//     const mediaRecorder = new MediaRecorder(recordingStream, options);
//     const chunks = [];

//     mediaRecorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         chunks.push(event.data);
//       }
//     };

//     mediaRecorder.onstop = async () => {
//       const blob = new Blob(chunks, { type: mimeType });
//       await uploadRecordingToServer(blob);
      
//       // Cleanup
//       recordingStream.getTracks().forEach(track => track.stop());
//       setRecordingStream(null);
//       setIsRecordingStopping(false);
//     };

//     mediaRecorder.onerror = (error) => {
//       console.error('MediaRecorder error:', error);
//       toast.error('Recording failed');
//       setIsRecording(false);
//       stopRecordingTimer();
      
//       // Cleanup on error
//       if (recordingStream) {
//         recordingStream.getTracks().forEach(track => track.stop());
//       }
//     };

//     // Start recording
//     mediaRecorder.start(1000); // 1 second slices for better performance
//     setRecorder(mediaRecorder);
//     setRecordingStream(recordingStream);
//     setRecordingChunks(chunks);
    
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Recording Started with All Audio!');

//   } catch (error) {
//     console.error('Error starting recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
    
//     // Cleanup on error
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }
//   }
// };
// const startNewScreenShareWithRecording = async () => {
//   try {
//     // 1. Screen Share Stream Start karein
//     const screenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         frameRate: { ideal: 60, max: 60 },
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//       audio: true, // System audio capture karne ke liye
//     });

//     // 2. Microphone Audio Setup (CRITICAL FIX FOR BLACK CAMERA)
//     let micTrack = null;

//     // Check karein agar main mediaStream (Camera+Mic) already chal raha hai
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       addDebugLog('🎤 Using existing microphone track for recording');
      
//       // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//       micTrack = mediaStream.getAudioTracks()[0];
      
//     } else {
//       // Agar mic pehle se on nahi hai, tabhi naya request karein
//       try {
//         addDebugLog('🎤 Requesting new microphone permission');
//         const micStream = await navigator.mediaDevices.getUserMedia({
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//           },
//         });
//         micTrack = micStream.getAudioTracks()[0];
//       } catch (micError) {
//         addDebugLog('⚠️ Mic permission denied or not available for recording');
//       }
//     }

//     // 3. Participants ke liye Screen Share setup karein (Updated version without cloning)
//     if (user?.role === 'streamer' || !user?.role) {
//       try {
//         await startScreenShareForParticipants(screenStream);
//       } catch (shareError) {
//         addDebugLog('⚠️ Could not share with participants, but recording will continue');
//       }
//     }

//     // 4. Recording ke liye Final Stream banayein
//     const recordingStream = new MediaStream();

//     // Screen Video add karein (Original tracks)
//     screenStream.getVideoTracks().forEach(track => recordingStream.addTrack(track));
    
//     // Screen Audio add karein (Original tracks)
//     screenStream.getAudioTracks().forEach(track => recordingStream.addTrack(track));

//     // Mic Audio add karein (Original track)
//     if (micTrack) {
//       recordingStream.addTrack(micTrack);
//     }

//     // 5. Recording Start Karein
//     startMediaRecorder(recordingStream, screenStream, null);

//     // State Updates
//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Screen recording started! (Camera remains visible)');

//     // 6. Handle Stop (Jab user "Stop Sharing" click kare browser mein)
//     screenStream.getVideoTracks()[0].onended = () => {
//       addDebugLog('🖥️ Screen share ended by system UI');
//       stopRecording();
      
//       // Agar streamer share kar raha tha, to socket se bhi stop karein
//       if (activeScreenShare?.source === "streamer") {
//         stopScreenShare();
//       }
      
//       // Mic track cleanup
//       if (micTrack && micTrack.readyState === 'live') {
//         micTrack.stop();
//       }
//     };

//   } catch (error) {
//     console.error('Error starting new screen share with recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startScreenShareForParticipants = async (screenStream) => {
//   if (!sendTransportRef.current || !user) return;
  
//   try {
//     // ✅ DIRECT TRACK - NO CLONING
//     const videoTrack = screenStream.getVideoTracks()[0];
//     if (!videoTrack) return;
    
//     // ✅ ORIGINAL TRACK PE HI CONTENT HINT LAGAO
//     if ('contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion';
//       addDebugLog("✅ Screen video track: Applied contentHint 'motion'");
//     }
    
//     // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//     const videoProducer = await sendTransportRef.current.produce({
//       track: videoTrack, // ✅ Original track directly
//       appData: {
//         source: "screen",
//         userId: user.id,
//         userName: user.name || "Streamer",
//       },
//     });

//     addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);
    
//     // Audio track भी direct - NO CLONING
//     const audioTrack = screenStream.getAudioTracks()[0];
//     if (audioTrack) {
//       // ✅ ORIGINAL AUDIO TRACK PE HI OPTIMIZATION
//       if ('contentHint' in audioTrack) {
//         audioTrack.contentHint = 'music';
//         addDebugLog("✅ Screen audio track: Applied contentHint 'music'");
//       }
      
//       // ✅ USE ORIGINAL AUDIO TRACK DIRECTLY - NO CLONING
//       const audioProducer = await sendTransportRef.current.produce({
//         track: audioTrack, // ✅ Original track directly
//         appData: {
//           source: "screen-audio",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });
      
//       addDebugLog(`✅ Screen share audio producer created: ${audioProducer.id}`);
//     }

//     // ✅ Screen share stream के लिए original stream ही use करें
//     // No need to create new MediaStream - use the existing one
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenStream, // ✅ Original stream directly
//       source: "streamer",
//     });

//     // Notify server
//     if (socket) {
//       socket.emit("screen-share-started", {
//         sessionId: sessionId || roomCode,
//         userId: user.id,
//         userName: user.name || "Streamer",
//         hasAudio: !!audioTrack,
//         source: "screen",
//       });
//     }
    
//   } catch (error) {
//     console.error('Error sharing screen with participants:', error);
//     // Recording continue rahegi, bas sharing fail hua
//   }
// };

// const startMediaRecorder = (recordingStream, screenStream, micStream_UNUSED) => {
//   try {
//     const videoTrack = recordingStream.getVideoTracks()[0];

//     // ✅ 1. GPU Acceleration Preference
//     // H.264 (Hardware Accelerated) -> VP8 (CPU Light) -> VP9 (CPU Heavy)
//     const mimeTypes = [
//       'video/webm;codecs=h264,opus', // 🚀 BEST: Uses GPU (Intel/Nvidia/Mobile)
//       'video/webm;codecs=vp8,opus',  // Good Balance
//       'video/webm'                   // Fallback
//     ];

//     let selectedMimeType = '';
//     for (const mime of mimeTypes) {
//       if (MediaRecorder.isTypeSupported(mime)) {
//         selectedMimeType = mime;
//         console.log(`✅ GPU Optimization: Using Codec ${mime}`);
//         break;
//       }
//     }

//     // ✅ 2. Optimized Bitrate (2.5 Mbps is enough for 720p)
//     const options = {
//       mimeType: selectedMimeType || 'video/webm',
//       videoBitsPerSecond: 2500000, 
//       audioBitsPerSecond: 128000,
//     };

//     // ✅ 3. Lock Resolution & FPS (Crucial for performance)
//     if (videoTrack) {
//       try {
//         videoTrack.applyConstraints({
//           frameRate: { ideal: 60, max: 70 }, // 60fps causes lag, use 30
//           width: { ideal: 1280, max: 1920 }, // 720p is efficient
//           height: { ideal: 720, max: 1080 },
//           resizeMode: "crop-and-scale"
//         });
//       } catch (e) {
//         console.warn('Constraint error:', e);
//       }
//     }

//     const mediaRecorder = new MediaRecorder(recordingStream, options);
//     const chunks = [];
//     setRecordingChunks(chunks);

//     mediaRecorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         chunks.push(event.data);
//         setRecordingChunks((prev) => [...prev, event.data]);
//       }
//     };

//     mediaRecorder.onstop = async () => {
//         // ... (Apka purana save logic yahan same rahega) ...
//         const blob = new Blob(chunks, { type: 'video/webm' });
//         await uploadRecordingToServer(blob);
        
//         if (recordingStream) {
//             recordingStream.getTracks().forEach(track => track.stop());
//         }
//         setRecordingStream(null);
//         setRecordingChunks([]);
//         setIsRecordingStopping(false);
//         addDebugLog(`✅ Recording saved using ${selectedMimeType}`);
//     };

//     mediaRecorder.onerror = (error) => {
//       console.error('MediaRecorder error:', error);
//       toast.error('Recording failed');
//       setIsRecording(false);
//       stopRecordingTimer();
//     };

//     // ✅ 4. TimeSlice = 2000ms (Relaxes the CPU)
//     mediaRecorder.start(2000);
//     setRecorder(mediaRecorder);

//   } catch (error) {
//     console.error("Failed to start recorder:", error);
//     toast.error("Recording failed to start");
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// // ✅ NEW: Function to add new viewer audio to active recording
// const addNewViewerAudioToRecording = (userId, audioStream, sourceType = "viewer-mic") => {
//   if (!isRecording || !audioContextRef.current || !audioDestinationRef.current) {
//     return false;
//   }
  
//   try {
//     addDebugLog(`➕ Attempting to add new ${sourceType} from ${userId} to recording`);
    
//     // Check if already added
//     if (window.recordingAudioSources && window.recordingAudioSources.has(userId)) {
//       addDebugLog(`⏩ ${sourceType} from ${userId} already in recording`);
//       return true;
//     }
    
//     // Create new source
//     const newSource = audioContextRef.current.createMediaStreamSource(audioStream);
//     const gainNode = audioContextRef.current.createGain();
    
//     // Set appropriate volume based on source
//     if (sourceType === "viewer-screen-audio") {
//       gainNode.gain.value = 0.8; // Screen audio 80%
//     } else {
//       gainNode.gain.value = 0.7; // Mic audio 70%
//     }
    
//     newSource.connect(gainNode).connect(audioDestinationRef.current);
    
//     // Store for cleanup
//     if (!window.recordingAudioSources) {
//       window.recordingAudioSources = new Map();
//     }
//     window.recordingAudioSources.set(userId, {
//       source: newSource,
//       gainNode: gainNode,
//       stream: audioStream,
//       sourceType: sourceType
//     });
    
//     addDebugLog(`✅ Added ${sourceType} from ${userId} to active recording`);
//     return true;
    
//   } catch (error) {
//     console.error(`Failed to add ${sourceType} to recording:`, error);
//     addDebugLog(`❌ Failed to add ${sourceType} to recording: ${error.message}`);
//     return false;
//   }
// };
// // ✅ UPDATED: Stop recording with proper cleanup
// const stopRecording = useCallback(async () => {
//   if (!recorder || recorder.state === 'inactive') return;

//   try {
//     addDebugLog('⏹️ Stopping recording with cleanup...');
//     setIsRecordingStopping(true);
    
//     if (recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     stopRecordingTimer();
    
//     // Recording stream cleanup
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//       setRecordingStream(null);
//     }
    
//     // Audio mixer cleanup
//     if (audioContextRef.current) {
//       // First disconnect all sources
//       if (window.recordingAudioSources) {
//         window.recordingAudioSources.forEach((sourceInfo, userId) => {
//           try {
//             sourceInfo.source.disconnect();
//             sourceInfo.gainNode.disconnect();
//           } catch (e) {
//             // Ignore cleanup errors
//           }
//         });
//         window.recordingAudioSources.clear();
//       }
      
//       audioContextRef.current.close();
//       audioContextRef.current = null;
//       audioDestinationRef.current = null;
//       addDebugLog('🔊 Audio mixer cleaned up');
//     }
    
//     // Agar screen share नहीं चल रहा, to screen capture भी cleanup करें
//     if (!activeScreenShare && screenCaptureActive) {
//       addDebugLog('🧹 Cleaning up screen capture (no active screen share)');
//       cleanupScreenCapture();
//     }
    
//     setIsRecording(false);
//     setRecordingSource(null);
    
//     toast.info('Processing recording...');
    
//   } catch (error) {
//     console.error('Error stopping recording:', error);
//     toast.error('Error stopping recording');
//   } finally {
//     setIsRecordingStopping(false);
//   }
// }, [recorder, recordingStream, activeScreenShare, screenCaptureActive]);

// const stopScreenShare = useCallback(() => {
//   addDebugLog("🛑 Stopping screen share...");
  
//   // Agar recording चल रही है, to continue रहने दें
//   if (isRecording) {
//     addDebugLog("🎬 Recording will continue after screen share stops");
    
//     // Only stop sharing with participants
//     if (socket && activeScreenShare?.source === "streamer") {
//       socket.emit("screen-share-stop", {
//         sessionId: sessionId || roomCode,
//         userId: user?.id,
//         source: "streamer"
//       });
//     }
    
//     // Cleanup producers
//     producers.current.forEach((producer, id) => {
//       if (producer.appData?.source === "screen" || producer.appData?.source === "screen-audio") {
//         try {
//           producer.close();
//           producers.current.delete(id);
          
//           setProducersState(prev => {
//             const newMap = new Map(prev);
//             newMap.delete(id);
//             return newMap;
//           });
//         } catch (err) {
//           addDebugLog(`⚠️ Error closing producer: ${err.message}`);
//         }
//       }
//     });
    
//     // Reset active screen share state
//     setActiveScreenShare(null);
    
//     // Agar recording नहीं चल रही, to screen capture cleanup करें
//     if (!isRecording && screenCaptureActive) {
//       addDebugLog('🧹 Cleaning up screen capture (no active recording)');
//       cleanupScreenCapture();
//     }
    
//     toast.info('Screen share stopped (recording continues)');
//   } else {
//     // Agar recording नहीं चल रही, to full cleanup
//     addDebugLog("🛑 Full cleanup - no recording active");
    
//     // Socket notification
//     if (socket && activeScreenShare?.source === "streamer") {
//       socket.emit("screen-share-stop", {
//         sessionId: sessionId || roomCode,
//         userId: user?.id,
//         source: "streamer"
//       });
//     }
    
//     // Cleanup producers
//     producers.current.forEach((producer, id) => {
//       if (producer.appData?.source === "screen" || producer.appData?.source === "screen-audio") {
//         try {
//           producer.close();
//           producers.current.delete(id);
          
//           setProducersState(prev => {
//             const newMap = new Map(prev);
//             newMap.delete(id);
//             return newMap;
//           });
//         } catch (err) {
//           addDebugLog(`⚠️ Error closing producer: ${err.message}`);
//         }
//       }
//     });
    
//     // Cleanup screen capture
//     if (screenCaptureActive) {
//       cleanupScreenCapture();
//     }
    
//     // Reset state
//     setActiveScreenShare(null);
    
//     toast.success('Screen share stopped');
//   }
  
//   // Reset zoom
//   setZoomed(prev => {
//     if (prev && prev.type === "screen") {
//       return null;
//     }
//     return prev;
//   });
  
// }, [isRecording, socket, activeScreenShare, screenCaptureActive, sessionId, roomCode, user]);
// const uploadRecordingToServer = async (blob) => {
//   try {
//     addDebugLog('📤 Uploading recording to backend (NEW API)...');
    
//     // ✅ Generate filename with session info
//     const fileName = `recording_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    
//     // ✅ Step 1: Get pre-signed URL from NEW API
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       blob.type,
//       blob.size
//     );
    
//     if (!presignedData?.uploadUrl) {
//       throw new Error('Failed to get upload URL from new API');
//     }
    
//     addDebugLog(`📁 Uploading to S3: ${fileName} (${formatFileSize(blob.size)})`);
    
//     // ✅ Step 2: Upload to S3 using presigned URL
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': blob.type,
//       },
//       body: blob,
//     });
    
//     if (!uploadResponse.ok) {
//       const errorText = await uploadResponse.text();
//       throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
//     }
    
//     addDebugLog('✅ Recording uploaded to S3 successfully');
    
//     // ✅ Step 3: Save recording metadata to NEW API
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: blob.type,
//       duration: recordingTimer,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey || presignedData.fileUrl,
//       thumbnailUrl: '', // You can add thumbnail generation later
//       recordingTitle: `Recording ${new Date().toLocaleDateString()}`,
//       description: `Recording of session ${sessionId}`,
//       recordedAt: new Date().toISOString()
//     };
    
//     const saveResponse = await saveRecordingMetadata(sessionId, saveData);
    
//     if (saveResponse.success) {
//       addDebugLog(`✅ Recording saved to database via new API: ${fileName}`);
      
//       // Get the recording ID from response
//       const recordingId = saveResponse.data?.recording?._id || 
//                          saveResponse.data?.id || 
//                          Date.now().toString();
      
//       toast.success(`🎉 Recording saved successfully! (${formatRecordingTime(recordingTimer)})`);
      
//       // Emit socket event
//       const socket = getSocket();
//       if (socket) {
//         socket.emit('recording_completed', {
//           sessionId,
//           recording: {
//             ...saveData,
//             id: recordingId
//           }
//         });
//       }
      
//       // ✅ Reset states
//       setIsRecording(false);
//       setRecorder(null);
//       setRecordedBlob(null);
//       resetRecordingTimer();
      
//       return { success: true, recordingId };
      
//     } else {
//       throw new Error('Failed to save recording metadata via new API');
//     }
    
//   } catch (error) {
//     console.error('❌ Recording upload error:', error);
    
//     // Try local fallback
//     try {
//       addDebugLog('⚠️ Upload failed, attempting local save...');
//       const localSuccess = saveRecordingLocally(blob);
//       if (localSuccess) {
//         toast.warning('Recording saved locally (backend upload failed)');
//         return { success: false, savedLocally: true };
//       } else {
//         toast.error('Failed to save recording anywhere');
//         return { success: false, savedLocally: false };
//       }
//     } catch (localError) {
//       console.error('Local save error:', localError);
//       toast.error('Failed to save recording anywhere');
//       return { success: false, savedLocally: false };
//     }
//   } finally {
//     setIsRecordingStopping(false);
//   }
// };
// // Helper function for local fallback
// const saveRecordingLocally = (blob) => {
//   try {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     const fileName = `recording_${sessionId}_${Date.now()}.webm`;
    
//     a.href = url;
//     a.download = fileName;
//     a.style.display = 'none';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Cleanup
//     setTimeout(() => {
//       URL.revokeObjectURL(url);
//     }, 1000);
    
//     return true;
//   } catch (error) {
//     console.error('Local save error:', error);
//     return false;
//   }
// };

// // Format file size helper
// const formatFileSize = (bytes) => {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// };

// // Cleanup on component unmount
// useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup media tracks
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // Cleanup window tracks
//     if (window.recordingTracks) {
//       window.recordingTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       window.recordingTracks = null;
//     }
//   };
// }, []);

// // ✅ UPDATED: Function to get all audio streams mixed for recording
// const getMixedAudioStream = (screenStream, micStream) => {
//   try {
//     addDebugLog("🎚️ Starting Audio Mixing for Recording...");
    
//     // 1. Create fresh Audio Context
//     if (audioContextRef.current) {
//       try {
//         audioContextRef.current.close();
//       } catch (e) {
//         console.warn("Old context close error:", e);
//       }
//     }
    
//     const AudioContext = window.AudioContext || window.webkitAudioContext;
//     const audioContext = new AudioContext({ sampleRate: 48000 });
//     const destination = audioContext.createMediaStreamDestination();
    
//     // Store for cleanup
//     audioContextRef.current = audioContext;
//     audioDestinationRef.current = destination;

//     // Global storage for cleanup
//     if (!window.recordingAudioSources) {
//       window.recordingAudioSources = new Map();
//     }

//     let totalSources = 0;
//     const addedSources = new Set();

//     // 2. Add Streamer Mic (if available and not already in screen stream)
//     if (micStream && micStream.getAudioTracks().length > 0) {
//       try {
//         const micTrack = micStream.getAudioTracks()[0];
//         if (micTrack.readyState === 'live') {
//           const micSource = audioContext.createMediaStreamSource(micStream);
//           const micGain = audioContext.createGain();
          
//           // IMPORTANT: Streamer's voice should be prominent
//           micGain.gain.value = 1.2;
          
//           micSource.connect(micGain).connect(destination);
//           addedSources.add('streamer-mic');
//           totalSources++;
          
//           window.recordingAudioSources.set('streamer-mic', {
//             source: micSource,
//             gainNode: micGain,
//             stream: micStream
//           });
          
//           addDebugLog("✅ Streamer Mic added to recording (120% volume)");
//         }
//       } catch (err) {
//         addDebugLog(`⚠️ Failed to add streamer mic: ${err.message}`);
//       }
//     }

//     // 3. Add Screen Audio (if exists and different from streamer mic)
//     if (screenStream && screenStream.getAudioTracks().length > 0) {
//       try {
//         const screenTrack = screenStream.getAudioTracks()[0];
//         if (screenTrack.readyState === 'live') {
//           const screenSource = audioContext.createMediaStreamSource(screenStream);
//           const screenGain = audioContext.createGain();
          
//           // Screen audio volume slightly lower
//           screenGain.gain.value = 0.6;
          
//           screenSource.connect(screenGain).connect(destination);
//           addedSources.add('screen-audio');
//           totalSources++;
          
//           window.recordingAudioSources.set('screen-audio', {
//             source: screenSource,
//             gainNode: screenGain,
//             stream: screenStream
//           });
          
//           addDebugLog("✅ Screen Audio added to recording (60% volume)");
//         }
//       } catch (err) {
//         addDebugLog(`⚠️ Failed to add screen audio: ${err.message}`);
//       }
//     }

//     // 4. Add ALL active viewer audios
//     // ✅ FIX: Use actual streams from viewerAudios map
//     viewerAudios.forEach((stream, userId) => {
//       if (addedSources.has(`viewer-${userId}`)) return;
      
//       if (stream && stream.getAudioTracks().length > 0) {
//         try {
//           const viewerTrack = stream.getAudioTracks()[0];
//           if (viewerTrack.readyState === 'live') {
//             const viewerSource = audioContext.createMediaStreamSource(stream);
//             const viewerGain = audioContext.createGain();
            
//             // Viewer audio volume balanced
//             viewerGain.gain.value = 0.8;
            
//             viewerSource.connect(viewerGain).connect(destination);
//             addedSources.add(`viewer-${userId}`);
//             totalSources++;
            
//             window.recordingAudioSources.set(`viewer-${userId}`, {
//               source: viewerSource,
//               gainNode: viewerGain,
//               stream: stream
//             });
            
//             addDebugLog(`✅ Viewer ${userId} audio added to recording (80% volume)`);
//           }
//         } catch (err) {
//           addDebugLog(`⚠️ Could not add viewer ${userId} audio: ${err.message}`);
//         }
//       }
//     });

//     // 5. Add pending audio streams
//     pendingAudioStreams.forEach((streamInfo, userId) => {
//       if (addedSources.has(`pending-${userId}`)) return;
      
//       if (streamInfo.audioStream && streamInfo.audioStream.getAudioTracks().length > 0) {
//         try {
//           const pendingTrack = streamInfo.audioStream.getAudioTracks()[0];
//           if (pendingTrack.readyState === 'live') {
//             const pendingSource = audioContext.createMediaStreamSource(streamInfo.audioStream);
//             const pendingGain = audioContext.createGain();
            
//             pendingGain.gain.value = 0.7;
//             pendingSource.connect(pendingGain).connect(destination);
//             addedSources.add(`pending-${userId}`);
//             totalSources++;
            
//             window.recordingAudioSources.set(`pending-${userId}`, {
//               source: pendingSource,
//               gainNode: pendingGain,
//               stream: streamInfo.audioStream
//             });
            
//             addDebugLog(`✅ Pending viewer ${userId} audio added to recording`);
//           }
//         } catch (err) {
//           addDebugLog(`⚠️ Could not add pending viewer ${userId}: ${err.message}`);
//         }
//       }
//     });

//     if (totalSources === 0) {
//       addDebugLog("⚠️ No audio sources found for mixing");
      
//       // Fallback: create silent audio track
//       const emptyStream = audioContext.createMediaStreamDestination().stream;
//       const emptyTrack = emptyStream.getAudioTracks()[0];
      
//       if (emptyTrack) {
//         // Add a very low gain to avoid complete silence
//         const oscillator = audioContext.createOscillator();
//         const gainNode = audioContext.createGain();
//         gainNode.gain.value = 0.001; // Almost silent
        
//         oscillator.connect(gainNode).connect(destination);
//         oscillator.start();
//         oscillator.stop(audioContext.currentTime + 0.1);
//       }
      
//       return destination.stream.getAudioTracks()[0];
//     }

//     addDebugLog(`✅ Audio mixing completed: ${totalSources} sources`);
//     return destination.stream.getAudioTracks()[0];

//   } catch (error) {
//     console.error("❌ Audio mixing failed:", error);
//     addDebugLog(`❌ Audio mixing error: ${error.message}`);
    
//     // Last resort: return mic track only
//     if (micStream && micStream.getAudioTracks().length > 0) {
//       return micStream.getAudioTracks()[0];
//     }
    
//     return null;
//   }
// };

//   const handleClose = () => {
//     setShowRecorder(false);
//     setIsRecording(false);
//   };

// // Permission check useEffect ko update karo
// useEffect(() => {
//   const checkPermissions = async () => {
//     try {
//       addDebugLog('🔍 Checking camera and microphone permissions...');
//       setPermissionStatus('checking');
      
//       // Mobile devices ke liye direct request karo
//       if (isMobile) {
//         addDebugLog('📱 Mobile device detected, requesting permissions directly...');
//         await initializeCamera();
//         return;
//       }
      
//       // Desktop ke liye existing logic
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//       const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
      
//       if (hasVideoPermission && hasAudioPermission) {
//         addDebugLog('✅ Camera and microphone permissions already granted');
//         setPermissionStatus('granted');
//         initializeCamera();
//       } else {
//         addDebugLog('ℹ️ Need to request camera/microphone permissions');
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     } catch (error) {
//       console.error('Error checking permissions:', error);
//       addDebugLog(`❌ Error checking permissions: ${error.message}`);
//       setPermissionStatus('denied');
//       setIsLoading(false);
//     }
//   };

//   checkPermissions();
// }, [isMobile]); // isMobile add karo dependency

// useEffect(() => {
//   if (activeScreenShare?.stream) {
//     // Check if not already zoomed on this screen
//     if (!zoomed || zoomed.userId !== activeScreenShare.userId) {
//       addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
      
//       setZoomed({
//         type: "screen",
//         stream: activeScreenShare.stream,
//         userId: activeScreenShare.userId
//       });
//     }
//   }
// }, [activeScreenShare]);

// useEffect(() => {
//   const resumeAll = () => {
//     document.querySelectorAll("audio").forEach((el) => {
//       el.play().catch(() => {});
//     });
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };

//   document.addEventListener("click", resumeAll, { once: true });
//   document.addEventListener("touchstart", resumeAll, { once: true });

//   return () => {
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };
// }, []);


// useEffect(() => {
//   const checkOrientation = () => {
//     // Check if mobile and landscape
//     const isLandscapeMode = window.innerWidth > window.innerHeight;
//     setIsLandscape(isLandscapeMode);
    
//     if (isMobile) {
//       addDebugLog(`📱 Mobile orientation: ${isLandscapeMode ? 'Landscape' : 'Portrait'} (${window.innerWidth}x${window.innerHeight})`);
//     }
//   };

//   // Initial check
//   checkOrientation();

//   // Listen for orientation changes
//   window.addEventListener('resize', checkOrientation);
//   window.addEventListener('orientationchange', checkOrientation);

//   return () => {
//     window.removeEventListener('resize', checkOrientation);
//     window.removeEventListener('orientationchange', checkOrientation);
//   };
// }, [isMobile]);
// useEffect(() => {
//   const handleFirstUserInteraction = () => {
//     addDebugLog('🎵 User interaction detected - enabling all audio');
//     setUserInteracted(true);
//     setShowAudioPermissionModal(false);
//     playAllAudio();
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
//   if (!userInteracted) {
//     document.addEventListener('click', handleFirstUserInteraction, { once: true });
//     document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   }
//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
// }, [userInteracted]);

//   useEffect(() => {
//     viewerAudios.forEach((stream, userId) => {
//       let audioEl = document.getElementById(`viewer-audio-${userId}`);
//       if (!audioEl) {
//         audioEl = document.createElement("audio");
//         audioEl.id = `viewer-audio-${userId}`;
//         audioEl.autoplay = true;
//         audioEl.playsInline = true;
//         audioEl.controls = false;
//         document.body.appendChild(audioEl);
//       }
//       audioEl.srcObject = stream;
//       audioEl.play().catch(err => {
//         console.warn(`Autoplay prevented for ${userId}, waiting for user gesture`, err);
//       });
//     });
//   }, [viewerAudios]);

  
// const openRemoveAudioModal = (participant) => {
//   setAudioRemoveTarget(participant);
// };

// const confirmRemoveAudio = () => {
//   if (audioRemoveTarget) {
//     handleMuteViewerAudio(audioRemoveTarget.socketId);
//     setAudioRemoveTarget(null);
//   }
// }; 
//   const handleNewViewerScreenProducer = useCallback((data) => {
//     addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
//     const socket = getSocket();
//     if (socket) {
//       createConsumer(sessionId || roomCode, data.producerId, data.kind);
//     } else {
//       addDebugLog('❌ Cannot create consumer: Socket not available');
//     }
//   }, [sessionId, roomCode]);

//   const handleViewerAudioPermissionGranted = useCallback((data) => {
//     addDebugLog(`Viewer audio permission granted: ${data.userId}`);
//     const socket = getSocket();
//     if (socket && data.userId !== user?.id) {
//       createConsumer(sessionId || roomCode, data.producerId, 'audio');
//     }
//   }, [sessionId, roomCode, user]);

//   const handleViewerAudioRequest = useCallback((data) => {
//     addDebugLog(`Viewer audio request from: ${data.requestedUserId}`);
//     setViewerAudioRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

// const playAllAudio = () => {
//   addDebugLog('🔊 Playing all audio elements...');
//   setTimeout(() => {
//     // Play all existing audio elements
//     audioElementsRef.current.forEach((audioEl, userId) => {
//       if (audioEl.paused && audioEl.srcObject) {
//         audioEl.play().catch(err => {
//           // Log but don't worry about autoplay errors
//           if (err.name !== 'NotAllowedError') {
//             addDebugLog(`⚠️ Failed to play audio for ${userId}: ${err.message}`);
//           }
//         });
//       }
//     });
//     pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
//       createAndPlayAudioElement(userId, streamInfo.audioStream, streamInfo.userName);
//     });

//     // Clear pending queue
//     pendingAudioQueueRef.current.clear();
//     setPendingAudioStreams(new Map());
    
//     addDebugLog('✅ All audio processing completed');
//   }, 200);
// };

// const createAndPlayAudioElement = (userId, audioStream, userName) => {
//   try {
//     let audioEl = document.getElementById(`viewer-audio-${userId}`);
//         if (audioEl) {
//       // Agar same stream already hai to kuch nahi karo
//       if (audioEl.srcObject === audioStream) {
//         addDebugLog(`✅ Audio already playing for user ${userId}`);
//         return audioEl;
//       }
      
//       // Old stream ko stop karo
//       if (audioEl.srcObject) {
//         audioEl.srcObject.getTracks().forEach(track => track.stop());
//       }
//       audioEl.pause();
//       audioEl.srcObject = null;
//     } else {
//       // Naya audio element create karo
//       audioEl = document.createElement("audio");
//       audioEl.id = `viewer-audio-${userId}`;
//       audioEl.playsInline = true;
//       audioEl.controls = false;
//       audioEl.muted = false;
//       audioEl.setAttribute('data-user-id', userId);
//       audioEl.setAttribute('data-user-name', userName);
//       document.body.appendChild(audioEl);
//     }
//     audioEl.srcObject = audioStream;
//         const playAudio = () => {
//       if (audioEl.paused) {
//         audioEl.play()
//           .then(() => {
//             addDebugLog(`✅ Audio playing for user ${userId}`);
//           })
//           .catch(error => {
//             // Agar play fail ho jaye to retry after short delay
//             if (error.name === 'NotAllowedError') {
//               addDebugLog(`⚠️ Audio play blocked for ${userId}, waiting for user gesture`);
//               // User interaction ke baad automatically play hoga
//             } else {
//               console.warn(`Audio play failed for ${userId}:`, error);
//               // Retry after 500ms
//               setTimeout(() => {
//                 if (audioEl.srcObject === audioStream && audioEl.paused) {
//                   audioEl.play().catch(e => {
//                     addDebugLog(`❌ Retry also failed for ${userId}: ${e.message}`);
//                   });
//                 }
//               }, 500);
//             }
//           });
//       }
//     };
//     if (userInteracted) {
//       // Small delay to avoid race condition
//       setTimeout(playAudio, 100);
//     }
//     audioElementsRef.current.set(userId, audioEl);
//     viewerAudiosRef.current.set(userId, audioStream);
//         setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.set(userId, audioStream);
//       return newMap;
//     });
//     addDebugLog(`🎤 Audio element ready for user ${userId}`);
//     return audioEl;
//   } catch (err) {
//     addDebugLog(`❌ Error creating audio element: ${err?.message || err}`);
//     return null;
//   }
// };
// // ✅ UPDATED: Handle audio consumer with recording support
// const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
//   const audioStream = new MediaStream([audioTrack]);
//   const userId = producerInfo.userId;
//   const userName = producerInfo.userName || `User ${userId}`;
  
//   addDebugLog(`🎵 New audio consumer: ${userId} (${sourceType})`);
  
//   // Store in appropriate map
//   if (sourceType === "viewer-mic") {
//     // Store in viewer audio map
//     viewerAudiosRef.current.set(userId, audioStream);
    
//     setViewerAudios(prev => {
//       const newMap = new Map(prev);
//       newMap.set(userId, audioStream);
//       return newMap;
//     });
    
//     addDebugLog(`🎤 Viewer mic audio stored: ${userName}`);
//   } else if (sourceType === "viewer-screen-audio") {
//     // Store separately for screen audio
//     addDebugLog(`📢 Viewer screen audio stored: ${userName}`);
//   }

//   // Create and play audio element
//   if (userInteracted) {
//     createAndPlayAudioElement(userId, audioStream, userName);
//   } else {
//     pendingAudioQueueRef.current.set(userId, {
//       userId,
//       userName,
//       audioStream,
//       sourceType,
//       producerInfo,
//       timestamp: Date.now()
//     });
    
//     setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    
//     if (!showAudioPermissionModal) {
//       setShowAudioPermissionModal(true);
//     }
//   }

//   // ✅ CRITICAL: If recording is active, add to mixer IMMEDIATELY
//   if (isRecording && audioContextRef.current && audioDestinationRef.current) {
//     try {
//       const newSource = audioContextRef.current.createMediaStreamSource(audioStream);
//       const gainNode = audioContextRef.current.createGain();
      
//       // Adjust volume based on source
//       gainNode.gain.value = sourceType === "viewer-screen-audio" ? 0.8 : 0.7;
      
//       newSource.connect(gainNode).connect(audioDestinationRef.current);
      
//       // Store for cleanup
//       if (!window.recordingAudioSources) {
//         window.recordingAudioSources = new Map();
//       }
      
//       window.recordingAudioSources.set(`${sourceType}-${userId}`, {
//         source: newSource,
//         gainNode: gainNode,
//         stream: audioStream
//       });
      
//       addDebugLog(`➕ Added ${sourceType} from ${userId} to active recording`);
      
//     } catch (err) {
//       console.warn("Failed to add viewer audio to recording mix", err);
//       addDebugLog(`⚠️ Failed to add ${sourceType} to recording: ${err.message}`);
//     }
//   }
// };
// const handleEnableAudio = () => {
//   addDebugLog('🎵 User manually enabled audio');
//   setUserInteracted(true);
//   setShowAudioPermissionModal(false);
  
//   // Small delay to ensure state update
//   setTimeout(() => {
//     playAllAudio();
//   }, 100);
// };

//   const handleScreenShareRequest = useCallback((data) => {
//     addDebugLog(`Screen share request from: ${data.requestedUserId}`);
//     setScreenShareRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

//   const handleViewerAudioStarted = useCallback((data) => {
//     addDebugLog(`Viewer audio started: ${data.userId}`);
//     setActiveViewerAudio(prev => new Map(prev).set(data.socketId, {
//       userId: data.userId,
//       socketId: data.socketId,
//       producerId: data.producerId
//     }));
//   }, []);

//   const handleViewerAudioMuted = useCallback((data) => {
//     addDebugLog(`Viewer audio muted: ${data.userId}`);
//     setActiveViewerAudio(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(data.socketId);
//       return newMap;
//     });
//   }, []);

//  // ✅ Viewer screen share started handler
// const handleScreenShareStarted = useCallback((data) => {
//   addDebugLog(`Screen share started by viewer: ${data.userId}`);

//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer") return prev;
//     return {
//       userId: data.userId,
//       userName: data.userName,
//       stream: null, // stream consumer banne ke baad attach hoga
//       source: "viewer-screen"
//     };
//   });
// }, [addDebugLog]);


// const handleScreenShareStopped = useCallback((data) => {
//   addDebugLog(
//     `🛑 Screen share stopped by viewer: ${data.userId}, source: ${data.source}`
//   );

//   // ✅ Reset zoom if same user's screen was zoomed
//   setZoomed((prev) => {
//     if (prev && prev.type === "screen" && prev.userId === data.userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped user: ${data.userId}`);
//       return null;
//     }
//     return prev;
//   });

//   // ✅ Forcefully clear active screen share
//   setActiveScreenShare((prev) => {
//     if (prev && prev.stream) {
//       try {
//         prev.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }
//     addDebugLog(`✅ Forced reset of active screen share (viewer: ${data.userId})`);
//     return null;
//   });
// }, [screenRef]);

//   const handleStopViewerScreenShare = useCallback((targetUserId) => {
//     emitSocketEvent('screen-share-force-stop', {
//       sessionId: sessionId || roomCode,
//       targetUserId
//     });
//     addDebugLog(`Stopped screen share for user: ${targetUserId}`);
//   }, [sessionId, roomCode]);

//   const handleViewerAudioResponse = useCallback((requesterSocketId, allow) => {
//     emitSocketEvent('viewer-audio-response', {
//       sessionId: sessionId || roomCode,
//       requesterSocketId,
//       allow
//     });
    
//     setViewerAudioRequests(prev => 
//       prev.filter(req => req.requesterSocketId !== requesterSocketId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed audio for viewer: ${requesterSocketId}`);
//     } else {
//       addDebugLog(`Denied audio for viewer: ${requesterSocketId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleScreenShareResponse = useCallback((requesterUserId, allow) => {
//     emitSocketEvent('screen-share-response', {
//       sessionId: sessionId || roomCode,
//       requesterUserId,
//       allow
//     });
    
//     setScreenShareRequests(prev => 
//       prev.filter(req => req.requestedUserId !== requesterUserId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed screen share for viewer: ${requesterUserId}`);
//     } else {
//       addDebugLog(`Denied screen share for viewer: ${requesterUserId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleMuteViewerAudio = useCallback((targetSocketId) => {
//     emitSocketEvent('streamer-stop-viewer-audio', {
//   sessionId: sessionId || roomCode,
//   targetSocketId
// });

//     addDebugLog(`Muted viewer audio: ${targetSocketId}`);
//   }, [sessionId, roomCode]);

//   const handleBanParticipant = useCallback((userId) => {
//     emitSocketEvent('ban-participant', {
//       sessionId: sessionId || roomCode,
//       userId
//     });
//     addDebugLog(`Banned participant: ${userId}`);
//   }, [sessionId, roomCode]);


// const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
//   try {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog("❌ No socket available for creating consumer");
//       return;
//     }

//     addDebugLog(`🎯 Creating consumer for producer: ${producerId}`);

//     // Skip if already have consumer
//     const existingConsumer = Array.from(consumers.current.values()).find(
//       (c) => c.producerId === producerId
//     );
//     if (existingConsumer) {
//       addDebugLog(`⚠️ Already have consumer for producer ${producerId}, skipping`);
//       return;
//     }

//     socket.emit(
//       "getProducerInfo",
//       { sessionId: currentSessionId, producerId },
//       async (info) => {
//         if (!info) {
//           addDebugLog(`❌ No producer info for producer: ${producerId}`);
//           return;
//         }

//         addDebugLog(
//           `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}`
//         );

//         // ✅ DEBUG LOG - देखें क्या info आ रहा है
//         console.log("PRODUCER INFO RECEIVED:", {
//           producerId,
//           source: info.source,
//           userId: info.userId,
//           userName: info.userName,
//           currentUser: user?.id
//         });
//         const isViewerScreenAudio = info.source === "viewer-screen-audio";
//         const isViewerMic = info.source === "viewer-mic";
//         const isViewerSource = isViewerScreenAudio || isViewerMic;
//         if (isViewerSource) {
//           addDebugLog(`🎤 Processing viewer audio (${info.source}) from user ${info.userId}`);
//         } else {
//           // अन्य sources के लिए self check करें
//           const isSelfProducer = info.userId?.toString() === user?.id?.toString();
//           const isStreamerAudio = info.source === 'streamer-mic' || info.source === 'mic' || info.source === 'screen-audio';
//           const isStreamerCamera = info.source === 'streamer-camera' || info.source === 'camera';
          
//           if (isSelfProducer) {
//             addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
//             return;
//           }
//           if ((isStreamerAudio || isStreamerCamera) && isSelfProducer) {
//             addDebugLog(`⏩ Skipping streamer media: ${info.source}`);
//             return;
//           }
//         }

//         // store producer state
//         setProducersState((prev) =>
//           new Map(prev).set(producerId, {
//             id: producerId,
//             kind: info.kind,
//             userId: info.userId,
//             userName: info.userName,
//             source: info.source || "camera",
//             paused: false,
//           })
//         );

//         if (!transportId && recvTransportRef.current)
//           transportId = recvTransportRef.current.id;
//         if (!transportId) {
//           addDebugLog("❌ No recv transport available for consumer");
//           return;
//         }

//         socket.emit(
//           "consume",
//           {
//             sessionId: currentSessionId,
//             transportId,
//             producerId,
//             rtpCapabilities: device.rtpCapabilities,
//           },
//           async (response) => {
//             if (response.error || !response.params) {
//               addDebugLog(`❌ Failed to consume: ${response.error}`);
//               return;
//             }

//             const consumerParams = response.params;
//             const transport = transports.current.get(transportId);
//             if (!transport) {
//               addDebugLog(`❌ No transport found for ID: ${transportId}`);
//               return;
//             }

//             try {
//               const consumer = await transport.consume({
//                 id: consumerParams.id,
//                 producerId: consumerParams.producerId,
//                 kind: consumerParams.kind,
//                 rtpParameters: consumerParams.rtpParameters,
//                 appData: { 
//                   source: info.source || "camera",
//                   userId: info.userId,
//                   userName: info.userName
//                 },
//               });

//               consumers.current.set(consumer.id, consumer);
//               addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source})`);

//               // ✅ DEBUG: consumer details
//               console.log("CONSUMER CREATED:", {
//                 id: consumer.id,
//                 kind: consumer.kind,
//                 source: info.source,
//                 track: consumer.track ? "Has track" : "No track",
//                 trackKind: consumer.track?.kind,
//                 trackReadyState: consumer.track?.readyState
//               });

//               // === Handle sources ===
//               if (consumer.track) {
//                 if (info.source === "screen" || info.source === "viewer-screen") {
//                   // 🔹 Screen share VIDEO
//                   const screenStream = new MediaStream([consumer.track]);
//                   setActiveScreenShare({
//                     userId: info.userId,
//                     userName: info.userName || (info.source === "screen" ? "Streamer" : "Viewer"),
//                     stream: screenStream,
//                     source: info.source,
//                   });
//                   addDebugLog(`🖥️ Active screen set (${info.source})`);

//                 } else if (info.source === "viewer-screen-audio") {
//                   // 🔹 Screen share AUDIO - Simplified permission system
//                   console.log("🎵 Handling viewer-screen-audio for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                  
//                 } else if (info.source === "viewer-mic") {
//                   // 🔹 Viewer MIC audio - Simplified permission system
//                   console.log("🎤 Handling viewer-mic for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-mic");
                  
//                 } else if (info.source === "viewer-camera") {
//                   // 🔹 Viewer camera
//                   try {
//                     const videoStream = new MediaStream([consumer.track]);
//                     setViewerCameras((prev) => {
//                       const newMap = new Map(prev);
//                       newMap.set(info.userId, videoStream);
//                       return newMap;
//                     });
//                     addDebugLog(`📷 Viewer camera stored for ${info.userId}`);
//                   } catch (err) {
//                     addDebugLog(`❌ Error storing viewer camera: ${err?.message || err}`);
//                   }

//                 } else if (consumer.track.kind === "video") {
//                   // Streamer video skip
//                   addDebugLog(`⏩ Skipping streamer video: ${info.source}`);

//                 } else if (consumer.track.kind === "audio") {
//                   // Streamer audio skip
//                   addDebugLog(`⏩ Skipping streamer audio: ${info.source}`);

//                 } else {
//                   addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
//                 }
//               } else {
//                 addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
//               }
//               socket.emit(
//                 "consumer-resume",
//                 { sessionId: currentSessionId, consumerId: consumer.id },
//                 (resumeResponse) => {
//                   if (resumeResponse?.success) {
//                     addDebugLog(`✅ Consumer ${consumer.id} resumed`);
//                   } else {
//                     addDebugLog(`❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error}`);
//                   }
//                 }
//               );
//             } catch (error) {
//               addDebugLog(`❌ Error creating consumer: ${error.message}`);
//               console.error("Consumer creation error:", error);
//             }
//           }
//         );
//       }
//     );
//   } catch (error) {
//     addDebugLog(`❌ Error in createConsumer: ${error.message}`);
//     console.error("createConsumer error:", error);
//   }
// };

// const cleanupViewerAudio = (userId) => {
//   addDebugLog(`🧹 Starting audio cleanup for user: ${userId}`);
//   if (pendingAudioQueueRef.current.has(userId)) {
//     const pendingStream = pendingAudioQueueRef.current.get(userId)?.audioStream;
//     if (pendingStream) {
//       try {
//         pendingStream.getTracks().forEach((t) => {
//           if (t.readyState === 'live') {
//             t.stop();
//             addDebugLog(`🛑 Stopped pending audio track: ${t.id}`);
//           }
//         });
//         addDebugLog(`🗑️ Stopped pending audio tracks for user: ${userId}`);
//       } catch (e) {
//         addDebugLog(`⚠️ Error stopping pending audio tracks: ${e.message}`);
//       }
//     }
//     pendingAudioQueueRef.current.delete(userId);
    
//     // Update pending streams state
//     setPendingAudioStreams(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });
    
//     addDebugLog(`✅ Removed from pending audio queue: ${userId}`);
//   }

//   const cleanupAudioElement = () => {
//     const audioEl = audioElementsRef.current.get(userId);
//     if (audioEl) {
//       try {
//         // Pause and clean up the audio element
//         if (!audioEl.paused) {
//           audioEl.pause();
//           addDebugLog(`⏸️ Paused audio element for user: ${userId}`);
//         }
        
//         // Clear srcObject and stop tracks if they exist
//         if (audioEl.srcObject) {
//           const stream = audioEl.srcObject;
//           stream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//               addDebugLog(`🛑 Stopped audio track: ${track.id}`);
//             }
//           });
//           audioEl.srcObject = null;
//         }
        
//         // Remove from DOM with delay to avoid race conditions
//         setTimeout(() => {
//           try {
//             if (audioEl.parentNode) {
//               audioEl.parentNode.removeChild(audioEl);
//               addDebugLog(`🗑️ Removed audio element from DOM for user: ${userId}`);
//             }
//           } catch (domError) {
//             addDebugLog(`⚠️ Error removing audio element from DOM: ${domError.message}`);
//           }
//         }, 100);
        
//       } catch (e) {
//         addDebugLog(`⚠️ Error in audio element cleanup: ${e.message}`);
//       }
      
//       // Remove from refs
//       audioElementsRef.current.delete(userId);
//     }
//   };

//   // ✅ Step 3: Clean up from viewerAudiosRef
//   const audioStream = viewerAudiosRef.current.get(userId);
//   if (audioStream) {
//     try {
//       audioStream.getTracks().forEach((t) => {
//         if (t.readyState === 'live') {
//           t.stop();
//           addDebugLog(`🛑 Stopped active audio track: ${t.id}`);
//         }
//       });
//     } catch (e) {
//       addDebugLog(`⚠️ Error stopping active audio stream: ${e.message}`);
//     }
//     viewerAudiosRef.current.delete(userId);
//   }

//   cleanupAudioElement();
//   setTimeout(() => {
//     const domAudioElements = document.querySelectorAll(`[data-user-id="${userId}"], #viewer-audio-${userId}`);
//     domAudioElements.forEach(el => {
//       try {
//         if (el.paused === false) {
//           el.pause();
//         }
//         if (el.srcObject) {
//           el.srcObject.getTracks().forEach(track => track.stop());
//           el.srcObject = null;
//         }
//         if (el.parentNode) {
//           el.parentNode.removeChild(el);
//           addDebugLog(`🗑️ Backup cleanup for audio element: ${userId}`);
//         }
//       } catch (e) {
//         addDebugLog(`⚠️ Error in backup DOM cleanup: ${e.message}`);
//       }
//     });
//   }, 200);

//   // ✅ Step 5: Remove screen share audio if exists
//   if (userId === activeScreenShare?.userId) {
//     setTimeout(() => {
//       const screenAudioElements = document.querySelectorAll(`[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`);
//       screenAudioElements.forEach(screenAudioEl => {
//         try {
//           screenAudioEl.pause();
//           screenAudioEl.srcObject = null;
//           if (screenAudioEl.parentNode) {
//             screenAudioEl.parentNode.removeChild(screenAudioEl);
//           }
//           addDebugLog(`🗑️ Cleaned up screen share audio for user: ${userId}`);
//         } catch (e) {
//           addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
//         }
//       });
//     }, 100);
//   }

//   // ✅ Step 6: Update viewerAudios state (with delay to ensure cleanup is done)
//   setTimeout(() => {
//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(userId)) {
//         newMap.delete(userId);
//         addDebugLog(`🔄 Removed from viewerAudios state: ${userId}`);
//       }
//       return newMap;
//     });

//     // ✅ Step 7: Check if we need to hide the audio modal
//     if (pendingAudioStreams.size === 0 && showAudioPermissionModal) {
//       setTimeout(() => {
//         setShowAudioPermissionModal(false);
//         addDebugLog(`🔕 No more pending audio - hiding modal`);
//       }, 300);
//     }

//     addDebugLog(`✅ Completed audio cleanup for user: ${userId}`);
//   }, 300);
// };

// const cleanupViewerCamera = (userId) => {
//   addDebugLog(`📷 Cleaning up camera for user: ${userId}`);
//     setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => {
//             if (track.kind === 'video') {
//               track.stop();
//             }
//           });
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });
// };

// const cleanupViewerMedia = (userId) => {
//   // 🖥️ Screen share cleanup
//   if (activeScreenShare?.userId === userId) {
//     if (activeScreenShare.stream) {
//       try {
//         activeScreenShare.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     setActiveScreenShare(null);

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }

//     addDebugLog(`🖥️ Viewer screen share stopped & cleaned for user: ${userId}`);
//   }

//   // 🎤 Audio cleanup
//   if (viewerAudiosRef.current.has(userId)) {
//     const stream = viewerAudiosRef.current.get(userId);
//     if (stream) {
//       try {
//         stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer audio tracks", e);
//       }
//     }
//     viewerAudiosRef.current.delete(userId);

//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });

//     addDebugLog(`🎤 Viewer audio stopped for user: ${userId}`);
//   }

//   setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => track.stop());
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });

//   addDebugLog(`✅ Fully cleaned up media for user: ${userId}`);
// };

// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);


// // ✅ Add this useEffect to handle Zoomed Video without flickering
// useEffect(() => {
//   if (zoomedVideoRef.current && zoomed?.stream) {
//     const videoEl = zoomedVideoRef.current;
    
//     // Only update if stream ID is different to prevent flickering
//     if (videoEl.srcObject?.id !== zoomed.stream.id) {
//       videoEl.srcObject = zoomed.stream;
//       videoEl.play().catch(e => console.warn("Zoomed video play error", e));
//     }
//   } else if (zoomedVideoRef.current && !zoomed) {
//     zoomedVideoRef.current.srcObject = null;
//   }
// }, [zoomed, zoomed?.stream?.id]); // Only runs when zoomed user/stream changes

//   const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-connect', {
//         sessionId: currentSessionId,
//         transportId,
//         dtlsParameters
//       }, (response) => {
//         if (response && response.success) {
//           resolve();
//         } else {
//           reject(new Error(response.error || 'Transport connect failed'));
//         }
//       });
//     });
//   };

//   const handleTransportProduce = (currentSessionId, transportId, kind, rtpParameters, appData) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-produce', {
//         sessionId: currentSessionId,
//         transportId,
//         kind,
//         rtpParameters,
//         appData,
//       }, (response) => {
//         if (response && response.id) {
//           resolve(response.id);
//         } else {
//           reject(new Error(response?.error || 'Produce failed'));
//         }
//       });
//     });
//   };

//   const handlePauseProducer = async (producerId) => {
//     emitSocketEvent('producer-pause', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: true });
//       }
//       return newState;
//     });
//   };

//   const handleResumeProducer = async (producerId) => {
//     emitSocketEvent('producer-resume', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: false });
//       }
//       return newState;
//     });
//   };

//   const handleCloseProducer = async (producerId) => {
//     emitSocketEvent('producer-close', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       newState.delete(producerId);
//       return newState;
//     });
    
//     producers.current.delete(producerId);
//   };

//   // ========== STREAMING CONTROL FUNCTIONS ==========
//   const startStreaming = async () => {
//     const socket = getSocket();
//     if (socket) {
//       const hasProducers = producers.current.size > 0;
      
//       if (hasProducers) {
//         addDebugLog('ℹ️ Producers already exist, resuming if paused...');
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.paused) {
//             handleResumeProducer(id);
//           }
//         });
//       } else {
//         addDebugLog('🔄 No producers found, initializing media...');
//         await initializeMedia(sessionId || roomCode, iceServers);
//       }
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_started' 
//       });
      
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
//     }
//   };

//   const pauseStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (!producer.paused) {
//           handlePauseProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'PAUSED', 
//         emitEvent: 'streamer_paused' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setIsStreamPaused(true);
//       setLocalPausedState(true);
      
//       if (videoRef.current && !videoRef.current.paused) {
//         videoRef.current.pause();
//       }
//     }
//   };

//   const resumeStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.paused) {
//           handleResumeProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_resumed' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }
//   };

//   const endStreaming = async () => {
//   if (window.confirm('Are you sure you want to end the session for all participants?')) {
    
//     // Agar recording chal rahi hai to pehle stop karen
//     if (isRecording) {
//       const stopSuccess = await stopRecordingAPI();
//       if (!stopSuccess) {
//         // Agar recording stop nahi hui to user ko confirm karen
//         const proceed = window.confirm('Recording stop failed. Still end session?');
//         if (!proceed) return;
//       }
//     }
    
//     // Phir session end karen
//     emitSocketEvent('streamer_control', { 
//       sessionId: sessionId || roomCode, 
//       status: 'ENDED', 
//       emitEvent: 'session_ended' 
//     });
//   }
// };

//  const toggleAudio = () => {
//   if (mediaStream) {
//     const audioTrack = mediaStream.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setAudioEnabled(audioTrack.enabled);

//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.source === 'mic') {
//           if (audioTrack.enabled) {
//             handleResumeProducer(id);
//           } else {
//             handlePauseProducer(id);
//           }
//         }
//       });

//       addDebugLog(`🎤 Streamer mic ${audioTrack.enabled ? "on" : "off"} (local playback muted)`);
//     }
//   }
// };

//   const toggleVideo = () => {
//     if (mediaStream) {
//       const videoTrack = mediaStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setVideoEnabled(videoTrack.enabled);
        
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.source === 'camera') {
//             if (videoTrack.enabled) {
//               handleResumeProducer(id);
//             } else {
//               handlePauseProducer(id);
//             }
//           }
//         });
        
//         addDebugLog(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
//       }
//     }
//   };


//   const startScreenShare = async () => {
//   try {
//     // Agar recording चल रही है, to usi stream se share करें
//     if (isRecording && screenCaptureStream) {
//       addDebugLog('🔄 Starting screen share from existing recording stream');
      
//       // Start sharing with participants
//       await startScreenShareForParticipants(screenCaptureStream);
      
//       setActiveScreenShare({
//         userId: user.id,
//         userName: user.name || "Streamer",
//         stream: screenCaptureStream,
//         source: "streamer",
//       });
      
//       toast.success('📺 Screen sharing started (from recording)');
//       return;
//     }
    
//     // Agar screen capture पहले से active है
//     if (screenCaptureActive && screenCaptureStream) {
//       addDebugLog('🔄 Starting screen share from existing capture');
      
//       await startScreenShareForParticipants(screenCaptureStream);
      
//       setActiveScreenShare({
//         userId: user.id,
//         userName: user.name || "Streamer",
//         stream: screenCaptureStream,
//         source: "streamer",
//       });
      
//       toast.success('📺 Screen sharing started');
//       return;
//     }
    
//     // Fresh screen capture start करें
//     addDebugLog('🆕 Starting fresh screen capture for sharing');
    
//     const screenStream = await startScreenCapture('share');
//     if (!screenStream) {
//       throw new Error('Screen capture failed');
//     }
    
//     await startScreenShareForParticipants(screenStream);
    
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenStream,
//       source: "streamer",
//     });
    
//     toast.success('📺 Screen sharing started!');
    
//   } catch (error) {
//     console.error('Screen share error:', error);
//     toast.error('Failed to start screen sharing');
//   }
// };


// const sendMessage = useCallback(async (text = '', file = null) => {
//   try {
//     let fileData = null;
//     let fileName = null;
//     let fileType = null;
//     let fileSize = null;
    
//     // Agar file hai to base64 mein convert karen (database ke bina direct transfer)
//     if (file) {
//       setUploadingFile(true);
      
//       // File size check (max 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('File size should be less than 5MB');
//         setUploadingFile(false);
//         return;
//       }

//       // File type check
//       const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
//       if (!allowedTypes.includes(file.type)) {
//         toast.error('Only images, PDF and text files are allowed');
//         setUploadingFile(false);
//         return;
//       }

//       // File ko base64 mein convert karen for direct transfer
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           // Base64 data (data:image/png;base64,XXXXXXXX ke format se prefix hata denge)
//           const base64String = e.target.result;
//           fileData = base64String.split(',')[1]; // Sirf base64 data le rahe hain
//           fileName = file.name;
//           fileType = file.type;
//           fileSize = file.size;
          
//           const messageData = {
//             sessionId: sessionId || roomCode,
//             message: text,
//             fileData: fileData, // Direct base64 data
//             fileName: fileName,
//             fileType: fileType,
//             fileSize: fileSize,
//             timestamp: new Date().toISOString(),
//             type: 'file' // Identify file message
//           };

//           emitSocketEvent('file_message', messageData);
//           setUploadingFile(false);
          
//           // Success feedback
//           toast.success('File sent successfully!');
//           resolve();
//         };
        
//         reader.onerror = () => {
//           console.error('File reading error');
//           setUploadingFile(false);
//           toast.error('Failed to read file');
//           resolve();
//         };
        
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // Normal text message
//       const messageData = {
//         sessionId: sessionId || roomCode,
//         message: text,
//         timestamp: new Date().toISOString(),
//         type: 'text' // Identify text message
//       };

//       emitSocketEvent('chat_message', messageData);
//     }
    
//   } catch (error) {
//     console.error('Error sending message:', error);
//     setUploadingFile(false);
//     toast.error('Failed to send message');
//   }
// }, [sessionId, roomCode]);

//   // ========== TRANSPORT CREATION ==========

//   const createSendTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createSendTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createSendTransport(response.params);
//           transports.current.set(transport.id, transport);
//           sendTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
//             try {
//               const producerId = await handleTransportProduce(
//                 currentSessionId,
//                 transport.id,
//                 kind,
//                 rtpParameters,
//                 appData
//               );
//               callback({ id: producerId });
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ SendTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating send transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   const createRecvTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createRecvTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createRecvTransport(response.params);
//           transports.current.set(transport.id, transport);
//           recvTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ RecvTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating recv transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   // ========== MEDIA INITIALIZATION ==========

//   const setupStreamerMedia = async (currentSessionId) => {
//     try {
//       if (producers.current.size > 0) {
//         addDebugLog('ℹ️ Producers already exist, skipping setup');
//         return;
//       }

//       if (!mediaStream) {
//         throw new Error('No mediaStream available');
//       }      
//     const videoTrack = mediaStream.getVideoTracks()[0];
//       const audioTrack = mediaStream.getAudioTracks()[0];
      
//       if (!videoTrack) {
//         throw new Error('No video track available');
//       }
      
//       if (!audioTrack) {
//         throw new Error('No audio track available');
//       }
      
//       addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
//       addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (!response || response.error || !response.params) {
//           console.error('Failed to create send transport:', response?.error);
//           setMediaError('Failed to create media transport');
//           addDebugLog(`❌ Transport creation error: ${response?.error}`);
//           return;
//         }

//         const transport = device.createSendTransport(response.params);
//         transports.current.set(transport.id, transport);
//         sendTransportRef.current = transport;

//         transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//           try {
//             await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//             callback();
//           } catch (error) {
//             console.error('Transport connect error:', error);
//             errback(error);
//           }
//         });
// transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
//   try {
//     const producerId = await handleTransportProduce(
//       currentSessionId,
//       transport.id,
//       kind,
//       rtpParameters,
//       appData
//     );
//     callback({ id: producerId });
//   } catch (error) {
//     console.error('Transport produce error:', error);
//     errback(error);
//   }
// });

// try {
//   setMediaError(null);
//   addDebugLog('✅ Using existing camera/microphone stream');

//  const videoProducer = await transport.produce({
//   track: videoTrack,
//   appData: { source: 'camera', userId: user?.id }   // 🔥 add userId
// });
//   producers.current.set(videoProducer.id, videoProducer);
//   setProducersState(prev => new Map(prev).set(videoProducer.id, {
//     id: videoProducer.id,
//     kind: 'video',
//     paused: false,
//     source: 'camera'
//   }));
//   addDebugLog(`✅ Video producer created: ${videoProducer.id}`);
  
//   const audioProducer = await transport.produce({
//   track: audioTrack,
//   appData: { source: 'mic', userId: user?.id }      // 🔥 add userId
// });

//   producers.current.set(audioProducer.id, audioProducer);
//   setProducersState(prev => new Map(prev).set(audioProducer.id, {
//     id: audioProducer.id,
//     kind: 'audio',
//     paused: false,
//     source: 'mic'
//   }));
//   addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

//   setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
//   setIsInitializing(false);
//   setIsLoading(false);
  
//   setTimeout(() => {
//     if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
//       videoRef.current.play().catch(error => {
//         console.log('Post-producer autoplay prevented:', error);
//         setShowPlayButton(true);
//       });
//     }
//   }, 500);
  
// } catch (error) {
//   console.error('Error creating producers:', error);
//   addDebugLog(`❌ Producer creation error: ${error.message}`);
//   setIsInitializing(false);
//   setIsLoading(false);
// }
//       });
//     } catch (error) {
//       console.error('Error setting up streamer media:', error);
//       setMediaError('Failed to set up media streaming');
//       addDebugLog(`❌ Media setup error: ${error.message}`);
//       setIsInitializing(false);
//       setIsLoading(false);
//     }
//   };
  
// const initializeMedia = async (currentSessionId, initialIceServers = []) => {
//   try {
//     if (isMediaInitialized) {
//       addDebugLog('ℹ️ Media already initialized, skipping');
//       return;
//     }
    
//     if (!mediaStream) {
//       addDebugLog('❌ No media stream available for initialization');
//       return;
//     }
    
//     setIsMediaInitialized(true);
//     addDebugLog('Initializing media with existing stream...');
    
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for media initialization');
//       return;
//     }
    
//     socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
//       if (response.error || !response.rtpCapabilities) {
//         addDebugLog(`❌ Failed to get router capabilities: ${response.error}`);
//         setMediaError('Failed to initialize media server');
//         setIsMediaInitialized(false);
//         return;
//       }

//       try {
//         await device.load({ routerRtpCapabilities: response.rtpCapabilities });
//         addDebugLog(`✅ Device loaded successfully`);

//         // Create transports
//         await createRecvTransport(currentSessionId);
//         await createSendTransport(currentSessionId);

//         // Setup streamer media
//         await setupStreamerMedia(currentSessionId);

//       } catch (error) {
//         console.error('Error loading device:', error);
//         setMediaError('Failed to initialize media device');
//         setIsMediaInitialized(false);
//         addDebugLog(`❌ Device load error: ${error.message}`);
//       }
//     });
//   } catch (error) {
//     console.error('Error initializing media:', error);
//     setMediaError('Failed to initialize media');
//     setIsMediaInitialized(false);
//     addDebugLog(`❌ Media init error: ${error.message}`);
//   }
// };

//   const joinRoomWithRetry = (retries = 3) => {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for joining room');
//       return;
//     }
    
//     if (retries === 0) {
//       console.error('Failed to join room after multiple attempts');
//       addDebugLog('Failed to join room after multiple attempts');
//       alert('Failed to join the session. Please try again.');
//       return;
//     }

//     addDebugLog(`Joining room (attempt ${4 - retries}/3)...`);
    
//     socket.emit('join_room', { 
//       token, 
//       sessionId: sessionId || null,
//       roomCode: roomCode || null,
//     }, (response) => {
//       if (response && response.error) {
//         console.warn(`Join room failed: ${response.error}, retrying... (${retries - 1} attempts left)`);
//         addDebugLog(`Join room failed: ${response.error}, retrying...`);
//         setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
//       }
//     });
//   };
//   // ========== CAMERA AND PERMISSION FUNCTIONS ==========

// const initializeCamera = async () => {
//   try {
//     addDebugLog('🔄 Initializing camera with smart audio optimization...');
//     setIsLoading(true);
//     setIsInitializing(true);
//     setCameraVisible(false);
//     setShowPlayButton(false); // Reset play button
    
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // ✅ SMART AUDIO CONSTRAINTS with complete optimization
//     const audioConstraints = await getOptimizedAudioConstraints(); // ✅ await add karo
    
//     // ✅ EARPHONE DETECTION aur optimization
//     const earphoneInfo = await detectEarphones();
    
//     // ✅ EARPHONE ADJUSTMENT - Force stereo if earphone detected
//     if (earphoneInfo.hasEarphone) {
//       audioConstraints.channelCount = 2;
//       audioConstraints.sampleRate = 48000; // High quality for earphones
      
//       if (earphoneInfo.isBluetooth) {
//         // Bluetooth earphones need special handling
//         audioConstraints.latency = 0.02; // Slightly higher latency for BT
//         addDebugLog('🎧 Bluetooth earphone detected - using optimized settings');
//       } else if (earphoneInfo.isWiredHeadphone) {
//         addDebugLog('🎧 Wired headphone detected - using high quality audio');
//       }
      
//       addDebugLog(`🎧 Earphone detected: ${earphoneInfo.deviceLabels.join(', ')}`);
//     }

//     addDebugLog(`🎵 Using optimized audio: ${audioConstraints.channelCount} channels, ${audioConstraints.sampleRate || 'default'}Hz`);

//     // Mobile-friendly constraints with SMART AUDIO
//     const constraints = {
//       video: {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 60, max: 70 },
//       },
//       audio: audioConstraints  // ✅ OPTIMIZED AUDIO CONSTRAINTS
//     };

//     addDebugLog('🎯 Requesting media with constraints:', {
//       video: constraints.video,
//       audio: constraints.audio
//     });

    
//     const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     console.log('📱 Camera stream obtained with optimized audio');

//     // ✅ VERIFY AUDIO SETTINGS
//     const videoTracks = stream.getVideoTracks();
//     const audioTracks = stream.getAudioTracks();
    
//     if (videoTracks.length === 0) {
//       throw new Error('No video track found in stream');
//     }

//     // Log actual audio settings
//     if (audioTracks.length > 0) {
//       const audioSettings = audioTracks[0].getSettings();
//       addDebugLog(`🎵 Actual audio settings: ${audioSettings.channelCount} channels, ${audioSettings.sampleRate || 'default'}Hz, sampleSize: ${audioSettings.sampleSize || 'N/A'}`);
      
//       // Warn if we got mono but wanted stereo
//       if (earphoneInfo.hasEarphone && audioSettings.channelCount === 1) {
//         addDebugLog('⚠️ Earphone connected but got MONO audio - device limitation');
//       }
      
//       // Log all audio track details
//       audioTracks.forEach((track, index) => {
//         const settings = track.getSettings();
//         addDebugLog(`🎤 Audio Track ${index + 1}:`, {
//           id: track.id,
//           label: track.label,
//           enabled: track.enabled,
//           muted: track.muted,
//           readyState: track.readyState,
//           channelCount: settings.channelCount,
//           sampleRate: settings.sampleRate,
//           sampleSize: settings.sampleSize,
//           latency: settings.latency
//         });
//       });
//     }

//     // Log video track details
//     videoTracks.forEach((track, index) => {
//       const settings = track.getSettings();
//       addDebugLog(`📹 Video Track ${index + 1}:`, {
//         id: track.id,
//         label: track.label,
//         enabled: track.enabled,
//         muted: track.muted,
//         readyState: track.readyState,
//         width: settings.width,
//         height: settings.height,
//         frameRate: settings.frameRate,
//         aspectRatio: settings.aspectRatio
//       });
//     });
    
//     setMediaStream(stream);
//     setMediaError(null);
//     setPermissionStatus('granted');
//     setCameraReady(true);
    
//     addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
    
//     // Setup video element properly
//     setTimeout(() => {
//       if (videoRef.current) {
//         const videoEl = videoRef.current;
//         videoEl.muted = true;
//         videoEl.playsInline = true;
//         videoEl.setAttribute('playsinline', '');
//         videoEl.setAttribute('webkit-playsinline', '');
//         videoEl.srcObject = stream;
        
//         // Video event listeners for better debugging
//         videoEl.onloadedmetadata = () => {
//           addDebugLog('📹 Video metadata loaded');
//         };
        
//         videoEl.oncanplay = () => {
//           addDebugLog('📹 Video can play');
//         };
        
//         videoEl.onerror = (e) => {
//           console.error('📹 Video error:', e);
//           addDebugLog(`❌ Video error: ${e.message}`);
//         };

//         // Auto-play attempt with better timing
//         setTimeout(() => {
//           videoEl.play().then(() => {
//             addDebugLog('✅ Mobile autoplay successful');
//             setIsPlaying(true);
//             setShowPlayButton(false);
//             setIsLoading(false);
//             setIsInitializing(false);
//           }).catch(error => {
//             console.log('📱 Mobile autoplay blocked, waiting for user gesture');
//             addDebugLog(`📱 Autoplay blocked: ${error.message}`);
//             setShowPlayButton(true);
//             setIsLoading(false);
//             setIsInitializing(false);
//           });
//         }, 800); // Slightly longer delay for mobile
//       }
//     }, 500);
    
//   } catch (error) {
//     console.error('❌ Error accessing camera:', error);
//     addDebugLog(`❌ Camera access error: ${error.message}`);
    
//     let errorMessage = `Camera error: ${error.message}`;
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
//       setPermissionStatus('denied');
//     } else if (error.name === 'NotFoundError') {
//       errorMessage = 'No camera found. Please check if camera is connected.';
//     } else if (error.name === 'NotSupportedError') {
//       errorMessage = 'Camera not supported on this device/browser.';
//     } else if (error.name === 'NotReadableError') {
//       errorMessage = 'Camera is already in use by another application.';
//     } else if (error.name === 'OverconstrainedError') {
//       errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...';
//       // Fallback to basic constraints
      
//     }
    
//     setMediaError(errorMessage);
//     setIsLoading(false);
//     setIsInitializing(false);
//     setShowPlayButton(true);
//   }
// };


//   const requestCameraPermissions = async () => {
//     try {
//       addDebugLog('🔄 Manually requesting camera permissions...');
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true, 
//         audio: {
//     echoCancellation: true,
//     noiseSuppression: true,
//     autoGainControl: true
//   },
//       });
      
//       stream.getTracks().forEach(track => track.stop());
      
//       setMediaError(null);
//       setPermissionStatus('granted');
//       addDebugLog('✅ Camera permissions granted manually');
      
//       initializeCamera();
//     } catch (error) {
//       console.error('Failed to request camera permissions:', error);
//       setMediaError('Failed to get camera permissions. Please allow access in browser settings.');
//       setPermissionStatus('denied');
//       addDebugLog(`❌ Manual permission request failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };

//   const retryCamera = async () => {
//     try {
//       setMediaError(null);
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       Array.from(producersState.keys()).forEach(producerId => {
//         handleCloseProducer(producerId);
//       });
      
//       transports.current.forEach(transport => {
//         try {
//           transport.close();
//         } catch (error) {
//           console.error('Error closing transport:', error);
//         }
//       });
//       transports.current.clear();
      
//       if (mediaStream) {
//         mediaStream.getTracks().forEach(track => track.stop());
//         setMediaStream(null);
//       }
      
//       setIsMediaInitialized(false);
//       setCameraReady(false);
//       setCameraVisible(false);
//       setIsWebSocketInitialized(false);
//       setProducersState(new Map());
      
//       initializeCamera();
      
//       addDebugLog('Camera retry initiated');
//     } catch (error) {
//       console.error('Failed to retry camera:', error);
//       setMediaError('Failed to restart camera');
//       setPermissionStatus('denied');
//       addDebugLog(`Camera retry failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };
//   // ========== WEBSOCKET INITIALIZATION ==========
//   const initializeWebSocket = () => {
//     if (permissionStatus !== 'granted') {
//       addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
//       return;
//     }

//     addDebugLog('Setting up socket connection...');
//     addDebugLog(`Socket URL: ${import.meta.env.VITE_SOCKET_URL}`);
//     addDebugLog(`Session ID: ${sessionId}`);
//     addDebugLog(`Room Code: ${roomCode}`);

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: { token },
//     transports: ['websocket', 'polling'], 
//     upgrade: true,
//     forceNew: true,
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000,
//     timeout: 20000
//     });

//     newSocket.on('connect', () => {
//       addDebugLog('✅ Socket connected, emitting join_room...');
//       setIsConnected(true);
      
//       joinRoomWithRetry();
//     });


//     newSocket.on('disconnect', () => {
//       addDebugLog('❌ Disconnected from server');
//       setIsConnected(false);
//     });

//     newSocket.on('connect_error', (error) => {
//       console.error('❌ Connection error:', error);
//       addDebugLog(`Connection error: ${error.message}`);
//       setIsConnected(false);
//     });

//     newSocket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//       addDebugLog(`Socket error: ${error.message}`);
//     });

//     newSocket.on('error_message', (data) => {
//       console.error('Error:', data);
//       addDebugLog(`Error message: ${JSON.stringify(data)}`);
//       alert(data.message || data);
//     });

//     // ========== SOCKET EVENT LISTENERS ==========
//     newSocket.on('new-viewer-screen-producer', (data) => {
//       addDebugLog('📩 Direct new-viewer-screen-producer event received');
//       handleNewViewerScreenProducer(data);
//     });

//     // Recording status events
// newSocket.on('recording_started', (data) => {
//   addDebugLog(`🎬 Recording started: ${data.sessionId}`);
//   setIsRecording(true);
// });

// newSocket.on('recording_stopped', (data) => {
//   addDebugLog(`⏹ Recording stopped: ${data.sessionId}`);
//   setIsRecording(false);
// });

//     newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
//     newSocket.on('viewer-audio-request', handleViewerAudioRequest);
//     newSocket.on('screen-share-request', handleScreenShareRequest);
//     newSocket.on('viewer-audio-started', handleViewerAudioStarted);
//     newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
//     newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
//     newSocket.on('screen-share-stopped-by-viewer', handleScreenShareStopped);
//     newSocket.on("viewer-video-request", handleViewerVideoRequest);


//     newSocket.on("viewer-audio-stopped", ({ userId }) => {
//   cleanupViewerAudio(userId);

//    newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
//   addDebugLog(`🛑 Viewer audio force-stopped: ${userId}`);
//    cleanupViewerAudio(userId); // remove their audio element

//    // Participants list update bhi karo
//    setParticipants(prev =>
//      prev.map(p =>
//        p.userId === userId ? { ...p, hasAudio: false } : p
//      )
//    );
//  });
// });

// newSocket.on("user_left", (data) => {
//   // keep your existing cleanup, but also ensure audio element removed
//   cleanupViewerAudio(data.userId);
//   cleanupViewerMedia(data.userId); // if you already had this
// });


//     // Viewer audio status events
//     newSocket.on('viewer-audio-enabled', (data) => {
//       addDebugLog(`Viewer audio enabled: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, hasAudio: true } : p
//       ));
//     });

//     newSocket.on('viewer-audio-started-global', (data) => {
//       addDebugLog(`Viewer audio started globally: ${data.userId}`);
//       setActiveSpeakers(prev => new Map(prev).set(data.socketId, {
//         userId: data.userId,
//         socketId: data.socketId,
//         userName: data.userName
//       }));
//     });

//     newSocket.on('viewer-audio-muted-global', (data) => {
//       addDebugLog(`Viewer audio muted globally: ${data.userId}`);
//       setActiveSpeakers(prev => {
//         const newMap = new Map(prev);
//         Array.from(newMap.entries()).forEach(([key, value]) => {
//           if (value.userId === data.userId) {
//             newMap.delete(key);
//           }
//         });
//         return newMap;
//       });
//     });

//     newSocket.on('joined_room', (data) => {
//       addDebugLog('✅ Joined room successfully');
//       setSession(data);
//       setParticipants(data.participants || []);
//       setIceServers(data.iceServers || []);
//       setIsLoading(false);
      
//       if (!isMediaInitialized) {
//         initializeMedia(data.sessionId, data.iceServers);
//       }
//     });

//     newSocket.on('ice_servers', (servers) => {
//       addDebugLog(`Received ${servers.length} ICE servers`);
//       setIceServers(servers);
//     });

//     newSocket.on('user_joined', (data) => {
//       addDebugLog(`User joined: ${data.userId}`);
//       setParticipants(prev => [...prev, data]);
//     });

//     newSocket.on('user_left', (data) => {
//       addDebugLog(`User left: ${data.userId}`);
//       setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      
//       // Clean up viewer media
//       cleanupViewerMedia(data.userId);
      
//       // Clean up remote videos
//       const videoToRemove = Array.from(remoteVideosRef.current.entries())
//         .find(([_, video]) => video.dataset?.socketId === data.socketId);
      
//       if (videoToRemove) {
//         const [producerId, video] = videoToRemove;
//         video.remove();
//         remoteVideosRef.current.delete(producerId);
//       }
//     });
//     // Socket event handlers mein ye add karen
// newSocket.on('chat_message', (message) => {
//   addDebugLog(`Chat message from ${message.userId}`);
  
//   // Agar file message hai to usko process karen
//   if (message.type === 'file') {
//     addDebugLog(`File received: ${message.fileName} (${message.fileType})`);
//   }
  
//   setMessages(prev => [...prev, {
//     ...message,
//     id: Date.now() + Math.random(), // Unique ID
//     timestamp: message.timestamp || new Date().toISOString()
//   }]);
// });
//     newSocket.on('streamer_started', () => {
//       addDebugLog('Streamer started streaming');
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setLocalPausedState(false);
//     });

//     newSocket.on('streamer_paused', () => {
//       addDebugLog('Streamer paused streaming');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//     });

//     newSocket.on('streamer_resumed', () => {
//       addDebugLog('Streamer resumed streaming');
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     });
//     // 🛑 Streamer ne ya viewer ne camera stop kiya
// newSocket.on("viewer-video-force-stopped-global", ({ userId }) => {
//   addDebugLog(`🛑 Camera stopped globally for user: ${userId}`);
//   cleanupViewerMedia(userId); // tumhare paas already hai
// });

// newSocket.on("viewer-camera-stopped", ({ userId }) => {
//   addDebugLog(`📷 Viewer camera stopped: ${userId}`);

//   setZoomed((prev) => {
//     if (prev && prev.type === "viewer" && prev.userId === userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped viewer camera: ${userId}`);
//       return null;
//     }
//     return prev;
//   });
//     cleanupViewerCamera(userId);
// });

// newSocket.on("viewer-camera-paused-global", ({ userId }) => {
//   addDebugLog(`⏸️ Viewer camera paused: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))
//   );
// });

// newSocket.on("viewer-camera-resumed-global", ({ userId }) => {
//   addDebugLog(`▶️ Viewer camera resumed: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))
//   );
// });
//     newSocket.on('session_ended', () => {
//       addDebugLog('Session ended by streamer');
//       setRoomState(prev => ({ ...prev, isStreaming: false, isPaused: true }));
//       alert('Session has been ended by the streamer.');
//       navigate('/dashboard');
//     });

//     newSocket.on('session_paused', () => {
//       addDebugLog('Session paused by streamer');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//       alert('Session has been paused by the streamer.');
//     });

//     newSocket.on('producer-paused', (data) => {
//       addDebugLog(`Producer paused: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: true });
//         }
//         return newState;
//       });
//     });

//     newSocket.on('producer-resumed', (data) => {
//       addDebugLog(`Producer resumed: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: false });
//         }
//         return newState;
//       });
//     });

// newSocket.on("producer-closed", (data) => {
//   addDebugLog(
//     `❌ Producer closed: ${data.producerId}, source: ${data.source}, user: ${data.userId}`
//   );

//   // 🖥️ Screen share cleanup (streamer OR viewer)
//   if (data.source === "screen" || data.source === "viewer-screen") {
//     // 🔴 Forcefully clear state
//     setActiveScreenShare(null);

//     // 🔴 Stop only video tracks from screen share
//     try {
//       if (screenRef.current?.srcObject) {
//         const tracks = screenRef.current.srcObject.getTracks?.() || [];
//         tracks.forEach((t) => {
//           if (t.kind === 'video') {
//             t.stop(); // Only stop video tracks
//           }
//         });
//       }
//     } catch (e) {
//       console.warn("Error stopping screen share tracks on producer-closed", e);
//     }

//     // 🔴 Clear video ref
//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef on producer-closed", e);
//       }
//     }

//     addDebugLog(
//       `✅ Producer closed → forced activeScreenShare reset for ${data.userId}`
//     );
//   }

//   // 🎤 Audio cleanup - ONLY for audio sources
//   if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//     cleanupViewerAudio(data.userId);
//     addDebugLog(`🎤 Viewer audio stopped for user: ${data.userId}`);
//   }

//   // 📷 Camera cleanup - ONLY for camera video
//   if (data.source === "viewer-camera") {
//     setViewerCameras((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(data.userId)) {
//         const stream = newMap.get(data.userId);
//         if (stream) {
//           try {
//             // ✅ ONLY stop VIDEO tracks, leave audio tracks alone
//             stream.getTracks().forEach((t) => {
//               if (t.kind === 'video') {
//                 t.stop();
//                 addDebugLog(`📹 Stopped video track for user ${data.userId}`);
//               }
//               // Audio tracks continue playing
//             });
//           } catch (e) {
//             console.warn("Error stopping camera tracks", e);
//           }
//         }
//         newMap.delete(data.userId);
//       }
//       return newMap;
//     });
//     addDebugLog(`📷 Viewer camera removed for user ${data.userId}`);
//   }

//   // 🔊 Streamer audio cleanup - if needed
//   if (data.source === "mic" || data.source === "streamer-mic") {
//     addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
//     // Don't cleanup viewer audio here, this is streamer's audio
//   }
// });


//     newSocket.on("new-producer", (data) => {
//       addDebugLog("📡 New producer available:", data);

//       // Track producer in state
//       setProducersState((prev) => {
//         const updated = new Map(prev);
//         updated.set(data.producerId, {
//           id: data.producerId,
//           kind: data.kind,
//           userId: data.userId,
//           source: data.source || "camera",
//           paused: false,
//         });
//         return updated;
//       });

//       // Handle viewer screen video
//       if (data.source === "viewer-screen") {
//         addDebugLog("🖥️ Consuming viewer screen producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }

//       // Handle viewer mic OR viewer screen audio
//       if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//         addDebugLog("🎤 Consuming viewer audio producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }
//       if (data.source === "viewer-camera") {
//   addDebugLog("📷 Consuming viewer camera producer:", data.producerId);
//   createConsumer(sessionId || roomCode, data.producerId, data.kind);
// }
//     });
    
//     newSocket.on('participant_updated', (data) => {
//       addDebugLog(`Participant updated: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, ...data.updates } : p
//       ));
//     });

//  newSocket.on("participants_list_updated", (data) => {
//   addDebugLog("📋 Participants list updated (snapshot)");
//   console.log("participants list:", data.participants || []);
//   setParticipants(data.participants || []);
// });
//     setSocket(newSocket);
//     socketRef.current = newSocket;
//   };

//   // ========== USE EFFECT HOOKS ==========

// useEffect(() => {
//   // Initialize media stream refs
//   streamerMediaRef.current = new MediaStream();
//   viewerAudiosRef.current = new Map();

//   return () => {
//     isMountedRef.current = false;

//     // 🎬 RECORDING CLEANUP (FIRST - most important)
//     if (recorder && recorder.state === 'recording') {
//       try {
//         recorder.stop();
//         addDebugLog('🛑 Recorder stopped on unmount');
//       } catch (error) {
//         console.error('Error stopping recorder:', error);
//       }
//     }
    
//     // 📺 SCREEN CAPTURE CLEANUP
//     if (screenCaptureStream) {
//       try {
//         screenCaptureStream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//             addDebugLog(`🛑 Stopped screen capture track: ${track.kind}`);
//           }
//         });
//       } catch (error) {
//         console.error('Error stopping screen capture:', error);
//       }
//     }
    
//     // 🧹 RECORDING STREAM CLEANUP
//     if (recordingStream) {
//       try {
//         recordingStream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//           }
//         });
//         setRecordingStream(null);
//         addDebugLog('🧹 Recording stream cleaned up');
//       } catch (error) {
//         console.error('Error cleaning recording stream:', error);
//       }
//     }

//     // 🎥 Clean up main camera/microphone stream
//     if (mediaStream) {
//       try {
//         mediaStream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//           }
//         });
//         addDebugLog('🎥 Main camera stream cleaned up');
//       } catch (error) {
//         console.error('Error stopping media stream:', error);
//       }
//     }

//     // 🖥️ Clean up active screen share (only one can be active)
//     if (activeScreenShare?.stream && activeScreenShare.stream !== screenCaptureStream) {
//       try {
//         activeScreenShare.stream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//           }
//         });
//         addDebugLog(`🖥️ Active screen share cleaned up: ${activeScreenShare.userName}`);
//       } catch (error) {
//         console.error('Error stopping active screen share:', error);
//       }
//     }

//     // 🎤 Clean up all viewer audio streams
//     viewerAudiosRef.current.forEach((stream, userId) => {
//       try {
//         stream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//           }
//         });
//       } catch (error) {
//         console.error(`Error stopping viewer audio for ${userId}:`, error);
//       }
//     });

//     // 🎥 Clean up remote video elements
//     remoteVideosRef.current.forEach((video, producerId) => {
//       try {
//         if (video && video.srcObject) {
//           video.srcObject.getTracks().forEach(track => track.stop());
//           video.srcObject = null;
//         }
//       } catch (error) {
//         console.error(`Error cleaning remote video ${producerId}:`, error);
//       }
//     });

//     // 🔥 AUDIO MIXER CLEANUP
//     if (audioContextRef.current) {
//       try {
//         audioContextRef.current.close();
//         audioContextRef.current = null;
//         audioDestinationRef.current = null;
//         addDebugLog('🔊 Audio mixer cleaned up');
//       } catch (error) {
//         console.error('Error closing audio context:', error);
//       }
//     }

//     // 🖱️ Remove gesture handlers
//     if (userGestureHandlerRef.current) {
//       try {
//         document.removeEventListener("click", userGestureHandlerRef.current);
//         document.removeEventListener("touchstart", userGestureHandlerRef.current);
//         addDebugLog('🖱️ Gesture handlers removed');
//       } catch (error) {
//         console.error('Error removing gesture handlers:', error);
//       }
//     }

//     // 🔌 Close all transports
//     transports.current.forEach((transport, id) => {
//       try {
//         transport.close();
//         addDebugLog(`🔌 Transport closed: ${id}`);
//       } catch (error) {
//         console.error(`Error closing transport ${id}:`, error);
//       }
//     });

//     // 🔗 Close socket connection
//     if (socketRef.current) {
//       try {
//         socketRef.current.close();
//         addDebugLog('🔗 Socket connection closed');
//       } catch (error) {
//         console.error('Error closing socket:', error);
//       }
//     }

//     // 🧹 CLEANUP PENDING AUDIO QUEUE
//     pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
//       try {
//         if (streamInfo.audioStream) {
//           streamInfo.audioStream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//             }
//           });
//         }
//       } catch (error) {
//         console.error(`Error cleaning pending audio for ${userId}:`, error);
//       }
//     });
//     pendingAudioQueueRef.current.clear();

//     // 🧹 CLEANUP AUDIO ELEMENTS FROM DOM
//     audioElementsRef.current.forEach((audioEl, userId) => {
//       try {
//         audioEl.pause();
//         audioEl.srcObject = null;
//         if (audioEl.parentNode) {
//           audioEl.parentNode.removeChild(audioEl);
//         }
//       } catch (error) {
//         console.error(`Error cleaning audio element for ${userId}:`, error);
//       }
//     });
//     audioElementsRef.current.clear();

//     // 🧹 CLEANUP VIEWER CAMERAS
//     viewerCameras.forEach((stream, userId) => {
//       try {
//         stream.getTracks().forEach(track => {
//           if (track.readyState === 'live') {
//             track.stop();
//           }
//         });
//       } catch (error) {
//         console.error(`Error cleaning viewer camera for ${userId}:`, error);
//       }
//     });

//     // 🧹 STATE RESET LOG
//     addDebugLog('✅ Component cleanup completed');
    
//     // TIMER CLEANUP (if any interval running)
//     if (recordingInterval) {
//       clearInterval(recordingInterval);
//     }
    
//     // 🚨 EMERGENCY: Stop any remaining MediaRecorder
//     if (window.MediaRecorder && window.recordingInstances) {
//       window.recordingInstances.forEach(recorder => {
//         if (recorder.state === 'recording') {
//           try {
//             recorder.stop();
//           } catch (e) {
//             // Ignore
//           }
//         }
//       });
//     }
//   };
// }, []); // Empty dependency array - runs only on unmount

//   useEffect(() => {
//     const checkPermissions = async () => {
//       try {
//         addDebugLog('🔍 Checking camera and microphone permissions...');
//         setPermissionStatus('checking');
        
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//         const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
        
//         if (hasVideoPermission && hasAudioPermission) {
//           addDebugLog('✅ Camera and microphone permissions already granted');
//           setPermissionStatus('granted');
//           initializeCamera();
//         } else {
//           addDebugLog('ℹ️ Need to request camera/microphone permissions');
//           setPermissionStatus('denied');
//           setIsLoading(false);
//         }
//       } catch (error) {
//         console.error('Error checking permissions:', error);
//         addDebugLog(`❌ Error checking permissions: ${error.message}`);
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     };

//     checkPermissions();
//   }, []);


//   useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup recording stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }
//   };
// }, [recorder, recordingStream]);

//   useEffect(() => {
//     if (permissionStatus === 'granted' && !isWebSocketInitialized) {
//       addDebugLog('🔄 Initializing WebSocket connection...');
//       setIsWebSocketInitialized(true);
//       initializeWebSocket();
//     }
//   }, [permissionStatus, isWebSocketInitialized]);

//   useEffect(() => {
//     const checkCameraVisibility = () => {
//       if (videoRef.current && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        
//         if (hasVideo && videoRef.current.readyState >= 2) {
//           setCameraVisible(true);
//           setIsLoading(false);
//           addDebugLog('✅ Camera video is visible on screen');
//         }
//       }
//     };

//     if (mediaStream) {
//       checkCameraVisibility();
//       const interval = setInterval(checkCameraVisibility, 500);
//       return () => clearInterval(interval);
//     }
//   }, [mediaStream]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
    
//     if (!videoElement || !mediaStream) {
//       setIsPlaying(false);
//       return;
//     }

//     if (videoElement.srcObject !== mediaStream) {
//       videoElement.srcObject = mediaStream;
//       videoElement.muted = true;
//     }

//     const handlePlay = () => {
//       console.log('Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
//       setIsLoading(false);
//     };

//     const handlePause = () => {
//       console.log('Video paused');
//       setIsPlaying(false);
//       setLocalPausedState(true);
      
//       if (!roomState.isPaused) {
//         setShowPlayButton(true);
//       }
//     };

//     const handleError = (e) => {
//       console.error('Video error:', e);
//       setMediaError(true);
//       setIsPlaying(false);
//       setShowPlayButton(true);
//     };

//     const handleLoadedMetadata = () => {
//       console.log('Video metadata loaded');
//       setIsLoading(false);
//       if (!roomState.isPaused && !localPausedState) {
//         videoElement.play().catch(error => {
//           console.log('Autoplay prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     };

//     const handleLoadedData = () => {
//       console.log('Video data loaded');
//       setIsLoading(false);
//       if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
//         setCameraVisible(true);
//         setIsLoading(false);
//       }
//     };

//     const handleCanPlay = () => {
//       console.log('Video can play');
//       setIsLoading(false);
//     };

//     videoElement.addEventListener('play', handlePlay);
//     videoElement.addEventListener('pause', handlePause);
//     videoElement.addEventListener('error', handleError);
//     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
//     videoElement.addEventListener('loadeddata', handleLoadedData);
//     videoElement.addEventListener('canplay', handleCanPlay);

//     if (videoElement.readyState >= 2) {
//       if (!videoElement.paused && !videoElement.ended) {
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setLocalPausedState(false);
//         setIsLoading(false);
//       } else if (roomState.isPaused) {
//         setIsPlaying(false);
//         setShowPlayButton(false);
//         setLocalPausedState(true);
//       } else {
//         videoElement.play().catch(error => {
//           console.log('Initial play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }

//     return () => {
//       videoElement.removeEventListener('play', handlePlay);
//       videoElement.removeEventListener('pause', handlePause);
//       videoElement.removeEventListener('error', handleError);
//       videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
//       videoElement.removeEventListener('loadeddata', handleLoadedData);
//       videoElement.removeEventListener('canplay', handleCanPlay);
//     };
//   }, [mediaStream, roomState.isPaused]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
//     if (!videoElement || !mediaStream) return;

//     if (roomState.isPaused && !videoElement.paused) {
//       videoElement.pause();
//       setIsPlaying(false);
//       setShowPlayButton(false);
//       setLocalPausedState(true);
//     } else if (!roomState.isPaused && videoElement.paused && roomState.isStreaming) {
//       videoElement.play().catch(error => {
//         console.log('Play after resume prevented:', error);
//         setShowPlayButton(true);
//         setLocalPausedState(true);
//       });
//     }
//   }, [roomState.isPaused, roomState.isStreaming, mediaStream]);

// // ✅ always keep PiP screen video in sync, even after zoom toggle
// useEffect(() => {
//   if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
//     screenRef.current.srcObject = activeScreenShare.stream;
//     screenRef.current.play().catch(() => {
//       console.warn("Autoplay blocked for screen PiP");
//     });
//   } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
//     screenRef.current.srcObject = null;
//   }
// }, [activeScreenShare?.stream, zoomed]);

//   useEffect(() => {
//     if (mediaStream) {
//       const tracks = mediaStream.getTracks();
//       tracks.forEach(track => {
//         addDebugLog(`Track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
//         if (track.kind === 'video') {
//           const settings = track.getSettings();
//           addDebugLog(`Video settings: ${JSON.stringify({
//             width: settings.width,
//             height: settings.height,
//             frameRate: settings.frameRate,
//             deviceId: settings.deviceId
//           })}`);
//         }
//       });
      
//       const status = checkStreamStatus();
//       if (status.hasVideo && status.hasAudio) {
//         addDebugLog('✅ Stream has both audio and video tracks');
//       } else {
//         addDebugLog('❌ Stream is missing audio or video tracks');
//       }
//     }
//   }, [mediaStream]);
// // 👇 ye effect tumhare component me daal do
// // ✅ Streamer video ke liye
// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);
//   // ========== UI COMPONENTS ==========

// const handlePlayClick = async (e) => {
//   try {
//     e.stopPropagation();
//     console.log('📱 User triggered play');
    
//     if (videoRef.current && mediaStream) {
//       // Ensure video element is properly set up
//       const videoEl = videoRef.current;
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
      
//       // Set source only if needed
//       if (videoEl.srcObject !== mediaStream) {
//         videoEl.srcObject = mediaStream;
//       }
      
//       // User gesture ke saath play
//       await videoEl.play();
//       console.log('✅ Mobile video started via user gesture');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
      
//     }
//   } catch (error) {
//     console.error('❌ Failed to play video on mobile:', error);
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       setMediaError('Autoplay blocked. Please tap to play.');
//     } else {
//       setMediaError('Failed to play video');
//     }
    
//     setShowPlayButton(true);
//     setLocalPausedState(true);
//   }
// };

//   // 📷 Jab viewer camera request bhejta hai
// const handleViewerVideoRequest = useCallback((data) => {
//   addDebugLog(`📷 Viewer requested camera: ${data.requesterName} (${data.requestedUserId})`);
  
//   setViewerVideoRequests((prev) => [
//     ...prev,
//     {
//       userId: data.requestedUserId,
//       userName: data.requesterName,
//       socketId: data.socketId
//     }
//   ]);
// }, []);

// // Replace old handleViewerVideoResponse with this:
// const handleViewerVideoResponse = useCallback((requesterSocketId, allow) => {
//   // Use socketRef (safer) or emitSocketEvent helper
//   if (!socketRef.current || !socketRef.current.connected) {
//     addDebugLog('❌ Socket not connected — cannot send viewer-video-response');
//     return;
//   }

//   socketRef.current.emit('viewer-video-response', {
//     sessionId: sessionId || roomCode,
//     requesterSocketId,    // <-- IMPORTANT: server expects this key
//     allow                  // <-- IMPORTANT: server expects `allow` (boolean)
//   });

//   // remove the request UI
//   setViewerVideoRequests(prev => prev.filter(r => r.userId !== requesterSocketId && r.socketId !== requesterSocketId));

//   addDebugLog(`${allow ? '✅' : '❌'} Camera ${allow ? 'approved' : 'denied'} for requester socket: ${requesterSocketId}`);
// }, [sessionId, roomCode]);

//   const checkStreamStatus = useCallback(() => {
//     if (!mediaStream) return false;
    
//     const videoTracks = mediaStream.getVideoTracks();
//     const audioTracks = mediaStream.getAudioTracks();
    
//     const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
//     const hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
//     addDebugLog(`Stream status - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
//     return { hasVideo, hasAudio };
//   }, [mediaStream]);

// useEffect(() => {
//   if (!isMobile) return;

//   const handleFirstUserInteraction = () => {
//     addDebugLog('📱 Mobile user interaction detected');
    
//     // Video play try karo user gesture ke baad
//     if (videoRef.current && mediaStream && showPlayButton) {
//       setTimeout(() => {
//         videoRef.current.play().catch(() => {
//           // Still blocked, play button show karo
//           setShowPlayButton(true);
//         });
//       }, 100);
//     }
//   };

//   // Multiple events pe listen karo
//   document.addEventListener('click', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchend', handleFirstUserInteraction, { once: true });

//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//     document.removeEventListener('touchend', handleFirstUserInteraction);
//   };
// }, [isMobile, mediaStream, showPlayButton]);


// // Mobile detection and handlers
// useEffect(() => {
//   const checkMobile = () => {
//     const mobile = window.innerWidth < 768 || 
//                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//     setIsMobile(mobile);
//     if (mobile) {
//       setMobileView('video');
//       setShowThumbnails(false);
//       addDebugLog(`📱 Mobile device detected: ${window.innerWidth}px`);
//     }
//   };

//   checkMobile();
//   window.addEventListener('resize', checkMobile);
  
//   return () => window.removeEventListener('resize', checkMobile);
// }, []);

//   // Full screen handling
//   const toggleFullScreen = () => {
//     if (!document.fullscreenElement) {
//       document.documentElement.requestFullscreen().catch(err => {
//         console.log('Full screen error:', err);
//       });
//       setIsFullScreen(true);
//     } else {
//       document.exitFullscreen();
//       setIsFullScreen(false);
//     }
//   };
//   // Mobile main render
//   if (isMobile) {
//       const mobileHeight = isLandscape ? 'h-[160vh]' : 'h-screen';

//     return (
//       <div className={`flex flex-col ${mobileHeight} bg-black text-white overflow-hidden`}>
//         <MobileHeader
//       session={session}
//       participants={participants}
//       isConnected={isConnected}
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//       showRequests={showRequests}
//       setShowRequests={setShowRequests}
//     />
    
//     <MobileRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//       handleScreenShareResponse={handleScreenShareResponse}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />
        
//         {mobileView === 'video' && (
//         <MobileVideoView
//           zoomed={zoomed}
//           setZoomed={setZoomed}
//           mediaStream={mediaStream}
//           participants={participants}
//           activeScreenShare={activeScreenShare}
//           setIsPlaying={setIsPlaying}
//           setShowPlayButton={setShowPlayButton}
//           showPlayButton={showPlayButton}
//           setMediaError={setMediaError}
//           mediaError={mediaError}
//           isLoading={isLoading}
//           isInitializing={isInitializing}
//           roomState={roomState}
//           localPausedState={localPausedState}
//           user={user}
//           videoEnabled={videoEnabled}
//           viewerCameras={viewerCameras}
//           showMobileControls={showMobileControls}
//           setShowMobileControls={setShowMobileControls}
//           handlePlayClick={handlePlayClick}
//           isPlaying={isPlaying}
//         />
//       )}
//         {mobileView === 'participants' && <MobileParticipantsView
//         participants={participants}
//         activeSpeakers={activeSpeakers}
//         handleMuteViewerAudio={handleMuteViewerAudio}
//         emitSocketEvent={emitSocketEvent}
//         sessionId={sessionId}
//         roomCode={roomCode}
//         addDebugLog={addDebugLog}
//         handleStopViewerScreenShare={handleStopViewerScreenShare}
//         handleBanParticipant={handleBanParticipant}
//       />}
//         {mobileView === 'chat' && <MobileChatView
//         messages={messages}
//         user={user}
//         sendMessage={sendMessage}
//         uploadingFile={uploadingFile}
//       />}
        
//        <MobileNavigation
//       mobileView={mobileView}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//     />
    
//     <MobileControls
//   toggleAudio={toggleAudio}
//   audioEnabled={audioEnabled}
//   toggleVideo={toggleVideo}
//   videoEnabled={videoEnabled}
//   roomState={roomState}
//   startStreaming={startStreaming}
//   resumeStreaming={resumeStreaming}
//   pauseStreaming={pauseStreaming}
//   endStreaming={endStreaming}
//   // ✅ New props for recording
//   handleRecordingToggle={handleRecordingToggle}
//   isRecording={isRecording}
//   isRecordingLoading={isRecordingLoading}
//   isRecordingStopping={isRecordingStopping}
// />

//         {/* Mobile Modals */}
//         {showParticipantsModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-h-80 overflow-y-auto">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold">Manage Participants</h3>
//                 <button 
//                   onClick={() => setShowParticipantsModal(false)}
//                   className="text-gray-400"
//                 >
//                   <FiX className="h-5 w-5" />
//                 </button>
//               </div>
              
//               <div className="space-y-2">
//                 {participants.map((participant, index) => (
//                   <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
//                     <span className="text-sm">{participant.name || 'User'}</span>
//                     <div className="flex space-x-1">
//                       {participant.hasAudio && (
//                         <button
//                           onClick={() => handleMuteViewerAudio(participant.socketId)}
//                           className="bg-red-500 text-white p-1 rounded text-xs"
//                         >
//                           Mute
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // ========== MAIN RENDER ==========

//   if (isLoading && permissionStatus !== 'denied') {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Requesting camera access...</p>
//           {mediaError && (
//             <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               <p>{mediaError}</p>
//               <button 
//                 onClick={initializeCamera}
//                 className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//               >
//                 Retry
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   if (permissionStatus === 'denied' && !isConnected) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
//           <div className="text-4xl mb-4">🎥</div>
//           <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
//           <p className="text-gray-600 mb-6">
//             To join this live session, you need to allow camera and microphone access.
//           </p>
//           <button
//             onClick={requestCameraPermissions}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
//           >
//             Allow Camera & Microphone
//           </button>
//           <p className="text-sm text-gray-500 mt-4">
//             If you've previously denied access, please check your browser settings.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (!isConnected || !session) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Connecting to session...</p>
//           <div className="mt-4 w-64 mx-auto">
//             <video 
//               ref={videoRef}
//               autoPlay 
//               playsInline 
//               muted={true}
//               className="w-full rounded-lg shadow-lg"
//             />
//             <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }
// return (
//   <div className="flex flex-col h-[115vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
//     {/* Enhanced Header */}
//     <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
//       <div className="flex items-center space-x-4">
//         <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
//           <FiVideo className="h-6 w-6 text-white" />
//         </div>
//         <div>
//           <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//             Stream Control Center
//           </h1>
//           <p className="text-sm text-gray-300 flex items-center space-x-1">
//             <FiRadio className="h-3 w-3 text-green-400" />
//             <span>Room: {session?.roomCode}</span>
//           </p>
//         </div>
        
//         {/* RECORDING TIMER DISPLAY */}
//         {isRecording && (
//           <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
//             <div className="relative">
//               <BsFillRecordFill className="h-4 w-4 text-red-200" />
//               <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
//             </div>
//             <span className="text-sm font-bold text-white font-mono">
//               {formatRecordingTime(recordingTimer)}
//             </span>
//             <span className="text-xs text-red-100 font-medium">REC</span>
            
//             {/* Recording status dot */}
//             <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
//           </div>
//         )}
//       </div>
      
//       <div className="flex items-center space-x-4">
//         {/* Connection Status */}
//         <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
//           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//           <span className="text-sm font-medium">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
//         </div>
        
//         {/* Participants Count */}
//         <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 px-4 py-2 rounded-full backdrop-blur-sm">
//           <FiUsers className="h-4 w-4 text-white" />
//           <span className="text-sm font-medium">
//             {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
//           </span>
//         </div>

//         {/* Additional Recording Info (Optional) */}
//         {isRecording && (
//           <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
//             <span className="text-xs text-red-200 font-medium">Recording Active</span>
//             <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
//           </div>
//         )}

//         {/* Notification Badge for Pending Requests */}
//         {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
//           <div className="relative">
//             <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
//               <FiAlertCircle className="h-5 w-5 text-white" />
//             </button>
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
//               {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
//             </span>
//           </div>
//         )}

//         {/* Sidebar Toggle Button */}
//         <button
//           onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
//           className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
//           title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//         >
//           {sidebarCollapsed ? 
//             <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
//             <FiChevronRight className="h-5 w-5 text-blue-400" />
//           }
//           <span className="text-sm font-medium">
//             {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//           </span>
//         </button>

//         {/* End Session Button */}
//         <button
//           onClick={endStreaming}
//           className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
//         >
//           <FiLogOut className="h-4 w-4" />
//           <span>End Session</span>
//         </button>
//       </div>
//     </header>

//     {/* Main Content Area */}
//     <div className="flex-1 overflow-hidden relative">
//       {/* Thumbnails Overlay - Will cover entire screen when expanded */}
//       {thumbnailsExpanded && (
//         <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
//           <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/90">
//             <h2 className="text-xl font-bold flex items-center space-x-3">
//               <FiVideo className="h-6 w-6 text-blue-400" />
//               <span>All Cameras ({thumbnailsCount})</span>
//             </h2>
//             <div className="flex items-center space-x-4">
//               {/* Search filter (optional) */}
              
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
//                 title="Exit Full Screen"
//               >
//                 <FiX className="h-6 w-6" />
//               </button>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-6">
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid="streamer"
//                     stream={mediaStream}
//                     userName="You"
//                     onClick={() => {
//                       setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "streamer"}
//                     videoEnabled={videoEnabled}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//                     Host
//                   </div>
//                 </div>
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <div key={uid} className="relative group">
//                   <ThumbnailVideo
//                     uid={uid}
//                     stream={stream}
//                     userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                     onClick={() => {
//                       setZoomed({ type: "viewer", stream, userId: uid });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                     videoEnabled={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
//                     Viewer
//                   </div>
//                 </div>
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid={activeScreenShare.userId}
//                     stream={activeScreenShare.stream}
//                     userName={`${activeScreenShare.userName}'s Screen`}
//                     onClick={() => {
//                       setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "screen"}
//                     videoEnabled={true}
//                     isScreenShare={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//                     <FiMonitor className="h-3 w-3 mr-1" />
//                     Screen
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           <div className="p-4 border-t border-gray-700 bg-gray-800/90">
//             <div className="flex justify-between items-center">
//               <div className="text-sm text-gray-400">
//                 Click on any camera to zoom into it
//               </div>
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
//               >
//                 Back to Stream
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* When sidebar is collapsed */}
//       {sidebarCollapsed ? (
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//               {/* Zoomed Video View */}
//               {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Expand Sidebar Button */}
//               <div className="absolute right-4 top-4 z-20">
//                 <button
//                   onClick={() => setSidebarCollapsed(false)}
//                   className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
//                   title="Show Sidebar"
//                 >
//                   <FiChevronLeft className="h-5 w-5 text-blue-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           {/* Thumbnails Column - Always visible */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : (
//         /* Original Layout when sidebar is expanded */
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//          {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Thumbnails Column */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Sidebar - Expanded */}
//           <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Sidebar Toggle Header */}
//             <div className="flex border-b border-gray-600">
//               <button
//                 onClick={() => setSidebarView('participants')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'participants' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiUsers className="h-5 w-5" />
//                 <span className="text-sm font-medium">Participants</span>
//               </button>
//               <button
//                 onClick={() => setSidebarView('chat')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'chat' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiMessageSquare className="h-5 w-5" />
//                 <span className="text-sm font-medium">Chat</span>
//               </button>
              
//               {/* Collapse button inside sidebar */}
//               <button
//                 onClick={() => setSidebarCollapsed(true)}
//                 className="px-3 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all duration-200"
//                 title="Hide Sidebar"
//               >
//                 <FiChevronRight className="h-5 w-5" />
//               </button>
//             </div>

//             {/* Participants View */}
//             {sidebarView === 'participants' && (
//               <div className="flex-1 flex flex-col min-h-0">
//                 <div className="p-4 border-b border-gray-600">
//                   <div className="flex items-center justify-between">
//                     <h3 className="font-semibold text-lg flex items-center space-x-2">
//                       <FiUsers className="h-5 w-5 text-blue-400" />
//                       <span>Participants ({participants.length})</span>
//                     </h3>
//                     <button
//                       onClick={() => setShowParticipantsModal(true)}
//                       className="p-1 hover:bg-gray-700 rounded transition-colors"
//                       title="Manage Participants"
//                     >
//                       <FiUsers className="h-5 w-5 text-gray-400" />
//                     </button>
//                   </div>
//                 </div>
                
//                 <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//                   {participants.map((participant, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-colors duration-200"
//                     >
//                       <div className="flex items-center space-x-3">
//                         <div
//                           className={`w-3 h-3 rounded-full ${
//                             activeSpeakers.has(participant.socketId)
//                               ? "bg-green-400 animate-pulse"
//                               : participant.hasAudio
//                               ? "bg-blue-400"
//                               : "bg-gray-400"
//                           }`}
//                         ></div>
//                         <span className="truncate font-medium">
//                           {participant.name || participant.userName || participant.userId || "User"}
//                         </span>
//                       </div>
                      
//                       <div className="flex items-center space-x-2">
//                         {/* Audio permission icon */}
//                         {participant.hasAudio && (
//                           <button
//                             onClick={() => openRemoveAudioModal(participant)}
//                             className="p-1 text-blue-400 hover:text-red-400 transition-colors"
//                             title="Remove Audio Permission"
//                           >
//                             <FiMic className="h-4 w-4" />
//                           </button>
//                         )}

//                         {/* Stop Camera icon */}
//                         {participant.hasVideo && (
//                           <button
//                             onClick={() => {
//                               emitSocketEvent("streamer-stop-viewer-video", {
//                                 sessionId: sessionId || roomCode,
//                                 targetSocketId: participant.socketId,
//                               });
//                               addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
//                             }}
//                             className="p-1 text-green-400 hover:text-red-400 transition-colors"
//                             title="Stop Camera"
//                           >
//                             <FiCameraOff className="h-4 w-4" />
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Chat View */}
//             {sidebarView === 'chat' && (
//               <ChatComponent
//                 messages={messages}
//                 onSendMessage={sendMessage}
//                 currentUserId={user?.id}
//                 uploadingFile={uploadingFile}
//                 socket={socket}
//                 sessionId={sessionId}
//                 roomCode={roomCode}
//               />
//             )}
//           </div>
//         </div>
//       )}
//     </div>

//     {/* Audio Permission Modal */}
//     <AudioPermissionModal
//       isOpen={showAudioPermissionModal}
//       onEnableAudio={handleEnableAudio}
//     />

//     {/* Updated Panels with Proper Z-index */}
//     <ViewerAudioRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//     />

//     <ScreenShareRequestsPanel
//       screenShareRequests={screenShareRequests}
//       handleScreenShareResponse={handleScreenShareResponse}
//     />

//     <ActiveViewerAudioPanel
//       activeViewerAudio={activeViewerAudio}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//     />

//     <ActiveScreenSharesPanel
//       activeScreenShare={activeScreenShare}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//     />

//     <ParticipantsModal
//       showParticipantsModal={showParticipantsModal}
//       setShowParticipantsModal={setShowParticipantsModal}
//       participants={participants}
//       activeSpeakers={activeSpeakers}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//       emitSocketEvent={emitSocketEvent}
//       sessionId={sessionId}
//       roomCode={roomCode}
//       addDebugLog={addDebugLog}
//       handleBanParticipant={handleBanParticipant}
//     />

//     <ViewerVideoRequestsPanel
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />

//     <ProducerStatus producersState={producersState} />

//     {/* Remove Audio Confirmation Modal */}
//     {audioRemoveTarget && (
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
//           <div className="flex items-center space-x-3 mb-4">
//             <FiAlertCircle className="h-6 w-6 text-red-500" />
//             <h3 className="text-lg font-semibold text-gray-900">Remove Audio?</h3>
//           </div>
//           <p className="text-gray-700 mb-6">
//             Do you want to remove audio for <strong className="text-gray-900">{audioRemoveTarget.name || audioRemoveTarget.userId}</strong>? 
//             They will need to request again to speak.
//           </p>
//           <div className="flex justify-end space-x-3">
//             <button 
//               onClick={() => setAudioRemoveTarget(null)}
//               className="flex items-center space-x-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
//             >
//               <FiX className="h-4 w-4" />
//               <span>Cancel</span>
//             </button>
//             <button 
//               onClick={confirmRemoveAudio}
//               className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//             >
//               <FiCheck className="h-4 w-4" />
//               <span>Remove Audio</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     )}
    
// <div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
//   <div className="flex justify-center space-x-6">
//     {/* Start/Resume/Pause Stream Control */}
//     {!roomState.isStreaming ? (
//       <button
//         onClick={startStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Streaming"
//         disabled={isInitializing || isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Start</span>
//       </button>
//     ) : roomState.isPaused ? (
//       <button
//         onClick={resumeStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Resume Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Resume</span>
//       </button>
//     ) : (
//       <button
//         onClick={pauseStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Pause Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPause className="text-xl mb-1" />
//         <span className="text-xs font-medium">Pause</span>
//       </button>
//     )}
    
//     {/* Audio Toggle */}
//     <button
//       onClick={toggleAudio}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         audioEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//       disabled={isRecordingLoading || isRecordingStopping}
//     >
//       {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
//     </button>

//     {/* Video Toggle */}
//     <button
//       onClick={toggleVideo}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         videoEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={videoEnabled ? "Disable Video" : "Enable Video"}
//       disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//     >
//       {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
//     </button>
    
//     {/* Smart Screen Share Button - UPDATED */}
//     {activeScreenShare?.source === "streamer" ? (
//       <button
//         onClick={stopScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title={
//           isRecording 
//             ? "Stop sharing with viewers (recording continues)" 
//             : "Stop Screen Share"
//         }
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <div className="relative">
//           <MdStopScreenShare className="text-xl mb-1" />
//           {isRecording && (
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
//           )}
//         </div>
//         <span className="text-xs font-medium">
//           {isRecording ? 'Stop Share' : 'Stop Share'}
//         </span>
//         {isRecording && (
//           <span className="absolute -top-1 -left-1 bg-yellow-500 text-black text-[10px] px-1 rounded font-bold">
//             REC
//           </span>
//         )}
//       </button>
//     ) : (
//       <button
//         onClick={startScreenShare}
//         className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//           screenCaptureActive || isRecording
//             ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
//             : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
//         }`}
//         title={
//           screenCaptureActive || isRecording
//             ? "Share active screen capture with viewers"
//             : "Start screen sharing"
//         }
//         disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//       >
//         <MdOutlineScreenShare className="text-xl mb-1" />
//         <span className="text-xs font-medium">
//           {screenCaptureActive || isRecording ? 'Share Active' : 'Share Screen'}
//         </span>
        
//         {/* Indicator for existing capture */}
//         {(screenCaptureActive || isRecording) && (
//           <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
//             ✓
//           </span>
//         )}
//       </button>
//     )}
    
//     {/* Smart Recording Button - UPDATED */}
//     <button
//       onClick={handleRecordingToggle}
//       disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         isRecording 
//           ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
//           : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
//       }`}
//       title={
//         isRecording 
//           ? `Stop Recording (${formatRecordingTime(recordingTimer)})` 
//           : screenCaptureActive || activeScreenShare
//             ? "Record from active screen" 
//             : "Start screen recording"
//       }
//     >
//       {isRecordingLoading ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Starting...</span>
//         </>
//       ) : isRecordingStopping ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Saving...</span>
//         </>
//       ) : isRecording ? (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
//           </div>
//           <span className="text-xs font-medium">Stop REC</span>
          
//           {/* Recording Timer Badge */}
//           <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//             {formatRecordingTime(recordingTimer)}
//           </span>
          
//           {/* Screen Share Indicator (if sharing) */}
//           {activeScreenShare && (
//             <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">
//               SHARING
//             </span>
//           )}
          
//           {/* Recording Size Indicator */}
//           {recordingChunks.length > 0 && (
//             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] py-0.5 rounded-b-2xl">
//               {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//             </div>
//           )}
//         </>
//       ) : (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             {(screenCaptureActive || activeScreenShare) && (
//               <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
//             )}
//           </div>
//           <span className="text-xs font-medium">
//             {screenCaptureActive || activeScreenShare ? 'Record Active' : 'Record'}
//           </span>
          
//           {/* Tooltip Indicator for existing capture */}
//           {(screenCaptureActive || activeScreenShare) && (
//             <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
//               ✓
//             </span>
//           )}
//         </>
//       )}
//     </button>

//     {/* End Stream Button */}
//     {roomState.isStreaming && (
//       <button
//         onClick={endStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="End Stream for All Participants"
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <FiStopCircle className="text-xl mb-1" />
//         <span className="text-xs font-medium">End Stream</span>
        
//         {/* Warning Indicator if Recording is Active */}
//         {isRecording && (
//           <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
//             !
//           </span>
//         )}
//       </button>
//     )}
//   </div>
  
//   {/* Status Bar - UPDATED */}
//   <div className="mt-3 mx-auto max-w-2xl">
//     {/* Recording Status */}
//     {isRecording && (
//       <div className="mb-2">
//         <div className="flex items-center justify-between text-xs text-gray-300">
//           <div className="flex items-center space-x-2">
//             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
//             <span className="font-medium">Recording Active</span>
//             <span className="text-gray-400">•</span>
//             <span>{formatRecordingTime(recordingTimer)}</span>
//             <span className="text-gray-400">•</span>
//             <span>
//               {activeScreenShare 
//                 ? `Recording ${activeScreenShare.userName}'s screen` 
//                 : 'Recording screen & audio'}
//             </span>
//           </div>
          
//           <div className="flex items-center space-x-2">
//             {recordingChunks.length > 0 && (
//               <>
//                 <span className="text-gray-400">Size:</span>
//                 <span className="font-mono">
//                   {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//                 </span>
//               </>
//             )}
//           </div>
//         </div>
        
//         {/* Recording Progress Bar */}
//         <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
//           <div 
//             className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
//             style={{ 
//               width: `${Math.min((recordingTimer % 60) / 60 * 100, 100)}%`,
//               animationDuration: '1s'
//             }}
//           ></div>
//         </div>
//       </div>
//     )}
    
//     {/* Screen Capture Status */}
//     {(screenCaptureActive || activeScreenShare) && (
//       <div className={`flex items-center justify-between text-xs ${isRecording ? 'text-gray-400' : 'text-gray-300'}`}>
//         <div className="flex items-center space-x-2">
//           <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//           <span className="font-medium">
//             {screenCaptureActive ? 'Screen Capture Active' : 'Screen Sharing Active'}
//           </span>
//           <span className="text-gray-400">•</span>
//           <span>
//             {activeScreenShare 
//               ? `Sharing with ${participants.length} viewers`
//               : 'Ready for recording or sharing'}
//           </span>
//         </div>
        
//         {/* Status indicators */}
//         <div className="flex items-center space-x-2">
//           {screenCaptureActive && !activeScreenShare && (
//             <span className="text-blue-400">Capture Ready</span>
//           )}
//           {activeScreenShare && !isRecording && (
//             <span className="text-green-400">Sharing Active</span>
//           )}
//           {activeScreenShare && isRecording && (
//             <span className="text-yellow-400">Sharing + Recording</span>
//           )}
//         </div>
//       </div>
//     )}
//   </div>
// </div>
//   </div>
// );

// };

// export default LiveSession; 


//ye vala better mein viewer side se audio ni aa rha tha baki sab thik tha




// //ye vala better tha
//  import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { io } from 'socket.io-client';
// import * as mediasoupClient from 'mediasoup-client';
// import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
// import ChatComponent from './ChatComponent';
// import AudioPermissionModal from './AudioPermissionModal';

// import { 
//   getRecordingUploadUrl, 
//   saveRecordingMetadata,
//   getRecordingDownloadUrl,
//   formatFileSize
// } from './recordingService';

// import { toast } from 'react-toastify';
// import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiShare2, FiSquare, FiUsers, FiMessageSquare, FiSettings, FiUser, FiUserCheck,
//   FiUserX, FiAirplay, FiCamera, FiCameraOff, FiCheck, FiX, FiLoader, FiLogOut, FiRefreshCw, FiPlay, FiPause, FiStopCircle,
//   FiArrowUpRight, FiChevronDown, FiSend, FiAlertCircle, FiWifi, FiWifiOff, FiCircle, FiRadio, FiMenu, FiGrid, FiList,
//   FiMonitor, FiMaximize2, FiMinimize2, FiImage, FiSmile, FiFile, FiDownload} from 'react-icons/fi';
// import { IoVideocam, IoVideocamOff, IoShareOutline, IoStop, IoExitOutline, IoPeople, IoChatbubbleEllipses,
//   IoCog, IoPlay, IoPause, IoExpand, IoContract} from 'react-icons/io5';
// import { MdOutlineScreenShare , MdStopScreenShare, MdPlayArrow, MdPause, MdStop, MdGroup, MdChat, MdSettings, MdExitToApp, MdRefresh,
//   MdWarning,
//   MdError
// } from 'react-icons/md';
// import { FiChevronRight,FiChevronLeft,FiMaximize,FiSearch  } from "react-icons/fi";


// import { BsFillRecordFill } from "react-icons/bs";
// import { 
//   useRecordingTimer, 
//   RecordingTimerDisplay, 
//   RecordingStatusBadge,
//   formatTime 
// } from './RecordingTimer';

// import {
//   ActiveViewerAudioPanel,
//   ActiveScreenSharesPanel,
//   ProducerStatus,
//   ParticipantsModal,
//   ViewerVideoRequestsPanel,
//   ViewerAudioRequestsPanel,
//   ScreenShareRequestsPanel,
//   MobileHeader,
//   MobileNavigation,
//   MobileRequestsPanel,
//   MobileControls,
//   MobileParticipantsView,
//   MobileChatView,
//   MobileVideoView,
//   ThumbnailVideo
// } from './components';


// const LiveSession = () => {
//   const [showAudioModal, setShowAudioModal] = useState(false);
//   const [pendingScreenShare, setPendingScreenShare] = useState(null);
//   const { sessionId, roomCode } = useParams();
//   const navigate = useNavigate();
//   const { user, token } = useAuth();
//   const [socket, setSocket] = useState(null);
//   const [showWhiteboard, setShowWhiteboard] = useState(false);
// const [recordings, setRecordings] = useState([]);
// const [showRecordingsModal, setShowRecordingsModal] = useState(false);
// const [isRecordingLoading, setIsRecordingLoading] = useState(false);
// const [isRecordingStopping, setIsRecordingStopping] = useState(false); // ✅ नया state add करें
// const [recordingInterval, setRecordingInterval] = useState(null); // ✅ नया state
// const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);
// const [fullScreenThumbnails, setFullScreenThumbnails] = useState(false);
// const [autoStartRecording, setAutoStartRecording] = useState(false);

// const [recordingStream, setRecordingStream] = useState(null);

// const { 
//   recordingTimer,
//   recordingStartTime,
//   isRecordingActive,
//   startRecordingTimer,
//   stopRecordingTimer,
//   resetRecordingTimer,
//   formatRecordingTime 
// } = useRecordingTimer();

// const [isLandscape, setIsLandscape] = useState(false);

// const [recorder, setRecorder] = useState(null);
// const [recordedBlob, setRecordedBlob] = useState(null);
// const [recordingChunks, setRecordingChunks] = useState([]);

//    const [showAudioPermissionModal, setShowAudioPermissionModal] = useState(false);
//   const [userInteracted, setUserInteracted] = useState(false);
//   const [pendingAudioStreams, setPendingAudioStreams] = useState(new Map());
//    const [uploadingFile, setUploadingFile] = useState(false);
//   const [chatInput, setChatInput] = useState('');
// const [thumbnailsPosition, setThumbnailsPosition] = useState('right');
// const [streamerThumbnailVisible, setStreamerThumbnailVisible] = useState(true);
// const [sidebarView, setSidebarView] = useState('participants');
// const [isWebSocketInitialized, setIsWebSocketInitialized] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);
//    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
// const [showRequests, setShowRequests] = useState(false);
//   const [mobileView, setMobileView] = useState('video');
//   const [showMobileControls, setShowMobileControls] = useState(true);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [showThumbnails, setShowThumbnails] = useState(false);
//   const [session, setSession] = useState(null);
//   const [participants, setParticipants] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [permissionStatus, setPermissionStatus] = useState('checking');
//   const [mediaError, setMediaError] = useState(null);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [cameraVisible, setCameraVisible] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [showPlayButton, setShowPlayButton] = useState(false);
//   const [localPausedState, setLocalPausedState] = useState(false);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [iceServers, setIceServers] = useState([]);
//   const [isMediaInitialized, setIsMediaInitialized] = useState(false);
//   const [debugLog, setDebugLog] = useState([]);
//   const [producersState, setProducersState] = useState(new Map());
//   const [consumersState, setConsumersState] = useState(new Map());
//   const [isStreamPaused, setIsStreamPaused] = useState(false);
//   const [showParticipantsModal, setShowParticipantsModal] = useState(false);
//   const [selectedParticipant, setSelectedParticipant] = useState(null);
//   const [activeSpeakers, setActiveSpeakers] = useState(new Map());
//   const [viewerAudioRequests, setViewerAudioRequests] = useState([]);
//   const [screenShareRequests, setScreenShareRequests] = useState([]);
//   const [activeViewerAudio, setActiveViewerAudio] = useState(new Map());
//   const [activeScreenShare, setActiveScreenShare] = useState(null);
//    const [audioRemoveTarget, setAudioRemoveTarget] = useState(null);
//    const [zoomed, setZoomed] = useState(null);
//   const [mediaStream, setMediaStream] = useState(null);
//   const [viewerAudios, setViewerAudios] = useState(new Map());
// const [viewerVideoRequests, setViewerVideoRequests] = useState([]);
// const [viewerCameras, setViewerCameras] = useState(new Map()); 
//   const streamerMediaRef = useRef(new MediaStream());
//   const viewerAudiosRef = useRef(new Map());
//   const videoRef = useRef(null);
//   const screenRef = useRef(null);
//   const remoteVideosRef = useRef(new Map());
//   const transports = useRef(new Map());
//   const producers = useRef(new Map());
//   const consumers = useRef(new Map());
//   const userGestureHandlerRef = useRef(null);
//   const isMountedRef = useRef(true);
//   const sendTransportRef = useRef(null);
//   const recvTransportRef = useRef(null);
//   const audioElementsRef = useRef(new Map());
//   const pendingAudioQueueRef = useRef(new Map());
//   const socketRef = useRef(null);
//   const zoomedVideoRef = useRef(null); // ✅ Add this near other refs
//   const audioContextRef = useRef(null);
// const audioDestinationRef = useRef(null);
//   const [device] = useState(new mediasoupClient.Device());
//   const [showRecorder, setShowRecorder] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);

//   const [roomState, setRoomState] = useState({
//     isStreaming: false,
//     isPaused: false,
//     whiteboardEnabled: true
//   });
//   const emitSocketEvent = (event, data, callback) => {
//     if (socketRef.current && socketRef.current.connected) {
//       if (callback) {
//         socketRef.current.emit(event, data, callback);
//       } else {
//         socketRef.current.emit(event, data);
//       }
//       addDebugLog(`📤 Emitted ${event} event`);
//       return true;
//     } else {
//       addDebugLog(`❌ Cannot emit ${event}: Socket not connected`);
//       return false;
//     }
//   };

//   const getSocket = () => {
//     return socketRef.current;
//   };
//   const toggleZoom = (type, stream, userId) => {
//   setZoomed((prev) => {
//     if (prev && prev.type === type && prev.userId === userId) {
//       return null; // unzoom
//     }
//     return { type, stream, userId };
//   });
// };

//   const addDebugLog = (message) => {
//     console.log(message);
//     setDebugLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
//   };

//   // ========== SOCKET EVENT HANDLERS ==========

//  const stopScreenShare = useCallback(() => {
//   addDebugLog("🛑 Stopping screen share...");

//   // 🔴 Agar recording chal rahi hai to pehle stop karen
//   if (isRecording) {
//     addDebugLog("🎬 Also stopping recording with screen share...");
    
//     // Recording stop karen
//     if (recorder && recorder.state === 'recording') {
//       try {
//         recorder.stop();
//         addDebugLog("⏹️ Recording stopped with screen share");
        
//         // Recording timer stop karen
//         stopRecordingTimer();
//         setIsRecording(false);
        
//         // Recording stream cleanup
//         if (recordingStream) {
//           recordingStream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//             }
//           });
//           setRecordingStream(null);
//         }
        
//         // Recording chunks clear karen
//         setRecordingChunks([]);
        
//         toast.info('Recording also stopped with screen share');
//       } catch (recordingError) {
//         addDebugLog(`❌ Error stopping recording: ${recordingError.message}`);
//       }
//     }
//   }

//   // 🔴 Screen audio producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen-audio") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen audio producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen audio producer: ${err.message}`);
//       }
//     }
//   });

//   // 🔴 Screen video producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen share video producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen share producer: ${err.message}`);
//       }
//     }
//   });

//   // 🖥️ Agar activeScreenShare streamer ka hai → tracks stop kardo
//   if (activeScreenShare?.source === "streamer" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         try {
//           if (track.readyState === 'live') {
//             track.stop();
//             addDebugLog(`🛑 Stopped screen share track: ${track.kind} - ${track.id}`);
//           }
//         } catch (trackError) {
//           addDebugLog(`⚠️ Error stopping track: ${trackError.message}`);
//         }
//       });
//       addDebugLog("✅ Streamer screen tracks stopped");
//     } catch (streamError) {
//       addDebugLog(`❌ Error stopping streamer screen tracks: ${streamError.message}`);
//     }
//   }

//   // 🖥️ Viewer screen share ka case handle karen
//   if (activeScreenShare?.source === "viewer-screen" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       addDebugLog(`🛑 Viewer screen tracks stopped for user: ${activeScreenShare.userId}`);
//     } catch (viewerError) {
//       addDebugLog(`⚠️ Error stopping viewer screen tracks: ${viewerError.message}`);
//     }
//   }

//   // 🔄 Zoom reset karen agar screen share zoomed hai
//   setZoomed(prev => {
//     if (prev && prev.type === "screen") {
//       addDebugLog(`🔄 Resetting zoom for stopped screen share`);
//       return null;
//     }
//     return prev;
//   });

//   // ❌ Active screen share state clear karen
//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer" || prev?.source === "viewer-screen") {
//       addDebugLog(`✅ Active screen share cleared: ${prev.userName}`);
//       return null;
//     }
//     return prev;
//   });

//   // 🎬 Screen ref clear karen
//   if (screenRef.current) {
//     try {
//       screenRef.current.srcObject = null;
//       screenRef.current.load?.();
//       addDebugLog("✅ Screen ref cleared");
//     } catch (screenRefError) {
//       addDebugLog(`⚠️ Error clearing screenRef: ${screenRefError.message}`);
//     }
//   }

//   // 📡 Server ko notify karen (only if streamer)
//   if (socket && activeScreenShare?.source === "streamer") {
//     try {
//       socket.emit("screen-share-stop", {
//         sessionId: sessionId || roomCode,
//         userId: user?.id,
//         source: "streamer"
//       });
//       addDebugLog("📤 Emitted screen-share-stop to server");
//     } catch (emitError) {
//       addDebugLog(`⚠️ Error emitting screen-share-stop: ${emitError.message}`);
//     }
//   }

//   // Viewer screen share ka case (agar viewer ne share kiya hai)
//   if (activeScreenShare?.source === "viewer-screen") {
//     addDebugLog(`🖥️ Viewer screen share cleanup for user: ${activeScreenShare.userId}`);
    
//     // Server ko notify karen (viewer ka screen share stop ho raha hai)
//     if (socket) {
//       try {
//         socket.emit("screen-share-force-stop", {
//           sessionId: sessionId || roomCode,
//           targetUserId: activeScreenShare.userId
//         });
//         addDebugLog(`📤 Notified server to stop viewer screen share: ${activeScreenShare.userId}`);
//       } catch (emitError) {
//         addDebugLog(`⚠️ Error notifying server: ${emitError.message}`);
//       }
//     }
//   }

//   // ✅ Screen share ke baad main camera restore ensure karen
//   // Agar main mediaStream hai to video element mein set karen
//   setTimeout(() => {
//     if (videoRef.current && mediaStream && !videoRef.current.srcObject) {
//       try {
//         videoRef.current.srcObject = mediaStream;
//         videoRef.current.play().catch(err => {
//           console.warn("Autoplay prevented after screen share:", err);
//         });
//         addDebugLog("✅ Main camera restored after screen share");
//       } catch (restoreError) {
//         addDebugLog(`⚠️ Error restoring main camera: ${restoreError.message}`);
//       }
//     }
//   }, 100);

//   // Toast notification
//   const toastMessage = isRecording 
//     ? 'Screen share & recording stopped' 
//     : 'Screen share stopped';
    
//   toast.success(toastMessage, {
//     position: "bottom-right",
//     autoClose: 3000,
//   });

//   addDebugLog("✅ Screen share fully stopped");

// }, [
//   isRecording, 
//   socket, 
//   sessionId, 
//   roomCode, 
//   user, 
//   activeScreenShare,
//   recorder,           // ✅ Added for recording control
//   recordingStream,    // ✅ Added for recording cleanup
//   stopRecordingTimer, // ✅ Added for timer control
//   mediaStream         // ✅ Added for camera restoration
// ]);


// const handleRecordingToggle = async () => {
//   if (isRecordingLoading || isRecordingStopping) {
//     toast.info('Recording operation is already in progress. Please wait...');
//     return;
//   }

//   if (!isRecording) {
//     await startRecording();
//   } else {
//     await stopRecording();
//   }
// };


// const startRecording = async () => {
//   try {
//     setIsRecordingLoading(true);
    
//     // Agar active screen share hai to usi se record karen
//     if (activeScreenShare?.stream) {
//       addDebugLog(`📺 Recording from existing screen share: ${activeScreenShare.userName}`);
//       await startRecordingFromScreenShare(activeScreenShare.stream);
//     } else {
//       // Naya screen share se record karen
//       addDebugLog('🎬 Starting new screen recording...');
//       await startNewScreenShareWithRecording();
//     }
    
//   } catch (error) {
//     console.error('Failed to start recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startRecordingFromScreenShare = async (screenShareStream) => {
//   try {
//     setIsRecordingLoading(true);

//     // 1. Get Streamer Mic
//     let currentMicStream = null;
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       currentMicStream = mediaStream;
//     } else {
//       // Agar mic nahi hai to request karein
//       try {
//         currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       } catch (e) {
//         console.warn("Mic not found for recording");
//       }
//     }

//     // 2. 🔥 Get Mixed Audio (Streamer + Screen + Viewers)
//     const mixedAudioTrack = getMixedAudioStream(screenShareStream, currentMicStream);

//     // 3. Prepare Recording Stream
//     const recordingStream = new MediaStream();

//     // Add Video
//     const videoTrack = screenShareStream.getVideoTracks()[0];
    
//     // ✅ ORIGINAL SCREEN VIDEO TRACK PE CONTENT HINT
//     if (videoTrack && 'contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion';
//       addDebugLog("🎬 Screen video: Applied contentHint 'motion' for recording");
//     }
    
//     if (videoTrack) {
//       // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//       recordingStream.addTrack(videoTrack); // ✅ Original track
//     }

//     // ✅ SCREEN AUDIO TRACK PE OPTIMIZATION (if exists)
//     const screenAudioTrack = screenShareStream.getAudioTracks()[0];
//     if (screenAudioTrack && 'contentHint' in screenAudioTrack) {
//       screenAudioTrack.contentHint = 'music';
//       addDebugLog("🎬 Screen audio: Applied contentHint 'music' for recording");
//     }

//     // Add Mixed Audio
//     if (mixedAudioTrack) {
//       recordingStream.addTrack(mixedAudioTrack);
//     } else if (currentMicStream) {
//       // Fallback agar mixing fail hui
//       const micAudioTrack = currentMicStream.getAudioTracks()[0];
//       if (micAudioTrack) {
//         // ✅ MIC AUDIO TRACK PE OPTIMIZATION
//         if ('contentHint' in micAudioTrack) {
//           micAudioTrack.contentHint = 'speech';
//           addDebugLog("🎬 Mic audio: Applied contentHint 'speech' for recording");
//         }
//         recordingStream.addTrack(micAudioTrack);
//       }
//     }

//     // 4. Start Recording
//     startMediaRecorder(recordingStream, screenShareStream, null);

//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Recording Started (All Audio Included)!');

//   } catch (error) {
//     console.error('Error starting recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecordingLoading(false);
//   }
// };

// const startNewScreenShareWithRecording = async () => {
//   try {
//     // 1. Screen Share Stream Start karein
//     const screenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         frameRate: { ideal: 60, max: 60 },
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//       audio: true, // System audio capture karne ke liye
//     });

//     // 2. Microphone Audio Setup (CRITICAL FIX FOR BLACK CAMERA)
//     let micTrack = null;

//     // Check karein agar main mediaStream (Camera+Mic) already chal raha hai
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       addDebugLog('🎤 Using existing microphone track for recording');
      
//       // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//       micTrack = mediaStream.getAudioTracks()[0];
      
//     } else {
//       // Agar mic pehle se on nahi hai, tabhi naya request karein
//       try {
//         addDebugLog('🎤 Requesting new microphone permission');
//         const micStream = await navigator.mediaDevices.getUserMedia({
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//           },
//         });
//         micTrack = micStream.getAudioTracks()[0];
//       } catch (micError) {
//         addDebugLog('⚠️ Mic permission denied or not available for recording');
//       }
//     }

//     // 3. Participants ke liye Screen Share setup karein (Updated version without cloning)
//     if (user?.role === 'streamer' || !user?.role) {
//       try {
//         await startScreenShareForParticipants(screenStream);
//       } catch (shareError) {
//         addDebugLog('⚠️ Could not share with participants, but recording will continue');
//       }
//     }

//     // 4. Recording ke liye Final Stream banayein
//     const recordingStream = new MediaStream();

//     // Screen Video add karein (Original tracks)
//     screenStream.getVideoTracks().forEach(track => recordingStream.addTrack(track));
    
//     // Screen Audio add karein (Original tracks)
//     screenStream.getAudioTracks().forEach(track => recordingStream.addTrack(track));

//     // Mic Audio add karein (Original track)
//     if (micTrack) {
//       recordingStream.addTrack(micTrack);
//     }

//     // 5. Recording Start Karein
//     startMediaRecorder(recordingStream, screenStream, null);

//     // State Updates
//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Screen recording started! (Camera remains visible)');

//     // 6. Handle Stop (Jab user "Stop Sharing" click kare browser mein)
//     screenStream.getVideoTracks()[0].onended = () => {
//       addDebugLog('🖥️ Screen share ended by system UI');
//       stopRecording();
      
//       // Agar streamer share kar raha tha, to socket se bhi stop karein
//       if (activeScreenShare?.source === "streamer") {
//         stopScreenShare();
//       }
      
//       // Mic track cleanup
//       if (micTrack && micTrack.readyState === 'live') {
//         micTrack.stop();
//       }
//     };

//   } catch (error) {
//     console.error('Error starting new screen share with recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startScreenShareForParticipants = async (screenStream) => {
//   if (!sendTransportRef.current || !user) return;
  
//   try {
//     // ✅ DIRECT TRACK - NO CLONING
//     const videoTrack = screenStream.getVideoTracks()[0];
//     if (!videoTrack) return;
    
//     // ✅ ORIGINAL TRACK PE HI CONTENT HINT LAGAO
//     if ('contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion';
//       addDebugLog("✅ Screen video track: Applied contentHint 'motion'");
//     }
    
//     // ✅ USE ORIGINAL TRACK DIRECTLY - NO CLONING
//     const videoProducer = await sendTransportRef.current.produce({
//       track: videoTrack, // ✅ Original track directly
//       appData: {
//         source: "screen",
//         userId: user.id,
//         userName: user.name || "Streamer",
//       },
//     });

//     addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);
    
//     // Audio track भी direct - NO CLONING
//     const audioTrack = screenStream.getAudioTracks()[0];
//     if (audioTrack) {
//       // ✅ ORIGINAL AUDIO TRACK PE HI OPTIMIZATION
//       if ('contentHint' in audioTrack) {
//         audioTrack.contentHint = 'music';
//         addDebugLog("✅ Screen audio track: Applied contentHint 'music'");
//       }
      
//       // ✅ USE ORIGINAL AUDIO TRACK DIRECTLY - NO CLONING
//       const audioProducer = await sendTransportRef.current.produce({
//         track: audioTrack, // ✅ Original track directly
//         appData: {
//           source: "screen-audio",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });
      
//       addDebugLog(`✅ Screen share audio producer created: ${audioProducer.id}`);
//     }

//     // ✅ Screen share stream के लिए original stream ही use करें
//     // No need to create new MediaStream - use the existing one
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenStream, // ✅ Original stream directly
//       source: "streamer",
//     });

//     // Notify server
//     if (socket) {
//       socket.emit("screen-share-started", {
//         sessionId: sessionId || roomCode,
//         userId: user.id,
//         userName: user.name || "Streamer",
//         hasAudio: !!audioTrack,
//         source: "screen",
//       });
//     }
    
//   } catch (error) {
//     console.error('Error sharing screen with participants:', error);
//     // Recording continue rahegi, bas sharing fail hua
//   }
// };

// const startMediaRecorder = (recordingStream, screenStream, micStream_UNUSED) => {
//   try {
//     const videoTrack = recordingStream.getVideoTracks()[0];

//     // ✅ 1. GPU Acceleration Preference
//     // H.264 (Hardware Accelerated) -> VP8 (CPU Light) -> VP9 (CPU Heavy)
//     const mimeTypes = [
//       'video/webm;codecs=h264,opus', // 🚀 BEST: Uses GPU (Intel/Nvidia/Mobile)
//       'video/webm;codecs=vp8,opus',  // Good Balance
//       'video/webm'                   // Fallback
//     ];

//     let selectedMimeType = '';
//     for (const mime of mimeTypes) {
//       if (MediaRecorder.isTypeSupported(mime)) {
//         selectedMimeType = mime;
//         console.log(`✅ GPU Optimization: Using Codec ${mime}`);
//         break;
//       }
//     }

//     // ✅ 2. Optimized Bitrate (2.5 Mbps is enough for 720p)
//     const options = {
//       mimeType: selectedMimeType || 'video/webm',
//       videoBitsPerSecond: 2500000, 
//       audioBitsPerSecond: 128000,
//     };

//     // ✅ 3. Lock Resolution & FPS (Crucial for performance)
//     if (videoTrack) {
//       try {
//         videoTrack.applyConstraints({
//           frameRate: { ideal: 60, max: 70 }, // 60fps causes lag, use 30
//           width: { ideal: 1280, max: 1920 }, // 720p is efficient
//           height: { ideal: 720, max: 1080 },
//           resizeMode: "crop-and-scale"
//         });
//       } catch (e) {
//         console.warn('Constraint error:', e);
//       }
//     }

//     const mediaRecorder = new MediaRecorder(recordingStream, options);
//     const chunks = [];
//     setRecordingChunks(chunks);

//     mediaRecorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         chunks.push(event.data);
//         setRecordingChunks((prev) => [...prev, event.data]);
//       }
//     };

//     mediaRecorder.onstop = async () => {
//         // ... (Apka purana save logic yahan same rahega) ...
//         const blob = new Blob(chunks, { type: 'video/webm' });
//         await uploadRecordingToServer(blob);
        
//         if (recordingStream) {
//             recordingStream.getTracks().forEach(track => track.stop());
//         }
//         setRecordingStream(null);
//         setRecordingChunks([]);
//         setIsRecordingStopping(false);
//         addDebugLog(`✅ Recording saved using ${selectedMimeType}`);
//     };

//     mediaRecorder.onerror = (error) => {
//       console.error('MediaRecorder error:', error);
//       toast.error('Recording failed');
//       setIsRecording(false);
//       stopRecordingTimer();
//     };

//     // ✅ 4. TimeSlice = 2000ms (Relaxes the CPU)
//     mediaRecorder.start(2000);
//     setRecorder(mediaRecorder);

//   } catch (error) {
//     console.error("Failed to start recorder:", error);
//     toast.error("Recording failed to start");
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };
// const stopRecording = useCallback(() => {
//   if (!recorder || recorder.state === 'inactive') return;

//   try {
//     addDebugLog('⏹️ Stopping recording...');
//     setIsRecordingStopping(true);
    
//     if (recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     stopRecordingTimer();
    
//     // Cleanup Recording Stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//       setRecordingStream(null);
//     }

//     // 🔥 CLEANUP AUDIO MIXER (Ye naya part hai)
//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//       audioContextRef.current = null;
//       audioDestinationRef.current = null;
//       addDebugLog("🧹 Audio Mixer Cleaned Up");
//     }

//     toast.info('Processing recording...');
//      stopScreenShare()
    
//   } catch (error) {
//     console.error('Error stopping:', error);
//   }
// }, [recorder, recordingStream, stopRecordingTimer]);

// const uploadRecordingToServer = async (blob) => {
//   try {
//     addDebugLog('📤 Uploading recording to backend (NEW API)...');
    
//     // ✅ Generate filename with session info
//     const fileName = `recording_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    
//     // ✅ Step 1: Get pre-signed URL from NEW API
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       blob.type,
//       blob.size
//     );
    
//     if (!presignedData?.uploadUrl) {
//       throw new Error('Failed to get upload URL from new API');
//     }
    
//     addDebugLog(`📁 Uploading to S3: ${fileName} (${formatFileSize(blob.size)})`);
    
//     // ✅ Step 2: Upload to S3 using presigned URL
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': blob.type,
//       },
//       body: blob,
//     });
    
//     if (!uploadResponse.ok) {
//       const errorText = await uploadResponse.text();
//       throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
//     }
    
//     addDebugLog('✅ Recording uploaded to S3 successfully');
    
//     // ✅ Step 3: Save recording metadata to NEW API
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: blob.type,
//       duration: recordingTimer,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey || presignedData.fileUrl,
//       thumbnailUrl: '', // You can add thumbnail generation later
//       recordingTitle: `Recording ${new Date().toLocaleDateString()}`,
//       description: `Recording of session ${sessionId}`,
//       recordedAt: new Date().toISOString()
//     };
    
//     const saveResponse = await saveRecordingMetadata(sessionId, saveData);
    
//     if (saveResponse.success) {
//       addDebugLog(`✅ Recording saved to database via new API: ${fileName}`);
      
//       // Get the recording ID from response
//       const recordingId = saveResponse.data?.recording?._id || 
//                          saveResponse.data?.id || 
//                          Date.now().toString();
      
//       toast.success(`🎉 Recording saved successfully! (${formatRecordingTime(recordingTimer)})`);
      
//       // Emit socket event
//       const socket = getSocket();
//       if (socket) {
//         socket.emit('recording_completed', {
//           sessionId,
//           recording: {
//             ...saveData,
//             id: recordingId
//           }
//         });
//       }
      
//       // ✅ Reset states
//       setIsRecording(false);
//       setRecorder(null);
//       setRecordedBlob(null);
//       resetRecordingTimer();
      
//       return { success: true, recordingId };
      
//     } else {
//       throw new Error('Failed to save recording metadata via new API');
//     }
    
//   } catch (error) {
//     console.error('❌ Recording upload error:', error);
    
//     // Try local fallback
//     try {
//       addDebugLog('⚠️ Upload failed, attempting local save...');
//       const localSuccess = saveRecordingLocally(blob);
//       if (localSuccess) {
//         toast.warning('Recording saved locally (backend upload failed)');
//         return { success: false, savedLocally: true };
//       } else {
//         toast.error('Failed to save recording anywhere');
//         return { success: false, savedLocally: false };
//       }
//     } catch (localError) {
//       console.error('Local save error:', localError);
//       toast.error('Failed to save recording anywhere');
//       return { success: false, savedLocally: false };
//     }
//   } finally {
//     setIsRecordingStopping(false);
//   }
// };
// // Helper function for local fallback
// const saveRecordingLocally = (blob) => {
//   try {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     const fileName = `recording_${sessionId}_${Date.now()}.webm`;
    
//     a.href = url;
//     a.download = fileName;
//     a.style.display = 'none';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Cleanup
//     setTimeout(() => {
//       URL.revokeObjectURL(url);
//     }, 1000);
    
//     return true;
//   } catch (error) {
//     console.error('Local save error:', error);
//     return false;
//   }
// };

// // Format file size helper
// const formatFileSize = (bytes) => {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// };

// // Cleanup on component unmount
// useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup media tracks
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // Cleanup window tracks
//     if (window.recordingTracks) {
//       window.recordingTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       window.recordingTracks = null;
//     }
//   };
// }, []);


// const getMixedAudioStream = (screenStream, micStream) => {
//   try {
//     addDebugLog("🎚️ Starting Audio Mixing...");
    
//     // 1. Create Audio Context
//     const AudioContext = window.AudioContext || window.webkitAudioContext;
//     const audioContext = new AudioContext();
//     const destination = audioContext.createMediaStreamDestination();

//     // Refs mein save karein (Cleanup ke liye)
//     audioContextRef.current = audioContext;
//     audioDestinationRef.current = destination;

//     // 2. Add Streamer Mic 🎤
//     if (micStream && micStream.getAudioTracks().length > 0) {
//       const micSource = audioContext.createMediaStreamSource(micStream);
//       // Optional: Volume Boost for Streamer
//       const gainNode = audioContext.createGain();
//       gainNode.gain.value = 1.0; 
//       micSource.connect(gainNode).connect(destination);
//       addDebugLog("✅ Streamer Mic mixed");
//     }

//     // 3. Add Screen Audio 🖥️
//     if (screenStream && screenStream.getAudioTracks().length > 0) {
//       const screenSource = audioContext.createMediaStreamSource(screenStream);
//       screenSource.connect(destination);
//       addDebugLog("✅ Screen Audio mixed");
//     }

//     // 4. Add All Existing Viewers 👥
//     viewerAudiosRef.current.forEach((stream, userId) => {
//       if (stream.getAudioTracks().length > 0) {
//         try {
//           const viewerSource = audioContext.createMediaStreamSource(stream);
//           viewerSource.connect(destination);
//           addDebugLog(`✅ Viewer ${userId} mixed`);
//         } catch (err) {
//           console.warn(`Could not mix viewer ${userId}`, err);
//         }
//       }
//     });

//     return destination.stream.getAudioTracks()[0]; // Mixed Track

//   } catch (error) {
//     console.error("Audio mixing failed:", error);
//     return null;
//   }
// };

//   const handleClose = () => {
//     setShowRecorder(false);
//     setIsRecording(false);
//   };

// // Permission check useEffect ko update karo
// useEffect(() => {
//   const checkPermissions = async () => {
//     try {
//       addDebugLog('🔍 Checking camera and microphone permissions...');
//       setPermissionStatus('checking');
      
//       // Mobile devices ke liye direct request karo
//       if (isMobile) {
//         addDebugLog('📱 Mobile device detected, requesting permissions directly...');
//         await initializeCamera();
//         return;
//       }
      
//       // Desktop ke liye existing logic
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//       const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
      
//       if (hasVideoPermission && hasAudioPermission) {
//         addDebugLog('✅ Camera and microphone permissions already granted');
//         setPermissionStatus('granted');
//         initializeCamera();
//       } else {
//         addDebugLog('ℹ️ Need to request camera/microphone permissions');
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     } catch (error) {
//       console.error('Error checking permissions:', error);
//       addDebugLog(`❌ Error checking permissions: ${error.message}`);
//       setPermissionStatus('denied');
//       setIsLoading(false);
//     }
//   };

//   checkPermissions();
// }, [isMobile]); // isMobile add karo dependency

// useEffect(() => {
//   if (activeScreenShare?.stream) {
//     // Check if not already zoomed on this screen
//     if (!zoomed || zoomed.userId !== activeScreenShare.userId) {
//       addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
      
//       setZoomed({
//         type: "screen",
//         stream: activeScreenShare.stream,
//         userId: activeScreenShare.userId
//       });
//     }
//   }
// }, [activeScreenShare]);

// useEffect(() => {
//   const resumeAll = () => {
//     document.querySelectorAll("audio").forEach((el) => {
//       el.play().catch(() => {});
//     });
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };

//   document.addEventListener("click", resumeAll, { once: true });
//   document.addEventListener("touchstart", resumeAll, { once: true });

//   return () => {
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };
// }, []);


// useEffect(() => {
//   const checkOrientation = () => {
//     // Check if mobile and landscape
//     const isLandscapeMode = window.innerWidth > window.innerHeight;
//     setIsLandscape(isLandscapeMode);
    
//     if (isMobile) {
//       addDebugLog(`📱 Mobile orientation: ${isLandscapeMode ? 'Landscape' : 'Portrait'} (${window.innerWidth}x${window.innerHeight})`);
//     }
//   };

//   // Initial check
//   checkOrientation();

//   // Listen for orientation changes
//   window.addEventListener('resize', checkOrientation);
//   window.addEventListener('orientationchange', checkOrientation);

//   return () => {
//     window.removeEventListener('resize', checkOrientation);
//     window.removeEventListener('orientationchange', checkOrientation);
//   };
// }, [isMobile]);
// useEffect(() => {
//   const handleFirstUserInteraction = () => {
//     addDebugLog('🎵 User interaction detected - enabling all audio');
//     setUserInteracted(true);
//     setShowAudioPermissionModal(false);
//     playAllAudio();
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
//   if (!userInteracted) {
//     document.addEventListener('click', handleFirstUserInteraction, { once: true });
//     document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   }
//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
// }, [userInteracted]);

//   useEffect(() => {
//     viewerAudios.forEach((stream, userId) => {
//       let audioEl = document.getElementById(`viewer-audio-${userId}`);
//       if (!audioEl) {
//         audioEl = document.createElement("audio");
//         audioEl.id = `viewer-audio-${userId}`;
//         audioEl.autoplay = true;
//         audioEl.playsInline = true;
//         audioEl.controls = false;
//         document.body.appendChild(audioEl);
//       }
//       audioEl.srcObject = stream;
//       audioEl.play().catch(err => {
//         console.warn(`Autoplay prevented for ${userId}, waiting for user gesture`, err);
//       });
//     });
//   }, [viewerAudios]);

  
// const openRemoveAudioModal = (participant) => {
//   setAudioRemoveTarget(participant);
// };

// const confirmRemoveAudio = () => {
//   if (audioRemoveTarget) {
//     handleMuteViewerAudio(audioRemoveTarget.socketId);
//     setAudioRemoveTarget(null);
//   }
// }; 
//   const handleNewViewerScreenProducer = useCallback((data) => {
//     addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
//     const socket = getSocket();
//     if (socket) {
//       createConsumer(sessionId || roomCode, data.producerId, data.kind);
//     } else {
//       addDebugLog('❌ Cannot create consumer: Socket not available');
//     }
//   }, [sessionId, roomCode]);

//   const handleViewerAudioPermissionGranted = useCallback((data) => {
//     addDebugLog(`Viewer audio permission granted: ${data.userId}`);
//     const socket = getSocket();
//     if (socket && data.userId !== user?.id) {
//       createConsumer(sessionId || roomCode, data.producerId, 'audio');
//     }
//   }, [sessionId, roomCode, user]);

//   const handleViewerAudioRequest = useCallback((data) => {
//     addDebugLog(`Viewer audio request from: ${data.requestedUserId}`);
//     setViewerAudioRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

// const playAllAudio = () => {
//   addDebugLog('🔊 Playing all audio elements...');
//   setTimeout(() => {
//     // Play all existing audio elements
//     audioElementsRef.current.forEach((audioEl, userId) => {
//       if (audioEl.paused && audioEl.srcObject) {
//         audioEl.play().catch(err => {
//           // Log but don't worry about autoplay errors
//           if (err.name !== 'NotAllowedError') {
//             addDebugLog(`⚠️ Failed to play audio for ${userId}: ${err.message}`);
//           }
//         });
//       }
//     });
//     pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
//       createAndPlayAudioElement(userId, streamInfo.audioStream, streamInfo.userName);
//     });

//     // Clear pending queue
//     pendingAudioQueueRef.current.clear();
//     setPendingAudioStreams(new Map());
    
//     addDebugLog('✅ All audio processing completed');
//   }, 200);
// };

// const createAndPlayAudioElement = (userId, audioStream, userName) => {
//   try {
//     let audioEl = document.getElementById(`viewer-audio-${userId}`);
//         if (audioEl) {
//       // Agar same stream already hai to kuch nahi karo
//       if (audioEl.srcObject === audioStream) {
//         addDebugLog(`✅ Audio already playing for user ${userId}`);
//         return audioEl;
//       }
      
//       // Old stream ko stop karo
//       if (audioEl.srcObject) {
//         audioEl.srcObject.getTracks().forEach(track => track.stop());
//       }
//       audioEl.pause();
//       audioEl.srcObject = null;
//     } else {
//       // Naya audio element create karo
//       audioEl = document.createElement("audio");
//       audioEl.id = `viewer-audio-${userId}`;
//       audioEl.playsInline = true;
//       audioEl.controls = false;
//       audioEl.muted = false;
//       audioEl.setAttribute('data-user-id', userId);
//       audioEl.setAttribute('data-user-name', userName);
//       document.body.appendChild(audioEl);
//     }
//     audioEl.srcObject = audioStream;
//         const playAudio = () => {
//       if (audioEl.paused) {
//         audioEl.play()
//           .then(() => {
//             addDebugLog(`✅ Audio playing for user ${userId}`);
//           })
//           .catch(error => {
//             // Agar play fail ho jaye to retry after short delay
//             if (error.name === 'NotAllowedError') {
//               addDebugLog(`⚠️ Audio play blocked for ${userId}, waiting for user gesture`);
//               // User interaction ke baad automatically play hoga
//             } else {
//               console.warn(`Audio play failed for ${userId}:`, error);
//               // Retry after 500ms
//               setTimeout(() => {
//                 if (audioEl.srcObject === audioStream && audioEl.paused) {
//                   audioEl.play().catch(e => {
//                     addDebugLog(`❌ Retry also failed for ${userId}: ${e.message}`);
//                   });
//                 }
//               }, 500);
//             }
//           });
//       }
//     };
//     if (userInteracted) {
//       // Small delay to avoid race condition
//       setTimeout(playAudio, 100);
//     }
//     audioElementsRef.current.set(userId, audioEl);
//     viewerAudiosRef.current.set(userId, audioStream);
//         setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.set(userId, audioStream);
//       return newMap;
//     });
//     addDebugLog(`🎤 Audio element ready for user ${userId}`);
//     return audioEl;
//   } catch (err) {
//     addDebugLog(`❌ Error creating audio element: ${err?.message || err}`);
//     return null;
//   }
// };
// const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
//   const audioStream = new MediaStream([audioTrack]);
//   const userId = producerInfo.userId;
//   const userName = producerInfo.userName || `User ${userId}`;
//   addDebugLog(`🎵 New audio consumer: ${userId} (${sourceType})`);
//   const existingAudioEl = audioElementsRef.current.get(userId);
//   if (existingAudioEl && existingAudioEl.srcObject === audioStream) {
//     addDebugLog(`⏩ Already have same audio stream for ${userId}, skipping`);
//     return;
//   }

//   if (userInteracted) {
//     createAndPlayAudioElement(userId, audioStream, userName);
//   } else {
//     pendingAudioQueueRef.current.set(userId, {
//       userId,
//       userName,
//       audioStream,
//       sourceType,
//       producerInfo,
//       timestamp: Date.now()
//     });
    
//     setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    
//     // Show permission modal if not already shown
//     if (!showAudioPermissionModal) {
//       setShowAudioPermissionModal(true);
//     }
    
//     addDebugLog(`⏳ Audio queued for user interaction: ${userName}`);

//     if (isRecording && audioContextRef.current && audioDestinationRef.current) {
//     try {
//       const newStream = new MediaStream([audioTrack]);
//       const newSource = audioContextRef.current.createMediaStreamSource(newStream);
//       newSource.connect(audioDestinationRef.current);
//       addDebugLog(`➕ New viewer ${producerInfo.userId} added to active recording`);
//     } catch (err) {
//       console.warn("Failed to add new viewer to recording mix", err);
//     }
//   }
//   }
// };
// const handleEnableAudio = () => {
//   addDebugLog('🎵 User manually enabled audio');
//   setUserInteracted(true);
//   setShowAudioPermissionModal(false);
  
//   // Small delay to ensure state update
//   setTimeout(() => {
//     playAllAudio();
//   }, 100);
// };

//   const handleScreenShareRequest = useCallback((data) => {
//     addDebugLog(`Screen share request from: ${data.requestedUserId}`);
//     setScreenShareRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

//   const handleViewerAudioStarted = useCallback((data) => {
//     addDebugLog(`Viewer audio started: ${data.userId}`);
//     setActiveViewerAudio(prev => new Map(prev).set(data.socketId, {
//       userId: data.userId,
//       socketId: data.socketId,
//       producerId: data.producerId
//     }));
//   }, []);

//   const handleViewerAudioMuted = useCallback((data) => {
//     addDebugLog(`Viewer audio muted: ${data.userId}`);
//     setActiveViewerAudio(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(data.socketId);
//       return newMap;
//     });
//   }, []);

//  // ✅ Viewer screen share started handler
// const handleScreenShareStarted = useCallback((data) => {
//   addDebugLog(`Screen share started by viewer: ${data.userId}`);

//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer") return prev;
//     return {
//       userId: data.userId,
//       userName: data.userName,
//       stream: null, // stream consumer banne ke baad attach hoga
//       source: "viewer-screen"
//     };
//   });
// }, [addDebugLog]);


// const handleScreenShareStopped = useCallback((data) => {
//   addDebugLog(
//     `🛑 Screen share stopped by viewer: ${data.userId}, source: ${data.source}`
//   );

//   // ✅ Reset zoom if same user's screen was zoomed
//   setZoomed((prev) => {
//     if (prev && prev.type === "screen" && prev.userId === data.userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped user: ${data.userId}`);
//       return null;
//     }
//     return prev;
//   });

//   // ✅ Forcefully clear active screen share
//   setActiveScreenShare((prev) => {
//     if (prev && prev.stream) {
//       try {
//         prev.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }
//     addDebugLog(`✅ Forced reset of active screen share (viewer: ${data.userId})`);
//     return null;
//   });
// }, [screenRef]);

//   const handleStopViewerScreenShare = useCallback((targetUserId) => {
//     emitSocketEvent('screen-share-force-stop', {
//       sessionId: sessionId || roomCode,
//       targetUserId
//     });
//     addDebugLog(`Stopped screen share for user: ${targetUserId}`);
//   }, [sessionId, roomCode]);

//   const handleViewerAudioResponse = useCallback((requesterSocketId, allow) => {
//     emitSocketEvent('viewer-audio-response', {
//       sessionId: sessionId || roomCode,
//       requesterSocketId,
//       allow
//     });
    
//     setViewerAudioRequests(prev => 
//       prev.filter(req => req.requesterSocketId !== requesterSocketId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed audio for viewer: ${requesterSocketId}`);
//     } else {
//       addDebugLog(`Denied audio for viewer: ${requesterSocketId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleScreenShareResponse = useCallback((requesterUserId, allow) => {
//     emitSocketEvent('screen-share-response', {
//       sessionId: sessionId || roomCode,
//       requesterUserId,
//       allow
//     });
    
//     setScreenShareRequests(prev => 
//       prev.filter(req => req.requestedUserId !== requesterUserId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed screen share for viewer: ${requesterUserId}`);
//     } else {
//       addDebugLog(`Denied screen share for viewer: ${requesterUserId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleMuteViewerAudio = useCallback((targetSocketId) => {
//     emitSocketEvent('streamer-stop-viewer-audio', {
//   sessionId: sessionId || roomCode,
//   targetSocketId
// });

//     addDebugLog(`Muted viewer audio: ${targetSocketId}`);
//   }, [sessionId, roomCode]);

//   const handleBanParticipant = useCallback((userId) => {
//     emitSocketEvent('ban-participant', {
//       sessionId: sessionId || roomCode,
//       userId
//     });
//     addDebugLog(`Banned participant: ${userId}`);
//   }, [sessionId, roomCode]);


// const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
//   try {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog("❌ No socket available for creating consumer");
//       return;
//     }

//     addDebugLog(`🎯 Creating consumer for producer: ${producerId}`);

//     // Skip if already have consumer
//     const existingConsumer = Array.from(consumers.current.values()).find(
//       (c) => c.producerId === producerId
//     );
//     if (existingConsumer) {
//       addDebugLog(`⚠️ Already have consumer for producer ${producerId}, skipping`);
//       return;
//     }

//     socket.emit(
//       "getProducerInfo",
//       { sessionId: currentSessionId, producerId },
//       async (info) => {
//         if (!info) {
//           addDebugLog(`❌ No producer info for producer: ${producerId}`);
//           return;
//         }

//         addDebugLog(
//           `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}`
//         );

//         // ✅ DEBUG LOG - देखें क्या info आ रहा है
//         console.log("PRODUCER INFO RECEIVED:", {
//           producerId,
//           source: info.source,
//           userId: info.userId,
//           userName: info.userName,
//           currentUser: user?.id
//         });
//         const isViewerScreenAudio = info.source === "viewer-screen-audio";
//         const isViewerMic = info.source === "viewer-mic";
//         const isViewerSource = isViewerScreenAudio || isViewerMic;
//         if (isViewerSource) {
//           addDebugLog(`🎤 Processing viewer audio (${info.source}) from user ${info.userId}`);
//         } else {
//           // अन्य sources के लिए self check करें
//           const isSelfProducer = info.userId?.toString() === user?.id?.toString();
//           const isStreamerAudio = info.source === 'streamer-mic' || info.source === 'mic' || info.source === 'screen-audio';
//           const isStreamerCamera = info.source === 'streamer-camera' || info.source === 'camera';
          
//           if (isSelfProducer) {
//             addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
//             return;
//           }
//           if ((isStreamerAudio || isStreamerCamera) && isSelfProducer) {
//             addDebugLog(`⏩ Skipping streamer media: ${info.source}`);
//             return;
//           }
//         }

//         // store producer state
//         setProducersState((prev) =>
//           new Map(prev).set(producerId, {
//             id: producerId,
//             kind: info.kind,
//             userId: info.userId,
//             userName: info.userName,
//             source: info.source || "camera",
//             paused: false,
//           })
//         );

//         if (!transportId && recvTransportRef.current)
//           transportId = recvTransportRef.current.id;
//         if (!transportId) {
//           addDebugLog("❌ No recv transport available for consumer");
//           return;
//         }

//         socket.emit(
//           "consume",
//           {
//             sessionId: currentSessionId,
//             transportId,
//             producerId,
//             rtpCapabilities: device.rtpCapabilities,
//           },
//           async (response) => {
//             if (response.error || !response.params) {
//               addDebugLog(`❌ Failed to consume: ${response.error}`);
//               return;
//             }

//             const consumerParams = response.params;
//             const transport = transports.current.get(transportId);
//             if (!transport) {
//               addDebugLog(`❌ No transport found for ID: ${transportId}`);
//               return;
//             }

//             try {
//               const consumer = await transport.consume({
//                 id: consumerParams.id,
//                 producerId: consumerParams.producerId,
//                 kind: consumerParams.kind,
//                 rtpParameters: consumerParams.rtpParameters,
//                 appData: { 
//                   source: info.source || "camera",
//                   userId: info.userId,
//                   userName: info.userName
//                 },
//               });

//               consumers.current.set(consumer.id, consumer);
//               addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source})`);

//               // ✅ DEBUG: consumer details
//               console.log("CONSUMER CREATED:", {
//                 id: consumer.id,
//                 kind: consumer.kind,
//                 source: info.source,
//                 track: consumer.track ? "Has track" : "No track",
//                 trackKind: consumer.track?.kind,
//                 trackReadyState: consumer.track?.readyState
//               });

//               // === Handle sources ===
//               if (consumer.track) {
//                 if (info.source === "screen" || info.source === "viewer-screen") {
//                   // 🔹 Screen share VIDEO
//                   const screenStream = new MediaStream([consumer.track]);
//                   setActiveScreenShare({
//                     userId: info.userId,
//                     userName: info.userName || (info.source === "screen" ? "Streamer" : "Viewer"),
//                     stream: screenStream,
//                     source: info.source,
//                   });
//                   addDebugLog(`🖥️ Active screen set (${info.source})`);

//                 } else if (info.source === "viewer-screen-audio") {
//                   // 🔹 Screen share AUDIO - Simplified permission system
//                   console.log("🎵 Handling viewer-screen-audio for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                  
//                 } else if (info.source === "viewer-mic") {
//                   // 🔹 Viewer MIC audio - Simplified permission system
//                   console.log("🎤 Handling viewer-mic for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-mic");
                  
//                 } else if (info.source === "viewer-camera") {
//                   // 🔹 Viewer camera
//                   try {
//                     const videoStream = new MediaStream([consumer.track]);
//                     setViewerCameras((prev) => {
//                       const newMap = new Map(prev);
//                       newMap.set(info.userId, videoStream);
//                       return newMap;
//                     });
//                     addDebugLog(`📷 Viewer camera stored for ${info.userId}`);
//                   } catch (err) {
//                     addDebugLog(`❌ Error storing viewer camera: ${err?.message || err}`);
//                   }

//                 } else if (consumer.track.kind === "video") {
//                   // Streamer video skip
//                   addDebugLog(`⏩ Skipping streamer video: ${info.source}`);

//                 } else if (consumer.track.kind === "audio") {
//                   // Streamer audio skip
//                   addDebugLog(`⏩ Skipping streamer audio: ${info.source}`);

//                 } else {
//                   addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
//                 }
//               } else {
//                 addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
//               }
//               socket.emit(
//                 "consumer-resume",
//                 { sessionId: currentSessionId, consumerId: consumer.id },
//                 (resumeResponse) => {
//                   if (resumeResponse?.success) {
//                     addDebugLog(`✅ Consumer ${consumer.id} resumed`);
//                   } else {
//                     addDebugLog(`❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error}`);
//                   }
//                 }
//               );
//             } catch (error) {
//               addDebugLog(`❌ Error creating consumer: ${error.message}`);
//               console.error("Consumer creation error:", error);
//             }
//           }
//         );
//       }
//     );
//   } catch (error) {
//     addDebugLog(`❌ Error in createConsumer: ${error.message}`);
//     console.error("createConsumer error:", error);
//   }
// };

// const cleanupViewerAudio = (userId) => {
//   addDebugLog(`🧹 Starting audio cleanup for user: ${userId}`);
//   if (pendingAudioQueueRef.current.has(userId)) {
//     const pendingStream = pendingAudioQueueRef.current.get(userId)?.audioStream;
//     if (pendingStream) {
//       try {
//         pendingStream.getTracks().forEach((t) => {
//           if (t.readyState === 'live') {
//             t.stop();
//             addDebugLog(`🛑 Stopped pending audio track: ${t.id}`);
//           }
//         });
//         addDebugLog(`🗑️ Stopped pending audio tracks for user: ${userId}`);
//       } catch (e) {
//         addDebugLog(`⚠️ Error stopping pending audio tracks: ${e.message}`);
//       }
//     }
//     pendingAudioQueueRef.current.delete(userId);
    
//     // Update pending streams state
//     setPendingAudioStreams(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });
    
//     addDebugLog(`✅ Removed from pending audio queue: ${userId}`);
//   }

//   const cleanupAudioElement = () => {
//     const audioEl = audioElementsRef.current.get(userId);
//     if (audioEl) {
//       try {
//         // Pause and clean up the audio element
//         if (!audioEl.paused) {
//           audioEl.pause();
//           addDebugLog(`⏸️ Paused audio element for user: ${userId}`);
//         }
        
//         // Clear srcObject and stop tracks if they exist
//         if (audioEl.srcObject) {
//           const stream = audioEl.srcObject;
//           stream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//               addDebugLog(`🛑 Stopped audio track: ${track.id}`);
//             }
//           });
//           audioEl.srcObject = null;
//         }
        
//         // Remove from DOM with delay to avoid race conditions
//         setTimeout(() => {
//           try {
//             if (audioEl.parentNode) {
//               audioEl.parentNode.removeChild(audioEl);
//               addDebugLog(`🗑️ Removed audio element from DOM for user: ${userId}`);
//             }
//           } catch (domError) {
//             addDebugLog(`⚠️ Error removing audio element from DOM: ${domError.message}`);
//           }
//         }, 100);
        
//       } catch (e) {
//         addDebugLog(`⚠️ Error in audio element cleanup: ${e.message}`);
//       }
      
//       // Remove from refs
//       audioElementsRef.current.delete(userId);
//     }
//   };

//   // ✅ Step 3: Clean up from viewerAudiosRef
//   const audioStream = viewerAudiosRef.current.get(userId);
//   if (audioStream) {
//     try {
//       audioStream.getTracks().forEach((t) => {
//         if (t.readyState === 'live') {
//           t.stop();
//           addDebugLog(`🛑 Stopped active audio track: ${t.id}`);
//         }
//       });
//     } catch (e) {
//       addDebugLog(`⚠️ Error stopping active audio stream: ${e.message}`);
//     }
//     viewerAudiosRef.current.delete(userId);
//   }

//   cleanupAudioElement();
//   setTimeout(() => {
//     const domAudioElements = document.querySelectorAll(`[data-user-id="${userId}"], #viewer-audio-${userId}`);
//     domAudioElements.forEach(el => {
//       try {
//         if (el.paused === false) {
//           el.pause();
//         }
//         if (el.srcObject) {
//           el.srcObject.getTracks().forEach(track => track.stop());
//           el.srcObject = null;
//         }
//         if (el.parentNode) {
//           el.parentNode.removeChild(el);
//           addDebugLog(`🗑️ Backup cleanup for audio element: ${userId}`);
//         }
//       } catch (e) {
//         addDebugLog(`⚠️ Error in backup DOM cleanup: ${e.message}`);
//       }
//     });
//   }, 200);

//   // ✅ Step 5: Remove screen share audio if exists
//   if (userId === activeScreenShare?.userId) {
//     setTimeout(() => {
//       const screenAudioElements = document.querySelectorAll(`[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`);
//       screenAudioElements.forEach(screenAudioEl => {
//         try {
//           screenAudioEl.pause();
//           screenAudioEl.srcObject = null;
//           if (screenAudioEl.parentNode) {
//             screenAudioEl.parentNode.removeChild(screenAudioEl);
//           }
//           addDebugLog(`🗑️ Cleaned up screen share audio for user: ${userId}`);
//         } catch (e) {
//           addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
//         }
//       });
//     }, 100);
//   }

//   // ✅ Step 6: Update viewerAudios state (with delay to ensure cleanup is done)
//   setTimeout(() => {
//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(userId)) {
//         newMap.delete(userId);
//         addDebugLog(`🔄 Removed from viewerAudios state: ${userId}`);
//       }
//       return newMap;
//     });

//     // ✅ Step 7: Check if we need to hide the audio modal
//     if (pendingAudioStreams.size === 0 && showAudioPermissionModal) {
//       setTimeout(() => {
//         setShowAudioPermissionModal(false);
//         addDebugLog(`🔕 No more pending audio - hiding modal`);
//       }, 300);
//     }

//     addDebugLog(`✅ Completed audio cleanup for user: ${userId}`);
//   }, 300);
// };

// const cleanupViewerCamera = (userId) => {
//   addDebugLog(`📷 Cleaning up camera for user: ${userId}`);
//     setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => {
//             if (track.kind === 'video') {
//               track.stop();
//             }
//           });
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });
// };

// const cleanupViewerMedia = (userId) => {
//   // 🖥️ Screen share cleanup
//   if (activeScreenShare?.userId === userId) {
//     if (activeScreenShare.stream) {
//       try {
//         activeScreenShare.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     setActiveScreenShare(null);

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }

//     addDebugLog(`🖥️ Viewer screen share stopped & cleaned for user: ${userId}`);
//   }

//   // 🎤 Audio cleanup
//   if (viewerAudiosRef.current.has(userId)) {
//     const stream = viewerAudiosRef.current.get(userId);
//     if (stream) {
//       try {
//         stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer audio tracks", e);
//       }
//     }
//     viewerAudiosRef.current.delete(userId);

//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });

//     addDebugLog(`🎤 Viewer audio stopped for user: ${userId}`);
//   }

//   setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => track.stop());
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });

//   addDebugLog(`✅ Fully cleaned up media for user: ${userId}`);
// };

// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);


// // ✅ Add this useEffect to handle Zoomed Video without flickering
// useEffect(() => {
//   if (zoomedVideoRef.current && zoomed?.stream) {
//     const videoEl = zoomedVideoRef.current;
    
//     // Only update if stream ID is different to prevent flickering
//     if (videoEl.srcObject?.id !== zoomed.stream.id) {
//       videoEl.srcObject = zoomed.stream;
//       videoEl.play().catch(e => console.warn("Zoomed video play error", e));
//     }
//   } else if (zoomedVideoRef.current && !zoomed) {
//     zoomedVideoRef.current.srcObject = null;
//   }
// }, [zoomed, zoomed?.stream?.id]); // Only runs when zoomed user/stream changes

//   const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-connect', {
//         sessionId: currentSessionId,
//         transportId,
//         dtlsParameters
//       }, (response) => {
//         if (response && response.success) {
//           resolve();
//         } else {
//           reject(new Error(response.error || 'Transport connect failed'));
//         }
//       });
//     });
//   };

//   const handleTransportProduce = (currentSessionId, transportId, kind, rtpParameters, appData) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-produce', {
//         sessionId: currentSessionId,
//         transportId,
//         kind,
//         rtpParameters,
//         appData,
//       }, (response) => {
//         if (response && response.id) {
//           resolve(response.id);
//         } else {
//           reject(new Error(response?.error || 'Produce failed'));
//         }
//       });
//     });
//   };

//   const handlePauseProducer = async (producerId) => {
//     emitSocketEvent('producer-pause', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: true });
//       }
//       return newState;
//     });
//   };

//   const handleResumeProducer = async (producerId) => {
//     emitSocketEvent('producer-resume', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: false });
//       }
//       return newState;
//     });
//   };

//   const handleCloseProducer = async (producerId) => {
//     emitSocketEvent('producer-close', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       newState.delete(producerId);
//       return newState;
//     });
    
//     producers.current.delete(producerId);
//   };

//   // ========== STREAMING CONTROL FUNCTIONS ==========
//   const startStreaming = async () => {
//     const socket = getSocket();
//     if (socket) {
//       const hasProducers = producers.current.size > 0;
      
//       if (hasProducers) {
//         addDebugLog('ℹ️ Producers already exist, resuming if paused...');
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.paused) {
//             handleResumeProducer(id);
//           }
//         });
//       } else {
//         addDebugLog('🔄 No producers found, initializing media...');
//         await initializeMedia(sessionId || roomCode, iceServers);
//       }
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_started' 
//       });
      
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
//     }
//   };

//   const pauseStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (!producer.paused) {
//           handlePauseProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'PAUSED', 
//         emitEvent: 'streamer_paused' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setIsStreamPaused(true);
//       setLocalPausedState(true);
      
//       if (videoRef.current && !videoRef.current.paused) {
//         videoRef.current.pause();
//       }
//     }
//   };

//   const resumeStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.paused) {
//           handleResumeProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_resumed' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }
//   };

//   const endStreaming = async () => {
//   if (window.confirm('Are you sure you want to end the session for all participants?')) {
    
//     // Agar recording chal rahi hai to pehle stop karen
//     if (isRecording) {
//       const stopSuccess = await stopRecordingAPI();
//       if (!stopSuccess) {
//         // Agar recording stop nahi hui to user ko confirm karen
//         const proceed = window.confirm('Recording stop failed. Still end session?');
//         if (!proceed) return;
//       }
//     }
    
//     // Phir session end karen
//     emitSocketEvent('streamer_control', { 
//       sessionId: sessionId || roomCode, 
//       status: 'ENDED', 
//       emitEvent: 'session_ended' 
//     });
//   }
// };

//  const toggleAudio = () => {
//   if (mediaStream) {
//     const audioTrack = mediaStream.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setAudioEnabled(audioTrack.enabled);

//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.source === 'mic') {
//           if (audioTrack.enabled) {
//             handleResumeProducer(id);
//           } else {
//             handlePauseProducer(id);
//           }
//         }
//       });

//       addDebugLog(`🎤 Streamer mic ${audioTrack.enabled ? "on" : "off"} (local playback muted)`);
//     }
//   }
// };

//   const toggleVideo = () => {
//     if (mediaStream) {
//       const videoTrack = mediaStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setVideoEnabled(videoTrack.enabled);
        
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.source === 'camera') {
//             if (videoTrack.enabled) {
//               handleResumeProducer(id);
//             } else {
//               handlePauseProducer(id);
//             }
//           }
//         });
        
//         addDebugLog(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
//       }
//     }
//   };
// const startScreenShare = useCallback(async () => {

//   if (activeScreenShare?.stream) {

//     // ❌ CASE 1: Screen share already active
//     toast.info(
//       `📺 A screen share is already active by ${activeScreenShare.userName}.
//       Please wait for it to end before starting a new one.`,
//       {
//         position: "bottom-right",
//         autoClose: 5000,
//       }
//     );

//     addDebugLog("❌ Screen share already active, cannot start new one");

//   } else {

//     // ✅ CASE 2: NO active screen share → ONLY this block runs
//     try {
//       addDebugLog("🖥️ Starting screen share with audio...");

//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: {
//           cursor: "always",
//           frameRate: { ideal: 60, max: 70 },
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//         },
//         audio: true,
//       });

//       const videoTrack = stream.getVideoTracks()[0];
//       const audioTrack = stream.getAudioTracks()[0];

//       if ('contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion'; // Screen share के लिए motion सबसे बेस्ट है
//       addDebugLog("✅ Applied contentHint: 'motion' for screen share");
//     }

//       if (!videoTrack) {
//         addDebugLog("❌ No video track found in screen share stream");
//         return;
//       }

//       if (!sendTransportRef.current) {
//         addDebugLog("❌ No send transport available for screen share");
//         return;
//       }

//       setActiveScreenShare({
//         userId: user.id,
//         userName: user.name || "Streamer",
//         stream,
//         source: "streamer",
//       });

//       // 🎥 VIDEO PRODUCER
//       const videoProducer = await sendTransportRef.current.produce({
//         track: videoTrack,
//         appData: {
//           source: "screen",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });

//       addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);

//       // 🔊 AUDIO PRODUCER
//       let audioProducer = null;
//       if (audioTrack) {

//         console.log("audio track",audioTrack)
//         audioProducer = await sendTransportRef.current.produce({
//           track: audioTrack,
//           appData: {
//             source: "screen-audio",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         });

//         addDebugLog(
//           `✅ Screen share audio producer created: ${audioProducer.id}`
//         );
//       }

//       socket.emit(
//         "transport-produce-screen",
//         {
//           sessionId: sessionId || roomCode,
//           transportId: sendTransportRef.current.id,
//           kind: "video",
//           rtpParameters: videoProducer.rtpParameters,
//           appData: {
//             source: "screen",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         },
//         (response) => {
//           if (response?.id) {
//             addDebugLog(`✅ Screen share video registered: ${response.id}`);

//             if (audioProducer) {
//               socket.emit("transport-produce-streamer-screen-audio", {
//                 sessionId: sessionId || roomCode,
//                 transportId: sendTransportRef.current.id,
//                 rtpParameters: audioProducer.rtpParameters,
//                 appData: {
//                   source: "screen-audio",
//                   userId: user.id,
//                   userName: user.name || "Streamer",
//                 },
//               });
//             }

//             socket.emit("screen-share-started", {
//               sessionId: sessionId || roomCode,
//               producerId: response.id,
//               userId: user.id,
//               userName: user.name || "Streamer",
//               hasAudio: !!audioTrack,
//               source: "screen",
//             });

//             addDebugLog(
//               `✅ Screen share started ${
//                 audioTrack ? "with audio" : "without audio"
//               }`
//             );
//           }
//         }
//       );

//       // 🛑 STOP HANDLERS
//       videoTrack.onended = () => stopScreenShare();

//       if (audioTrack) {
//         audioTrack.onended = () =>
//           addDebugLog("🛑 Screen share audio ended");
//       }

//       stream.getTracks().forEach((track) => {
//         track.onended = () => {
//           if (track.kind === "video") stopScreenShare();
//         };
//       });

//       toast.success(
//         `🖥️ Screen sharing started ${
//           audioTrack ? "(with audio)" : "(video only)"
//         }`,
//         {
//           position: "bottom-right",
//           autoClose: 3000,
//         }
//       );

//     } catch (error) {
//       console.error("❌ Screen share error:", error);

//       toast.error("❌ Failed to start screen sharing", {
//         position: "bottom-right",
//         autoClose: 5000,
//       });
//     }
//   }

// }, [
//   activeScreenShare,
//   user,
//   sendTransportRef,
//   stopScreenShare,
//   socket,
//   sessionId,
//   roomCode,
// ]);


// const sendMessage = useCallback(async (text = '', file = null) => {
//   try {
//     let fileData = null;
//     let fileName = null;
//     let fileType = null;
//     let fileSize = null;
    
//     // Agar file hai to base64 mein convert karen (database ke bina direct transfer)
//     if (file) {
//       setUploadingFile(true);
      
//       // File size check (max 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('File size should be less than 5MB');
//         setUploadingFile(false);
//         return;
//       }

//       // File type check
//       const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
//       if (!allowedTypes.includes(file.type)) {
//         toast.error('Only images, PDF and text files are allowed');
//         setUploadingFile(false);
//         return;
//       }

//       // File ko base64 mein convert karen for direct transfer
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           // Base64 data (data:image/png;base64,XXXXXXXX ke format se prefix hata denge)
//           const base64String = e.target.result;
//           fileData = base64String.split(',')[1]; // Sirf base64 data le rahe hain
//           fileName = file.name;
//           fileType = file.type;
//           fileSize = file.size;
          
//           const messageData = {
//             sessionId: sessionId || roomCode,
//             message: text,
//             fileData: fileData, // Direct base64 data
//             fileName: fileName,
//             fileType: fileType,
//             fileSize: fileSize,
//             timestamp: new Date().toISOString(),
//             type: 'file' // Identify file message
//           };

//           emitSocketEvent('file_message', messageData);
//           setUploadingFile(false);
          
//           // Success feedback
//           toast.success('File sent successfully!');
//           resolve();
//         };
        
//         reader.onerror = () => {
//           console.error('File reading error');
//           setUploadingFile(false);
//           toast.error('Failed to read file');
//           resolve();
//         };
        
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // Normal text message
//       const messageData = {
//         sessionId: sessionId || roomCode,
//         message: text,
//         timestamp: new Date().toISOString(),
//         type: 'text' // Identify text message
//       };

//       emitSocketEvent('chat_message', messageData);
//     }
    
//   } catch (error) {
//     console.error('Error sending message:', error);
//     setUploadingFile(false);
//     toast.error('Failed to send message');
//   }
// }, [sessionId, roomCode]);

//   // ========== TRANSPORT CREATION ==========

//   const createSendTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createSendTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createSendTransport(response.params);
//           transports.current.set(transport.id, transport);
//           sendTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
//             try {
//               const producerId = await handleTransportProduce(
//                 currentSessionId,
//                 transport.id,
//                 kind,
//                 rtpParameters,
//                 appData
//               );
//               callback({ id: producerId });
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ SendTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating send transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   const createRecvTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createRecvTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createRecvTransport(response.params);
//           transports.current.set(transport.id, transport);
//           recvTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ RecvTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating recv transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   // ========== MEDIA INITIALIZATION ==========

//   const setupStreamerMedia = async (currentSessionId) => {
//     try {
//       if (producers.current.size > 0) {
//         addDebugLog('ℹ️ Producers already exist, skipping setup');
//         return;
//       }

//       if (!mediaStream) {
//         throw new Error('No mediaStream available');
//       }      
//     const videoTrack = mediaStream.getVideoTracks()[0];
//       const audioTrack = mediaStream.getAudioTracks()[0];
      
//       if (!videoTrack) {
//         throw new Error('No video track available');
//       }
      
//       if (!audioTrack) {
//         throw new Error('No audio track available');
//       }
      
//       addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
//       addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (!response || response.error || !response.params) {
//           console.error('Failed to create send transport:', response?.error);
//           setMediaError('Failed to create media transport');
//           addDebugLog(`❌ Transport creation error: ${response?.error}`);
//           return;
//         }

//         const transport = device.createSendTransport(response.params);
//         transports.current.set(transport.id, transport);
//         sendTransportRef.current = transport;

//         transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//           try {
//             await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//             callback();
//           } catch (error) {
//             console.error('Transport connect error:', error);
//             errback(error);
//           }
//         });
// transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
//   try {
//     const producerId = await handleTransportProduce(
//       currentSessionId,
//       transport.id,
//       kind,
//       rtpParameters,
//       appData
//     );
//     callback({ id: producerId });
//   } catch (error) {
//     console.error('Transport produce error:', error);
//     errback(error);
//   }
// });

// try {
//   setMediaError(null);
//   addDebugLog('✅ Using existing camera/microphone stream');

//  const videoProducer = await transport.produce({
//   track: videoTrack,
//   appData: { source: 'camera', userId: user?.id }   // 🔥 add userId
// });
//   producers.current.set(videoProducer.id, videoProducer);
//   setProducersState(prev => new Map(prev).set(videoProducer.id, {
//     id: videoProducer.id,
//     kind: 'video',
//     paused: false,
//     source: 'camera'
//   }));
//   addDebugLog(`✅ Video producer created: ${videoProducer.id}`);
  
//   const audioProducer = await transport.produce({
//   track: audioTrack,
//   appData: { source: 'mic', userId: user?.id }      // 🔥 add userId
// });

//   producers.current.set(audioProducer.id, audioProducer);
//   setProducersState(prev => new Map(prev).set(audioProducer.id, {
//     id: audioProducer.id,
//     kind: 'audio',
//     paused: false,
//     source: 'mic'
//   }));
//   addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

//   setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
//   setIsInitializing(false);
//   setIsLoading(false);
  
//   setTimeout(() => {
//     if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
//       videoRef.current.play().catch(error => {
//         console.log('Post-producer autoplay prevented:', error);
//         setShowPlayButton(true);
//       });
//     }
//   }, 500);
  
// } catch (error) {
//   console.error('Error creating producers:', error);
//   addDebugLog(`❌ Producer creation error: ${error.message}`);
//   setIsInitializing(false);
//   setIsLoading(false);
// }
//       });
//     } catch (error) {
//       console.error('Error setting up streamer media:', error);
//       setMediaError('Failed to set up media streaming');
//       addDebugLog(`❌ Media setup error: ${error.message}`);
//       setIsInitializing(false);
//       setIsLoading(false);
//     }
//   };
  
// const initializeMedia = async (currentSessionId, initialIceServers = []) => {
//   try {
//     if (isMediaInitialized) {
//       addDebugLog('ℹ️ Media already initialized, skipping');
//       return;
//     }
    
//     if (!mediaStream) {
//       addDebugLog('❌ No media stream available for initialization');
//       return;
//     }
    
//     setIsMediaInitialized(true);
//     addDebugLog('Initializing media with existing stream...');
    
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for media initialization');
//       return;
//     }
    
//     socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
//       if (response.error || !response.rtpCapabilities) {
//         addDebugLog(`❌ Failed to get router capabilities: ${response.error}`);
//         setMediaError('Failed to initialize media server');
//         setIsMediaInitialized(false);
//         return;
//       }

//       try {
//         await device.load({ routerRtpCapabilities: response.rtpCapabilities });
//         addDebugLog(`✅ Device loaded successfully`);

//         // Create transports
//         await createRecvTransport(currentSessionId);
//         await createSendTransport(currentSessionId);

//         // Setup streamer media
//         await setupStreamerMedia(currentSessionId);

//       } catch (error) {
//         console.error('Error loading device:', error);
//         setMediaError('Failed to initialize media device');
//         setIsMediaInitialized(false);
//         addDebugLog(`❌ Device load error: ${error.message}`);
//       }
//     });
//   } catch (error) {
//     console.error('Error initializing media:', error);
//     setMediaError('Failed to initialize media');
//     setIsMediaInitialized(false);
//     addDebugLog(`❌ Media init error: ${error.message}`);
//   }
// };

//   const joinRoomWithRetry = (retries = 3) => {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for joining room');
//       return;
//     }
    
//     if (retries === 0) {
//       console.error('Failed to join room after multiple attempts');
//       addDebugLog('Failed to join room after multiple attempts');
//       alert('Failed to join the session. Please try again.');
//       return;
//     }

//     addDebugLog(`Joining room (attempt ${4 - retries}/3)...`);
    
//     socket.emit('join_room', { 
//       token, 
//       sessionId: sessionId || null,
//       roomCode: roomCode || null,
//     }, (response) => {
//       if (response && response.error) {
//         console.warn(`Join room failed: ${response.error}, retrying... (${retries - 1} attempts left)`);
//         addDebugLog(`Join room failed: ${response.error}, retrying...`);
//         setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
//       }
//     });
//   };
//   // ========== CAMERA AND PERMISSION FUNCTIONS ==========

// const initializeCamera = async () => {
//   try {
//     addDebugLog('🔄 Initializing camera with smart audio optimization...');
//     setIsLoading(true);
//     setIsInitializing(true);
//     setCameraVisible(false);
//     setShowPlayButton(false); // Reset play button
    
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // ✅ SMART AUDIO CONSTRAINTS with complete optimization
//     const audioConstraints = await getOptimizedAudioConstraints(); // ✅ await add karo
    
//     // ✅ EARPHONE DETECTION aur optimization
//     const earphoneInfo = await detectEarphones();
    
//     // ✅ EARPHONE ADJUSTMENT - Force stereo if earphone detected
//     if (earphoneInfo.hasEarphone) {
//       audioConstraints.channelCount = 2;
//       audioConstraints.sampleRate = 48000; // High quality for earphones
      
//       if (earphoneInfo.isBluetooth) {
//         // Bluetooth earphones need special handling
//         audioConstraints.latency = 0.02; // Slightly higher latency for BT
//         addDebugLog('🎧 Bluetooth earphone detected - using optimized settings');
//       } else if (earphoneInfo.isWiredHeadphone) {
//         addDebugLog('🎧 Wired headphone detected - using high quality audio');
//       }
      
//       addDebugLog(`🎧 Earphone detected: ${earphoneInfo.deviceLabels.join(', ')}`);
//     }

//     addDebugLog(`🎵 Using optimized audio: ${audioConstraints.channelCount} channels, ${audioConstraints.sampleRate || 'default'}Hz`);

//     // Mobile-friendly constraints with SMART AUDIO
//     const constraints = {
//       video: {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 60, max: 70 },
//       },
//       audio: audioConstraints  // ✅ OPTIMIZED AUDIO CONSTRAINTS
//     };

//     addDebugLog('🎯 Requesting media with constraints:', {
//       video: constraints.video,
//       audio: constraints.audio
//     });

    
//     const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     console.log('📱 Camera stream obtained with optimized audio');

//     // ✅ VERIFY AUDIO SETTINGS
//     const videoTracks = stream.getVideoTracks();
//     const audioTracks = stream.getAudioTracks();
    
//     if (videoTracks.length === 0) {
//       throw new Error('No video track found in stream');
//     }

//     // Log actual audio settings
//     if (audioTracks.length > 0) {
//       const audioSettings = audioTracks[0].getSettings();
//       addDebugLog(`🎵 Actual audio settings: ${audioSettings.channelCount} channels, ${audioSettings.sampleRate || 'default'}Hz, sampleSize: ${audioSettings.sampleSize || 'N/A'}`);
      
//       // Warn if we got mono but wanted stereo
//       if (earphoneInfo.hasEarphone && audioSettings.channelCount === 1) {
//         addDebugLog('⚠️ Earphone connected but got MONO audio - device limitation');
//       }
      
//       // Log all audio track details
//       audioTracks.forEach((track, index) => {
//         const settings = track.getSettings();
//         addDebugLog(`🎤 Audio Track ${index + 1}:`, {
//           id: track.id,
//           label: track.label,
//           enabled: track.enabled,
//           muted: track.muted,
//           readyState: track.readyState,
//           channelCount: settings.channelCount,
//           sampleRate: settings.sampleRate,
//           sampleSize: settings.sampleSize,
//           latency: settings.latency
//         });
//       });
//     }

//     // Log video track details
//     videoTracks.forEach((track, index) => {
//       const settings = track.getSettings();
//       addDebugLog(`📹 Video Track ${index + 1}:`, {
//         id: track.id,
//         label: track.label,
//         enabled: track.enabled,
//         muted: track.muted,
//         readyState: track.readyState,
//         width: settings.width,
//         height: settings.height,
//         frameRate: settings.frameRate,
//         aspectRatio: settings.aspectRatio
//       });
//     });
    
//     setMediaStream(stream);
//     setMediaError(null);
//     setPermissionStatus('granted');
//     setCameraReady(true);
    
//     addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
    
//     // Setup video element properly
//     setTimeout(() => {
//       if (videoRef.current) {
//         const videoEl = videoRef.current;
//         videoEl.muted = true;
//         videoEl.playsInline = true;
//         videoEl.setAttribute('playsinline', '');
//         videoEl.setAttribute('webkit-playsinline', '');
//         videoEl.srcObject = stream;
        
//         // Video event listeners for better debugging
//         videoEl.onloadedmetadata = () => {
//           addDebugLog('📹 Video metadata loaded');
//         };
        
//         videoEl.oncanplay = () => {
//           addDebugLog('📹 Video can play');
//         };
        
//         videoEl.onerror = (e) => {
//           console.error('📹 Video error:', e);
//           addDebugLog(`❌ Video error: ${e.message}`);
//         };

//         // Auto-play attempt with better timing
//         setTimeout(() => {
//           videoEl.play().then(() => {
//             addDebugLog('✅ Mobile autoplay successful');
//             setIsPlaying(true);
//             setShowPlayButton(false);
//             setIsLoading(false);
//             setIsInitializing(false);
//           }).catch(error => {
//             console.log('📱 Mobile autoplay blocked, waiting for user gesture');
//             addDebugLog(`📱 Autoplay blocked: ${error.message}`);
//             setShowPlayButton(true);
//             setIsLoading(false);
//             setIsInitializing(false);
//           });
//         }, 800); // Slightly longer delay for mobile
//       }
//     }, 500);
    
//   } catch (error) {
//     console.error('❌ Error accessing camera:', error);
//     addDebugLog(`❌ Camera access error: ${error.message}`);
    
//     let errorMessage = `Camera error: ${error.message}`;
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
//       setPermissionStatus('denied');
//     } else if (error.name === 'NotFoundError') {
//       errorMessage = 'No camera found. Please check if camera is connected.';
//     } else if (error.name === 'NotSupportedError') {
//       errorMessage = 'Camera not supported on this device/browser.';
//     } else if (error.name === 'NotReadableError') {
//       errorMessage = 'Camera is already in use by another application.';
//     } else if (error.name === 'OverconstrainedError') {
//       errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...';
//       // Fallback to basic constraints
      
//     }
    
//     setMediaError(errorMessage);
//     setIsLoading(false);
//     setIsInitializing(false);
//     setShowPlayButton(true);
//   }
// };


//   const requestCameraPermissions = async () => {
//     try {
//       addDebugLog('🔄 Manually requesting camera permissions...');
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true, 
//         audio: {
//     echoCancellation: true,
//     noiseSuppression: true,
//     autoGainControl: true
//   },
//       });
      
//       stream.getTracks().forEach(track => track.stop());
      
//       setMediaError(null);
//       setPermissionStatus('granted');
//       addDebugLog('✅ Camera permissions granted manually');
      
//       initializeCamera();
//     } catch (error) {
//       console.error('Failed to request camera permissions:', error);
//       setMediaError('Failed to get camera permissions. Please allow access in browser settings.');
//       setPermissionStatus('denied');
//       addDebugLog(`❌ Manual permission request failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };

//   const retryCamera = async () => {
//     try {
//       setMediaError(null);
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       Array.from(producersState.keys()).forEach(producerId => {
//         handleCloseProducer(producerId);
//       });
      
//       transports.current.forEach(transport => {
//         try {
//           transport.close();
//         } catch (error) {
//           console.error('Error closing transport:', error);
//         }
//       });
//       transports.current.clear();
      
//       if (mediaStream) {
//         mediaStream.getTracks().forEach(track => track.stop());
//         setMediaStream(null);
//       }
      
//       setIsMediaInitialized(false);
//       setCameraReady(false);
//       setCameraVisible(false);
//       setIsWebSocketInitialized(false);
//       setProducersState(new Map());
      
//       initializeCamera();
      
//       addDebugLog('Camera retry initiated');
//     } catch (error) {
//       console.error('Failed to retry camera:', error);
//       setMediaError('Failed to restart camera');
//       setPermissionStatus('denied');
//       addDebugLog(`Camera retry failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };
//   // ========== WEBSOCKET INITIALIZATION ==========
//   const initializeWebSocket = () => {
//     if (permissionStatus !== 'granted') {
//       addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
//       return;
//     }

//     addDebugLog('Setting up socket connection...');
//     addDebugLog(`Socket URL: ${import.meta.env.VITE_SOCKET_URL}`);
//     addDebugLog(`Session ID: ${sessionId}`);
//     addDebugLog(`Room Code: ${roomCode}`);

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: { token },
//     transports: ['websocket', 'polling'], 
//     upgrade: true,
//     forceNew: true,
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000,
//     timeout: 20000
//     });

//     newSocket.on('connect', () => {
//       addDebugLog('✅ Socket connected, emitting join_room...');
//       setIsConnected(true);
      
//       joinRoomWithRetry();
//     });


//     newSocket.on('disconnect', () => {
//       addDebugLog('❌ Disconnected from server');
//       setIsConnected(false);
//     });

//     newSocket.on('connect_error', (error) => {
//       console.error('❌ Connection error:', error);
//       addDebugLog(`Connection error: ${error.message}`);
//       setIsConnected(false);
//     });

//     newSocket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//       addDebugLog(`Socket error: ${error.message}`);
//     });

//     newSocket.on('error_message', (data) => {
//       console.error('Error:', data);
//       addDebugLog(`Error message: ${JSON.stringify(data)}`);
//       alert(data.message || data);
//     });

//     // ========== SOCKET EVENT LISTENERS ==========
//     newSocket.on('new-viewer-screen-producer', (data) => {
//       addDebugLog('📩 Direct new-viewer-screen-producer event received');
//       handleNewViewerScreenProducer(data);
//     });

//     // Recording status events
// newSocket.on('recording_started', (data) => {
//   addDebugLog(`🎬 Recording started: ${data.sessionId}`);
//   setIsRecording(true);
// });

// newSocket.on('recording_stopped', (data) => {
//   addDebugLog(`⏹ Recording stopped: ${data.sessionId}`);
//   setIsRecording(false);
// });

//     newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
//     newSocket.on('viewer-audio-request', handleViewerAudioRequest);
//     newSocket.on('screen-share-request', handleScreenShareRequest);
//     newSocket.on('viewer-audio-started', handleViewerAudioStarted);
//     newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
//     newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
//     newSocket.on('screen-share-stopped-by-viewer', handleScreenShareStopped);
//     newSocket.on("viewer-video-request", handleViewerVideoRequest);


//     newSocket.on("viewer-audio-stopped", ({ userId }) => {
//   cleanupViewerAudio(userId);

//    newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
//   addDebugLog(`🛑 Viewer audio force-stopped: ${userId}`);
//    cleanupViewerAudio(userId); // remove their audio element

//    // Participants list update bhi karo
//    setParticipants(prev =>
//      prev.map(p =>
//        p.userId === userId ? { ...p, hasAudio: false } : p
//      )
//    );
//  });
// });

// newSocket.on("user_left", (data) => {
//   // keep your existing cleanup, but also ensure audio element removed
//   cleanupViewerAudio(data.userId);
//   cleanupViewerMedia(data.userId); // if you already had this
// });


//     // Viewer audio status events
//     newSocket.on('viewer-audio-enabled', (data) => {
//       addDebugLog(`Viewer audio enabled: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, hasAudio: true } : p
//       ));
//     });

//     newSocket.on('viewer-audio-started-global', (data) => {
//       addDebugLog(`Viewer audio started globally: ${data.userId}`);
//       setActiveSpeakers(prev => new Map(prev).set(data.socketId, {
//         userId: data.userId,
//         socketId: data.socketId,
//         userName: data.userName
//       }));
//     });

//     newSocket.on('viewer-audio-muted-global', (data) => {
//       addDebugLog(`Viewer audio muted globally: ${data.userId}`);
//       setActiveSpeakers(prev => {
//         const newMap = new Map(prev);
//         Array.from(newMap.entries()).forEach(([key, value]) => {
//           if (value.userId === data.userId) {
//             newMap.delete(key);
//           }
//         });
//         return newMap;
//       });
//     });

//     newSocket.on('joined_room', (data) => {
//       addDebugLog('✅ Joined room successfully');
//       setSession(data);
//       setParticipants(data.participants || []);
//       setIceServers(data.iceServers || []);
//       setIsLoading(false);
      
//       if (!isMediaInitialized) {
//         initializeMedia(data.sessionId, data.iceServers);
//       }
//     });

//     newSocket.on('ice_servers', (servers) => {
//       addDebugLog(`Received ${servers.length} ICE servers`);
//       setIceServers(servers);
//     });

//     newSocket.on('user_joined', (data) => {
//       addDebugLog(`User joined: ${data.userId}`);
//       setParticipants(prev => [...prev, data]);
//     });

//     newSocket.on('user_left', (data) => {
//       addDebugLog(`User left: ${data.userId}`);
//       setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      
//       // Clean up viewer media
//       cleanupViewerMedia(data.userId);
      
//       // Clean up remote videos
//       const videoToRemove = Array.from(remoteVideosRef.current.entries())
//         .find(([_, video]) => video.dataset?.socketId === data.socketId);
      
//       if (videoToRemove) {
//         const [producerId, video] = videoToRemove;
//         video.remove();
//         remoteVideosRef.current.delete(producerId);
//       }
//     });
//     // Socket event handlers mein ye add karen
// newSocket.on('chat_message', (message) => {
//   addDebugLog(`Chat message from ${message.userId}`);
  
//   // Agar file message hai to usko process karen
//   if (message.type === 'file') {
//     addDebugLog(`File received: ${message.fileName} (${message.fileType})`);
//   }
  
//   setMessages(prev => [...prev, {
//     ...message,
//     id: Date.now() + Math.random(), // Unique ID
//     timestamp: message.timestamp || new Date().toISOString()
//   }]);
// });
//     newSocket.on('streamer_started', () => {
//       addDebugLog('Streamer started streaming');
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setLocalPausedState(false);
//     });

//     newSocket.on('streamer_paused', () => {
//       addDebugLog('Streamer paused streaming');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//     });

//     newSocket.on('streamer_resumed', () => {
//       addDebugLog('Streamer resumed streaming');
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     });
//     // 🛑 Streamer ne ya viewer ne camera stop kiya
// newSocket.on("viewer-video-force-stopped-global", ({ userId }) => {
//   addDebugLog(`🛑 Camera stopped globally for user: ${userId}`);
//   cleanupViewerMedia(userId); // tumhare paas already hai
// });

// newSocket.on("viewer-camera-stopped", ({ userId }) => {
//   addDebugLog(`📷 Viewer camera stopped: ${userId}`);

//   setZoomed((prev) => {
//     if (prev && prev.type === "viewer" && prev.userId === userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped viewer camera: ${userId}`);
//       return null;
//     }
//     return prev;
//   });
//     cleanupViewerCamera(userId);
// });

// newSocket.on("viewer-camera-paused-global", ({ userId }) => {
//   addDebugLog(`⏸️ Viewer camera paused: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))
//   );
// });

// newSocket.on("viewer-camera-resumed-global", ({ userId }) => {
//   addDebugLog(`▶️ Viewer camera resumed: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))
//   );
// });
//     newSocket.on('session_ended', () => {
//       addDebugLog('Session ended by streamer');
//       setRoomState(prev => ({ ...prev, isStreaming: false, isPaused: true }));
//       alert('Session has been ended by the streamer.');
//       navigate('/dashboard');
//     });

//     newSocket.on('session_paused', () => {
//       addDebugLog('Session paused by streamer');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//       alert('Session has been paused by the streamer.');
//     });

//     newSocket.on('producer-paused', (data) => {
//       addDebugLog(`Producer paused: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: true });
//         }
//         return newState;
//       });
//     });

//     newSocket.on('producer-resumed', (data) => {
//       addDebugLog(`Producer resumed: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: false });
//         }
//         return newState;
//       });
//     });

// newSocket.on("producer-closed", (data) => {
//   addDebugLog(
//     `❌ Producer closed: ${data.producerId}, source: ${data.source}, user: ${data.userId}`
//   );

//   // 🖥️ Screen share cleanup (streamer OR viewer)
//   if (data.source === "screen" || data.source === "viewer-screen") {
//     // 🔴 Forcefully clear state
//     setActiveScreenShare(null);

//     // 🔴 Stop only video tracks from screen share
//     try {
//       if (screenRef.current?.srcObject) {
//         const tracks = screenRef.current.srcObject.getTracks?.() || [];
//         tracks.forEach((t) => {
//           if (t.kind === 'video') {
//             t.stop(); // Only stop video tracks
//           }
//         });
//       }
//     } catch (e) {
//       console.warn("Error stopping screen share tracks on producer-closed", e);
//     }

//     // 🔴 Clear video ref
//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef on producer-closed", e);
//       }
//     }

//     addDebugLog(
//       `✅ Producer closed → forced activeScreenShare reset for ${data.userId}`
//     );
//   }

//   // 🎤 Audio cleanup - ONLY for audio sources
//   if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//     cleanupViewerAudio(data.userId);
//     addDebugLog(`🎤 Viewer audio stopped for user: ${data.userId}`);
//   }

//   // 📷 Camera cleanup - ONLY for camera video
//   if (data.source === "viewer-camera") {
//     setViewerCameras((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(data.userId)) {
//         const stream = newMap.get(data.userId);
//         if (stream) {
//           try {
//             // ✅ ONLY stop VIDEO tracks, leave audio tracks alone
//             stream.getTracks().forEach((t) => {
//               if (t.kind === 'video') {
//                 t.stop();
//                 addDebugLog(`📹 Stopped video track for user ${data.userId}`);
//               }
//               // Audio tracks continue playing
//             });
//           } catch (e) {
//             console.warn("Error stopping camera tracks", e);
//           }
//         }
//         newMap.delete(data.userId);
//       }
//       return newMap;
//     });
//     addDebugLog(`📷 Viewer camera removed for user ${data.userId}`);
//   }

//   // 🔊 Streamer audio cleanup - if needed
//   if (data.source === "mic" || data.source === "streamer-mic") {
//     addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
//     // Don't cleanup viewer audio here, this is streamer's audio
//   }
// });


//     newSocket.on("new-producer", (data) => {
//       addDebugLog("📡 New producer available:", data);

//       // Track producer in state
//       setProducersState((prev) => {
//         const updated = new Map(prev);
//         updated.set(data.producerId, {
//           id: data.producerId,
//           kind: data.kind,
//           userId: data.userId,
//           source: data.source || "camera",
//           paused: false,
//         });
//         return updated;
//       });

//       // Handle viewer screen video
//       if (data.source === "viewer-screen") {
//         addDebugLog("🖥️ Consuming viewer screen producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }

//       // Handle viewer mic OR viewer screen audio
//       if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//         addDebugLog("🎤 Consuming viewer audio producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }
//       if (data.source === "viewer-camera") {
//   addDebugLog("📷 Consuming viewer camera producer:", data.producerId);
//   createConsumer(sessionId || roomCode, data.producerId, data.kind);
// }
//     });
    
//     newSocket.on('participant_updated', (data) => {
//       addDebugLog(`Participant updated: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, ...data.updates } : p
//       ));
//     });

//  newSocket.on("participants_list_updated", (data) => {
//   addDebugLog("📋 Participants list updated (snapshot)");
//   console.log("participants list:", data.participants || []);
//   setParticipants(data.participants || []);
// });
//     setSocket(newSocket);
//     socketRef.current = newSocket;
//   };

//   // ========== USE EFFECT HOOKS ==========

//  useEffect(() => {
//   // Initialize media stream refs
//   streamerMediaRef.current = new MediaStream();
//   viewerAudiosRef.current = new Map();

//   return () => {
//     isMountedRef.current = false;

//     // 🎥 Clean up main camera/microphone stream
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }

//     // 🖥️ Clean up active screen share (only one can be active)
//     if (activeScreenShare?.stream) {
//       activeScreenShare.stream.getTracks().forEach(track => track.stop());
//     }

//     // 🎤 Clean up all viewer audio streams
//     viewerAudiosRef.current.forEach(stream => {
//       stream.getTracks().forEach(track => track.stop());
//     });

//     // 🎥 Clean up remote video elements
//     remoteVideosRef.current.forEach(video => {
//       if (video && video.srcObject) {
//         video.srcObject.getTracks().forEach(track => track.stop());
//         video.srcObject = null;
//       }
//     });

//     // 🖱️ Remove gesture handlers
//     if (userGestureHandlerRef.current) {
//       document.removeEventListener("click", userGestureHandlerRef.current);
//       document.removeEventListener("touchstart", userGestureHandlerRef.current);
//     }

//     // 🔌 Close all transports
//     transports.current.forEach(transport => transport.close());

//     // 🔗 Close socket connection
//     if (socketRef.current) {
//       socketRef.current.close();
//     }
//   };
// }, []);

//   useEffect(() => {
//     const checkPermissions = async () => {
//       try {
//         addDebugLog('🔍 Checking camera and microphone permissions...');
//         setPermissionStatus('checking');
        
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//         const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
        
//         if (hasVideoPermission && hasAudioPermission) {
//           addDebugLog('✅ Camera and microphone permissions already granted');
//           setPermissionStatus('granted');
//           initializeCamera();
//         } else {
//           addDebugLog('ℹ️ Need to request camera/microphone permissions');
//           setPermissionStatus('denied');
//           setIsLoading(false);
//         }
//       } catch (error) {
//         console.error('Error checking permissions:', error);
//         addDebugLog(`❌ Error checking permissions: ${error.message}`);
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     };

//     checkPermissions();
//   }, []);


//   useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup recording stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }
//   };
// }, [recorder, recordingStream]);

//   useEffect(() => {
//     if (permissionStatus === 'granted' && !isWebSocketInitialized) {
//       addDebugLog('🔄 Initializing WebSocket connection...');
//       setIsWebSocketInitialized(true);
//       initializeWebSocket();
//     }
//   }, [permissionStatus, isWebSocketInitialized]);

//   useEffect(() => {
//     const checkCameraVisibility = () => {
//       if (videoRef.current && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        
//         if (hasVideo && videoRef.current.readyState >= 2) {
//           setCameraVisible(true);
//           setIsLoading(false);
//           addDebugLog('✅ Camera video is visible on screen');
//         }
//       }
//     };

//     if (mediaStream) {
//       checkCameraVisibility();
//       const interval = setInterval(checkCameraVisibility, 500);
//       return () => clearInterval(interval);
//     }
//   }, [mediaStream]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
    
//     if (!videoElement || !mediaStream) {
//       setIsPlaying(false);
//       return;
//     }

//     if (videoElement.srcObject !== mediaStream) {
//       videoElement.srcObject = mediaStream;
//       videoElement.muted = true;
//     }

//     const handlePlay = () => {
//       console.log('Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
//       setIsLoading(false);
//     };

//     const handlePause = () => {
//       console.log('Video paused');
//       setIsPlaying(false);
//       setLocalPausedState(true);
      
//       if (!roomState.isPaused) {
//         setShowPlayButton(true);
//       }
//     };

//     const handleError = (e) => {
//       console.error('Video error:', e);
//       setMediaError(true);
//       setIsPlaying(false);
//       setShowPlayButton(true);
//     };

//     const handleLoadedMetadata = () => {
//       console.log('Video metadata loaded');
//       setIsLoading(false);
//       if (!roomState.isPaused && !localPausedState) {
//         videoElement.play().catch(error => {
//           console.log('Autoplay prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     };

//     const handleLoadedData = () => {
//       console.log('Video data loaded');
//       setIsLoading(false);
//       if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
//         setCameraVisible(true);
//         setIsLoading(false);
//       }
//     };

//     const handleCanPlay = () => {
//       console.log('Video can play');
//       setIsLoading(false);
//     };

//     videoElement.addEventListener('play', handlePlay);
//     videoElement.addEventListener('pause', handlePause);
//     videoElement.addEventListener('error', handleError);
//     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
//     videoElement.addEventListener('loadeddata', handleLoadedData);
//     videoElement.addEventListener('canplay', handleCanPlay);

//     if (videoElement.readyState >= 2) {
//       if (!videoElement.paused && !videoElement.ended) {
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setLocalPausedState(false);
//         setIsLoading(false);
//       } else if (roomState.isPaused) {
//         setIsPlaying(false);
//         setShowPlayButton(false);
//         setLocalPausedState(true);
//       } else {
//         videoElement.play().catch(error => {
//           console.log('Initial play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }

//     return () => {
//       videoElement.removeEventListener('play', handlePlay);
//       videoElement.removeEventListener('pause', handlePause);
//       videoElement.removeEventListener('error', handleError);
//       videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
//       videoElement.removeEventListener('loadeddata', handleLoadedData);
//       videoElement.removeEventListener('canplay', handleCanPlay);
//     };
//   }, [mediaStream, roomState.isPaused]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
//     if (!videoElement || !mediaStream) return;

//     if (roomState.isPaused && !videoElement.paused) {
//       videoElement.pause();
//       setIsPlaying(false);
//       setShowPlayButton(false);
//       setLocalPausedState(true);
//     } else if (!roomState.isPaused && videoElement.paused && roomState.isStreaming) {
//       videoElement.play().catch(error => {
//         console.log('Play after resume prevented:', error);
//         setShowPlayButton(true);
//         setLocalPausedState(true);
//       });
//     }
//   }, [roomState.isPaused, roomState.isStreaming, mediaStream]);

// // ✅ always keep PiP screen video in sync, even after zoom toggle
// useEffect(() => {
//   if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
//     screenRef.current.srcObject = activeScreenShare.stream;
//     screenRef.current.play().catch(() => {
//       console.warn("Autoplay blocked for screen PiP");
//     });
//   } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
//     screenRef.current.srcObject = null;
//   }
// }, [activeScreenShare?.stream, zoomed]);

//   useEffect(() => {
//     if (mediaStream) {
//       const tracks = mediaStream.getTracks();
//       tracks.forEach(track => {
//         addDebugLog(`Track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
//         if (track.kind === 'video') {
//           const settings = track.getSettings();
//           addDebugLog(`Video settings: ${JSON.stringify({
//             width: settings.width,
//             height: settings.height,
//             frameRate: settings.frameRate,
//             deviceId: settings.deviceId
//           })}`);
//         }
//       });
      
//       const status = checkStreamStatus();
//       if (status.hasVideo && status.hasAudio) {
//         addDebugLog('✅ Stream has both audio and video tracks');
//       } else {
//         addDebugLog('❌ Stream is missing audio or video tracks');
//       }
//     }
//   }, [mediaStream]);
// // 👇 ye effect tumhare component me daal do
// // ✅ Streamer video ke liye
// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);
//   // ========== UI COMPONENTS ==========

// const handlePlayClick = async (e) => {
//   try {
//     e.stopPropagation();
//     console.log('📱 User triggered play');
    
//     if (videoRef.current && mediaStream) {
//       // Ensure video element is properly set up
//       const videoEl = videoRef.current;
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
      
//       // Set source only if needed
//       if (videoEl.srcObject !== mediaStream) {
//         videoEl.srcObject = mediaStream;
//       }
      
//       // User gesture ke saath play
//       await videoEl.play();
//       console.log('✅ Mobile video started via user gesture');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
      
//     }
//   } catch (error) {
//     console.error('❌ Failed to play video on mobile:', error);
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       setMediaError('Autoplay blocked. Please tap to play.');
//     } else {
//       setMediaError('Failed to play video');
//     }
    
//     setShowPlayButton(true);
//     setLocalPausedState(true);
//   }
// };

//   // 📷 Jab viewer camera request bhejta hai
// const handleViewerVideoRequest = useCallback((data) => {
//   addDebugLog(`📷 Viewer requested camera: ${data.requesterName} (${data.requestedUserId})`);
  
//   setViewerVideoRequests((prev) => [
//     ...prev,
//     {
//       userId: data.requestedUserId,
//       userName: data.requesterName,
//       socketId: data.socketId
//     }
//   ]);
// }, []);

// // Replace old handleViewerVideoResponse with this:
// const handleViewerVideoResponse = useCallback((requesterSocketId, allow) => {
//   // Use socketRef (safer) or emitSocketEvent helper
//   if (!socketRef.current || !socketRef.current.connected) {
//     addDebugLog('❌ Socket not connected — cannot send viewer-video-response');
//     return;
//   }

//   socketRef.current.emit('viewer-video-response', {
//     sessionId: sessionId || roomCode,
//     requesterSocketId,    // <-- IMPORTANT: server expects this key
//     allow                  // <-- IMPORTANT: server expects `allow` (boolean)
//   });

//   // remove the request UI
//   setViewerVideoRequests(prev => prev.filter(r => r.userId !== requesterSocketId && r.socketId !== requesterSocketId));

//   addDebugLog(`${allow ? '✅' : '❌'} Camera ${allow ? 'approved' : 'denied'} for requester socket: ${requesterSocketId}`);
// }, [sessionId, roomCode]);

//   const checkStreamStatus = useCallback(() => {
//     if (!mediaStream) return false;
    
//     const videoTracks = mediaStream.getVideoTracks();
//     const audioTracks = mediaStream.getAudioTracks();
    
//     const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
//     const hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
//     addDebugLog(`Stream status - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
//     return { hasVideo, hasAudio };
//   }, [mediaStream]);

// useEffect(() => {
//   if (!isMobile) return;

//   const handleFirstUserInteraction = () => {
//     addDebugLog('📱 Mobile user interaction detected');
    
//     // Video play try karo user gesture ke baad
//     if (videoRef.current && mediaStream && showPlayButton) {
//       setTimeout(() => {
//         videoRef.current.play().catch(() => {
//           // Still blocked, play button show karo
//           setShowPlayButton(true);
//         });
//       }, 100);
//     }
//   };

//   // Multiple events pe listen karo
//   document.addEventListener('click', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchend', handleFirstUserInteraction, { once: true });

//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//     document.removeEventListener('touchend', handleFirstUserInteraction);
//   };
// }, [isMobile, mediaStream, showPlayButton]);


// // Mobile detection and handlers
// useEffect(() => {
//   const checkMobile = () => {
//     const mobile = window.innerWidth < 768 || 
//                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//     setIsMobile(mobile);
//     if (mobile) {
//       setMobileView('video');
//       setShowThumbnails(false);
//       addDebugLog(`📱 Mobile device detected: ${window.innerWidth}px`);
//     }
//   };

//   checkMobile();
//   window.addEventListener('resize', checkMobile);
  
//   return () => window.removeEventListener('resize', checkMobile);
// }, []);

//   // Full screen handling
//   const toggleFullScreen = () => {
//     if (!document.fullscreenElement) {
//       document.documentElement.requestFullscreen().catch(err => {
//         console.log('Full screen error:', err);
//       });
//       setIsFullScreen(true);
//     } else {
//       document.exitFullscreen();
//       setIsFullScreen(false);
//     }
//   };
//   // Mobile main render
//   if (isMobile) {
//       const mobileHeight = isLandscape ? 'h-[160vh]' : 'h-screen';

//     return (
//       <div className={`flex flex-col ${mobileHeight} bg-black text-white overflow-hidden`}>
//         <MobileHeader
//       session={session}
//       participants={participants}
//       isConnected={isConnected}
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//       showRequests={showRequests}
//       setShowRequests={setShowRequests}
//     />
    
//     <MobileRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//       handleScreenShareResponse={handleScreenShareResponse}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />
        
//         {mobileView === 'video' && (
//         <MobileVideoView
//           zoomed={zoomed}
//           setZoomed={setZoomed}
//           mediaStream={mediaStream}
//           participants={participants}
//           activeScreenShare={activeScreenShare}
//           setIsPlaying={setIsPlaying}
//           setShowPlayButton={setShowPlayButton}
//           showPlayButton={showPlayButton}
//           setMediaError={setMediaError}
//           mediaError={mediaError}
//           isLoading={isLoading}
//           isInitializing={isInitializing}
//           roomState={roomState}
//           localPausedState={localPausedState}
//           user={user}
//           videoEnabled={videoEnabled}
//           viewerCameras={viewerCameras}
//           showMobileControls={showMobileControls}
//           setShowMobileControls={setShowMobileControls}
//           handlePlayClick={handlePlayClick}
//           isPlaying={isPlaying}
//         />
//       )}
//         {mobileView === 'participants' && <MobileParticipantsView
//         participants={participants}
//         activeSpeakers={activeSpeakers}
//         handleMuteViewerAudio={handleMuteViewerAudio}
//         emitSocketEvent={emitSocketEvent}
//         sessionId={sessionId}
//         roomCode={roomCode}
//         addDebugLog={addDebugLog}
//         handleStopViewerScreenShare={handleStopViewerScreenShare}
//         handleBanParticipant={handleBanParticipant}
//       />}
//         {mobileView === 'chat' && <MobileChatView
//         messages={messages}
//         user={user}
//         sendMessage={sendMessage}
//         uploadingFile={uploadingFile}
//       />}
        
//        <MobileNavigation
//       mobileView={mobileView}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//     />
    
//     <MobileControls
//   toggleAudio={toggleAudio}
//   audioEnabled={audioEnabled}
//   toggleVideo={toggleVideo}
//   videoEnabled={videoEnabled}
//   roomState={roomState}
//   startStreaming={startStreaming}
//   resumeStreaming={resumeStreaming}
//   pauseStreaming={pauseStreaming}
//   endStreaming={endStreaming}
//   // ✅ New props for recording
//   handleRecordingToggle={handleRecordingToggle}
//   isRecording={isRecording}
//   isRecordingLoading={isRecordingLoading}
//   isRecordingStopping={isRecordingStopping}
// />

//         {/* Mobile Modals */}
//         {showParticipantsModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-h-80 overflow-y-auto">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold">Manage Participants</h3>
//                 <button 
//                   onClick={() => setShowParticipantsModal(false)}
//                   className="text-gray-400"
//                 >
//                   <FiX className="h-5 w-5" />
//                 </button>
//               </div>
              
//               <div className="space-y-2">
//                 {participants.map((participant, index) => (
//                   <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
//                     <span className="text-sm">{participant.name || 'User'}</span>
//                     <div className="flex space-x-1">
//                       {participant.hasAudio && (
//                         <button
//                           onClick={() => handleMuteViewerAudio(participant.socketId)}
//                           className="bg-red-500 text-white p-1 rounded text-xs"
//                         >
//                           Mute
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // ========== MAIN RENDER ==========

//   if (isLoading && permissionStatus !== 'denied') {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Requesting camera access...</p>
//           {mediaError && (
//             <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               <p>{mediaError}</p>
//               <button 
//                 onClick={initializeCamera}
//                 className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//               >
//                 Retry
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   if (permissionStatus === 'denied' && !isConnected) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
//           <div className="text-4xl mb-4">🎥</div>
//           <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
//           <p className="text-gray-600 mb-6">
//             To join this live session, you need to allow camera and microphone access.
//           </p>
//           <button
//             onClick={requestCameraPermissions}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
//           >
//             Allow Camera & Microphone
//           </button>
//           <p className="text-sm text-gray-500 mt-4">
//             If you've previously denied access, please check your browser settings.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (!isConnected || !session) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Connecting to session...</p>
//           <div className="mt-4 w-64 mx-auto">
//             <video 
//               ref={videoRef}
//               autoPlay 
//               playsInline 
//               muted={true}
//               className="w-full rounded-lg shadow-lg"
//             />
//             <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }
// return (
//   <div className="flex flex-col h-[115vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
//     {/* Enhanced Header */}
//     <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
//       <div className="flex items-center space-x-4">
//         <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
//           <FiVideo className="h-6 w-6 text-white" />
//         </div>
//         <div>
//           <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//             Stream Control Center
//           </h1>
//           <p className="text-sm text-gray-300 flex items-center space-x-1">
//             <FiRadio className="h-3 w-3 text-green-400" />
//             <span>Room: {session?.roomCode}</span>
//           </p>
//         </div>
        
//         {/* RECORDING TIMER DISPLAY */}
//         {isRecording && (
//           <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
//             <div className="relative">
//               <BsFillRecordFill className="h-4 w-4 text-red-200" />
//               <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
//             </div>
//             <span className="text-sm font-bold text-white font-mono">
//               {formatRecordingTime(recordingTimer)}
//             </span>
//             <span className="text-xs text-red-100 font-medium">REC</span>
            
//             {/* Recording status dot */}
//             <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
//           </div>
//         )}
//       </div>
      
//       <div className="flex items-center space-x-4">
//         {/* Connection Status */}
//         <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
//           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//           <span className="text-sm font-medium">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
//         </div>
        
//         {/* Participants Count */}
//         <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 px-4 py-2 rounded-full backdrop-blur-sm">
//           <FiUsers className="h-4 w-4 text-white" />
//           <span className="text-sm font-medium">
//             {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
//           </span>
//         </div>

//         {/* Additional Recording Info (Optional) */}
//         {isRecording && (
//           <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
//             <span className="text-xs text-red-200 font-medium">Recording Active</span>
//             <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
//           </div>
//         )}

//         {/* Notification Badge for Pending Requests */}
//         {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
//           <div className="relative">
//             <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
//               <FiAlertCircle className="h-5 w-5 text-white" />
//             </button>
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
//               {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
//             </span>
//           </div>
//         )}

//         {/* Sidebar Toggle Button */}
//         <button
//           onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
//           className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
//           title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//         >
//           {sidebarCollapsed ? 
//             <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
//             <FiChevronRight className="h-5 w-5 text-blue-400" />
//           }
//           <span className="text-sm font-medium">
//             {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//           </span>
//         </button>

//         {/* End Session Button */}
//         <button
//           onClick={endStreaming}
//           className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
//         >
//           <FiLogOut className="h-4 w-4" />
//           <span>End Session</span>
//         </button>
//       </div>
//     </header>

//     {/* Main Content Area */}
//     <div className="flex-1 overflow-hidden relative">
//       {/* Thumbnails Overlay - Will cover entire screen when expanded */}
//       {thumbnailsExpanded && (
//         <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
//           <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/90">
//             <h2 className="text-xl font-bold flex items-center space-x-3">
//               <FiVideo className="h-6 w-6 text-blue-400" />
//               <span>All Cameras ({thumbnailsCount})</span>
//             </h2>
//             <div className="flex items-center space-x-4">
//               {/* Search filter (optional) */}
              
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
//                 title="Exit Full Screen"
//               >
//                 <FiX className="h-6 w-6" />
//               </button>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-6">
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid="streamer"
//                     stream={mediaStream}
//                     userName="You"
//                     onClick={() => {
//                       setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "streamer"}
//                     videoEnabled={videoEnabled}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//                     Host
//                   </div>
//                 </div>
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <div key={uid} className="relative group">
//                   <ThumbnailVideo
//                     uid={uid}
//                     stream={stream}
//                     userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                     onClick={() => {
//                       setZoomed({ type: "viewer", stream, userId: uid });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                     videoEnabled={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
//                     Viewer
//                   </div>
//                 </div>
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid={activeScreenShare.userId}
//                     stream={activeScreenShare.stream}
//                     userName={`${activeScreenShare.userName}'s Screen`}
//                     onClick={() => {
//                       setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "screen"}
//                     videoEnabled={true}
//                     isScreenShare={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//                     <FiMonitor className="h-3 w-3 mr-1" />
//                     Screen
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           <div className="p-4 border-t border-gray-700 bg-gray-800/90">
//             <div className="flex justify-between items-center">
//               <div className="text-sm text-gray-400">
//                 Click on any camera to zoom into it
//               </div>
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
//               >
//                 Back to Stream
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* When sidebar is collapsed */}
//       {sidebarCollapsed ? (
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//               {/* Zoomed Video View */}
//               {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Expand Sidebar Button */}
//               <div className="absolute right-4 top-4 z-20">
//                 <button
//                   onClick={() => setSidebarCollapsed(false)}
//                   className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
//                   title="Show Sidebar"
//                 >
//                   <FiChevronLeft className="h-5 w-5 text-blue-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           {/* Thumbnails Column - Always visible */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : (
//         /* Original Layout when sidebar is expanded */
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//          {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Thumbnails Column */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Sidebar - Expanded */}
//           <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Sidebar Toggle Header */}
//             <div className="flex border-b border-gray-600">
//               <button
//                 onClick={() => setSidebarView('participants')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'participants' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiUsers className="h-5 w-5" />
//                 <span className="text-sm font-medium">Participants</span>
//               </button>
//               <button
//                 onClick={() => setSidebarView('chat')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'chat' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiMessageSquare className="h-5 w-5" />
//                 <span className="text-sm font-medium">Chat</span>
//               </button>
              
//               {/* Collapse button inside sidebar */}
//               <button
//                 onClick={() => setSidebarCollapsed(true)}
//                 className="px-3 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all duration-200"
//                 title="Hide Sidebar"
//               >
//                 <FiChevronRight className="h-5 w-5" />
//               </button>
//             </div>

//             {/* Participants View */}
//             {sidebarView === 'participants' && (
//               <div className="flex-1 flex flex-col min-h-0">
//                 <div className="p-4 border-b border-gray-600">
//                   <div className="flex items-center justify-between">
//                     <h3 className="font-semibold text-lg flex items-center space-x-2">
//                       <FiUsers className="h-5 w-5 text-blue-400" />
//                       <span>Participants ({participants.length})</span>
//                     </h3>
//                     <button
//                       onClick={() => setShowParticipantsModal(true)}
//                       className="p-1 hover:bg-gray-700 rounded transition-colors"
//                       title="Manage Participants"
//                     >
//                       <FiUsers className="h-5 w-5 text-gray-400" />
//                     </button>
//                   </div>
//                 </div>
                
//                 <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//                   {participants.map((participant, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-colors duration-200"
//                     >
//                       <div className="flex items-center space-x-3">
//                         <div
//                           className={`w-3 h-3 rounded-full ${
//                             activeSpeakers.has(participant.socketId)
//                               ? "bg-green-400 animate-pulse"
//                               : participant.hasAudio
//                               ? "bg-blue-400"
//                               : "bg-gray-400"
//                           }`}
//                         ></div>
//                         <span className="truncate font-medium">
//                           {participant.name || participant.userName || participant.userId || "User"}
//                         </span>
//                       </div>
                      
//                       <div className="flex items-center space-x-2">
//                         {/* Audio permission icon */}
//                         {participant.hasAudio && (
//                           <button
//                             onClick={() => openRemoveAudioModal(participant)}
//                             className="p-1 text-blue-400 hover:text-red-400 transition-colors"
//                             title="Remove Audio Permission"
//                           >
//                             <FiMic className="h-4 w-4" />
//                           </button>
//                         )}

//                         {/* Stop Camera icon */}
//                         {participant.hasVideo && (
//                           <button
//                             onClick={() => {
//                               emitSocketEvent("streamer-stop-viewer-video", {
//                                 sessionId: sessionId || roomCode,
//                                 targetSocketId: participant.socketId,
//                               });
//                               addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
//                             }}
//                             className="p-1 text-green-400 hover:text-red-400 transition-colors"
//                             title="Stop Camera"
//                           >
//                             <FiCameraOff className="h-4 w-4" />
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Chat View */}
//             {sidebarView === 'chat' && (
//               <ChatComponent
//                 messages={messages}
//                 onSendMessage={sendMessage}
//                 currentUserId={user?.id}
//                 uploadingFile={uploadingFile}
//                 socket={socket}
//                 sessionId={sessionId}
//                 roomCode={roomCode}
//               />
//             )}
//           </div>
//         </div>
//       )}
//     </div>

//     {/* Audio Permission Modal */}
//     <AudioPermissionModal
//       isOpen={showAudioPermissionModal}
//       onEnableAudio={handleEnableAudio}
//     />

//     {/* Updated Panels with Proper Z-index */}
//     <ViewerAudioRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//     />

//     <ScreenShareRequestsPanel
//       screenShareRequests={screenShareRequests}
//       handleScreenShareResponse={handleScreenShareResponse}
//     />

//     <ActiveViewerAudioPanel
//       activeViewerAudio={activeViewerAudio}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//     />

//     <ActiveScreenSharesPanel
//       activeScreenShare={activeScreenShare}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//     />

//     <ParticipantsModal
//       showParticipantsModal={showParticipantsModal}
//       setShowParticipantsModal={setShowParticipantsModal}
//       participants={participants}
//       activeSpeakers={activeSpeakers}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//       emitSocketEvent={emitSocketEvent}
//       sessionId={sessionId}
//       roomCode={roomCode}
//       addDebugLog={addDebugLog}
//       handleBanParticipant={handleBanParticipant}
//     />

//     <ViewerVideoRequestsPanel
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />

//     <ProducerStatus producersState={producersState} />

//     {/* Remove Audio Confirmation Modal */}
//     {audioRemoveTarget && (
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
//           <div className="flex items-center space-x-3 mb-4">
//             <FiAlertCircle className="h-6 w-6 text-red-500" />
//             <h3 className="text-lg font-semibold text-gray-900">Remove Audio?</h3>
//           </div>
//           <p className="text-gray-700 mb-6">
//             Do you want to remove audio for <strong className="text-gray-900">{audioRemoveTarget.name || audioRemoveTarget.userId}</strong>? 
//             They will need to request again to speak.
//           </p>
//           <div className="flex justify-end space-x-3">
//             <button 
//               onClick={() => setAudioRemoveTarget(null)}
//               className="flex items-center space-x-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
//             >
//               <FiX className="h-4 w-4" />
//               <span>Cancel</span>
//             </button>
//             <button 
//               onClick={confirmRemoveAudio}
//               className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//             >
//               <FiCheck className="h-4 w-4" />
//               <span>Remove Audio</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     )}
    
//     {/* Enhanced Controls Footer */}
//  <div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
//   <div className="flex justify-center space-x-6">
//     {/* Start/Resume/Pause Stream Control */}
//     {!roomState.isStreaming ? (
//       <button
//         onClick={startStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Streaming"
//         disabled={isInitializing || isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Start</span>
//       </button>
//     ) : roomState.isPaused ? (
//       <button
//         onClick={resumeStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Resume Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Resume</span>
//       </button>
//     ) : (
//       <button
//         onClick={pauseStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Pause Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPause className="text-xl mb-1" />
//         <span className="text-xs font-medium">Pause</span>
//       </button>
//     )}
    
//     {/* Audio Toggle */}
//     <button
//       onClick={toggleAudio}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         audioEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//       disabled={isRecordingLoading || isRecordingStopping}
//     >
//       {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
//     </button>

//     {/* Video Toggle */}
//     <button
//       onClick={toggleVideo}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         videoEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={videoEnabled ? "Disable Video" : "Enable Video"}
//       disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//     >
//       {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
//     </button>
    
//     {/* Smart Screen Share Button */}
//     {activeScreenShare?.source === "streamer" ? (
//       <button
//         onClick={stopScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title={isRecording ? "Stop Screen Share & Recording" : "Stop Screen Share"}
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <div className="relative">
//           <FiSquare className="text-xl mb-1" />
//           {isRecording && (
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
//           )}
//         </div>
//         <span className="text-xs font-medium">
//           {isRecording ? 'Stop Both' : 'Stop Share'}
//         </span>
//         {isRecording && (
//           <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] px-1 rounded">
//             REC
//           </span>
//         )}
//       </button>
//     ) : (
//       <button
//         onClick={startScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl hover:from-gray-700 hover:to-gray-800 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Screen Share"
//         disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//       >
//         <MdOutlineScreenShare className="text-xl mb-1" />
//         <span className="text-xs font-medium">Share Screen</span>
//       </button>
//     )}
    
//     {/* Smart Recording Button */}
//     <button
//       onClick={handleRecordingToggle}
//       disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         isRecording 
//           ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
//           : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
//       }`}
//       title={
//         isRecording 
//           ? `Stop Recording (${formatRecordingTime(recordingTimer)})` 
//           : activeScreenShare 
//             ? "Record Current Screen Share" 
//             : "Start Screen Recording"
//       }
//     >
//       {isRecordingLoading ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Starting...</span>
//         </>
//       ) : isRecordingStopping ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Saving...</span>
//         </>
//       ) : isRecording ? (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
//           </div>
//           <span className="text-xs font-medium">Stop REC</span>
          
//           {/* Recording Timer Badge */}
//           <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//             {formatRecordingTime(recordingTimer)}
//           </span>
          
//           {/* Screen Share Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">
//               SCREEN
//             </span>
//           )}
          
//           {/* Recording Size Indicator */}
//           {recordingChunks.length > 0 && (
//             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] py-0.5 rounded-b-2xl">
//               {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//             </div>
//           )}
//         </>
//       ) : (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             {activeScreenShare && (
//               <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
//             )}
//           </div>
//           <span className="text-xs font-medium">
//             {activeScreenShare ? 'Record Share' : 'Record'}
//           </span>
          
//           {/* Tooltip Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
//               ✓
//             </span>
//           )}
//         </>
//       )}
//     </button>

//     {/* End Stream Button */}
//     {roomState.isStreaming && (
//       <button
//         onClick={endStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="End Stream for All Participants"
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <FiStopCircle className="text-xl mb-1" />
//         <span className="text-xs font-medium">End Stream</span>
        
//         {/* Warning Indicator if Recording is Active */}
//         {isRecording && (
//           <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
//             !
//           </span>
//         )}
//       </button>
//     )}
//   </div>
  
//   {/* Recording Status Bar */}
//   {isRecording && (
//     <div className="mt-3 mx-auto max-w-2xl">
//       <div className="flex items-center justify-between text-xs text-gray-300">
//         <div className="flex items-center space-x-2">
//           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
//           <span className="font-medium">Recording Active</span>
//           <span className="text-gray-400">•</span>
//           <span>{formatRecordingTime(recordingTimer)}</span>
//           <span className="text-gray-400">•</span>
//           <span>
//             {activeScreenShare 
//               ? `Recording ${activeScreenShare.userName}'s screen` 
//               : 'Recording screen & audio'}
//           </span>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {recordingChunks.length > 0 && (
//             <>
//               <span className="text-gray-400">Size:</span>
//               <span className="font-mono">
//                 {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//               </span>
//             </>
//           )}
//         </div>
//       </div>
      
//       {/* Recording Progress Bar */}
//       <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
//         <div 
//           className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
//           style={{ 
//             width: `${Math.min((recordingTimer % 60) / 60 * 100, 100)}%`,
//             animationDuration: '1s'
//           }}
//         ></div>
//       </div>
//     </div>
//   )}
// </div>
//   </div>
// );

// };

// export default LiveSession; 

























//perfect
//  import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { io } from 'socket.io-client';
// import * as mediasoupClient from 'mediasoup-client';
// import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
// import ChatComponent from './ChatComponent';
// import AudioPermissionModal from './AudioPermissionModal';

// import { 
//   getRecordingUploadUrl, 
//   saveRecordingMetadata,
//   getRecordingDownloadUrl,
//   formatFileSize
// } from './recordingService';

// import { toast } from 'react-toastify';
// import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiShare2, FiSquare, FiUsers, FiMessageSquare, FiSettings, FiUser, FiUserCheck,
//   FiUserX, FiAirplay, FiCamera, FiCameraOff, FiCheck, FiX, FiLoader, FiLogOut, FiRefreshCw, FiPlay, FiPause, FiStopCircle,
//   FiArrowUpRight, FiChevronDown, FiSend, FiAlertCircle, FiWifi, FiWifiOff, FiCircle, FiRadio, FiMenu, FiGrid, FiList,
//   FiMonitor, FiMaximize2, FiMinimize2, FiImage, FiSmile, FiFile, FiDownload} from 'react-icons/fi';
// import { IoVideocam, IoVideocamOff, IoShareOutline, IoStop, IoExitOutline, IoPeople, IoChatbubbleEllipses,
//   IoCog, IoPlay, IoPause, IoExpand, IoContract} from 'react-icons/io5';
// import { MdOutlineScreenShare , MdStopScreenShare, MdPlayArrow, MdPause, MdStop, MdGroup, MdChat, MdSettings, MdExitToApp, MdRefresh,
//   MdWarning,
//   MdError
// } from 'react-icons/md';
// import { FiChevronRight,FiChevronLeft,FiMaximize,FiSearch  } from "react-icons/fi";


// import { BsFillRecordFill } from "react-icons/bs";
// import { 
//   useRecordingTimer, 
//   RecordingTimerDisplay, 
//   RecordingStatusBadge,
//   formatTime 
// } from './RecordingTimer';

// import {
//   ActiveViewerAudioPanel,
//   ActiveScreenSharesPanel,
//   ProducerStatus,
//   ParticipantsModal,
//   ViewerVideoRequestsPanel,
//   ViewerAudioRequestsPanel,
//   ScreenShareRequestsPanel,
//   MobileHeader,
//   MobileNavigation,
//   MobileRequestsPanel,
//   MobileControls,
//   MobileParticipantsView,
//   MobileChatView,
//   MobileVideoView,
//   ThumbnailVideo
// } from './components';


// const LiveSession = () => {
//   const { sessionId, roomCode } = useParams();
//   const navigate = useNavigate();
//   const { user, token } = useAuth();
//   const [socket, setSocket] = useState(null);
//   const [showWhiteboard, setShowWhiteboard] = useState(false);
// const [recordings, setRecordings] = useState([]);
// const [showRecordingsModal, setShowRecordingsModal] = useState(false);
// const [isRecordingLoading, setIsRecordingLoading] = useState(false);
// const [isRecordingStopping, setIsRecordingStopping] = useState(false); // ✅ नया state add करें
// const [recordingInterval, setRecordingInterval] = useState(null); // ✅ नया state
// const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);
// const [fullScreenThumbnails, setFullScreenThumbnails] = useState(false);
// const [autoStartRecording, setAutoStartRecording] = useState(false);

// const [recordingStream, setRecordingStream] = useState(null);

// const { 
//   recordingTimer,
//   recordingStartTime,
//   isRecordingActive,
//   startRecordingTimer,
//   stopRecordingTimer,
//   resetRecordingTimer,
//   formatRecordingTime 
// } = useRecordingTimer();

// const [isLandscape, setIsLandscape] = useState(false);

// const [recorder, setRecorder] = useState(null);
// const [recordedBlob, setRecordedBlob] = useState(null);
// const [recordingChunks, setRecordingChunks] = useState([]);

//    const [showAudioPermissionModal, setShowAudioPermissionModal] = useState(false);
//   const [userInteracted, setUserInteracted] = useState(false);
//   const [pendingAudioStreams, setPendingAudioStreams] = useState(new Map());
//    const [uploadingFile, setUploadingFile] = useState(false);
//   const [chatInput, setChatInput] = useState('');
// const [thumbnailsPosition, setThumbnailsPosition] = useState('right');
// const [streamerThumbnailVisible, setStreamerThumbnailVisible] = useState(true);
// const [sidebarView, setSidebarView] = useState('participants');
// const [isWebSocketInitialized, setIsWebSocketInitialized] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);
//    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
// const [showRequests, setShowRequests] = useState(false);
//   const [mobileView, setMobileView] = useState('video');
//   const [showMobileControls, setShowMobileControls] = useState(true);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [showThumbnails, setShowThumbnails] = useState(false);
//   const [session, setSession] = useState(null);
//   const [participants, setParticipants] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [permissionStatus, setPermissionStatus] = useState('checking');
//   const [mediaError, setMediaError] = useState(null);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [cameraVisible, setCameraVisible] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [showPlayButton, setShowPlayButton] = useState(false);
//   const [localPausedState, setLocalPausedState] = useState(false);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [iceServers, setIceServers] = useState([]);
//   const [isMediaInitialized, setIsMediaInitialized] = useState(false);
//   const [debugLog, setDebugLog] = useState([]);
//   const [producersState, setProducersState] = useState(new Map());
//   const [consumersState, setConsumersState] = useState(new Map());
//   const [isStreamPaused, setIsStreamPaused] = useState(false);
//   const [showParticipantsModal, setShowParticipantsModal] = useState(false);
//   const [selectedParticipant, setSelectedParticipant] = useState(null);
//   const [activeSpeakers, setActiveSpeakers] = useState(new Map());
//   const [viewerAudioRequests, setViewerAudioRequests] = useState([]);
//   const [screenShareRequests, setScreenShareRequests] = useState([]);
//   const [activeViewerAudio, setActiveViewerAudio] = useState(new Map());
//   const [activeScreenShare, setActiveScreenShare] = useState(null);
//    const [audioRemoveTarget, setAudioRemoveTarget] = useState(null);
//    const [zoomed, setZoomed] = useState(null);
//   const [mediaStream, setMediaStream] = useState(null);
//   const [viewerAudios, setViewerAudios] = useState(new Map());
// const [viewerVideoRequests, setViewerVideoRequests] = useState([]);
// const [viewerCameras, setViewerCameras] = useState(new Map()); 
//   const streamerMediaRef = useRef(new MediaStream());
//   const viewerAudiosRef = useRef(new Map());
//   const videoRef = useRef(null);
//   const screenRef = useRef(null);
//   const remoteVideosRef = useRef(new Map());
//   const transports = useRef(new Map());
//   const producers = useRef(new Map());
//   const consumers = useRef(new Map());
//   const userGestureHandlerRef = useRef(null);
//   const isMountedRef = useRef(true);
//   const sendTransportRef = useRef(null);
//   const recvTransportRef = useRef(null);
//   const audioElementsRef = useRef(new Map());
//   const pendingAudioQueueRef = useRef(new Map());
//   const socketRef = useRef(null);
//   const zoomedVideoRef = useRef(null); // ✅ Add this near other refs
//   const audioContextRef = useRef(null);
// const audioDestinationRef = useRef(null);
//   const [device] = useState(new mediasoupClient.Device());
//   const [showRecorder, setShowRecorder] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);

//   const [roomState, setRoomState] = useState({
//     isStreaming: false,
//     isPaused: false,
//     whiteboardEnabled: true
//   });
//   const emitSocketEvent = (event, data, callback) => {
//     if (socketRef.current && socketRef.current.connected) {
//       if (callback) {
//         socketRef.current.emit(event, data, callback);
//       } else {
//         socketRef.current.emit(event, data);
//       }
//       addDebugLog(`📤 Emitted ${event} event`);
//       return true;
//     } else {
//       addDebugLog(`❌ Cannot emit ${event}: Socket not connected`);
//       return false;
//     }
//   };

//   const getSocket = () => {
//     return socketRef.current;
//   };
//   const toggleZoom = (type, stream, userId) => {
//   setZoomed((prev) => {
//     if (prev && prev.type === type && prev.userId === userId) {
//       return null; // unzoom
//     }
//     return { type, stream, userId };
//   });
// };

//   const addDebugLog = (message) => {
//     console.log(message);
//     setDebugLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
//   };

//   // ========== SOCKET EVENT HANDLERS ==========

//  const stopScreenShare = useCallback(() => {
//   addDebugLog("🛑 Stopping screen share...");

//   // 🔴 Agar recording chal rahi hai to pehle stop karen
//   if (isRecording) {
//     addDebugLog("🎬 Also stopping recording with screen share...");
    
//     // Recording stop karen
//     if (recorder && recorder.state === 'recording') {
//       try {
//         recorder.stop();
//         addDebugLog("⏹️ Recording stopped with screen share");
        
//         // Recording timer stop karen
//         stopRecordingTimer();
//         setIsRecording(false);
        
//         // Recording stream cleanup
//         if (recordingStream) {
//           recordingStream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//             }
//           });
//           setRecordingStream(null);
//         }
        
//         // Recording chunks clear karen
//         setRecordingChunks([]);
        
//         toast.info('Recording also stopped with screen share');
//       } catch (recordingError) {
//         addDebugLog(`❌ Error stopping recording: ${recordingError.message}`);
//       }
//     }
//   }

//   // 🔴 Screen audio producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen-audio") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen audio producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen audio producer: ${err.message}`);
//       }
//     }
//   });

//   // 🔴 Screen video producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen share video producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen share producer: ${err.message}`);
//       }
//     }
//   });

//   // 🖥️ Agar activeScreenShare streamer ka hai → tracks stop kardo
//   if (activeScreenShare?.source === "streamer" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         try {
//           if (track.readyState === 'live') {
//             track.stop();
//             addDebugLog(`🛑 Stopped screen share track: ${track.kind} - ${track.id}`);
//           }
//         } catch (trackError) {
//           addDebugLog(`⚠️ Error stopping track: ${trackError.message}`);
//         }
//       });
//       addDebugLog("✅ Streamer screen tracks stopped");
//     } catch (streamError) {
//       addDebugLog(`❌ Error stopping streamer screen tracks: ${streamError.message}`);
//     }
//   }

//   // 🖥️ Viewer screen share ka case handle karen
//   if (activeScreenShare?.source === "viewer-screen" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       addDebugLog(`🛑 Viewer screen tracks stopped for user: ${activeScreenShare.userId}`);
//     } catch (viewerError) {
//       addDebugLog(`⚠️ Error stopping viewer screen tracks: ${viewerError.message}`);
//     }
//   }

//   // 🔄 Zoom reset karen agar screen share zoomed hai
//   setZoomed(prev => {
//     if (prev && prev.type === "screen") {
//       addDebugLog(`🔄 Resetting zoom for stopped screen share`);
//       return null;
//     }
//     return prev;
//   });

//   // ❌ Active screen share state clear karen
//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer" || prev?.source === "viewer-screen") {
//       addDebugLog(`✅ Active screen share cleared: ${prev.userName}`);
//       return null;
//     }
//     return prev;
//   });

//   // 🎬 Screen ref clear karen
//   if (screenRef.current) {
//     try {
//       screenRef.current.srcObject = null;
//       screenRef.current.load?.();
//       addDebugLog("✅ Screen ref cleared");
//     } catch (screenRefError) {
//       addDebugLog(`⚠️ Error clearing screenRef: ${screenRefError.message}`);
//     }
//   }

//   // 📡 Server ko notify karen (only if streamer)
//   if (socket && activeScreenShare?.source === "streamer") {
//     try {
//       socket.emit("screen-share-stop", {
//         sessionId: sessionId || roomCode,
//         userId: user?.id,
//         source: "streamer"
//       });
//       addDebugLog("📤 Emitted screen-share-stop to server");
//     } catch (emitError) {
//       addDebugLog(`⚠️ Error emitting screen-share-stop: ${emitError.message}`);
//     }
//   }

//   // Viewer screen share ka case (agar viewer ne share kiya hai)
//   if (activeScreenShare?.source === "viewer-screen") {
//     addDebugLog(`🖥️ Viewer screen share cleanup for user: ${activeScreenShare.userId}`);
    
//     // Server ko notify karen (viewer ka screen share stop ho raha hai)
//     if (socket) {
//       try {
//         socket.emit("screen-share-force-stop", {
//           sessionId: sessionId || roomCode,
//           targetUserId: activeScreenShare.userId
//         });
//         addDebugLog(`📤 Notified server to stop viewer screen share: ${activeScreenShare.userId}`);
//       } catch (emitError) {
//         addDebugLog(`⚠️ Error notifying server: ${emitError.message}`);
//       }
//     }
//   }

//   // ✅ Screen share ke baad main camera restore ensure karen
//   // Agar main mediaStream hai to video element mein set karen
//   setTimeout(() => {
//     if (videoRef.current && mediaStream && !videoRef.current.srcObject) {
//       try {
//         videoRef.current.srcObject = mediaStream;
//         videoRef.current.play().catch(err => {
//           console.warn("Autoplay prevented after screen share:", err);
//         });
//         addDebugLog("✅ Main camera restored after screen share");
//       } catch (restoreError) {
//         addDebugLog(`⚠️ Error restoring main camera: ${restoreError.message}`);
//       }
//     }
//   }, 100);

//   // Toast notification
//   const toastMessage = isRecording 
//     ? 'Screen share & recording stopped' 
//     : 'Screen share stopped';
    
//   toast.success(toastMessage, {
//     position: "bottom-right",
//     autoClose: 3000,
//   });

//   addDebugLog("✅ Screen share fully stopped");

// }, [
//   isRecording, 
//   socket, 
//   sessionId, 
//   roomCode, 
//   user, 
//   activeScreenShare,
//   recorder,           // ✅ Added for recording control
//   recordingStream,    // ✅ Added for recording cleanup
//   stopRecordingTimer, // ✅ Added for timer control
//   mediaStream         // ✅ Added for camera restoration
// ]);


// const handleRecordingToggle = async () => {
//   if (isRecordingLoading || isRecordingStopping) {
//     toast.info('Recording operation is already in progress. Please wait...');
//     return;
//   }

//   if (!isRecording) {
//     await startRecording();
//   } else {
//     await stopRecording();
//   }
// };


// const startRecording = async () => {
//   try {
//     setIsRecordingLoading(true);
    
//     // Agar active screen share hai to usi se record karen
//     if (activeScreenShare?.stream) {
//       addDebugLog(`📺 Recording from existing screen share: ${activeScreenShare.userName}`);
//       await startRecordingFromScreenShare(activeScreenShare.stream);
//     } else {
//       // Naya screen share se record karen
//       addDebugLog('🎬 Starting new screen recording...');
//       await startNewScreenShareWithRecording();
//     }
    
//   } catch (error) {
//     console.error('Failed to start recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startRecordingFromScreenShare = async (screenShareStream) => {
//   try {
//     setIsRecordingLoading(true);

//     // 1. Get Streamer Mic
//     let currentMicStream = null;
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       currentMicStream = mediaStream;
//     } else {
//       // Agar mic nahi hai to request karein
//       try {
//         currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       } catch (e) {
//         console.warn("Mic not found for recording");
//       }
//     }

//     // 2. 🔥 Get Mixed Audio (Streamer + Screen + Viewers)
//     const mixedAudioTrack = getMixedAudioStream(screenShareStream, currentMicStream);

//     // 3. Prepare Recording Stream
//     const recordingStream = new MediaStream();

//     // Add Video
//     const videoTrack = screenShareStream.getVideoTracks()[0];
//     if (videoTrack && 'contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion';
//       addDebugLog("🎬 Recording: Applied contentHint 'motion' for screen video");
//     }
//     if (videoTrack) {
//       recordingStream.addTrack(videoTrack.clone());
//     }

//     // Add Mixed Audio
//     if (mixedAudioTrack) {
//       recordingStream.addTrack(mixedAudioTrack);
//     } else if (currentMicStream) {
//        // Fallback agar mixing fail hui
//        recordingStream.addTrack(currentMicStream.getAudioTracks()[0]);
//     }

//     // 4. Start Recording
//     startMediaRecorder(recordingStream, screenShareStream, null);

//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Recording Started (All Audio Included)!');

//   } catch (error) {
//     console.error('Error starting recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecordingLoading(false);
//   }
// };

// const startNewScreenShareWithRecording = async () => {
//   try {
//     // 1. Screen Share Stream Start karein
//     const screenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         frameRate: { ideal: 60, max: 60 },
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//       audio: true, // System audio capture karne ke liye
//     });

//     // 2. Microphone Audio Setup (CRITICAL FIX FOR BLACK CAMERA)
//     let micTrack = null;

//     // Check karein agar main mediaStream (Camera+Mic) already chal raha hai
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       addDebugLog('🎤 Using existing microphone track for recording (Cloned)');
      

//       micTrack = mediaStream.getAudioTracks()[0].clone();
      
//     } else {
//       // Agar mic pehle se on nahi hai, tabhi naya request karein
//       try {
//         addDebugLog('🎤 Requesting new microphone permission');
//         const micStream = await navigator.mediaDevices.getUserMedia({
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//           },
//         });
//         micTrack = micStream.getAudioTracks()[0];
//       } catch (micError) {
//         addDebugLog('⚠️ Mic permission denied or not available for recording');
//       }
//     }

//     // 3. Participants ke liye Screen Share setup karein (Existing logic)
//     if (user?.role === 'streamer' || !user?.role) {
//       try {
//         await startScreenShareForParticipants(screenStream);
//       } catch (shareError) {
//         addDebugLog('⚠️ Could not share with participants, but recording will continue');
//       }
//     }

//     // 4. Recording ke liye Final Stream banayein
//     const recordingStream = new MediaStream();

//     // Screen Video add karein
//     screenStream.getVideoTracks().forEach(track => recordingStream.addTrack(track));
    
//     // Screen Audio add karein (agar user ne share kiya hai)
//     screenStream.getAudioTracks().forEach(track => recordingStream.addTrack(track));

//     // Mic Audio add karein (Cloned track)
//     if (micTrack) {
//       recordingStream.addTrack(micTrack);
//     }

//     // 5. Recording Start Karein
//     // Note: Hum micStream null bhej rahe hain kyunki humne track manually add kar diya hai
//     startMediaRecorder(recordingStream, screenStream, null);

//     // State Updates
//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Screen recording started! (Camera remains visible)');

//     // 6. Handle Stop (Jab user "Stop Sharing" click kare browser mein)
//     screenStream.getVideoTracks()[0].onended = () => {
//       addDebugLog('🖥️ Screen share ended by system UI');
//       stopRecording();
      
//       // Agar streamer share kar raha tha, to socket se bhi stop karein
//       if (activeScreenShare?.source === "streamer") {
//         stopScreenShare();
//       }
      
//       // Cloned mic track ko cleanup karein
//       if (micTrack) micTrack.stop();
//     };

//   } catch (error) {
//     console.error('Error starting new screen share with recording:', error);
//     toast.error('Failed to start recording');
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startScreenShareForParticipants = async (screenStream) => {
//   if (!sendTransportRef.current || !user) return;
  
//   try {
//     // ✅ Screen share ke tracks CLONE karen taki main stream disturb na ho
//     const videoTrack = screenStream.getVideoTracks()[0];
//     if (!videoTrack) return;
    
//     // Clone the track for sharing
//     const clonedVideoTrack = videoTrack.clone();
    
//     const videoProducer = await sendTransportRef.current.produce({
//       track: clonedVideoTrack,
//       appData: {
//         source: "screen",
//         userId: user.id,
//         userName: user.name || "Streamer",
//       },
//     });

//     addDebugLog(`✅ Screen share producer created: ${videoProducer.id}`);
    
//     // Audio track bhi share karen (agar available hai)
//     const audioTrack = screenStream.getAudioTracks()[0];
//     if (audioTrack) {
//       const clonedAudioTrack = audioTrack.clone();
//       await sendTransportRef.current.produce({
//         track: clonedAudioTrack,
//         appData: {
//           source: "screen-audio",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });
//     }

//     // ✅ Screen share stream ko alag store karen (main mediaStream ko overwrite na karen)
//     const screenShareStream = new MediaStream();
//     screenShareStream.addTrack(videoTrack);
//     if (audioTrack) screenShareStream.addTrack(audioTrack);

//     // Update active screen share state
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenShareStream,
//       source: "streamer",
//     });

//     // Notify server
//     if (socket) {
//       socket.emit("screen-share-started", {
//         sessionId: sessionId || roomCode,
//         userId: user.id,
//         userName: user.name || "Streamer",
//         hasAudio: !!audioTrack,
//         source: "screen",
//       });
//     }
    
//   } catch (error) {
//     console.error('Error sharing screen with participants:', error);
//     // Recording continue rahegi, bas sharing fail hua
//   }
// };

// const startMediaRecorder = (recordingStream, screenStream, micStream_UNUSED) => {
//   try {
//     const videoTrack = recordingStream.getVideoTracks()[0];

//     // ✅ 1. GPU Acceleration Preference
//     // H.264 (Hardware Accelerated) -> VP8 (CPU Light) -> VP9 (CPU Heavy)
//     const mimeTypes = [
//       'video/webm;codecs=h264,opus', // 🚀 BEST: Uses GPU (Intel/Nvidia/Mobile)
//       'video/webm;codecs=vp8,opus',  // Good Balance
//       'video/webm'                   // Fallback
//     ];

//     let selectedMimeType = '';
//     for (const mime of mimeTypes) {
//       if (MediaRecorder.isTypeSupported(mime)) {
//         selectedMimeType = mime;
//         console.log(`✅ GPU Optimization: Using Codec ${mime}`);
//         break;
//       }
//     }

//     // ✅ 2. Optimized Bitrate (2.5 Mbps is enough for 720p)
//     const options = {
//       mimeType: selectedMimeType || 'video/webm',
//       videoBitsPerSecond: 2500000, 
//       audioBitsPerSecond: 128000,
//     };

//     // ✅ 3. Lock Resolution & FPS (Crucial for performance)
//     if (videoTrack) {
//       try {
//         videoTrack.applyConstraints({
//           frameRate: { ideal: 60, max: 70 }, // 60fps causes lag, use 30
//           width: { ideal: 1280, max: 1920 }, // 720p is efficient
//           height: { ideal: 720, max: 1080 },
//           resizeMode: "crop-and-scale"
//         });
//       } catch (e) {
//         console.warn('Constraint error:', e);
//       }
//     }

//     const mediaRecorder = new MediaRecorder(recordingStream, options);
//     const chunks = [];
//     setRecordingChunks(chunks);

//     mediaRecorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         chunks.push(event.data);
//         setRecordingChunks((prev) => [...prev, event.data]);
//       }
//     };

//     mediaRecorder.onstop = async () => {
//         // ... (Apka purana save logic yahan same rahega) ...
//         const blob = new Blob(chunks, { type: 'video/webm' });
//         await uploadRecordingToServer(blob);
        
//         if (recordingStream) {
//             recordingStream.getTracks().forEach(track => track.stop());
//         }
//         setRecordingStream(null);
//         setRecordingChunks([]);
//         setIsRecordingStopping(false);
//         addDebugLog(`✅ Recording saved using ${selectedMimeType}`);
//     };

//     mediaRecorder.onerror = (error) => {
//       console.error('MediaRecorder error:', error);
//       toast.error('Recording failed');
//       setIsRecording(false);
//       stopRecordingTimer();
//     };

//     // ✅ 4. TimeSlice = 2000ms (Relaxes the CPU)
//     mediaRecorder.start(2000);
//     setRecorder(mediaRecorder);

//   } catch (error) {
//     console.error("Failed to start recorder:", error);
//     toast.error("Recording failed to start");
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };
// const stopRecording = useCallback(() => {
//   if (!recorder || recorder.state === 'inactive') return;

//   try {
//     addDebugLog('⏹️ Stopping recording...');
//     setIsRecordingStopping(true);
    
//     if (recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     stopRecordingTimer();
    
//     // Cleanup Recording Stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//       setRecordingStream(null);
//     }

//     // 🔥 CLEANUP AUDIO MIXER (Ye naya part hai)
//     if (audioContextRef.current) {
//       audioContextRef.current.close();
//       audioContextRef.current = null;
//       audioDestinationRef.current = null;
//       addDebugLog("🧹 Audio Mixer Cleaned Up");
//     }

//     toast.info('Processing recording...');
    
//   } catch (error) {
//     console.error('Error stopping:', error);
//   }
// }, [recorder, recordingStream, stopRecordingTimer]);

// const uploadRecordingToServer = async (blob) => {
//   try {
//     addDebugLog('📤 Uploading recording to backend (NEW API)...');
    
//     // ✅ Generate filename with session info
//     const fileName = `recording_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    
//     // ✅ Step 1: Get pre-signed URL from NEW API
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       blob.type,
//       blob.size
//     );
    
//     if (!presignedData?.uploadUrl) {
//       throw new Error('Failed to get upload URL from new API');
//     }
    
//     addDebugLog(`📁 Uploading to S3: ${fileName} (${formatFileSize(blob.size)})`);
    
//     // ✅ Step 2: Upload to S3 using presigned URL
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': blob.type,
//       },
//       body: blob,
//     });
    
//     if (!uploadResponse.ok) {
//       const errorText = await uploadResponse.text();
//       throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
//     }
    
//     addDebugLog('✅ Recording uploaded to S3 successfully');
    
//     // ✅ Step 3: Save recording metadata to NEW API
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: blob.type,
//       duration: recordingTimer,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey || presignedData.fileUrl,
//       thumbnailUrl: '', // You can add thumbnail generation later
//       recordingTitle: `Recording ${new Date().toLocaleDateString()}`,
//       description: `Recording of session ${sessionId}`,
//       recordedAt: new Date().toISOString()
//     };
    
//     const saveResponse = await saveRecordingMetadata(sessionId, saveData);
    
//     if (saveResponse.success) {
//       addDebugLog(`✅ Recording saved to database via new API: ${fileName}`);
      
//       // Get the recording ID from response
//       const recordingId = saveResponse.data?.recording?._id || 
//                          saveResponse.data?.id || 
//                          Date.now().toString();
      
//       toast.success(`🎉 Recording saved successfully! (${formatRecordingTime(recordingTimer)})`);
      
//       // Emit socket event
//       const socket = getSocket();
//       if (socket) {
//         socket.emit('recording_completed', {
//           sessionId,
//           recording: {
//             ...saveData,
//             id: recordingId
//           }
//         });
//       }
      
//       // ✅ Reset states
//       setIsRecording(false);
//       setRecorder(null);
//       setRecordedBlob(null);
//       resetRecordingTimer();
      
//       return { success: true, recordingId };
      
//     } else {
//       throw new Error('Failed to save recording metadata via new API');
//     }
    
//   } catch (error) {
//     console.error('❌ Recording upload error:', error);
    
//     // Try local fallback
//     try {
//       addDebugLog('⚠️ Upload failed, attempting local save...');
//       const localSuccess = saveRecordingLocally(blob);
//       if (localSuccess) {
//         toast.warning('Recording saved locally (backend upload failed)');
//         return { success: false, savedLocally: true };
//       } else {
//         toast.error('Failed to save recording anywhere');
//         return { success: false, savedLocally: false };
//       }
//     } catch (localError) {
//       console.error('Local save error:', localError);
//       toast.error('Failed to save recording anywhere');
//       return { success: false, savedLocally: false };
//     }
//   } finally {
//     setIsRecordingStopping(false);
//   }
// };
// // Helper function for local fallback
// const saveRecordingLocally = (blob) => {
//   try {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     const fileName = `recording_${sessionId}_${Date.now()}.webm`;
    
//     a.href = url;
//     a.download = fileName;
//     a.style.display = 'none';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Cleanup
//     setTimeout(() => {
//       URL.revokeObjectURL(url);
//     }, 1000);
    
//     return true;
//   } catch (error) {
//     console.error('Local save error:', error);
//     return false;
//   }
// };

// // Format file size helper
// const formatFileSize = (bytes) => {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// };

// // Cleanup on component unmount
// useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup media tracks
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // Cleanup window tracks
//     if (window.recordingTracks) {
//       window.recordingTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       window.recordingTracks = null;
//     }
//   };
// }, []);


// const getMixedAudioStream = (screenStream, micStream) => {
//   try {
//     addDebugLog("🎚️ Starting Audio Mixing...");
    
//     // 1. Create Audio Context
//     const AudioContext = window.AudioContext || window.webkitAudioContext;
//     const audioContext = new AudioContext();
//     const destination = audioContext.createMediaStreamDestination();

//     // Refs mein save karein (Cleanup ke liye)
//     audioContextRef.current = audioContext;
//     audioDestinationRef.current = destination;

//     // 2. Add Streamer Mic 🎤
//     if (micStream && micStream.getAudioTracks().length > 0) {
//       const micSource = audioContext.createMediaStreamSource(micStream);
//       // Optional: Volume Boost for Streamer
//       const gainNode = audioContext.createGain();
//       gainNode.gain.value = 1.0; 
//       micSource.connect(gainNode).connect(destination);
//       addDebugLog("✅ Streamer Mic mixed");
//     }

//     // 3. Add Screen Audio 🖥️
//     if (screenStream && screenStream.getAudioTracks().length > 0) {
//       const screenSource = audioContext.createMediaStreamSource(screenStream);
//       screenSource.connect(destination);
//       addDebugLog("✅ Screen Audio mixed");
//     }

//     // 4. Add All Existing Viewers 👥
//     viewerAudiosRef.current.forEach((stream, userId) => {
//       if (stream.getAudioTracks().length > 0) {
//         try {
//           const viewerSource = audioContext.createMediaStreamSource(stream);
//           viewerSource.connect(destination);
//           addDebugLog(`✅ Viewer ${userId} mixed`);
//         } catch (err) {
//           console.warn(`Could not mix viewer ${userId}`, err);
//         }
//       }
//     });

//     return destination.stream.getAudioTracks()[0]; // Mixed Track

//   } catch (error) {
//     console.error("Audio mixing failed:", error);
//     return null;
//   }
// };

//   const handleClose = () => {
//     setShowRecorder(false);
//     setIsRecording(false);
//   };

// // Permission check useEffect ko update karo
// useEffect(() => {
//   const checkPermissions = async () => {
//     try {
//       addDebugLog('🔍 Checking camera and microphone permissions...');
//       setPermissionStatus('checking');
      
//       // Mobile devices ke liye direct request karo
//       if (isMobile) {
//         addDebugLog('📱 Mobile device detected, requesting permissions directly...');
//         await initializeCamera();
//         return;
//       }
      
//       // Desktop ke liye existing logic
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//       const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
      
//       if (hasVideoPermission && hasAudioPermission) {
//         addDebugLog('✅ Camera and microphone permissions already granted');
//         setPermissionStatus('granted');
//         initializeCamera();
//       } else {
//         addDebugLog('ℹ️ Need to request camera/microphone permissions');
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     } catch (error) {
//       console.error('Error checking permissions:', error);
//       addDebugLog(`❌ Error checking permissions: ${error.message}`);
//       setPermissionStatus('denied');
//       setIsLoading(false);
//     }
//   };

//   checkPermissions();
// }, [isMobile]); // isMobile add karo dependency

// useEffect(() => {
//   if (activeScreenShare?.stream) {
//     // Check if not already zoomed on this screen
//     if (!zoomed || zoomed.userId !== activeScreenShare.userId) {
//       addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
      
//       setZoomed({
//         type: "screen",
//         stream: activeScreenShare.stream,
//         userId: activeScreenShare.userId
//       });
//     }
//   }
// }, [activeScreenShare]);

// useEffect(() => {
//   const resumeAll = () => {
//     document.querySelectorAll("audio").forEach((el) => {
//       el.play().catch(() => {});
//     });
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };

//   document.addEventListener("click", resumeAll, { once: true });
//   document.addEventListener("touchstart", resumeAll, { once: true });

//   return () => {
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };
// }, []);


// useEffect(() => {
//   const checkOrientation = () => {
//     // Check if mobile and landscape
//     const isLandscapeMode = window.innerWidth > window.innerHeight;
//     setIsLandscape(isLandscapeMode);
    
//     if (isMobile) {
//       addDebugLog(`📱 Mobile orientation: ${isLandscapeMode ? 'Landscape' : 'Portrait'} (${window.innerWidth}x${window.innerHeight})`);
//     }
//   };

//   // Initial check
//   checkOrientation();

//   // Listen for orientation changes
//   window.addEventListener('resize', checkOrientation);
//   window.addEventListener('orientationchange', checkOrientation);

//   return () => {
//     window.removeEventListener('resize', checkOrientation);
//     window.removeEventListener('orientationchange', checkOrientation);
//   };
// }, [isMobile]);
// useEffect(() => {
//   const handleFirstUserInteraction = () => {
//     addDebugLog('🎵 User interaction detected - enabling all audio');
//     setUserInteracted(true);
//     setShowAudioPermissionModal(false);
//     playAllAudio();
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
//   if (!userInteracted) {
//     document.addEventListener('click', handleFirstUserInteraction, { once: true });
//     document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   }
//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
// }, [userInteracted]);

//   useEffect(() => {
//     viewerAudios.forEach((stream, userId) => {
//       let audioEl = document.getElementById(`viewer-audio-${userId}`);
//       if (!audioEl) {
//         audioEl = document.createElement("audio");
//         audioEl.id = `viewer-audio-${userId}`;
//         audioEl.autoplay = true;
//         audioEl.playsInline = true;
//         audioEl.controls = false;
//         document.body.appendChild(audioEl);
//       }
//       audioEl.srcObject = stream;
//       audioEl.play().catch(err => {
//         console.warn(`Autoplay prevented for ${userId}, waiting for user gesture`, err);
//       });
//     });
//   }, [viewerAudios]);

  
// const openRemoveAudioModal = (participant) => {
//   setAudioRemoveTarget(participant);
// };

// const confirmRemoveAudio = () => {
//   if (audioRemoveTarget) {
//     handleMuteViewerAudio(audioRemoveTarget.socketId);
//     setAudioRemoveTarget(null);
//   }
// }; 
//   const handleNewViewerScreenProducer = useCallback((data) => {
//     addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
//     const socket = getSocket();
//     if (socket) {
//       createConsumer(sessionId || roomCode, data.producerId, data.kind);
//     } else {
//       addDebugLog('❌ Cannot create consumer: Socket not available');
//     }
//   }, [sessionId, roomCode]);

//   const handleViewerAudioPermissionGranted = useCallback((data) => {
//     addDebugLog(`Viewer audio permission granted: ${data.userId}`);
//     const socket = getSocket();
//     if (socket && data.userId !== user?.id) {
//       createConsumer(sessionId || roomCode, data.producerId, 'audio');
//     }
//   }, [sessionId, roomCode, user]);

//   const handleViewerAudioRequest = useCallback((data) => {
//     addDebugLog(`Viewer audio request from: ${data.requestedUserId}`);
//     setViewerAudioRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

// const playAllAudio = () => {
//   addDebugLog('🔊 Playing all audio elements...');
//   setTimeout(() => {
//     // Play all existing audio elements
//     audioElementsRef.current.forEach((audioEl, userId) => {
//       if (audioEl.paused && audioEl.srcObject) {
//         audioEl.play().catch(err => {
//           // Log but don't worry about autoplay errors
//           if (err.name !== 'NotAllowedError') {
//             addDebugLog(`⚠️ Failed to play audio for ${userId}: ${err.message}`);
//           }
//         });
//       }
//     });
//     pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
//       createAndPlayAudioElement(userId, streamInfo.audioStream, streamInfo.userName);
//     });

//     // Clear pending queue
//     pendingAudioQueueRef.current.clear();
//     setPendingAudioStreams(new Map());
    
//     addDebugLog('✅ All audio processing completed');
//   }, 200);
// };

// const createAndPlayAudioElement = (userId, audioStream, userName) => {
//   try {
//     let audioEl = document.getElementById(`viewer-audio-${userId}`);
//         if (audioEl) {
//       // Agar same stream already hai to kuch nahi karo
//       if (audioEl.srcObject === audioStream) {
//         addDebugLog(`✅ Audio already playing for user ${userId}`);
//         return audioEl;
//       }
      
//       // Old stream ko stop karo
//       if (audioEl.srcObject) {
//         audioEl.srcObject.getTracks().forEach(track => track.stop());
//       }
//       audioEl.pause();
//       audioEl.srcObject = null;
//     } else {
//       // Naya audio element create karo
//       audioEl = document.createElement("audio");
//       audioEl.id = `viewer-audio-${userId}`;
//       audioEl.playsInline = true;
//       audioEl.controls = false;
//       audioEl.muted = false;
//       audioEl.setAttribute('data-user-id', userId);
//       audioEl.setAttribute('data-user-name', userName);
//       document.body.appendChild(audioEl);
//     }
//     audioEl.srcObject = audioStream;
//         const playAudio = () => {
//       if (audioEl.paused) {
//         audioEl.play()
//           .then(() => {
//             addDebugLog(`✅ Audio playing for user ${userId}`);
//           })
//           .catch(error => {
//             // Agar play fail ho jaye to retry after short delay
//             if (error.name === 'NotAllowedError') {
//               addDebugLog(`⚠️ Audio play blocked for ${userId}, waiting for user gesture`);
//               // User interaction ke baad automatically play hoga
//             } else {
//               console.warn(`Audio play failed for ${userId}:`, error);
//               // Retry after 500ms
//               setTimeout(() => {
//                 if (audioEl.srcObject === audioStream && audioEl.paused) {
//                   audioEl.play().catch(e => {
//                     addDebugLog(`❌ Retry also failed for ${userId}: ${e.message}`);
//                   });
//                 }
//               }, 500);
//             }
//           });
//       }
//     };
//     if (userInteracted) {
//       // Small delay to avoid race condition
//       setTimeout(playAudio, 100);
//     }
//     audioElementsRef.current.set(userId, audioEl);
//     viewerAudiosRef.current.set(userId, audioStream);
//         setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.set(userId, audioStream);
//       return newMap;
//     });
//     addDebugLog(`🎤 Audio element ready for user ${userId}`);
//     return audioEl;
//   } catch (err) {
//     addDebugLog(`❌ Error creating audio element: ${err?.message || err}`);
//     return null;
//   }
// };
// const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
//   const audioStream = new MediaStream([audioTrack]);
//   const userId = producerInfo.userId;
//   const userName = producerInfo.userName || `User ${userId}`;
//   addDebugLog(`🎵 New audio consumer: ${userId} (${sourceType})`);
//   const existingAudioEl = audioElementsRef.current.get(userId);
//   if (existingAudioEl && existingAudioEl.srcObject === audioStream) {
//     addDebugLog(`⏩ Already have same audio stream for ${userId}, skipping`);
//     return;
//   }

//   if (userInteracted) {
//     createAndPlayAudioElement(userId, audioStream, userName);
//   } else {
//     pendingAudioQueueRef.current.set(userId, {
//       userId,
//       userName,
//       audioStream,
//       sourceType,
//       producerInfo,
//       timestamp: Date.now()
//     });
    
//     setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    
//     // Show permission modal if not already shown
//     if (!showAudioPermissionModal) {
//       setShowAudioPermissionModal(true);
//     }
    
//     addDebugLog(`⏳ Audio queued for user interaction: ${userName}`);

//     if (isRecording && audioContextRef.current && audioDestinationRef.current) {
//     try {
//       const newStream = new MediaStream([audioTrack]);
//       const newSource = audioContextRef.current.createMediaStreamSource(newStream);
//       newSource.connect(audioDestinationRef.current);
//       addDebugLog(`➕ New viewer ${producerInfo.userId} added to active recording`);
//     } catch (err) {
//       console.warn("Failed to add new viewer to recording mix", err);
//     }
//   }
//   }
// };
// const handleEnableAudio = () => {
//   addDebugLog('🎵 User manually enabled audio');
//   setUserInteracted(true);
//   setShowAudioPermissionModal(false);
  
//   // Small delay to ensure state update
//   setTimeout(() => {
//     playAllAudio();
//   }, 100);
// };

//   const handleScreenShareRequest = useCallback((data) => {
//     addDebugLog(`Screen share request from: ${data.requestedUserId}`);
//     setScreenShareRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

//   const handleViewerAudioStarted = useCallback((data) => {
//     addDebugLog(`Viewer audio started: ${data.userId}`);
//     setActiveViewerAudio(prev => new Map(prev).set(data.socketId, {
//       userId: data.userId,
//       socketId: data.socketId,
//       producerId: data.producerId
//     }));
//   }, []);

//   const handleViewerAudioMuted = useCallback((data) => {
//     addDebugLog(`Viewer audio muted: ${data.userId}`);
//     setActiveViewerAudio(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(data.socketId);
//       return newMap;
//     });
//   }, []);

//  // ✅ Viewer screen share started handler
// const handleScreenShareStarted = useCallback((data) => {
//   addDebugLog(`Screen share started by viewer: ${data.userId}`);

//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer") return prev;
//     return {
//       userId: data.userId,
//       userName: data.userName,
//       stream: null, // stream consumer banne ke baad attach hoga
//       source: "viewer-screen"
//     };
//   });
// }, [addDebugLog]);


// const handleScreenShareStopped = useCallback((data) => {
//   addDebugLog(
//     `🛑 Screen share stopped by viewer: ${data.userId}, source: ${data.source}`
//   );

//   // ✅ Reset zoom if same user's screen was zoomed
//   setZoomed((prev) => {
//     if (prev && prev.type === "screen" && prev.userId === data.userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped user: ${data.userId}`);
//       return null;
//     }
//     return prev;
//   });

//   // ✅ Forcefully clear active screen share
//   setActiveScreenShare((prev) => {
//     if (prev && prev.stream) {
//       try {
//         prev.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }
//     addDebugLog(`✅ Forced reset of active screen share (viewer: ${data.userId})`);
//     return null;
//   });
// }, [screenRef]);

//   const handleStopViewerScreenShare = useCallback((targetUserId) => {
//     emitSocketEvent('screen-share-force-stop', {
//       sessionId: sessionId || roomCode,
//       targetUserId
//     });
//     addDebugLog(`Stopped screen share for user: ${targetUserId}`);
//   }, [sessionId, roomCode]);

//   const handleViewerAudioResponse = useCallback((requesterSocketId, allow) => {
//     emitSocketEvent('viewer-audio-response', {
//       sessionId: sessionId || roomCode,
//       requesterSocketId,
//       allow
//     });
    
//     setViewerAudioRequests(prev => 
//       prev.filter(req => req.requesterSocketId !== requesterSocketId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed audio for viewer: ${requesterSocketId}`);
//     } else {
//       addDebugLog(`Denied audio for viewer: ${requesterSocketId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleScreenShareResponse = useCallback((requesterUserId, allow) => {
//     emitSocketEvent('screen-share-response', {
//       sessionId: sessionId || roomCode,
//       requesterUserId,
//       allow
//     });
    
//     setScreenShareRequests(prev => 
//       prev.filter(req => req.requestedUserId !== requesterUserId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed screen share for viewer: ${requesterUserId}`);
//     } else {
//       addDebugLog(`Denied screen share for viewer: ${requesterUserId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleMuteViewerAudio = useCallback((targetSocketId) => {
//     emitSocketEvent('streamer-stop-viewer-audio', {
//   sessionId: sessionId || roomCode,
//   targetSocketId
// });

//     addDebugLog(`Muted viewer audio: ${targetSocketId}`);
//   }, [sessionId, roomCode]);

//   const handleBanParticipant = useCallback((userId) => {
//     emitSocketEvent('ban-participant', {
//       sessionId: sessionId || roomCode,
//       userId
//     });
//     addDebugLog(`Banned participant: ${userId}`);
//   }, [sessionId, roomCode]);


// const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
//   try {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog("❌ No socket available for creating consumer");
//       return;
//     }

//     addDebugLog(`🎯 Creating consumer for producer: ${producerId}`);

//     // Skip if already have consumer
//     const existingConsumer = Array.from(consumers.current.values()).find(
//       (c) => c.producerId === producerId
//     );
//     if (existingConsumer) {
//       addDebugLog(`⚠️ Already have consumer for producer ${producerId}, skipping`);
//       return;
//     }

//     socket.emit(
//       "getProducerInfo",
//       { sessionId: currentSessionId, producerId },
//       async (info) => {
//         if (!info) {
//           addDebugLog(`❌ No producer info for producer: ${producerId}`);
//           return;
//         }

//         addDebugLog(
//           `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}`
//         );

//         // ✅ DEBUG LOG - देखें क्या info आ रहा है
//         console.log("PRODUCER INFO RECEIVED:", {
//           producerId,
//           source: info.source,
//           userId: info.userId,
//           userName: info.userName,
//           currentUser: user?.id
//         });
//         const isViewerScreenAudio = info.source === "viewer-screen-audio";
//         const isViewerMic = info.source === "viewer-mic";
//         const isViewerSource = isViewerScreenAudio || isViewerMic;
//         if (isViewerSource) {
//           addDebugLog(`🎤 Processing viewer audio (${info.source}) from user ${info.userId}`);
//         } else {
//           // अन्य sources के लिए self check करें
//           const isSelfProducer = info.userId?.toString() === user?.id?.toString();
//           const isStreamerAudio = info.source === 'streamer-mic' || info.source === 'mic' || info.source === 'screen-audio';
//           const isStreamerCamera = info.source === 'streamer-camera' || info.source === 'camera';
          
//           if (isSelfProducer) {
//             addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
//             return;
//           }
//           if ((isStreamerAudio || isStreamerCamera) && isSelfProducer) {
//             addDebugLog(`⏩ Skipping streamer media: ${info.source}`);
//             return;
//           }
//         }

//         // store producer state
//         setProducersState((prev) =>
//           new Map(prev).set(producerId, {
//             id: producerId,
//             kind: info.kind,
//             userId: info.userId,
//             userName: info.userName,
//             source: info.source || "camera",
//             paused: false,
//           })
//         );

//         if (!transportId && recvTransportRef.current)
//           transportId = recvTransportRef.current.id;
//         if (!transportId) {
//           addDebugLog("❌ No recv transport available for consumer");
//           return;
//         }

//         socket.emit(
//           "consume",
//           {
//             sessionId: currentSessionId,
//             transportId,
//             producerId,
//             rtpCapabilities: device.rtpCapabilities,
//           },
//           async (response) => {
//             if (response.error || !response.params) {
//               addDebugLog(`❌ Failed to consume: ${response.error}`);
//               return;
//             }

//             const consumerParams = response.params;
//             const transport = transports.current.get(transportId);
//             if (!transport) {
//               addDebugLog(`❌ No transport found for ID: ${transportId}`);
//               return;
//             }

//             try {
//               const consumer = await transport.consume({
//                 id: consumerParams.id,
//                 producerId: consumerParams.producerId,
//                 kind: consumerParams.kind,
//                 rtpParameters: consumerParams.rtpParameters,
//                 appData: { 
//                   source: info.source || "camera",
//                   userId: info.userId,
//                   userName: info.userName
//                 },
//               });

//               consumers.current.set(consumer.id, consumer);
//               addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source})`);

//               // ✅ DEBUG: consumer details
//               console.log("CONSUMER CREATED:", {
//                 id: consumer.id,
//                 kind: consumer.kind,
//                 source: info.source,
//                 track: consumer.track ? "Has track" : "No track",
//                 trackKind: consumer.track?.kind,
//                 trackReadyState: consumer.track?.readyState
//               });

//               // === Handle sources ===
//               if (consumer.track) {
//                 if (info.source === "screen" || info.source === "viewer-screen") {
//                   // 🔹 Screen share VIDEO
//                   const screenStream = new MediaStream([consumer.track]);
//                   setActiveScreenShare({
//                     userId: info.userId,
//                     userName: info.userName || (info.source === "screen" ? "Streamer" : "Viewer"),
//                     stream: screenStream,
//                     source: info.source,
//                   });
//                   addDebugLog(`🖥️ Active screen set (${info.source})`);

//                 } else if (info.source === "viewer-screen-audio") {
//                   // 🔹 Screen share AUDIO - Simplified permission system
//                   console.log("🎵 Handling viewer-screen-audio for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                  
//                 } else if (info.source === "viewer-mic") {
//                   // 🔹 Viewer MIC audio - Simplified permission system
//                   console.log("🎤 Handling viewer-mic for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-mic");
                  
//                 } else if (info.source === "viewer-camera") {
//                   // 🔹 Viewer camera
//                   try {
//                     const videoStream = new MediaStream([consumer.track]);
//                     setViewerCameras((prev) => {
//                       const newMap = new Map(prev);
//                       newMap.set(info.userId, videoStream);
//                       return newMap;
//                     });
//                     addDebugLog(`📷 Viewer camera stored for ${info.userId}`);
//                   } catch (err) {
//                     addDebugLog(`❌ Error storing viewer camera: ${err?.message || err}`);
//                   }

//                 } else if (consumer.track.kind === "video") {
//                   // Streamer video skip
//                   addDebugLog(`⏩ Skipping streamer video: ${info.source}`);

//                 } else if (consumer.track.kind === "audio") {
//                   // Streamer audio skip
//                   addDebugLog(`⏩ Skipping streamer audio: ${info.source}`);

//                 } else {
//                   addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
//                 }
//               } else {
//                 addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
//               }
//               socket.emit(
//                 "consumer-resume",
//                 { sessionId: currentSessionId, consumerId: consumer.id },
//                 (resumeResponse) => {
//                   if (resumeResponse?.success) {
//                     addDebugLog(`✅ Consumer ${consumer.id} resumed`);
//                   } else {
//                     addDebugLog(`❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error}`);
//                   }
//                 }
//               );
//             } catch (error) {
//               addDebugLog(`❌ Error creating consumer: ${error.message}`);
//               console.error("Consumer creation error:", error);
//             }
//           }
//         );
//       }
//     );
//   } catch (error) {
//     addDebugLog(`❌ Error in createConsumer: ${error.message}`);
//     console.error("createConsumer error:", error);
//   }
// };

// const cleanupViewerAudio = (userId) => {
//   addDebugLog(`🧹 Starting audio cleanup for user: ${userId}`);
//   if (pendingAudioQueueRef.current.has(userId)) {
//     const pendingStream = pendingAudioQueueRef.current.get(userId)?.audioStream;
//     if (pendingStream) {
//       try {
//         pendingStream.getTracks().forEach((t) => {
//           if (t.readyState === 'live') {
//             t.stop();
//             addDebugLog(`🛑 Stopped pending audio track: ${t.id}`);
//           }
//         });
//         addDebugLog(`🗑️ Stopped pending audio tracks for user: ${userId}`);
//       } catch (e) {
//         addDebugLog(`⚠️ Error stopping pending audio tracks: ${e.message}`);
//       }
//     }
//     pendingAudioQueueRef.current.delete(userId);
    
//     // Update pending streams state
//     setPendingAudioStreams(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });
    
//     addDebugLog(`✅ Removed from pending audio queue: ${userId}`);
//   }

//   const cleanupAudioElement = () => {
//     const audioEl = audioElementsRef.current.get(userId);
//     if (audioEl) {
//       try {
//         // Pause and clean up the audio element
//         if (!audioEl.paused) {
//           audioEl.pause();
//           addDebugLog(`⏸️ Paused audio element for user: ${userId}`);
//         }
        
//         // Clear srcObject and stop tracks if they exist
//         if (audioEl.srcObject) {
//           const stream = audioEl.srcObject;
//           stream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//               addDebugLog(`🛑 Stopped audio track: ${track.id}`);
//             }
//           });
//           audioEl.srcObject = null;
//         }
        
//         // Remove from DOM with delay to avoid race conditions
//         setTimeout(() => {
//           try {
//             if (audioEl.parentNode) {
//               audioEl.parentNode.removeChild(audioEl);
//               addDebugLog(`🗑️ Removed audio element from DOM for user: ${userId}`);
//             }
//           } catch (domError) {
//             addDebugLog(`⚠️ Error removing audio element from DOM: ${domError.message}`);
//           }
//         }, 100);
        
//       } catch (e) {
//         addDebugLog(`⚠️ Error in audio element cleanup: ${e.message}`);
//       }
      
//       // Remove from refs
//       audioElementsRef.current.delete(userId);
//     }
//   };

//   // ✅ Step 3: Clean up from viewerAudiosRef
//   const audioStream = viewerAudiosRef.current.get(userId);
//   if (audioStream) {
//     try {
//       audioStream.getTracks().forEach((t) => {
//         if (t.readyState === 'live') {
//           t.stop();
//           addDebugLog(`🛑 Stopped active audio track: ${t.id}`);
//         }
//       });
//     } catch (e) {
//       addDebugLog(`⚠️ Error stopping active audio stream: ${e.message}`);
//     }
//     viewerAudiosRef.current.delete(userId);
//   }

//   cleanupAudioElement();
//   setTimeout(() => {
//     const domAudioElements = document.querySelectorAll(`[data-user-id="${userId}"], #viewer-audio-${userId}`);
//     domAudioElements.forEach(el => {
//       try {
//         if (el.paused === false) {
//           el.pause();
//         }
//         if (el.srcObject) {
//           el.srcObject.getTracks().forEach(track => track.stop());
//           el.srcObject = null;
//         }
//         if (el.parentNode) {
//           el.parentNode.removeChild(el);
//           addDebugLog(`🗑️ Backup cleanup for audio element: ${userId}`);
//         }
//       } catch (e) {
//         addDebugLog(`⚠️ Error in backup DOM cleanup: ${e.message}`);
//       }
//     });
//   }, 200);

//   // ✅ Step 5: Remove screen share audio if exists
//   if (userId === activeScreenShare?.userId) {
//     setTimeout(() => {
//       const screenAudioElements = document.querySelectorAll(`[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`);
//       screenAudioElements.forEach(screenAudioEl => {
//         try {
//           screenAudioEl.pause();
//           screenAudioEl.srcObject = null;
//           if (screenAudioEl.parentNode) {
//             screenAudioEl.parentNode.removeChild(screenAudioEl);
//           }
//           addDebugLog(`🗑️ Cleaned up screen share audio for user: ${userId}`);
//         } catch (e) {
//           addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
//         }
//       });
//     }, 100);
//   }

//   // ✅ Step 6: Update viewerAudios state (with delay to ensure cleanup is done)
//   setTimeout(() => {
//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(userId)) {
//         newMap.delete(userId);
//         addDebugLog(`🔄 Removed from viewerAudios state: ${userId}`);
//       }
//       return newMap;
//     });

//     // ✅ Step 7: Check if we need to hide the audio modal
//     if (pendingAudioStreams.size === 0 && showAudioPermissionModal) {
//       setTimeout(() => {
//         setShowAudioPermissionModal(false);
//         addDebugLog(`🔕 No more pending audio - hiding modal`);
//       }, 300);
//     }

//     addDebugLog(`✅ Completed audio cleanup for user: ${userId}`);
//   }, 300);
// };

// const cleanupViewerCamera = (userId) => {
//   addDebugLog(`📷 Cleaning up camera for user: ${userId}`);
//     setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => {
//             if (track.kind === 'video') {
//               track.stop();
//             }
//           });
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });
// };

// const cleanupViewerMedia = (userId) => {
//   // 🖥️ Screen share cleanup
//   if (activeScreenShare?.userId === userId) {
//     if (activeScreenShare.stream) {
//       try {
//         activeScreenShare.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     setActiveScreenShare(null);

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }

//     addDebugLog(`🖥️ Viewer screen share stopped & cleaned for user: ${userId}`);
//   }

//   // 🎤 Audio cleanup
//   if (viewerAudiosRef.current.has(userId)) {
//     const stream = viewerAudiosRef.current.get(userId);
//     if (stream) {
//       try {
//         stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer audio tracks", e);
//       }
//     }
//     viewerAudiosRef.current.delete(userId);

//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });

//     addDebugLog(`🎤 Viewer audio stopped for user: ${userId}`);
//   }

//   setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => track.stop());
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });

//   addDebugLog(`✅ Fully cleaned up media for user: ${userId}`);
// };

// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);


// // ✅ Add this useEffect to handle Zoomed Video without flickering
// useEffect(() => {
//   if (zoomedVideoRef.current && zoomed?.stream) {
//     const videoEl = zoomedVideoRef.current;
    
//     // Only update if stream ID is different to prevent flickering
//     if (videoEl.srcObject?.id !== zoomed.stream.id) {
//       videoEl.srcObject = zoomed.stream;
//       videoEl.play().catch(e => console.warn("Zoomed video play error", e));
//     }
//   } else if (zoomedVideoRef.current && !zoomed) {
//     zoomedVideoRef.current.srcObject = null;
//   }
// }, [zoomed, zoomed?.stream?.id]); // Only runs when zoomed user/stream changes

//   const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-connect', {
//         sessionId: currentSessionId,
//         transportId,
//         dtlsParameters
//       }, (response) => {
//         if (response && response.success) {
//           resolve();
//         } else {
//           reject(new Error(response.error || 'Transport connect failed'));
//         }
//       });
//     });
//   };

//   const handleTransportProduce = (currentSessionId, transportId, kind, rtpParameters, appData) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-produce', {
//         sessionId: currentSessionId,
//         transportId,
//         kind,
//         rtpParameters,
//         appData,
//       }, (response) => {
//         if (response && response.id) {
//           resolve(response.id);
//         } else {
//           reject(new Error(response?.error || 'Produce failed'));
//         }
//       });
//     });
//   };

//   const handlePauseProducer = async (producerId) => {
//     emitSocketEvent('producer-pause', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: true });
//       }
//       return newState;
//     });
//   };

//   const handleResumeProducer = async (producerId) => {
//     emitSocketEvent('producer-resume', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: false });
//       }
//       return newState;
//     });
//   };

//   const handleCloseProducer = async (producerId) => {
//     emitSocketEvent('producer-close', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       newState.delete(producerId);
//       return newState;
//     });
    
//     producers.current.delete(producerId);
//   };

//   // ========== STREAMING CONTROL FUNCTIONS ==========
//   const startStreaming = async () => {
//     const socket = getSocket();
//     if (socket) {
//       const hasProducers = producers.current.size > 0;
      
//       if (hasProducers) {
//         addDebugLog('ℹ️ Producers already exist, resuming if paused...');
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.paused) {
//             handleResumeProducer(id);
//           }
//         });
//       } else {
//         addDebugLog('🔄 No producers found, initializing media...');
//         await initializeMedia(sessionId || roomCode, iceServers);
//       }
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_started' 
//       });
      
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
//     }
//   };

//   const pauseStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (!producer.paused) {
//           handlePauseProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'PAUSED', 
//         emitEvent: 'streamer_paused' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setIsStreamPaused(true);
//       setLocalPausedState(true);
      
//       if (videoRef.current && !videoRef.current.paused) {
//         videoRef.current.pause();
//       }
//     }
//   };

//   const resumeStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.paused) {
//           handleResumeProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_resumed' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }
//   };

//   const endStreaming = async () => {
//   if (window.confirm('Are you sure you want to end the session for all participants?')) {
    
//     // Agar recording chal rahi hai to pehle stop karen
//     if (isRecording) {
//       const stopSuccess = await stopRecordingAPI();
//       if (!stopSuccess) {
//         // Agar recording stop nahi hui to user ko confirm karen
//         const proceed = window.confirm('Recording stop failed. Still end session?');
//         if (!proceed) return;
//       }
//     }
    
//     // Phir session end karen
//     emitSocketEvent('streamer_control', { 
//       sessionId: sessionId || roomCode, 
//       status: 'ENDED', 
//       emitEvent: 'session_ended' 
//     });
//   }
// };

//  const toggleAudio = () => {
//   if (mediaStream) {
//     const audioTrack = mediaStream.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setAudioEnabled(audioTrack.enabled);

//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.source === 'mic') {
//           if (audioTrack.enabled) {
//             handleResumeProducer(id);
//           } else {
//             handlePauseProducer(id);
//           }
//         }
//       });

//       addDebugLog(`🎤 Streamer mic ${audioTrack.enabled ? "on" : "off"} (local playback muted)`);
//     }
//   }
// };

//   const toggleVideo = () => {
//     if (mediaStream) {
//       const videoTrack = mediaStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setVideoEnabled(videoTrack.enabled);
        
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.source === 'camera') {
//             if (videoTrack.enabled) {
//               handleResumeProducer(id);
//             } else {
//               handlePauseProducer(id);
//             }
//           }
//         });
        
//         addDebugLog(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
//       }
//     }
//   };
// const startScreenShare = useCallback(async () => {

//   if (activeScreenShare?.stream) {

//     // ❌ CASE 1: Screen share already active
//     toast.info(
//       `📺 A screen share is already active by ${activeScreenShare.userName}.
//       Please wait for it to end before starting a new one.`,
//       {
//         position: "bottom-right",
//         autoClose: 5000,
//       }
//     );

//     addDebugLog("❌ Screen share already active, cannot start new one");

//   } else {

//     // ✅ CASE 2: NO active screen share → ONLY this block runs
//     try {
//       addDebugLog("🖥️ Starting screen share with audio...");

//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: {
//           cursor: "always",
//           frameRate: { ideal: 60, max: 70 },
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//         },
//         audio: true,
//       });

//       const videoTrack = stream.getVideoTracks()[0];
//       const audioTrack = stream.getAudioTracks()[0];

//       if ('contentHint' in videoTrack) {
//       videoTrack.contentHint = 'motion'; // Screen share के लिए motion सबसे बेस्ट है
//       addDebugLog("✅ Applied contentHint: 'motion' for screen share");
//     }

//       if (!videoTrack) {
//         addDebugLog("❌ No video track found in screen share stream");
//         return;
//       }

//       if (!sendTransportRef.current) {
//         addDebugLog("❌ No send transport available for screen share");
//         return;
//       }

//       setActiveScreenShare({
//         userId: user.id,
//         userName: user.name || "Streamer",
//         stream,
//         source: "streamer",
//       });

//       // 🎥 VIDEO PRODUCER
//       const videoProducer = await sendTransportRef.current.produce({
//         track: videoTrack,
//         appData: {
//           source: "screen",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });

//       addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);

//       // 🔊 AUDIO PRODUCER
//       let audioProducer = null;
//       if (audioTrack) {

//         console.log("audio track",audioTrack)
//         audioProducer = await sendTransportRef.current.produce({
//           track: audioTrack,
//           appData: {
//             source: "screen-audio",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         });

//         addDebugLog(
//           `✅ Screen share audio producer created: ${audioProducer.id}`
//         );
//       }

//       socket.emit(
//         "transport-produce-screen",
//         {
//           sessionId: sessionId || roomCode,
//           transportId: sendTransportRef.current.id,
//           kind: "video",
//           rtpParameters: videoProducer.rtpParameters,
//           appData: {
//             source: "screen",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         },
//         (response) => {
//           if (response?.id) {
//             addDebugLog(`✅ Screen share video registered: ${response.id}`);

//             if (audioProducer) {
//               socket.emit("transport-produce-streamer-screen-audio", {
//                 sessionId: sessionId || roomCode,
//                 transportId: sendTransportRef.current.id,
//                 rtpParameters: audioProducer.rtpParameters,
//                 appData: {
//                   source: "screen-audio",
//                   userId: user.id,
//                   userName: user.name || "Streamer",
//                 },
//               });
//             }

//             socket.emit("screen-share-started", {
//               sessionId: sessionId || roomCode,
//               producerId: response.id,
//               userId: user.id,
//               userName: user.name || "Streamer",
//               hasAudio: !!audioTrack,
//               source: "screen",
//             });

//             addDebugLog(
//               `✅ Screen share started ${
//                 audioTrack ? "with audio" : "without audio"
//               }`
//             );
//           }
//         }
//       );

//       // 🛑 STOP HANDLERS
//       videoTrack.onended = () => stopScreenShare();

//       if (audioTrack) {
//         audioTrack.onended = () =>
//           addDebugLog("🛑 Screen share audio ended");
//       }

//       stream.getTracks().forEach((track) => {
//         track.onended = () => {
//           if (track.kind === "video") stopScreenShare();
//         };
//       });

//       toast.success(
//         `🖥️ Screen sharing started ${
//           audioTrack ? "(with audio)" : "(video only)"
//         }`,
//         {
//           position: "bottom-right",
//           autoClose: 3000,
//         }
//       );

//     } catch (error) {
//       console.error("❌ Screen share error:", error);

//       toast.error("❌ Failed to start screen sharing", {
//         position: "bottom-right",
//         autoClose: 5000,
//       });
//     }
//   }

// }, [
//   activeScreenShare,
//   user,
//   sendTransportRef,
//   stopScreenShare,
//   socket,
//   sessionId,
//   roomCode,
// ]);


// const sendMessage = useCallback(async (text = '', file = null) => {
//   try {
//     let fileData = null;
//     let fileName = null;
//     let fileType = null;
//     let fileSize = null;
    
//     // Agar file hai to base64 mein convert karen (database ke bina direct transfer)
//     if (file) {
//       setUploadingFile(true);
      
//       // File size check (max 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('File size should be less than 5MB');
//         setUploadingFile(false);
//         return;
//       }

//       // File type check
//       const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
//       if (!allowedTypes.includes(file.type)) {
//         toast.error('Only images, PDF and text files are allowed');
//         setUploadingFile(false);
//         return;
//       }

//       // File ko base64 mein convert karen for direct transfer
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           // Base64 data (data:image/png;base64,XXXXXXXX ke format se prefix hata denge)
//           const base64String = e.target.result;
//           fileData = base64String.split(',')[1]; // Sirf base64 data le rahe hain
//           fileName = file.name;
//           fileType = file.type;
//           fileSize = file.size;
          
//           const messageData = {
//             sessionId: sessionId || roomCode,
//             message: text,
//             fileData: fileData, // Direct base64 data
//             fileName: fileName,
//             fileType: fileType,
//             fileSize: fileSize,
//             timestamp: new Date().toISOString(),
//             type: 'file' // Identify file message
//           };

//           emitSocketEvent('file_message', messageData);
//           setUploadingFile(false);
          
//           // Success feedback
//           toast.success('File sent successfully!');
//           resolve();
//         };
        
//         reader.onerror = () => {
//           console.error('File reading error');
//           setUploadingFile(false);
//           toast.error('Failed to read file');
//           resolve();
//         };
        
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // Normal text message
//       const messageData = {
//         sessionId: sessionId || roomCode,
//         message: text,
//         timestamp: new Date().toISOString(),
//         type: 'text' // Identify text message
//       };

//       emitSocketEvent('chat_message', messageData);
//     }
    
//   } catch (error) {
//     console.error('Error sending message:', error);
//     setUploadingFile(false);
//     toast.error('Failed to send message');
//   }
// }, [sessionId, roomCode]);

//   // ========== TRANSPORT CREATION ==========

//   const createSendTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createSendTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createSendTransport(response.params);
//           transports.current.set(transport.id, transport);
//           sendTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
//             try {
//               const producerId = await handleTransportProduce(
//                 currentSessionId,
//                 transport.id,
//                 kind,
//                 rtpParameters,
//                 appData
//               );
//               callback({ id: producerId });
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ SendTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating send transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   const createRecvTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createRecvTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createRecvTransport(response.params);
//           transports.current.set(transport.id, transport);
//           recvTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ RecvTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating recv transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   // ========== MEDIA INITIALIZATION ==========

//   const setupStreamerMedia = async (currentSessionId) => {
//     try {
//       if (producers.current.size > 0) {
//         addDebugLog('ℹ️ Producers already exist, skipping setup');
//         return;
//       }

//       if (!mediaStream) {
//         throw new Error('No mediaStream available');
//       }      
//     const videoTrack = mediaStream.getVideoTracks()[0];
//       const audioTrack = mediaStream.getAudioTracks()[0];
      
//       if (!videoTrack) {
//         throw new Error('No video track available');
//       }
      
//       if (!audioTrack) {
//         throw new Error('No audio track available');
//       }
      
//       addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
//       addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (!response || response.error || !response.params) {
//           console.error('Failed to create send transport:', response?.error);
//           setMediaError('Failed to create media transport');
//           addDebugLog(`❌ Transport creation error: ${response?.error}`);
//           return;
//         }

//         const transport = device.createSendTransport(response.params);
//         transports.current.set(transport.id, transport);
//         sendTransportRef.current = transport;

//         transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//           try {
//             await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//             callback();
//           } catch (error) {
//             console.error('Transport connect error:', error);
//             errback(error);
//           }
//         });
// transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
//   try {
//     const producerId = await handleTransportProduce(
//       currentSessionId,
//       transport.id,
//       kind,
//       rtpParameters,
//       appData
//     );
//     callback({ id: producerId });
//   } catch (error) {
//     console.error('Transport produce error:', error);
//     errback(error);
//   }
// });

// try {
//   setMediaError(null);
//   addDebugLog('✅ Using existing camera/microphone stream');

//  const videoProducer = await transport.produce({
//   track: videoTrack,
//   appData: { source: 'camera', userId: user?.id }   // 🔥 add userId
// });
//   producers.current.set(videoProducer.id, videoProducer);
//   setProducersState(prev => new Map(prev).set(videoProducer.id, {
//     id: videoProducer.id,
//     kind: 'video',
//     paused: false,
//     source: 'camera'
//   }));
//   addDebugLog(`✅ Video producer created: ${videoProducer.id}`);
  
//   const audioProducer = await transport.produce({
//   track: audioTrack,
//   appData: { source: 'mic', userId: user?.id }      // 🔥 add userId
// });

//   producers.current.set(audioProducer.id, audioProducer);
//   setProducersState(prev => new Map(prev).set(audioProducer.id, {
//     id: audioProducer.id,
//     kind: 'audio',
//     paused: false,
//     source: 'mic'
//   }));
//   addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

//   setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
//   setIsInitializing(false);
//   setIsLoading(false);
  
//   setTimeout(() => {
//     if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
//       videoRef.current.play().catch(error => {
//         console.log('Post-producer autoplay prevented:', error);
//         setShowPlayButton(true);
//       });
//     }
//   }, 500);
  
// } catch (error) {
//   console.error('Error creating producers:', error);
//   addDebugLog(`❌ Producer creation error: ${error.message}`);
//   setIsInitializing(false);
//   setIsLoading(false);
// }
//       });
//     } catch (error) {
//       console.error('Error setting up streamer media:', error);
//       setMediaError('Failed to set up media streaming');
//       addDebugLog(`❌ Media setup error: ${error.message}`);
//       setIsInitializing(false);
//       setIsLoading(false);
//     }
//   };
  
// const initializeMedia = async (currentSessionId, initialIceServers = []) => {
//   try {
//     if (isMediaInitialized) {
//       addDebugLog('ℹ️ Media already initialized, skipping');
//       return;
//     }
    
//     if (!mediaStream) {
//       addDebugLog('❌ No media stream available for initialization');
//       return;
//     }
    
//     setIsMediaInitialized(true);
//     addDebugLog('Initializing media with existing stream...');
    
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for media initialization');
//       return;
//     }
    
//     socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
//       if (response.error || !response.rtpCapabilities) {
//         addDebugLog(`❌ Failed to get router capabilities: ${response.error}`);
//         setMediaError('Failed to initialize media server');
//         setIsMediaInitialized(false);
//         return;
//       }

//       try {
//         await device.load({ routerRtpCapabilities: response.rtpCapabilities });
//         addDebugLog(`✅ Device loaded successfully`);

//         // Create transports
//         await createRecvTransport(currentSessionId);
//         await createSendTransport(currentSessionId);

//         // Setup streamer media
//         await setupStreamerMedia(currentSessionId);

//       } catch (error) {
//         console.error('Error loading device:', error);
//         setMediaError('Failed to initialize media device');
//         setIsMediaInitialized(false);
//         addDebugLog(`❌ Device load error: ${error.message}`);
//       }
//     });
//   } catch (error) {
//     console.error('Error initializing media:', error);
//     setMediaError('Failed to initialize media');
//     setIsMediaInitialized(false);
//     addDebugLog(`❌ Media init error: ${error.message}`);
//   }
// };

//   const joinRoomWithRetry = (retries = 3) => {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for joining room');
//       return;
//     }
    
//     if (retries === 0) {
//       console.error('Failed to join room after multiple attempts');
//       addDebugLog('Failed to join room after multiple attempts');
//       alert('Failed to join the session. Please try again.');
//       return;
//     }

//     addDebugLog(`Joining room (attempt ${4 - retries}/3)...`);
    
//     socket.emit('join_room', { 
//       token, 
//       sessionId: sessionId || null,
//       roomCode: roomCode || null,
//     }, (response) => {
//       if (response && response.error) {
//         console.warn(`Join room failed: ${response.error}, retrying... (${retries - 1} attempts left)`);
//         addDebugLog(`Join room failed: ${response.error}, retrying...`);
//         setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
//       }
//     });
//   };
//   // ========== CAMERA AND PERMISSION FUNCTIONS ==========

// const initializeCamera = async () => {
//   try {
//     addDebugLog('🔄 Initializing camera with smart audio optimization...');
//     setIsLoading(true);
//     setIsInitializing(true);
//     setCameraVisible(false);
//     setShowPlayButton(false); // Reset play button
    
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // ✅ SMART AUDIO CONSTRAINTS with complete optimization
//     const audioConstraints = await getOptimizedAudioConstraints(); // ✅ await add karo
    
//     // ✅ EARPHONE DETECTION aur optimization
//     const earphoneInfo = await detectEarphones();
    
//     // ✅ EARPHONE ADJUSTMENT - Force stereo if earphone detected
//     if (earphoneInfo.hasEarphone) {
//       audioConstraints.channelCount = 2;
//       audioConstraints.sampleRate = 48000; // High quality for earphones
      
//       if (earphoneInfo.isBluetooth) {
//         // Bluetooth earphones need special handling
//         audioConstraints.latency = 0.02; // Slightly higher latency for BT
//         addDebugLog('🎧 Bluetooth earphone detected - using optimized settings');
//       } else if (earphoneInfo.isWiredHeadphone) {
//         addDebugLog('🎧 Wired headphone detected - using high quality audio');
//       }
      
//       addDebugLog(`🎧 Earphone detected: ${earphoneInfo.deviceLabels.join(', ')}`);
//     }

//     addDebugLog(`🎵 Using optimized audio: ${audioConstraints.channelCount} channels, ${audioConstraints.sampleRate || 'default'}Hz`);

//     // Mobile-friendly constraints with SMART AUDIO
//     const constraints = {
//       video: {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 60, max: 70 },
//       },
//       audio: audioConstraints  // ✅ OPTIMIZED AUDIO CONSTRAINTS
//     };

//     addDebugLog('🎯 Requesting media with constraints:', {
//       video: constraints.video,
//       audio: constraints.audio
//     });

    
//     const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     console.log('📱 Camera stream obtained with optimized audio');

//     // ✅ VERIFY AUDIO SETTINGS
//     const videoTracks = stream.getVideoTracks();
//     const audioTracks = stream.getAudioTracks();
    
//     if (videoTracks.length === 0) {
//       throw new Error('No video track found in stream');
//     }

//     // Log actual audio settings
//     if (audioTracks.length > 0) {
//       const audioSettings = audioTracks[0].getSettings();
//       addDebugLog(`🎵 Actual audio settings: ${audioSettings.channelCount} channels, ${audioSettings.sampleRate || 'default'}Hz, sampleSize: ${audioSettings.sampleSize || 'N/A'}`);
      
//       // Warn if we got mono but wanted stereo
//       if (earphoneInfo.hasEarphone && audioSettings.channelCount === 1) {
//         addDebugLog('⚠️ Earphone connected but got MONO audio - device limitation');
//       }
      
//       // Log all audio track details
//       audioTracks.forEach((track, index) => {
//         const settings = track.getSettings();
//         addDebugLog(`🎤 Audio Track ${index + 1}:`, {
//           id: track.id,
//           label: track.label,
//           enabled: track.enabled,
//           muted: track.muted,
//           readyState: track.readyState,
//           channelCount: settings.channelCount,
//           sampleRate: settings.sampleRate,
//           sampleSize: settings.sampleSize,
//           latency: settings.latency
//         });
//       });
//     }

//     // Log video track details
//     videoTracks.forEach((track, index) => {
//       const settings = track.getSettings();
//       addDebugLog(`📹 Video Track ${index + 1}:`, {
//         id: track.id,
//         label: track.label,
//         enabled: track.enabled,
//         muted: track.muted,
//         readyState: track.readyState,
//         width: settings.width,
//         height: settings.height,
//         frameRate: settings.frameRate,
//         aspectRatio: settings.aspectRatio
//       });
//     });
    
//     setMediaStream(stream);
//     setMediaError(null);
//     setPermissionStatus('granted');
//     setCameraReady(true);
    
//     addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
    
//     // Setup video element properly
//     setTimeout(() => {
//       if (videoRef.current) {
//         const videoEl = videoRef.current;
//         videoEl.muted = true;
//         videoEl.playsInline = true;
//         videoEl.setAttribute('playsinline', '');
//         videoEl.setAttribute('webkit-playsinline', '');
//         videoEl.srcObject = stream;
        
//         // Video event listeners for better debugging
//         videoEl.onloadedmetadata = () => {
//           addDebugLog('📹 Video metadata loaded');
//         };
        
//         videoEl.oncanplay = () => {
//           addDebugLog('📹 Video can play');
//         };
        
//         videoEl.onerror = (e) => {
//           console.error('📹 Video error:', e);
//           addDebugLog(`❌ Video error: ${e.message}`);
//         };

//         // Auto-play attempt with better timing
//         setTimeout(() => {
//           videoEl.play().then(() => {
//             addDebugLog('✅ Mobile autoplay successful');
//             setIsPlaying(true);
//             setShowPlayButton(false);
//             setIsLoading(false);
//             setIsInitializing(false);
//           }).catch(error => {
//             console.log('📱 Mobile autoplay blocked, waiting for user gesture');
//             addDebugLog(`📱 Autoplay blocked: ${error.message}`);
//             setShowPlayButton(true);
//             setIsLoading(false);
//             setIsInitializing(false);
//           });
//         }, 800); // Slightly longer delay for mobile
//       }
//     }, 500);
    
//   } catch (error) {
//     console.error('❌ Error accessing camera:', error);
//     addDebugLog(`❌ Camera access error: ${error.message}`);
    
//     let errorMessage = `Camera error: ${error.message}`;
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
//       setPermissionStatus('denied');
//     } else if (error.name === 'NotFoundError') {
//       errorMessage = 'No camera found. Please check if camera is connected.';
//     } else if (error.name === 'NotSupportedError') {
//       errorMessage = 'Camera not supported on this device/browser.';
//     } else if (error.name === 'NotReadableError') {
//       errorMessage = 'Camera is already in use by another application.';
//     } else if (error.name === 'OverconstrainedError') {
//       errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...';
//       // Fallback to basic constraints
      
//     }
    
//     setMediaError(errorMessage);
//     setIsLoading(false);
//     setIsInitializing(false);
//     setShowPlayButton(true);
//   }
// };


//   const requestCameraPermissions = async () => {
//     try {
//       addDebugLog('🔄 Manually requesting camera permissions...');
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true, 
//         audio: {
//     echoCancellation: true,
//     noiseSuppression: true,
//     autoGainControl: true
//   },
//       });
      
//       stream.getTracks().forEach(track => track.stop());
      
//       setMediaError(null);
//       setPermissionStatus('granted');
//       addDebugLog('✅ Camera permissions granted manually');
      
//       initializeCamera();
//     } catch (error) {
//       console.error('Failed to request camera permissions:', error);
//       setMediaError('Failed to get camera permissions. Please allow access in browser settings.');
//       setPermissionStatus('denied');
//       addDebugLog(`❌ Manual permission request failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };

//   const retryCamera = async () => {
//     try {
//       setMediaError(null);
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       Array.from(producersState.keys()).forEach(producerId => {
//         handleCloseProducer(producerId);
//       });
      
//       transports.current.forEach(transport => {
//         try {
//           transport.close();
//         } catch (error) {
//           console.error('Error closing transport:', error);
//         }
//       });
//       transports.current.clear();
      
//       if (mediaStream) {
//         mediaStream.getTracks().forEach(track => track.stop());
//         setMediaStream(null);
//       }
      
//       setIsMediaInitialized(false);
//       setCameraReady(false);
//       setCameraVisible(false);
//       setIsWebSocketInitialized(false);
//       setProducersState(new Map());
      
//       initializeCamera();
      
//       addDebugLog('Camera retry initiated');
//     } catch (error) {
//       console.error('Failed to retry camera:', error);
//       setMediaError('Failed to restart camera');
//       setPermissionStatus('denied');
//       addDebugLog(`Camera retry failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };
//   // ========== WEBSOCKET INITIALIZATION ==========
//   const initializeWebSocket = () => {
//     if (permissionStatus !== 'granted') {
//       addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
//       return;
//     }

//     addDebugLog('Setting up socket connection...');
//     addDebugLog(`Socket URL: ${import.meta.env.VITE_SOCKET_URL}`);
//     addDebugLog(`Session ID: ${sessionId}`);
//     addDebugLog(`Room Code: ${roomCode}`);

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: { token },
//     transports: ['websocket', 'polling'], 
//     upgrade: true,
//     forceNew: true,
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000,
//     timeout: 20000
//     });

//     newSocket.on('connect', () => {
//       addDebugLog('✅ Socket connected, emitting join_room...');
//       setIsConnected(true);
      
//       joinRoomWithRetry();
//     });


//     newSocket.on('disconnect', () => {
//       addDebugLog('❌ Disconnected from server');
//       setIsConnected(false);
//     });

//     newSocket.on('connect_error', (error) => {
//       console.error('❌ Connection error:', error);
//       addDebugLog(`Connection error: ${error.message}`);
//       setIsConnected(false);
//     });

//     newSocket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//       addDebugLog(`Socket error: ${error.message}`);
//     });

//     newSocket.on('error_message', (data) => {
//       console.error('Error:', data);
//       addDebugLog(`Error message: ${JSON.stringify(data)}`);
//       alert(data.message || data);
//     });

//     // ========== SOCKET EVENT LISTENERS ==========
//     newSocket.on('new-viewer-screen-producer', (data) => {
//       addDebugLog('📩 Direct new-viewer-screen-producer event received');
//       handleNewViewerScreenProducer(data);
//     });

//     // Recording status events
// newSocket.on('recording_started', (data) => {
//   addDebugLog(`🎬 Recording started: ${data.sessionId}`);
//   setIsRecording(true);
// });

// newSocket.on('recording_stopped', (data) => {
//   addDebugLog(`⏹ Recording stopped: ${data.sessionId}`);
//   setIsRecording(false);
// });

//     newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
//     newSocket.on('viewer-audio-request', handleViewerAudioRequest);
//     newSocket.on('screen-share-request', handleScreenShareRequest);
//     newSocket.on('viewer-audio-started', handleViewerAudioStarted);
//     newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
//     newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
//     newSocket.on('screen-share-stopped-by-viewer', handleScreenShareStopped);
//     newSocket.on("viewer-video-request", handleViewerVideoRequest);


//     newSocket.on("viewer-audio-stopped", ({ userId }) => {
//   cleanupViewerAudio(userId);

//    newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
//   addDebugLog(`🛑 Viewer audio force-stopped: ${userId}`);
//    cleanupViewerAudio(userId); // remove their audio element

//    // Participants list update bhi karo
//    setParticipants(prev =>
//      prev.map(p =>
//        p.userId === userId ? { ...p, hasAudio: false } : p
//      )
//    );
//  });
// });

// newSocket.on("user_left", (data) => {
//   // keep your existing cleanup, but also ensure audio element removed
//   cleanupViewerAudio(data.userId);
//   cleanupViewerMedia(data.userId); // if you already had this
// });


//     // Viewer audio status events
//     newSocket.on('viewer-audio-enabled', (data) => {
//       addDebugLog(`Viewer audio enabled: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, hasAudio: true } : p
//       ));
//     });

//     newSocket.on('viewer-audio-started-global', (data) => {
//       addDebugLog(`Viewer audio started globally: ${data.userId}`);
//       setActiveSpeakers(prev => new Map(prev).set(data.socketId, {
//         userId: data.userId,
//         socketId: data.socketId,
//         userName: data.userName
//       }));
//     });

//     newSocket.on('viewer-audio-muted-global', (data) => {
//       addDebugLog(`Viewer audio muted globally: ${data.userId}`);
//       setActiveSpeakers(prev => {
//         const newMap = new Map(prev);
//         Array.from(newMap.entries()).forEach(([key, value]) => {
//           if (value.userId === data.userId) {
//             newMap.delete(key);
//           }
//         });
//         return newMap;
//       });
//     });

//     newSocket.on('joined_room', (data) => {
//       addDebugLog('✅ Joined room successfully');
//       setSession(data);
//       setParticipants(data.participants || []);
//       setIceServers(data.iceServers || []);
//       setIsLoading(false);
      
//       if (!isMediaInitialized) {
//         initializeMedia(data.sessionId, data.iceServers);
//       }
//     });

//     newSocket.on('ice_servers', (servers) => {
//       addDebugLog(`Received ${servers.length} ICE servers`);
//       setIceServers(servers);
//     });

//     newSocket.on('user_joined', (data) => {
//       addDebugLog(`User joined: ${data.userId}`);
//       setParticipants(prev => [...prev, data]);
//     });

//     newSocket.on('user_left', (data) => {
//       addDebugLog(`User left: ${data.userId}`);
//       setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      
//       // Clean up viewer media
//       cleanupViewerMedia(data.userId);
      
//       // Clean up remote videos
//       const videoToRemove = Array.from(remoteVideosRef.current.entries())
//         .find(([_, video]) => video.dataset?.socketId === data.socketId);
      
//       if (videoToRemove) {
//         const [producerId, video] = videoToRemove;
//         video.remove();
//         remoteVideosRef.current.delete(producerId);
//       }
//     });
//     // Socket event handlers mein ye add karen
// newSocket.on('chat_message', (message) => {
//   addDebugLog(`Chat message from ${message.userId}`);
  
//   // Agar file message hai to usko process karen
//   if (message.type === 'file') {
//     addDebugLog(`File received: ${message.fileName} (${message.fileType})`);
//   }
  
//   setMessages(prev => [...prev, {
//     ...message,
//     id: Date.now() + Math.random(), // Unique ID
//     timestamp: message.timestamp || new Date().toISOString()
//   }]);
// });
//     newSocket.on('streamer_started', () => {
//       addDebugLog('Streamer started streaming');
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setLocalPausedState(false);
//     });

//     newSocket.on('streamer_paused', () => {
//       addDebugLog('Streamer paused streaming');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//     });

//     newSocket.on('streamer_resumed', () => {
//       addDebugLog('Streamer resumed streaming');
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     });
//     // 🛑 Streamer ne ya viewer ne camera stop kiya
// newSocket.on("viewer-video-force-stopped-global", ({ userId }) => {
//   addDebugLog(`🛑 Camera stopped globally for user: ${userId}`);
//   cleanupViewerMedia(userId); // tumhare paas already hai
// });

// newSocket.on("viewer-camera-stopped", ({ userId }) => {
//   addDebugLog(`📷 Viewer camera stopped: ${userId}`);

//   setZoomed((prev) => {
//     if (prev && prev.type === "viewer" && prev.userId === userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped viewer camera: ${userId}`);
//       return null;
//     }
//     return prev;
//   });
//     cleanupViewerCamera(userId);
// });

// newSocket.on("viewer-camera-paused-global", ({ userId }) => {
//   addDebugLog(`⏸️ Viewer camera paused: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))
//   );
// });

// newSocket.on("viewer-camera-resumed-global", ({ userId }) => {
//   addDebugLog(`▶️ Viewer camera resumed: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))
//   );
// });
//     newSocket.on('session_ended', () => {
//       addDebugLog('Session ended by streamer');
//       setRoomState(prev => ({ ...prev, isStreaming: false, isPaused: true }));
//       alert('Session has been ended by the streamer.');
//       navigate('/dashboard');
//     });

//     newSocket.on('session_paused', () => {
//       addDebugLog('Session paused by streamer');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//       alert('Session has been paused by the streamer.');
//     });

//     newSocket.on('producer-paused', (data) => {
//       addDebugLog(`Producer paused: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: true });
//         }
//         return newState;
//       });
//     });

//     newSocket.on('producer-resumed', (data) => {
//       addDebugLog(`Producer resumed: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: false });
//         }
//         return newState;
//       });
//     });

// newSocket.on("producer-closed", (data) => {
//   addDebugLog(
//     `❌ Producer closed: ${data.producerId}, source: ${data.source}, user: ${data.userId}`
//   );

//   // 🖥️ Screen share cleanup (streamer OR viewer)
//   if (data.source === "screen" || data.source === "viewer-screen") {
//     // 🔴 Forcefully clear state
//     setActiveScreenShare(null);

//     // 🔴 Stop only video tracks from screen share
//     try {
//       if (screenRef.current?.srcObject) {
//         const tracks = screenRef.current.srcObject.getTracks?.() || [];
//         tracks.forEach((t) => {
//           if (t.kind === 'video') {
//             t.stop(); // Only stop video tracks
//           }
//         });
//       }
//     } catch (e) {
//       console.warn("Error stopping screen share tracks on producer-closed", e);
//     }

//     // 🔴 Clear video ref
//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef on producer-closed", e);
//       }
//     }

//     addDebugLog(
//       `✅ Producer closed → forced activeScreenShare reset for ${data.userId}`
//     );
//   }

//   // 🎤 Audio cleanup - ONLY for audio sources
//   if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//     cleanupViewerAudio(data.userId);
//     addDebugLog(`🎤 Viewer audio stopped for user: ${data.userId}`);
//   }

//   // 📷 Camera cleanup - ONLY for camera video
//   if (data.source === "viewer-camera") {
//     setViewerCameras((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(data.userId)) {
//         const stream = newMap.get(data.userId);
//         if (stream) {
//           try {
//             // ✅ ONLY stop VIDEO tracks, leave audio tracks alone
//             stream.getTracks().forEach((t) => {
//               if (t.kind === 'video') {
//                 t.stop();
//                 addDebugLog(`📹 Stopped video track for user ${data.userId}`);
//               }
//               // Audio tracks continue playing
//             });
//           } catch (e) {
//             console.warn("Error stopping camera tracks", e);
//           }
//         }
//         newMap.delete(data.userId);
//       }
//       return newMap;
//     });
//     addDebugLog(`📷 Viewer camera removed for user ${data.userId}`);
//   }

//   // 🔊 Streamer audio cleanup - if needed
//   if (data.source === "mic" || data.source === "streamer-mic") {
//     addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
//     // Don't cleanup viewer audio here, this is streamer's audio
//   }
// });


//     newSocket.on("new-producer", (data) => {
//       addDebugLog("📡 New producer available:", data);

//       // Track producer in state
//       setProducersState((prev) => {
//         const updated = new Map(prev);
//         updated.set(data.producerId, {
//           id: data.producerId,
//           kind: data.kind,
//           userId: data.userId,
//           source: data.source || "camera",
//           paused: false,
//         });
//         return updated;
//       });

//       // Handle viewer screen video
//       if (data.source === "viewer-screen") {
//         addDebugLog("🖥️ Consuming viewer screen producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }

//       // Handle viewer mic OR viewer screen audio
//       if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//         addDebugLog("🎤 Consuming viewer audio producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }
//       if (data.source === "viewer-camera") {
//   addDebugLog("📷 Consuming viewer camera producer:", data.producerId);
//   createConsumer(sessionId || roomCode, data.producerId, data.kind);
// }
//     });
    
//     newSocket.on('participant_updated', (data) => {
//       addDebugLog(`Participant updated: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, ...data.updates } : p
//       ));
//     });

//  newSocket.on("participants_list_updated", (data) => {
//   addDebugLog("📋 Participants list updated (snapshot)");
//   console.log("participants list:", data.participants || []);
//   setParticipants(data.participants || []);
// });
//     setSocket(newSocket);
//     socketRef.current = newSocket;
//   };

//   // ========== USE EFFECT HOOKS ==========

//  useEffect(() => {
//   // Initialize media stream refs
//   streamerMediaRef.current = new MediaStream();
//   viewerAudiosRef.current = new Map();

//   return () => {
//     isMountedRef.current = false;

//     // 🎥 Clean up main camera/microphone stream
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }

//     // 🖥️ Clean up active screen share (only one can be active)
//     if (activeScreenShare?.stream) {
//       activeScreenShare.stream.getTracks().forEach(track => track.stop());
//     }

//     // 🎤 Clean up all viewer audio streams
//     viewerAudiosRef.current.forEach(stream => {
//       stream.getTracks().forEach(track => track.stop());
//     });

//     // 🎥 Clean up remote video elements
//     remoteVideosRef.current.forEach(video => {
//       if (video && video.srcObject) {
//         video.srcObject.getTracks().forEach(track => track.stop());
//         video.srcObject = null;
//       }
//     });

//     // 🖱️ Remove gesture handlers
//     if (userGestureHandlerRef.current) {
//       document.removeEventListener("click", userGestureHandlerRef.current);
//       document.removeEventListener("touchstart", userGestureHandlerRef.current);
//     }

//     // 🔌 Close all transports
//     transports.current.forEach(transport => transport.close());

//     // 🔗 Close socket connection
//     if (socketRef.current) {
//       socketRef.current.close();
//     }
//   };
// }, []);

//   useEffect(() => {
//     const checkPermissions = async () => {
//       try {
//         addDebugLog('🔍 Checking camera and microphone permissions...');
//         setPermissionStatus('checking');
        
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//         const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
        
//         if (hasVideoPermission && hasAudioPermission) {
//           addDebugLog('✅ Camera and microphone permissions already granted');
//           setPermissionStatus('granted');
//           initializeCamera();
//         } else {
//           addDebugLog('ℹ️ Need to request camera/microphone permissions');
//           setPermissionStatus('denied');
//           setIsLoading(false);
//         }
//       } catch (error) {
//         console.error('Error checking permissions:', error);
//         addDebugLog(`❌ Error checking permissions: ${error.message}`);
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     };

//     checkPermissions();
//   }, []);


//   useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup recording stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }
//   };
// }, [recorder, recordingStream]);

//   useEffect(() => {
//     if (permissionStatus === 'granted' && !isWebSocketInitialized) {
//       addDebugLog('🔄 Initializing WebSocket connection...');
//       setIsWebSocketInitialized(true);
//       initializeWebSocket();
//     }
//   }, [permissionStatus, isWebSocketInitialized]);

//   useEffect(() => {
//     const checkCameraVisibility = () => {
//       if (videoRef.current && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        
//         if (hasVideo && videoRef.current.readyState >= 2) {
//           setCameraVisible(true);
//           setIsLoading(false);
//           addDebugLog('✅ Camera video is visible on screen');
//         }
//       }
//     };

//     if (mediaStream) {
//       checkCameraVisibility();
//       const interval = setInterval(checkCameraVisibility, 500);
//       return () => clearInterval(interval);
//     }
//   }, [mediaStream]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
    
//     if (!videoElement || !mediaStream) {
//       setIsPlaying(false);
//       return;
//     }

//     if (videoElement.srcObject !== mediaStream) {
//       videoElement.srcObject = mediaStream;
//       videoElement.muted = true;
//     }

//     const handlePlay = () => {
//       console.log('Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
//       setIsLoading(false);
//     };

//     const handlePause = () => {
//       console.log('Video paused');
//       setIsPlaying(false);
//       setLocalPausedState(true);
      
//       if (!roomState.isPaused) {
//         setShowPlayButton(true);
//       }
//     };

//     const handleError = (e) => {
//       console.error('Video error:', e);
//       setMediaError(true);
//       setIsPlaying(false);
//       setShowPlayButton(true);
//     };

//     const handleLoadedMetadata = () => {
//       console.log('Video metadata loaded');
//       setIsLoading(false);
//       if (!roomState.isPaused && !localPausedState) {
//         videoElement.play().catch(error => {
//           console.log('Autoplay prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     };

//     const handleLoadedData = () => {
//       console.log('Video data loaded');
//       setIsLoading(false);
//       if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
//         setCameraVisible(true);
//         setIsLoading(false);
//       }
//     };

//     const handleCanPlay = () => {
//       console.log('Video can play');
//       setIsLoading(false);
//     };

//     videoElement.addEventListener('play', handlePlay);
//     videoElement.addEventListener('pause', handlePause);
//     videoElement.addEventListener('error', handleError);
//     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
//     videoElement.addEventListener('loadeddata', handleLoadedData);
//     videoElement.addEventListener('canplay', handleCanPlay);

//     if (videoElement.readyState >= 2) {
//       if (!videoElement.paused && !videoElement.ended) {
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setLocalPausedState(false);
//         setIsLoading(false);
//       } else if (roomState.isPaused) {
//         setIsPlaying(false);
//         setShowPlayButton(false);
//         setLocalPausedState(true);
//       } else {
//         videoElement.play().catch(error => {
//           console.log('Initial play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }

//     return () => {
//       videoElement.removeEventListener('play', handlePlay);
//       videoElement.removeEventListener('pause', handlePause);
//       videoElement.removeEventListener('error', handleError);
//       videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
//       videoElement.removeEventListener('loadeddata', handleLoadedData);
//       videoElement.removeEventListener('canplay', handleCanPlay);
//     };
//   }, [mediaStream, roomState.isPaused]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
//     if (!videoElement || !mediaStream) return;

//     if (roomState.isPaused && !videoElement.paused) {
//       videoElement.pause();
//       setIsPlaying(false);
//       setShowPlayButton(false);
//       setLocalPausedState(true);
//     } else if (!roomState.isPaused && videoElement.paused && roomState.isStreaming) {
//       videoElement.play().catch(error => {
//         console.log('Play after resume prevented:', error);
//         setShowPlayButton(true);
//         setLocalPausedState(true);
//       });
//     }
//   }, [roomState.isPaused, roomState.isStreaming, mediaStream]);

// // ✅ always keep PiP screen video in sync, even after zoom toggle
// useEffect(() => {
//   if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
//     screenRef.current.srcObject = activeScreenShare.stream;
//     screenRef.current.play().catch(() => {
//       console.warn("Autoplay blocked for screen PiP");
//     });
//   } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
//     screenRef.current.srcObject = null;
//   }
// }, [activeScreenShare?.stream, zoomed]);

//   useEffect(() => {
//     if (mediaStream) {
//       const tracks = mediaStream.getTracks();
//       tracks.forEach(track => {
//         addDebugLog(`Track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
//         if (track.kind === 'video') {
//           const settings = track.getSettings();
//           addDebugLog(`Video settings: ${JSON.stringify({
//             width: settings.width,
//             height: settings.height,
//             frameRate: settings.frameRate,
//             deviceId: settings.deviceId
//           })}`);
//         }
//       });
      
//       const status = checkStreamStatus();
//       if (status.hasVideo && status.hasAudio) {
//         addDebugLog('✅ Stream has both audio and video tracks');
//       } else {
//         addDebugLog('❌ Stream is missing audio or video tracks');
//       }
//     }
//   }, [mediaStream]);
// // 👇 ye effect tumhare component me daal do
// // ✅ Streamer video ke liye
// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);
//   // ========== UI COMPONENTS ==========

// const handlePlayClick = async (e) => {
//   try {
//     e.stopPropagation();
//     console.log('📱 User triggered play');
    
//     if (videoRef.current && mediaStream) {
//       // Ensure video element is properly set up
//       const videoEl = videoRef.current;
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
      
//       // Set source only if needed
//       if (videoEl.srcObject !== mediaStream) {
//         videoEl.srcObject = mediaStream;
//       }
      
//       // User gesture ke saath play
//       await videoEl.play();
//       console.log('✅ Mobile video started via user gesture');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
      
//     }
//   } catch (error) {
//     console.error('❌ Failed to play video on mobile:', error);
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       setMediaError('Autoplay blocked. Please tap to play.');
//     } else {
//       setMediaError('Failed to play video');
//     }
    
//     setShowPlayButton(true);
//     setLocalPausedState(true);
//   }
// };

//   // 📷 Jab viewer camera request bhejta hai
// const handleViewerVideoRequest = useCallback((data) => {
//   addDebugLog(`📷 Viewer requested camera: ${data.requesterName} (${data.requestedUserId})`);
  
//   setViewerVideoRequests((prev) => [
//     ...prev,
//     {
//       userId: data.requestedUserId,
//       userName: data.requesterName,
//       socketId: data.socketId
//     }
//   ]);
// }, []);

// // Replace old handleViewerVideoResponse with this:
// const handleViewerVideoResponse = useCallback((requesterSocketId, allow) => {
//   // Use socketRef (safer) or emitSocketEvent helper
//   if (!socketRef.current || !socketRef.current.connected) {
//     addDebugLog('❌ Socket not connected — cannot send viewer-video-response');
//     return;
//   }

//   socketRef.current.emit('viewer-video-response', {
//     sessionId: sessionId || roomCode,
//     requesterSocketId,    // <-- IMPORTANT: server expects this key
//     allow                  // <-- IMPORTANT: server expects `allow` (boolean)
//   });

//   // remove the request UI
//   setViewerVideoRequests(prev => prev.filter(r => r.userId !== requesterSocketId && r.socketId !== requesterSocketId));

//   addDebugLog(`${allow ? '✅' : '❌'} Camera ${allow ? 'approved' : 'denied'} for requester socket: ${requesterSocketId}`);
// }, [sessionId, roomCode]);

//   const checkStreamStatus = useCallback(() => {
//     if (!mediaStream) return false;
    
//     const videoTracks = mediaStream.getVideoTracks();
//     const audioTracks = mediaStream.getAudioTracks();
    
//     const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
//     const hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
//     addDebugLog(`Stream status - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
//     return { hasVideo, hasAudio };
//   }, [mediaStream]);

// useEffect(() => {
//   if (!isMobile) return;

//   const handleFirstUserInteraction = () => {
//     addDebugLog('📱 Mobile user interaction detected');
    
//     // Video play try karo user gesture ke baad
//     if (videoRef.current && mediaStream && showPlayButton) {
//       setTimeout(() => {
//         videoRef.current.play().catch(() => {
//           // Still blocked, play button show karo
//           setShowPlayButton(true);
//         });
//       }, 100);
//     }
//   };

//   // Multiple events pe listen karo
//   document.addEventListener('click', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchend', handleFirstUserInteraction, { once: true });

//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//     document.removeEventListener('touchend', handleFirstUserInteraction);
//   };
// }, [isMobile, mediaStream, showPlayButton]);


// // Mobile detection and handlers
// useEffect(() => {
//   const checkMobile = () => {
//     const mobile = window.innerWidth < 768 || 
//                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//     setIsMobile(mobile);
//     if (mobile) {
//       setMobileView('video');
//       setShowThumbnails(false);
//       addDebugLog(`📱 Mobile device detected: ${window.innerWidth}px`);
//     }
//   };

//   checkMobile();
//   window.addEventListener('resize', checkMobile);
  
//   return () => window.removeEventListener('resize', checkMobile);
// }, []);

//   // Full screen handling
//   const toggleFullScreen = () => {
//     if (!document.fullscreenElement) {
//       document.documentElement.requestFullscreen().catch(err => {
//         console.log('Full screen error:', err);
//       });
//       setIsFullScreen(true);
//     } else {
//       document.exitFullscreen();
//       setIsFullScreen(false);
//     }
//   };
//   // Mobile main render
//   if (isMobile) {
//       const mobileHeight = isLandscape ? 'h-[160vh]' : 'h-screen';

//     return (
//       <div className={`flex flex-col ${mobileHeight} bg-black text-white overflow-hidden`}>
//         <MobileHeader
//       session={session}
//       participants={participants}
//       isConnected={isConnected}
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//       showRequests={showRequests}
//       setShowRequests={setShowRequests}
//     />
    
//     <MobileRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//       handleScreenShareResponse={handleScreenShareResponse}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />
        
//         {mobileView === 'video' && (
//         <MobileVideoView
//           zoomed={zoomed}
//           setZoomed={setZoomed}
//           mediaStream={mediaStream}
//           participants={participants}
//           activeScreenShare={activeScreenShare}
//           setIsPlaying={setIsPlaying}
//           setShowPlayButton={setShowPlayButton}
//           showPlayButton={showPlayButton}
//           setMediaError={setMediaError}
//           mediaError={mediaError}
//           isLoading={isLoading}
//           isInitializing={isInitializing}
//           roomState={roomState}
//           localPausedState={localPausedState}
//           user={user}
//           videoEnabled={videoEnabled}
//           viewerCameras={viewerCameras}
//           showMobileControls={showMobileControls}
//           setShowMobileControls={setShowMobileControls}
//           handlePlayClick={handlePlayClick}
//           isPlaying={isPlaying}
//         />
//       )}
//         {mobileView === 'participants' && <MobileParticipantsView
//         participants={participants}
//         activeSpeakers={activeSpeakers}
//         handleMuteViewerAudio={handleMuteViewerAudio}
//         emitSocketEvent={emitSocketEvent}
//         sessionId={sessionId}
//         roomCode={roomCode}
//         addDebugLog={addDebugLog}
//         handleStopViewerScreenShare={handleStopViewerScreenShare}
//         handleBanParticipant={handleBanParticipant}
//       />}
//         {mobileView === 'chat' && <MobileChatView
//         messages={messages}
//         user={user}
//         sendMessage={sendMessage}
//         uploadingFile={uploadingFile}
//       />}
        
//        <MobileNavigation
//       mobileView={mobileView}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//     />
    
//     <MobileControls
//   toggleAudio={toggleAudio}
//   audioEnabled={audioEnabled}
//   toggleVideo={toggleVideo}
//   videoEnabled={videoEnabled}
//   roomState={roomState}
//   startStreaming={startStreaming}
//   resumeStreaming={resumeStreaming}
//   pauseStreaming={pauseStreaming}
//   endStreaming={endStreaming}
//   // ✅ New props for recording
//   handleRecordingToggle={handleRecordingToggle}
//   isRecording={isRecording}
//   isRecordingLoading={isRecordingLoading}
//   isRecordingStopping={isRecordingStopping}
// />

//         {/* Mobile Modals */}
//         {showParticipantsModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-h-80 overflow-y-auto">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold">Manage Participants</h3>
//                 <button 
//                   onClick={() => setShowParticipantsModal(false)}
//                   className="text-gray-400"
//                 >
//                   <FiX className="h-5 w-5" />
//                 </button>
//               </div>
              
//               <div className="space-y-2">
//                 {participants.map((participant, index) => (
//                   <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
//                     <span className="text-sm">{participant.name || 'User'}</span>
//                     <div className="flex space-x-1">
//                       {participant.hasAudio && (
//                         <button
//                           onClick={() => handleMuteViewerAudio(participant.socketId)}
//                           className="bg-red-500 text-white p-1 rounded text-xs"
//                         >
//                           Mute
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // ========== MAIN RENDER ==========

//   if (isLoading && permissionStatus !== 'denied') {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Requesting camera access...</p>
//           {mediaError && (
//             <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               <p>{mediaError}</p>
//               <button 
//                 onClick={initializeCamera}
//                 className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//               >
//                 Retry
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   if (permissionStatus === 'denied' && !isConnected) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
//           <div className="text-4xl mb-4">🎥</div>
//           <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
//           <p className="text-gray-600 mb-6">
//             To join this live session, you need to allow camera and microphone access.
//           </p>
//           <button
//             onClick={requestCameraPermissions}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
//           >
//             Allow Camera & Microphone
//           </button>
//           <p className="text-sm text-gray-500 mt-4">
//             If you've previously denied access, please check your browser settings.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (!isConnected || !session) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Connecting to session...</p>
//           <div className="mt-4 w-64 mx-auto">
//             <video 
//               ref={videoRef}
//               autoPlay 
//               playsInline 
//               muted={true}
//               className="w-full rounded-lg shadow-lg"
//             />
//             <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }
// return (
//   <div className="flex flex-col h-[115vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
//     {/* Enhanced Header */}
//     <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
//       <div className="flex items-center space-x-4">
//         <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
//           <FiVideo className="h-6 w-6 text-white" />
//         </div>
//         <div>
//           <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//             Stream Control Center
//           </h1>
//           <p className="text-sm text-gray-300 flex items-center space-x-1">
//             <FiRadio className="h-3 w-3 text-green-400" />
//             <span>Room: {session?.roomCode}</span>
//           </p>
//         </div>
        
//         {/* RECORDING TIMER DISPLAY */}
//         {isRecording && (
//           <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
//             <div className="relative">
//               <BsFillRecordFill className="h-4 w-4 text-red-200" />
//               <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
//             </div>
//             <span className="text-sm font-bold text-white font-mono">
//               {formatRecordingTime(recordingTimer)}
//             </span>
//             <span className="text-xs text-red-100 font-medium">REC</span>
            
//             {/* Recording status dot */}
//             <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
//           </div>
//         )}
//       </div>
      
//       <div className="flex items-center space-x-4">
//         {/* Connection Status */}
//         <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
//           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//           <span className="text-sm font-medium">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
//         </div>
        
//         {/* Participants Count */}
//         <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 px-4 py-2 rounded-full backdrop-blur-sm">
//           <FiUsers className="h-4 w-4 text-white" />
//           <span className="text-sm font-medium">
//             {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
//           </span>
//         </div>

//         {/* Additional Recording Info (Optional) */}
//         {isRecording && (
//           <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
//             <span className="text-xs text-red-200 font-medium">Recording Active</span>
//             <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
//           </div>
//         )}

//         {/* Notification Badge for Pending Requests */}
//         {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
//           <div className="relative">
//             <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
//               <FiAlertCircle className="h-5 w-5 text-white" />
//             </button>
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
//               {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
//             </span>
//           </div>
//         )}

//         {/* Sidebar Toggle Button */}
//         <button
//           onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
//           className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
//           title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//         >
//           {sidebarCollapsed ? 
//             <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
//             <FiChevronRight className="h-5 w-5 text-blue-400" />
//           }
//           <span className="text-sm font-medium">
//             {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//           </span>
//         </button>

//         {/* End Session Button */}
//         <button
//           onClick={endStreaming}
//           className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
//         >
//           <FiLogOut className="h-4 w-4" />
//           <span>End Session</span>
//         </button>
//       </div>
//     </header>

//     {/* Main Content Area */}
//     <div className="flex-1 overflow-hidden relative">
//       {/* Thumbnails Overlay - Will cover entire screen when expanded */}
//       {thumbnailsExpanded && (
//         <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
//           <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/90">
//             <h2 className="text-xl font-bold flex items-center space-x-3">
//               <FiVideo className="h-6 w-6 text-blue-400" />
//               <span>All Cameras ({thumbnailsCount})</span>
//             </h2>
//             <div className="flex items-center space-x-4">
//               {/* Search filter (optional) */}
              
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
//                 title="Exit Full Screen"
//               >
//                 <FiX className="h-6 w-6" />
//               </button>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-6">
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid="streamer"
//                     stream={mediaStream}
//                     userName="You"
//                     onClick={() => {
//                       setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "streamer"}
//                     videoEnabled={videoEnabled}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//                     Host
//                   </div>
//                 </div>
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <div key={uid} className="relative group">
//                   <ThumbnailVideo
//                     uid={uid}
//                     stream={stream}
//                     userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                     onClick={() => {
//                       setZoomed({ type: "viewer", stream, userId: uid });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                     videoEnabled={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
//                     Viewer
//                   </div>
//                 </div>
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid={activeScreenShare.userId}
//                     stream={activeScreenShare.stream}
//                     userName={`${activeScreenShare.userName}'s Screen`}
//                     onClick={() => {
//                       setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "screen"}
//                     videoEnabled={true}
//                     isScreenShare={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//                     <FiMonitor className="h-3 w-3 mr-1" />
//                     Screen
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           <div className="p-4 border-t border-gray-700 bg-gray-800/90">
//             <div className="flex justify-between items-center">
//               <div className="text-sm text-gray-400">
//                 Click on any camera to zoom into it
//               </div>
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
//               >
//                 Back to Stream
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* When sidebar is collapsed */}
//       {sidebarCollapsed ? (
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//               {/* Zoomed Video View */}
//               {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Expand Sidebar Button */}
//               <div className="absolute right-4 top-4 z-20">
//                 <button
//                   onClick={() => setSidebarCollapsed(false)}
//                   className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
//                   title="Show Sidebar"
//                 >
//                   <FiChevronLeft className="h-5 w-5 text-blue-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           {/* Thumbnails Column - Always visible */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : (
//         /* Original Layout when sidebar is expanded */
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//          {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Thumbnails Column */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Sidebar - Expanded */}
//           <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Sidebar Toggle Header */}
//             <div className="flex border-b border-gray-600">
//               <button
//                 onClick={() => setSidebarView('participants')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'participants' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiUsers className="h-5 w-5" />
//                 <span className="text-sm font-medium">Participants</span>
//               </button>
//               <button
//                 onClick={() => setSidebarView('chat')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'chat' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiMessageSquare className="h-5 w-5" />
//                 <span className="text-sm font-medium">Chat</span>
//               </button>
              
//               {/* Collapse button inside sidebar */}
//               <button
//                 onClick={() => setSidebarCollapsed(true)}
//                 className="px-3 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all duration-200"
//                 title="Hide Sidebar"
//               >
//                 <FiChevronRight className="h-5 w-5" />
//               </button>
//             </div>

//             {/* Participants View */}
//             {sidebarView === 'participants' && (
//               <div className="flex-1 flex flex-col min-h-0">
//                 <div className="p-4 border-b border-gray-600">
//                   <div className="flex items-center justify-between">
//                     <h3 className="font-semibold text-lg flex items-center space-x-2">
//                       <FiUsers className="h-5 w-5 text-blue-400" />
//                       <span>Participants ({participants.length})</span>
//                     </h3>
//                     <button
//                       onClick={() => setShowParticipantsModal(true)}
//                       className="p-1 hover:bg-gray-700 rounded transition-colors"
//                       title="Manage Participants"
//                     >
//                       <FiUsers className="h-5 w-5 text-gray-400" />
//                     </button>
//                   </div>
//                 </div>
                
//                 <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//                   {participants.map((participant, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-colors duration-200"
//                     >
//                       <div className="flex items-center space-x-3">
//                         <div
//                           className={`w-3 h-3 rounded-full ${
//                             activeSpeakers.has(participant.socketId)
//                               ? "bg-green-400 animate-pulse"
//                               : participant.hasAudio
//                               ? "bg-blue-400"
//                               : "bg-gray-400"
//                           }`}
//                         ></div>
//                         <span className="truncate font-medium">
//                           {participant.name || participant.userName || participant.userId || "User"}
//                         </span>
//                       </div>
                      
//                       <div className="flex items-center space-x-2">
//                         {/* Audio permission icon */}
//                         {participant.hasAudio && (
//                           <button
//                             onClick={() => openRemoveAudioModal(participant)}
//                             className="p-1 text-blue-400 hover:text-red-400 transition-colors"
//                             title="Remove Audio Permission"
//                           >
//                             <FiMic className="h-4 w-4" />
//                           </button>
//                         )}

//                         {/* Stop Camera icon */}
//                         {participant.hasVideo && (
//                           <button
//                             onClick={() => {
//                               emitSocketEvent("streamer-stop-viewer-video", {
//                                 sessionId: sessionId || roomCode,
//                                 targetSocketId: participant.socketId,
//                               });
//                               addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
//                             }}
//                             className="p-1 text-green-400 hover:text-red-400 transition-colors"
//                             title="Stop Camera"
//                           >
//                             <FiCameraOff className="h-4 w-4" />
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Chat View */}
//             {sidebarView === 'chat' && (
//               <ChatComponent
//                 messages={messages}
//                 onSendMessage={sendMessage}
//                 currentUserId={user?.id}
//                 uploadingFile={uploadingFile}
//                 socket={socket}
//                 sessionId={sessionId}
//                 roomCode={roomCode}
//               />
//             )}
//           </div>
//         </div>
//       )}
//     </div>

//     {/* Audio Permission Modal */}
//     <AudioPermissionModal
//       isOpen={showAudioPermissionModal}
//       onEnableAudio={handleEnableAudio}
//     />

//     {/* Updated Panels with Proper Z-index */}
//     <ViewerAudioRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//     />

//     <ScreenShareRequestsPanel
//       screenShareRequests={screenShareRequests}
//       handleScreenShareResponse={handleScreenShareResponse}
//     />

//     <ActiveViewerAudioPanel
//       activeViewerAudio={activeViewerAudio}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//     />

//     <ActiveScreenSharesPanel
//       activeScreenShare={activeScreenShare}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//     />

//     <ParticipantsModal
//       showParticipantsModal={showParticipantsModal}
//       setShowParticipantsModal={setShowParticipantsModal}
//       participants={participants}
//       activeSpeakers={activeSpeakers}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//       emitSocketEvent={emitSocketEvent}
//       sessionId={sessionId}
//       roomCode={roomCode}
//       addDebugLog={addDebugLog}
//       handleBanParticipant={handleBanParticipant}
//     />

//     <ViewerVideoRequestsPanel
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />

//     <ProducerStatus producersState={producersState} />

//     {/* Remove Audio Confirmation Modal */}
//     {audioRemoveTarget && (
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
//           <div className="flex items-center space-x-3 mb-4">
//             <FiAlertCircle className="h-6 w-6 text-red-500" />
//             <h3 className="text-lg font-semibold text-gray-900">Remove Audio?</h3>
//           </div>
//           <p className="text-gray-700 mb-6">
//             Do you want to remove audio for <strong className="text-gray-900">{audioRemoveTarget.name || audioRemoveTarget.userId}</strong>? 
//             They will need to request again to speak.
//           </p>
//           <div className="flex justify-end space-x-3">
//             <button 
//               onClick={() => setAudioRemoveTarget(null)}
//               className="flex items-center space-x-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
//             >
//               <FiX className="h-4 w-4" />
//               <span>Cancel</span>
//             </button>
//             <button 
//               onClick={confirmRemoveAudio}
//               className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//             >
//               <FiCheck className="h-4 w-4" />
//               <span>Remove Audio</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     )}
    
//     {/* Enhanced Controls Footer */}
//  <div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
//   <div className="flex justify-center space-x-6">
//     {/* Start/Resume/Pause Stream Control */}
//     {!roomState.isStreaming ? (
//       <button
//         onClick={startStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Streaming"
//         disabled={isInitializing || isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Start</span>
//       </button>
//     ) : roomState.isPaused ? (
//       <button
//         onClick={resumeStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Resume Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Resume</span>
//       </button>
//     ) : (
//       <button
//         onClick={pauseStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Pause Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPause className="text-xl mb-1" />
//         <span className="text-xs font-medium">Pause</span>
//       </button>
//     )}
    
//     {/* Audio Toggle */}
//     <button
//       onClick={toggleAudio}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         audioEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//       disabled={isRecordingLoading || isRecordingStopping}
//     >
//       {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
//     </button>

//     {/* Video Toggle */}
//     <button
//       onClick={toggleVideo}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         videoEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={videoEnabled ? "Disable Video" : "Enable Video"}
//       disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//     >
//       {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
//     </button>
    
//     {/* Smart Screen Share Button */}
//     {activeScreenShare?.source === "streamer" ? (
//       <button
//         onClick={stopScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title={isRecording ? "Stop Screen Share & Recording" : "Stop Screen Share"}
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <div className="relative">
//           <FiSquare className="text-xl mb-1" />
//           {isRecording && (
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
//           )}
//         </div>
//         <span className="text-xs font-medium">
//           {isRecording ? 'Stop Both' : 'Stop Share'}
//         </span>
//         {isRecording && (
//           <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] px-1 rounded">
//             REC
//           </span>
//         )}
//       </button>
//     ) : (
//       <button
//         onClick={startScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl hover:from-gray-700 hover:to-gray-800 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Screen Share"
//         disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//       >
//         <MdOutlineScreenShare className="text-xl mb-1" />
//         <span className="text-xs font-medium">Share Screen</span>
//       </button>
//     )}
    
//     {/* Smart Recording Button */}
//     <button
//       onClick={handleRecordingToggle}
//       disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         isRecording 
//           ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
//           : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
//       }`}
//       title={
//         isRecording 
//           ? `Stop Recording (${formatRecordingTime(recordingTimer)})` 
//           : activeScreenShare 
//             ? "Record Current Screen Share" 
//             : "Start Screen Recording"
//       }
//     >
//       {isRecordingLoading ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Starting...</span>
//         </>
//       ) : isRecordingStopping ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Saving...</span>
//         </>
//       ) : isRecording ? (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
//           </div>
//           <span className="text-xs font-medium">Stop REC</span>
          
//           {/* Recording Timer Badge */}
//           <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//             {formatRecordingTime(recordingTimer)}
//           </span>
          
//           {/* Screen Share Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">
//               SCREEN
//             </span>
//           )}
          
//           {/* Recording Size Indicator */}
//           {recordingChunks.length > 0 && (
//             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] py-0.5 rounded-b-2xl">
//               {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//             </div>
//           )}
//         </>
//       ) : (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             {activeScreenShare && (
//               <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
//             )}
//           </div>
//           <span className="text-xs font-medium">
//             {activeScreenShare ? 'Record Share' : 'Record'}
//           </span>
          
//           {/* Tooltip Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
//               ✓
//             </span>
//           )}
//         </>
//       )}
//     </button>

//     {/* End Stream Button */}
//     {roomState.isStreaming && (
//       <button
//         onClick={endStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="End Stream for All Participants"
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <FiStopCircle className="text-xl mb-1" />
//         <span className="text-xs font-medium">End Stream</span>
        
//         {/* Warning Indicator if Recording is Active */}
//         {isRecording && (
//           <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
//             !
//           </span>
//         )}
//       </button>
//     )}
//   </div>
  
//   {/* Recording Status Bar */}
//   {isRecording && (
//     <div className="mt-3 mx-auto max-w-2xl">
//       <div className="flex items-center justify-between text-xs text-gray-300">
//         <div className="flex items-center space-x-2">
//           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
//           <span className="font-medium">Recording Active</span>
//           <span className="text-gray-400">•</span>
//           <span>{formatRecordingTime(recordingTimer)}</span>
//           <span className="text-gray-400">•</span>
//           <span>
//             {activeScreenShare 
//               ? `Recording ${activeScreenShare.userName}'s screen` 
//               : 'Recording screen & audio'}
//           </span>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {recordingChunks.length > 0 && (
//             <>
//               <span className="text-gray-400">Size:</span>
//               <span className="font-mono">
//                 {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//               </span>
//             </>
//           )}
//         </div>
//       </div>
      
//       {/* Recording Progress Bar */}
//       <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
//         <div 
//           className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
//           style={{ 
//             width: `${Math.min((recordingTimer % 60) / 60 * 100, 100)}%`,
//             animationDuration: '1s'
//           }}
//         ></div>
//       </div>
//     </div>
//   )}
// </div>
//   </div>
// );

// };

// export default LiveSession; 





























// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { io } from 'socket.io-client';
// import * as mediasoupClient from 'mediasoup-client';
// import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
// import ChatComponent from './ChatComponent';
// import AudioPermissionModal from './AudioPermissionModal';
// import { uploadRecordingToBackend, getRecordingUploadUrl } from './recordingService';
// import ScreenRecorderComponent from './ScreenRecorderComponent';

// import { toast } from 'react-toastify';
// import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiShare2, FiSquare, FiUsers, FiMessageSquare, FiSettings, FiUser, FiUserCheck,
//   FiUserX, FiAirplay, FiCamera, FiCameraOff, FiCheck, FiX, FiLoader, FiLogOut, FiRefreshCw, FiPlay, FiPause, FiStopCircle,
//   FiArrowUpRight, FiChevronDown, FiSend, FiAlertCircle, FiWifi, FiWifiOff, FiCircle, FiRadio, FiMenu, FiGrid, FiList,
//   FiMonitor, FiMaximize2, FiMinimize2, FiImage, FiSmile, FiFile, FiDownload} from 'react-icons/fi';
// import { IoVideocam, IoVideocamOff, IoShareOutline, IoStop, IoExitOutline, IoPeople, IoChatbubbleEllipses,
//   IoCog, IoPlay, IoPause, IoExpand, IoContract} from 'react-icons/io5';
// import { MdOutlineScreenShare , MdStopScreenShare, MdPlayArrow, MdPause, MdStop, MdGroup, MdChat, MdSettings, MdExitToApp, MdRefresh,
//   MdWarning,
//   MdError
// } from 'react-icons/md';
// import { FiChevronRight,FiChevronLeft,FiMaximize,FiSearch  } from "react-icons/fi";


// import { BsFillRecordFill } from "react-icons/bs";
// import { 
//   useRecordingTimer, 
//   RecordingTimerDisplay, 
//   RecordingStatusBadge,
//   formatTime 
// } from './RecordingTimer';

// import {
//   ActiveViewerAudioPanel,
//   ActiveScreenSharesPanel,
//   ProducerStatus,
//   ParticipantsModal,
//   ViewerVideoRequestsPanel,
//   ViewerAudioRequestsPanel,
//   ScreenShareRequestsPanel,
//   MobileHeader,
//   MobileNavigation,
//   MobileRequestsPanel,
//   MobileControls,
//   MobileParticipantsView,
//   MobileChatView,
//   MobileVideoView,
//   ThumbnailVideo
// } from './components';


// const LiveSession = () => {
//   const { sessionId, roomCode } = useParams();
//   const navigate = useNavigate();
//   const { user, token } = useAuth();
//   const [socket, setSocket] = useState(null);
//   const [showWhiteboard, setShowWhiteboard] = useState(false);
// const [recordings, setRecordings] = useState([]);
// const [showRecordingsModal, setShowRecordingsModal] = useState(false);
// const [isRecordingLoading, setIsRecordingLoading] = useState(false);
// const [isRecordingStopping, setIsRecordingStopping] = useState(false); // ✅ नया state add करें
// const [recordingInterval, setRecordingInterval] = useState(null); // ✅ नया state
// const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
// const [thumbnailsExpanded, setThumbnailsExpanded] = useState(false);
// const [fullScreenThumbnails, setFullScreenThumbnails] = useState(false);
// const [autoStartRecording, setAutoStartRecording] = useState(false);

// const [recordingStream, setRecordingStream] = useState(null);




// const { 
//   recordingTimer,
//   recordingStartTime,
//   isRecordingActive,
//   startRecordingTimer,
//   stopRecordingTimer,
//   resetRecordingTimer,
//   formatRecordingTime 
// } = useRecordingTimer();

// const [isLandscape, setIsLandscape] = useState(false);

// const [recorder, setRecorder] = useState(null);
// const [recordedBlob, setRecordedBlob] = useState(null);
// const [recordingChunks, setRecordingChunks] = useState([]);


//    const [showAudioPermissionModal, setShowAudioPermissionModal] = useState(false);
//   const [userInteracted, setUserInteracted] = useState(false);
//   const [pendingAudioStreams, setPendingAudioStreams] = useState(new Map());
//    const [uploadingFile, setUploadingFile] = useState(false);
//   const [chatInput, setChatInput] = useState('');
// const [thumbnailsPosition, setThumbnailsPosition] = useState('right');
// const [streamerThumbnailVisible, setStreamerThumbnailVisible] = useState(true);
// const [sidebarView, setSidebarView] = useState('participants');
// const [isWebSocketInitialized, setIsWebSocketInitialized] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);
//    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
// const [showRequests, setShowRequests] = useState(false);
//   const [mobileView, setMobileView] = useState('video');
//   const [showMobileControls, setShowMobileControls] = useState(true);
//   const [isFullScreen, setIsFullScreen] = useState(false);
//   const [showThumbnails, setShowThumbnails] = useState(false);
//   const [session, setSession] = useState(null);
//   const [participants, setParticipants] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [permissionStatus, setPermissionStatus] = useState('checking');
//   const [mediaError, setMediaError] = useState(null);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [cameraVisible, setCameraVisible] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [showPlayButton, setShowPlayButton] = useState(false);
//   const [localPausedState, setLocalPausedState] = useState(false);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [iceServers, setIceServers] = useState([]);
//   const [isMediaInitialized, setIsMediaInitialized] = useState(false);
//   const [debugLog, setDebugLog] = useState([]);
//   const [producersState, setProducersState] = useState(new Map());
//   const [consumersState, setConsumersState] = useState(new Map());
//   const [isStreamPaused, setIsStreamPaused] = useState(false);
//   const [showParticipantsModal, setShowParticipantsModal] = useState(false);
//   const [selectedParticipant, setSelectedParticipant] = useState(null);
//   const [activeSpeakers, setActiveSpeakers] = useState(new Map());
//   const [viewerAudioRequests, setViewerAudioRequests] = useState([]);
//   const [screenShareRequests, setScreenShareRequests] = useState([]);
//   const [activeViewerAudio, setActiveViewerAudio] = useState(new Map());
//   const [activeScreenShare, setActiveScreenShare] = useState(null);
//    const [audioRemoveTarget, setAudioRemoveTarget] = useState(null);
//    const [zoomed, setZoomed] = useState(null);
//   const [mediaStream, setMediaStream] = useState(null);
//   const [viewerAudios, setViewerAudios] = useState(new Map());
// const [viewerVideoRequests, setViewerVideoRequests] = useState([]);
// const [viewerCameras, setViewerCameras] = useState(new Map()); 
//   const streamerMediaRef = useRef(new MediaStream());
//   const viewerAudiosRef = useRef(new Map());
//   const videoRef = useRef(null);
//   const screenRef = useRef(null);
//   const remoteVideosRef = useRef(new Map());
//   const transports = useRef(new Map());
//   const producers = useRef(new Map());
//   const consumers = useRef(new Map());
//   const userGestureHandlerRef = useRef(null);
//   const isMountedRef = useRef(true);
//   const sendTransportRef = useRef(null);
//   const recvTransportRef = useRef(null);
//   const audioElementsRef = useRef(new Map());
//   const pendingAudioQueueRef = useRef(new Map());
//   const socketRef = useRef(null);
//   const zoomedVideoRef = useRef(null); // ✅ Add this near other refs
//   const [device] = useState(new mediasoupClient.Device());
//   const [showRecorder, setShowRecorder] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);

//   const [roomState, setRoomState] = useState({
//     isStreaming: false,
//     isPaused: false,
//     whiteboardEnabled: true
//   });
//   const emitSocketEvent = (event, data, callback) => {
//     if (socketRef.current && socketRef.current.connected) {
//       if (callback) {
//         socketRef.current.emit(event, data, callback);
//       } else {
//         socketRef.current.emit(event, data);
//       }
//       addDebugLog(`📤 Emitted ${event} event`);
//       return true;
//     } else {
//       addDebugLog(`❌ Cannot emit ${event}: Socket not connected`);
//       return false;
//     }
//   };

//   const getSocket = () => {
//     return socketRef.current;
//   };
//   const toggleZoom = (type, stream, userId) => {
//   setZoomed((prev) => {
//     if (prev && prev.type === type && prev.userId === userId) {
//       return null; // unzoom
//     }
//     return { type, stream, userId };
//   });
// };


//   const addDebugLog = (message) => {
//     console.log(message);
//     setDebugLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
//   };

//   // ========== SOCKET EVENT HANDLERS ==========

//  const stopScreenShare = useCallback(() => {
//   addDebugLog("🛑 Stopping screen share...");

//   // 🔴 Agar recording chal rahi hai to pehle stop karen
//   if (isRecording) {
//     addDebugLog("🎬 Also stopping recording with screen share...");
    
//     // Recording stop karen
//     if (recorder && recorder.state === 'recording') {
//       try {
//         recorder.stop();
//         addDebugLog("⏹️ Recording stopped with screen share");
        
//         // Recording timer stop karen
//         stopRecordingTimer();
//         setIsRecording(false);
        
//         // Recording stream cleanup
//         if (recordingStream) {
//           recordingStream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//             }
//           });
//           setRecordingStream(null);
//         }
        
//         // Recording chunks clear karen
//         setRecordingChunks([]);
        
//         toast.info('Recording also stopped with screen share');
//       } catch (recordingError) {
//         addDebugLog(`❌ Error stopping recording: ${recordingError.message}`);
//       }
//     }
//   }

//   // 🔴 Screen audio producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen-audio") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen audio producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen audio producer: ${err.message}`);
//       }
//     }
//   });

//   // 🔴 Screen video producer close karen (agar bana hai)
//   producers.current.forEach((producer, id) => {
//     if (producer.appData?.source === "screen") {
//       try {
//         producer.close();
//         producers.current.delete(id);

//         setProducersState(prev => {
//           const newMap = new Map(prev);
//           newMap.delete(id);
//           return newMap;
//         });

//         addDebugLog(`🛑 Screen share video producer closed: ${id}`);
//       } catch (err) {
//         addDebugLog(`⚠️ Error closing screen share producer: ${err.message}`);
//       }
//     }
//   });

//   // 🖥️ Agar activeScreenShare streamer ka hai → tracks stop kardo
//   if (activeScreenShare?.source === "streamer" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         try {
//           if (track.readyState === 'live') {
//             track.stop();
//             addDebugLog(`🛑 Stopped screen share track: ${track.kind} - ${track.id}`);
//           }
//         } catch (trackError) {
//           addDebugLog(`⚠️ Error stopping track: ${trackError.message}`);
//         }
//       });
//       addDebugLog("✅ Streamer screen tracks stopped");
//     } catch (streamError) {
//       addDebugLog(`❌ Error stopping streamer screen tracks: ${streamError.message}`);
//     }
//   }

//   // 🖥️ Viewer screen share ka case handle karen
//   if (activeScreenShare?.source === "viewer-screen" && activeScreenShare.stream) {
//     try {
//       const tracks = activeScreenShare.stream.getTracks();
//       tracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       addDebugLog(`🛑 Viewer screen tracks stopped for user: ${activeScreenShare.userId}`);
//     } catch (viewerError) {
//       addDebugLog(`⚠️ Error stopping viewer screen tracks: ${viewerError.message}`);
//     }
//   }

//   // 🔄 Zoom reset karen agar screen share zoomed hai
//   setZoomed(prev => {
//     if (prev && prev.type === "screen") {
//       addDebugLog(`🔄 Resetting zoom for stopped screen share`);
//       return null;
//     }
//     return prev;
//   });

//   // ❌ Active screen share state clear karen
//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer" || prev?.source === "viewer-screen") {
//       addDebugLog(`✅ Active screen share cleared: ${prev.userName}`);
//       return null;
//     }
//     return prev;
//   });

//   // 🎬 Screen ref clear karen
//   if (screenRef.current) {
//     try {
//       screenRef.current.srcObject = null;
//       screenRef.current.load?.();
//       addDebugLog("✅ Screen ref cleared");
//     } catch (screenRefError) {
//       addDebugLog(`⚠️ Error clearing screenRef: ${screenRefError.message}`);
//     }
//   }

//   // 📡 Server ko notify karen (only if streamer)
//   if (socket && activeScreenShare?.source === "streamer") {
//     try {
//       socket.emit("screen-share-stop", {
//         sessionId: sessionId || roomCode,
//         userId: user?.id,
//         source: "streamer"
//       });
//       addDebugLog("📤 Emitted screen-share-stop to server");
//     } catch (emitError) {
//       addDebugLog(`⚠️ Error emitting screen-share-stop: ${emitError.message}`);
//     }
//   }

//   // Viewer screen share ka case (agar viewer ne share kiya hai)
//   if (activeScreenShare?.source === "viewer-screen") {
//     addDebugLog(`🖥️ Viewer screen share cleanup for user: ${activeScreenShare.userId}`);
    
//     // Server ko notify karen (viewer ka screen share stop ho raha hai)
//     if (socket) {
//       try {
//         socket.emit("screen-share-force-stop", {
//           sessionId: sessionId || roomCode,
//           targetUserId: activeScreenShare.userId
//         });
//         addDebugLog(`📤 Notified server to stop viewer screen share: ${activeScreenShare.userId}`);
//       } catch (emitError) {
//         addDebugLog(`⚠️ Error notifying server: ${emitError.message}`);
//       }
//     }
//   }

//   // ✅ Screen share ke baad main camera restore ensure karen
//   // Agar main mediaStream hai to video element mein set karen
//   setTimeout(() => {
//     if (videoRef.current && mediaStream && !videoRef.current.srcObject) {
//       try {
//         videoRef.current.srcObject = mediaStream;
//         videoRef.current.play().catch(err => {
//           console.warn("Autoplay prevented after screen share:", err);
//         });
//         addDebugLog("✅ Main camera restored after screen share");
//       } catch (restoreError) {
//         addDebugLog(`⚠️ Error restoring main camera: ${restoreError.message}`);
//       }
//     }
//   }, 100);

//   // Toast notification
//   const toastMessage = isRecording 
//     ? 'Screen share & recording stopped' 
//     : 'Screen share stopped';
    
//   toast.success(toastMessage, {
//     position: "bottom-right",
//     autoClose: 3000,
//   });

//   addDebugLog("✅ Screen share fully stopped");

// }, [
//   isRecording, 
//   socket, 
//   sessionId, 
//   roomCode, 
//   user, 
//   activeScreenShare,
//   recorder,           // ✅ Added for recording control
//   recordingStream,    // ✅ Added for recording cleanup
//   stopRecordingTimer, // ✅ Added for timer control
//   mediaStream         // ✅ Added for camera restoration
// ]);


// const handleRecordingToggle = async () => {
//   if (isRecordingLoading || isRecordingStopping) {
//     toast.info('Recording operation is already in progress. Please wait...');
//     return;
//   }

//   if (!isRecording) {
//     await startRecording();
//   } else {
//     await stopRecording();
//   }
// };


// // const startRecording = async () => {
// //   try {
// //     addDebugLog('🎬 Starting screen recording...');
// //     setIsRecordingLoading(true);

// //     // ✅ CASE 1: Agar active screen share hai to usi se record karen
// //     if (activeScreenShare?.stream) {
// //       addDebugLog(`📺 Recording from existing screen share: ${activeScreenShare.userName}`);
// //       return startRecordingFromScreenShare(activeScreenShare.stream);
// //     }
    
// //     // ✅ CASE 2: Agar koi screen share nahi hai to naya screen share se record karen
// //     addDebugLog('🔄 No active screen share, starting new screen share for recording');
// //     return startNewScreenShareWithRecording();
    
// //   } catch (error) {
// //     console.error('Failed to start recording:', error);
    
// //     if (error.message === 'SCREEN_SHARE_CANCELLED') {
// //       toast.info('Screen sharing cancelled');
// //     } else if (error.name === 'NotAllowedError') {
// //       toast.error('Screen sharing permission denied');
// //     } else {
// //       toast.error('Failed to start recording');
// //     }
    
// //     setIsRecording(false);
// //     setIsRecordingLoading(false);
// //   }
// // };



// // ✅ FUNCTION 1: Existing screen share se recording


// const reinitializeCamera = async () => {
//   try {
//     addDebugLog('🔄 Re-initializing camera during recording...');
    
//     // 1. पहले existing producers को pause करें
//     Array.from(producers.current.entries()).forEach(([id, producer]) => {
//       if (producer.appData?.source === 'camera') {
//         try {
//           producer.pause();
//           addDebugLog(`⏸️ Camera producer paused: ${id}`);
//         } catch (err) {
//           addDebugLog(`⚠️ Error pausing camera producer: ${err.message}`);
//         }
//       }
//     });
    
//     // 2. Current camera tracks को stop करें
//     if (mediaStream) {
//       const videoTracks = mediaStream.getVideoTracks();
//       videoTracks.forEach(track => {
//         if (track.kind === 'video') {
//           addDebugLog(`🛑 Stopping camera track: ${track.id}`);
//           track.stop();
//         }
//       });
//     }
    
//     // 3. नया camera stream request करें
//     const newVideoStream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         width: { ideal: 640 },
//         height: { ideal: 480 },
//         frameRate: { ideal: 24 },
//         facingMode: 'user'
//       },
//       audio: false // Audio नहीं लेंगे क्योंकि mic पहले से है
//     });
    
//     addDebugLog('✅ New camera stream obtained');
    
//     // 4. नया MediaStream बनाएं (पुराने audio tracks को add करें)
//     const newCombinedStream = new MediaStream();
    
//     // नए video tracks add करें
//     newVideoStream.getVideoTracks().forEach(track => {
//       newCombinedStream.addTrack(track);
//       addDebugLog(`📹 Added new video track: ${track.id}`);
//     });
    
//     // पुराने audio tracks को add करें (अगर available हैं)
//     if (mediaStream) {
//       const audioTracks = mediaStream.getAudioTracks();
//       audioTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           newCombinedStream.addTrack(track);
//           addDebugLog(`🎤 Kept existing audio track: ${track.id}`);
//         }
//       });
//     }
    
//     // 5. State update करें
//     setMediaStream(newCombinedStream);
    
//     // 6. Video element को update करें
//     if (videoRef.current) {
//       videoRef.current.srcObject = newCombinedStream;
//       videoRef.current.play()
//         .then(() => {
//           addDebugLog('✅ Camera re-initialized and playing');
//           setIsPlaying(true);
//           setShowPlayButton(false);
//           setMediaError(false);
//         })
//         .catch(error => {
//           console.warn('Re-initialized camera play error:', error);
//           addDebugLog(`⚠️ Camera play blocked: ${error.message}`);
//           setShowPlayButton(true);
//         });
//     }
    
//     // 7. नए camera track के लिए producer update करें
//     setTimeout(async () => {
//       try {
//         const newVideoTrack = newCombinedStream.getVideoTracks()[0];
//         if (newVideoTrack && sendTransportRef.current) {
          
//           // पुराने camera producer को close करें
//           Array.from(producers.current.entries()).forEach(([id, producer]) => {
//             if (producer.appData?.source === 'camera') {
//               producer.close();
//               producers.current.delete(id);
              
//               setProducersState(prev => {
//                 const newMap = new Map(prev);
//                 newMap.delete(id);
//                 return newMap;
//               });
              
//               addDebugLog(`🗑️ Closed old camera producer: ${id}`);
//             }
//           });
          
//           // नया camera producer create करें
//           const newCameraProducer = await sendTransportRef.current.produce({
//             track: newVideoTrack,
//             appData: {
//               source: 'camera',
//               userId: user?.id,
//               userName: user?.name
//             }
//           });
          
//           producers.current.set(newCameraProducer.id, newCameraProducer);
          
//           setProducersState(prev => 
//             new Map(prev).set(newCameraProducer.id, {
//               id: newCameraProducer.id,
//               kind: 'video',
//               paused: false,
//               source: 'camera',
//               userId: user?.id
//             })
//           );
          
//           addDebugLog(`✅ New camera producer created: ${newCameraProducer.id}`);
//         }
//       } catch (producerError) {
//         addDebugLog(`⚠️ Error creating new camera producer: ${producerError.message}`);
//       }
//     }, 500);
    
//     addDebugLog('✅ Camera re-initialization completed');
//     return true;
    
//   } catch (error) {
//     console.error('❌ Camera re-initialization failed:', error);
//     addDebugLog(`❌ Camera re-init error: ${error.message}`);
    
//     // Fallback: Try with simpler constraints
//     try {
//       addDebugLog('🔄 Trying fallback camera constraints...');
//       const fallbackStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: false
//       });
      
//       if (videoRef.current) {
//         videoRef.current.srcObject = fallbackStream;
//         setMediaStream(fallbackStream);
//         addDebugLog('✅ Fallback camera initialized');
//         return true;
//       }
//     } catch (fallbackError) {
//       addDebugLog(`❌ Fallback also failed: ${fallbackError.message}`);
//     }
    
//     setMediaError('Camera re-initialization failed');
//     setShowPlayButton(true);
//     return false;
//   }
// };

// const preWarmCamera = async () => {
//   try {
//     addDebugLog('🔥 Pre-warming camera before recording...');
    
//     // एक hidden video element create करें जो camera को active रखे
//     const hiddenVideo = document.createElement('video');
//     hiddenVideo.style.display = 'none';
//     hiddenVideo.autoplay = true;
//     hiddenVideo.playsInline = true;
//     hiddenVideo.muted = true;
//     document.body.appendChild(hiddenVideo);
    
//     // Camera stream लें और hidden video में play करें
//     const keepAliveStream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         width: { ideal: 320 },
//         height: { ideal: 240 },
//         frameRate: { ideal: 15 }
//       },
//       audio: false
//     });
    
//     hiddenVideo.srcObject = keepAliveStream;
//     hiddenVideo.play().catch(() => {});
    
//     addDebugLog('✅ Camera pre-warmed (hidden stream active)');
    
//     // इसे store करें ताकि बाद में clean कर सकें
//     window.cameraKeepAlive = {
//       video: hiddenVideo,
//       stream: keepAliveStream
//     };
    
//     return true;
//   } catch (error) {
//     addDebugLog(`❌ Camera pre-warm failed: ${error.message}`);
//     return false;
//   }
// };


// const startRecording = async () => {
//   try {
//     setIsRecordingLoading(true);
//     addDebugLog('🎬 Starting separate recording session...');

//     // --- STEP 1: Request Screen specifically for Recording (Separate Window) ---
//     // Yeh browser ka built-in popup kholega (Aapki Requirement)
//     const recordingScreenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         width: { ideal: 1920 },
//         height: { ideal: 1080 },
//         frameRate: 30
//       },
//       audio: true // System audio (Youtube, etc.) capture karega
//     });

//     // Handle "Stop Sharing" button specifically for the recorder
//     recordingScreenStream.getVideoTracks()[0].onended = () => {
//       addDebugLog("⏹️ Recording screen stopped by system UI");
//       stopRecording();
//     };

//     // --- STEP 2: Create Final Stream for Recorder ---
//     const finalRecordingStream = new MediaStream();

//     // A. Add Screen Video (From Step 1)
//     finalRecordingStream.addTrack(recordingScreenStream.getVideoTracks()[0]);

//     // B. Add Screen Audio (From Step 1 - System Audio)
//     if (recordingScreenStream.getAudioTracks().length > 0) {
//       finalRecordingStream.addTrack(recordingScreenStream.getAudioTracks()[0]);
//     }

//     // --- STEP 3: SAFER MIC HANDLING (CRITICAL FIX) ---
//     // Naya getUserMedia call MAT karo. Jo camera/mic chal raha hai, uska clone lo.
//     // Isse Camera band nahi hoga.
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//        const existingMicTrack = mediaStream.getAudioTracks()[0];
//        const clonedMicTrack = existingMicTrack.clone(); // Clone create kiya
//        finalRecordingStream.addTrack(clonedMicTrack);
//        addDebugLog('🎤 Added cloned mic to recording (Camera Safe)');
//     } else {
//        addDebugLog('⚠️ No active microphone found to record');
//     }

//     // --- STEP 4: Start Recorder ---
//     // Humne screenStream pass kiya taaki cleanup ke time reference rahe
//     startMediaRecorder(finalRecordingStream, recordingScreenStream); 
    
//     // UI Update
//     setRecordingStream(finalRecordingStream); 
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();
    
//     toast.success('🔴 Recording Started (Camera is ON)');

//   } catch (error) {
//     console.error('Failed to start recording:', error);
//     // Error handling: User ne cancel kiya ya permission deny ki
//     if (error.name === 'NotAllowedError') {
//         toast.info('Recording cancelled by user');
//     } else {
//         toast.error('Failed to start recording');
//     }
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };
// const startRecordingFromScreenShare = async (screenShareStream) => {
//   try {
//     addDebugLog('🎬 Initializing secure recording...');

//     // 1. Create a dedicated stream for recording
//     const recordingStream = new MediaStream();

//     // --- VIDEO HANDLING (CLONE) ---
//     // Screen Video Track को Clone करें ताकि Main Screen पर असर न पड़े
//     const originalVideoTrack = screenShareStream.getVideoTracks()[0];
//     if (originalVideoTrack) {
//       const clonedVideoTrack = originalVideoTrack.clone();
//       recordingStream.addTrack(clonedVideoTrack);
//     } else {
//       throw new Error("No video track in screen share");
//     }

//     // --- SYSTEM AUDIO HANDLING (CLONE) ---
//     const originalScreenAudio = screenShareStream.getAudioTracks()[0];
//     if (originalScreenAudio) {
//       const clonedScreenAudio = originalScreenAudio.clone();
//       recordingStream.addTrack(clonedScreenAudio);
//     }

//     // --- MIC AUDIO HANDLING (CLONE) ---
//     // मौजूदा कैमरा/माइक स्ट्रीम से ऑडियो लें और क्लोन करें
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       addDebugLog('🎤 Cloning existing microphone for recording');
//       const originalMicTrack = mediaStream.getAudioTracks()[0];
//       const clonedMicTrack = originalMicTrack.clone();
//       recordingStream.addTrack(clonedMicTrack);
//     } else {
//       // अगर माइक नहीं है, तो नया मांगें (Optional fallback)
//       try {
//         const micStream = await navigator.mediaDevices.getUserMedia({
//           audio: { echoCancellation: true, noiseSuppression: true }
//         });
//         // यहाँ क्लोन की जरूरत नहीं क्योंकि ये नया स्ट्रीम है
//         recordingStream.addTrack(micStream.getAudioTracks()[0]);
//       } catch (err) {
//         addDebugLog('⚠️ No mic audio for recording');
//       }
//     }

//     // 2. Start Recording with the CLONED stream
//     // Note: हम original screenShareStream पास नहीं कर रहे, सिर्फ recordingStream use होगा
//     startMediaRecorder(recordingStream, null, null);

//     // State Updates
//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     toast.success('🎬 Recording started smoothly!');

//   } catch (error) {
//     console.error('Error recording from screen share:', error);
//     toast.error('Failed to start recording');
//     setIsRecordingLoading(false);
//   }
// };



// const emergencyCameraRecovery = async () => {
//   try {
//     addDebugLog('🚨 Starting emergency camera recovery...');
    
//     // 1. First try to get camera with minimal constraints
//     const newCameraStream = await navigator.mediaDevices.getUserMedia({
//       video: {
//         width: { ideal: 320 },
//         height: { ideal: 240 },
//         frameRate: { ideal: 15 }
//       },
//       audio: false
//     });
    
//     // 2. Get the new camera track
//     const newCameraTrack = newCameraStream.getVideoTracks()[0];
//     if (!newCameraTrack) {
//       throw new Error('No camera track obtained');
//     }
    
//     // 3. Create new media stream with old audio and new video
//     const newMediaStream = new MediaStream();
    
//     // Add new camera track
//     newMediaStream.addTrack(newCameraTrack);
    
//     // Add existing audio tracks if available
//     if (mediaStream) {
//       const audioTracks = mediaStream.getAudioTracks();
//       audioTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           newMediaStream.addTrack(track);
//         }
//       });
//     }
    
//     // 4. Update state
//     setMediaStream(newMediaStream);
    
//     // 5. Update video element
//     if (videoRef.current) {
//       videoRef.current.srcObject = newMediaStream;
//       videoRef.current.play()
//         .then(() => {
//           addDebugLog('✅ Emergency camera recovery successful');
//           setIsPlaying(true);
//           setShowPlayButton(false);
//         })
//         .catch(error => {
//           console.warn('Emergency recovery play error:', error);
//           setShowPlayButton(true);
//         });
//     }
    
//     return true;
    
//   } catch (error) {
//     addDebugLog(`❌ Emergency camera recovery failed: ${error.message}`);
    
//     // Fallback: Show message to user
//     toast.warning('Camera may not be visible during recording', {
//       position: "bottom-right",
//       autoClose: 3000,
//     });
    
//     return false;
//   }
// };

// const startNewScreenShareWithRecording = async () => {
//   try {
//     setIsRecordingLoading(true);
//     addDebugLog('🎬 Starting screen recording with camera preservation...');

//     // ✅ STEP 1: Camera को पहले ही pre-warm करें
//     const preWarmSuccess = await preWarmCamera();
//     if (!preWarmSuccess) {
//       addDebugLog('⚠️ Camera pre-warm failed, continuing anyway...');
//     }

//     // ✅ STEP 2: थोड़ा wait करें camera stabilize होने के लिए
//     await new Promise(resolve => setTimeout(resolve, 500));

//     // ✅ STEP 3: Screen share start करें (WITHOUT auto camera disable)
//     const screenStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         cursor: "always",
//         frameRate: 30,
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//       },
//       audio: true,
//     });

//     addDebugLog('🖥️ Screen share started (camera should stay on)');

//     // ✅ STEP 4: Camera status check और restore करें
//     let cameraRestored = false;
//     if (mediaStream) {
//       const cameraTrack = mediaStream.getVideoTracks()[0];
//       if (cameraTrack) {
//         if (cameraTrack.readyState === 'live') {
//           // Camera को force enable करें
//           cameraTrack.enabled = true;
          
//           // Video element को update करें
//           if (videoRef.current) {
//             videoRef.current.srcObject = mediaStream;
//             videoRef.current.play().catch(e => {
//               console.warn('Camera play after screen share:', e);
//               setShowPlayButton(true);
//             });
//           }
          
//           addDebugLog('✅ Camera kept alive during screen share');
//           cameraRestored = true;
//         } else {
//           addDebugLog('❌ Camera track not live, attempting to restore...');
//         }
//       } else {
//         addDebugLog('❌ No camera track found in mediaStream');
//       }
//     }

//     // ✅ STEP 5: अगर camera restore नहीं हुआ, तो emergency restore करें
//     if (!cameraRestored) {
//       addDebugLog('🔄 Camera not restored, attempting emergency recovery...');
//       await emergencyCameraRecovery();
//     }

//     // ✅ STEP 6: Microphone Audio Setup
//     let micTrack = null;
    
//     // Check karein agar main mediaStream (Camera+Mic) already chal raha hai
//     if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//       addDebugLog('🎤 Using existing microphone track for recording (Cloned)');
//       // ✅ IMPORTANT: Existing audio track ko CLONE करें
//       micTrack = mediaStream.getAudioTracks()[0].clone();
//     } else {
//       // Agar mic pehle se on nahi hai, tabhi naya request karein
//       try {
//         addDebugLog('🎤 Requesting new microphone permission');
//         const micStream = await navigator.mediaDevices.getUserMedia({
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//           },
//         });
//         micTrack = micStream.getAudioTracks()[0];
//       } catch (micError) {
//         addDebugLog('⚠️ Mic permission denied or not available for recording');
//       }
//     }

//     // ✅ STEP 7: Participants ke liye Screen Share setup karein
//     if (user?.role === 'streamer' || !user?.role) {
//       try {
//         await startScreenShareForParticipants(screenStream);
//       } catch (shareError) {
//         addDebugLog('⚠️ Could not share with participants, but recording will continue');
//       }
//     }

//     // ✅ STEP 8: Recording ke liye Final Stream banayein
//     const recordingStream = new MediaStream();

//     // Screen Video add karein (CLONED)
//     const screenVideoTrack = screenStream.getVideoTracks()[0];
//     if (screenVideoTrack) {
//       const clonedScreenVideo = screenVideoTrack.clone();
//       recordingStream.addTrack(clonedScreenVideo);
//     }
    
//     // Screen Audio add karein (agar user ne share kiya hai) - CLONED
//     const screenAudioTrack = screenStream.getAudioTracks()[0];
//     if (screenAudioTrack) {
//       const clonedScreenAudio = screenAudioTrack.clone();
//       recordingStream.addTrack(clonedScreenAudio);
//     }

//     // Mic Audio add karein (Cloned track)
//     if (micTrack) {
//       recordingStream.addTrack(micTrack);
//     }

//     // ✅ STEP 9: Recording Start Karein
//     startMediaRecorder(recordingStream, screenStream, null);

//     // ✅ STEP 10: State Updates
//     setRecordingStream(recordingStream);
//     setIsRecording(true);
//     setIsRecordingLoading(false);
//     startRecordingTimer();

//     // ✅ STEP 11: Active screen share state set karein
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenStream, // Original stream use karen
//       source: "streamer",
//     });

//     // ✅ STEP 12: Final camera check और thumbnail update
//     setTimeout(() => {
//       // Final camera status check
//       if (mediaStream) {
//         const finalCameraTrack = mediaStream.getVideoTracks()[0];
//         if (finalCameraTrack && finalCameraTrack.readyState === 'live') {
//           addDebugLog('🎯 Final camera status: ACTIVE');
          
//           // Force thumbnail update
//           if (videoRef.current && videoRef.current.srcObject !== mediaStream) {
//             videoRef.current.srcObject = mediaStream;
//             videoRef.current.play().catch(e => {
//               console.warn('Final camera play attempt:', e);
//             });
//           }
//         } else {
//           addDebugLog('🎯 Final camera status: INACTIVE - showing fallback');
//           setMediaError('Camera inactive during recording');
//         }
//       }
      
//       // Auto-zoom trigger (if needed)
//       if (activeScreenShare?.source === "streamer") {
//         setZoomed({
//           type: "screen",
//           stream: screenStream,
//           userId: user.id
//         });
//         addDebugLog('🔄 Auto-zoomed to screen share');
//       }
//     }, 800);

//     toast.success('🎬 Screen recording started! (Camera should remain visible)');

//     // ✅ STEP 13: Handle Stop (Jab user "Stop Sharing" click kare browser mein)
//     screenStream.getVideoTracks()[0].onended = () => {
//       addDebugLog('🖥️ Screen share ended by system UI');
//       stopRecording();
      
//       // Agar streamer share kar raha tha, to socket se bhi stop karein
//       if (activeScreenShare?.source === "streamer") {
//         stopScreenShare();
//       }
      
//       // Cleanup
//       if (micTrack) micTrack.stop();
      
//       // Camera cleanup भी करें
//       if (window.cameraKeepAlive) {
//         window.cameraKeepAlive.stream.getTracks().forEach(track => track.stop());
//         if (window.cameraKeepAlive.video.parentNode) {
//           window.cameraKeepAlive.video.parentNode.removeChild(window.cameraKeepAlive.video);
//         }
//         delete window.cameraKeepAlive;
//       }
//     };

//     // ✅ STEP 14: Audio track end handler
//     if (screenAudioTrack) {
//       screenAudioTrack.onended = () => {
//         addDebugLog('🔊 Screen audio ended');
//       };
//     }

//   } catch (error) {
//     console.error('Error starting new screen share with recording:', error);
    
//     // Cleanup on error
//     if (window.cameraKeepAlive) {
//       window.cameraKeepAlive.stream.getTracks().forEach(track => track.stop());
//       delete window.cameraKeepAlive;
//     }
    
//     if (error.message === 'SCREEN_SHARE_CANCELLED') {
//       toast.info('Screen sharing cancelled');
//     } else if (error.name === 'NotAllowedError') {
//       toast.error('Screen sharing permission denied');
//     } else {
//       toast.error('Failed to start recording');
//     }
    
//     setIsRecording(false);
//     setIsRecordingLoading(false);
//   }
// };

// const startScreenShareForParticipants = async (screenStream) => {
//   if (!sendTransportRef.current || !user) return;
  
//   try {
//     // ✅ Screen share ke tracks CLONE karen taki main stream disturb na ho
//     const videoTrack = screenStream.getVideoTracks()[0];
//     if (!videoTrack) return;
    
//     // Clone the track for sharing
//     const clonedVideoTrack = videoTrack.clone();
    
//     const videoProducer = await sendTransportRef.current.produce({
//       track: clonedVideoTrack,
//       appData: {
//         source: "screen",
//         userId: user.id,
//         userName: user.name || "Streamer",
//       },
//     });

//     addDebugLog(`✅ Screen share producer created: ${videoProducer.id}`);
    
//     // Audio track bhi share karen (agar available hai)
//     const audioTrack = screenStream.getAudioTracks()[0];
//     if (audioTrack) {
//       const clonedAudioTrack = audioTrack.clone();
//       await sendTransportRef.current.produce({
//         track: clonedAudioTrack,
//         appData: {
//           source: "screen-audio",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });
//     }

//     // ✅ Screen share stream ko alag store karen (main mediaStream ko overwrite na karen)
//     const screenShareStream = new MediaStream();
//     screenShareStream.addTrack(videoTrack);
//     if (audioTrack) screenShareStream.addTrack(audioTrack);

//     // Update active screen share state
//     setActiveScreenShare({
//       userId: user.id,
//       userName: user.name || "Streamer",
//       stream: screenShareStream,
//       source: "streamer",
//     });

//     // Notify server
//     if (socket) {
//       socket.emit("screen-share-started", {
//         sessionId: sessionId || roomCode,
//         userId: user.id,
//         userName: user.name || "Streamer",
//         hasAudio: !!audioTrack,
//         source: "screen",
//       });
//     }
    
//   } catch (error) {
//     console.error('Error sharing screen with participants:', error);
//     // Recording continue rahegi, bas sharing fail hua
//   }
// };
// // ✅ FUNCTION 4: MediaRecorder setup (common function)
// // Function signature update karein agar purana alag tha
// const startMediaRecorder = (recordingStream, originalScreenStream) => {
//   const options = {
//     mimeType: 'video/webm;codecs=vp9,opus',
//     videoBitsPerSecond: 3000000 
//   };

//   if (!MediaRecorder.isTypeSupported(options.mimeType)) {
//     delete options.mimeType; // Fallback
//   }

//   const mediaRecorder = new MediaRecorder(recordingStream, options);
//   const chunks = [];
//   setRecordingChunks([]);

//   mediaRecorder.ondataavailable = (event) => {
//     if (event.data.size > 0) {
//       chunks.push(event.data);
//       setRecordingChunks(prev => [...prev, event.data]);
//     }
//   };

//   mediaRecorder.onstop = async () => {
//     const blob = new Blob(chunks, { type: 'video/webm' });
    
//     // Internal Cleanup: Tracks stop karein
//     if(recordingStream) recordingStream.getTracks().forEach(track => track.stop());
//     if(originalScreenStream) originalScreenStream.getTracks().forEach(track => track.stop());

//     await uploadRecordingToServer(blob);
//     setRecorder(null);
//   };

//   mediaRecorder.onerror = (error) => {
//     console.error('Recorder error:', error);
//     toast.error('Recording failed');
//     stopRecording();
//   };

//   mediaRecorder.start(1000); 
//   setRecorder(mediaRecorder);
// };
// const stopRecording = useCallback(() => {
//   if (!recorder || recorder.state === 'inactive') return;

//   try {
//     addDebugLog('⏹️ Stopping recording...');
//     setIsRecordingStopping(true);
    
//     // 1. Stop Recorder
//     if (recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     stopRecordingTimer();
    
//     // 2. STOP ONLY RECORDING STREAMS
//     // Isse main mediaStream (Camera) par koi asar nahi padega
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => {
//         track.stop(); 
//         addDebugLog(`🛑 Stopped recording track: ${track.kind} (${track.label})`);
//       });
//       setRecordingStream(null);
//     }
    
//     toast.info('⏹️ Recording Stopped. Uploading...');
    
//   } catch (error) {
//     console.error('Error stopping recording:', error);
//     setIsRecordingStopping(false);
//   }
// }, [recorder, recordingStream, stopRecordingTimer]);

// const uploadRecordingToServer = async (blob) => {
//   try {
//     addDebugLog('📤 Uploading recording to backend...');
    
//     // Generate filename with session info
//     const fileName = `recording_${sessionId}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    
//     // Get pre-signed URL from backend
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       blob.type,
//       blob.size
//     );
    
//     if (!presignedData?.uploadUrl) {
//       throw new Error('Failed to get upload URL');
//     }
    
//     addDebugLog(`📁 Uploading to S3: ${fileName} (${formatFileSize(blob.size)})`);
    
//     // Upload to S3 using pre-signed URL
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': blob.type,
//       },
//       body: blob,
//     });
    
//     if (!uploadResponse.ok) {
//       throw new Error(`S3 upload failed: ${uploadResponse.status}`);
//     }
    
//     addDebugLog('✅ Recording uploaded to S3 successfully');
    
//     // Save recording metadata to backend
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: blob.type,
//       duration: recordingTimer,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey,
//       thumbnailUrl: '' // You can add thumbnail generation later
//     };
    
//     const saveResponse = await saveRecordingMetadata(sessionId, saveData);
    
//     if (saveResponse.success) {
//       addDebugLog(`✅ Recording saved to database: ${fileName}`);
//       toast.success(`🎉 Recording saved successfully! (${formatRecordingTime(recordingTimer)})`);
      
//       // Emit socket event
//       const socket = getSocket();
//       if (socket) {
//         socket.emit('recording_completed', {
//           sessionId,
//           recording: saveData
//         });
//       }
//     } else {
//       throw new Error('Failed to save recording metadata');
//     }
    
//     // Reset states
//     setIsRecording(false);
//     setRecorder(null);
//     setRecordedBlob(null);
    
//   } catch (error) {
//     console.error('Recording upload error:', error);
    
//     // Try local fallback
//     try {
//       addDebugLog('⚠️ Upload failed, attempting local save...');
//       const localSuccess = saveRecordingLocally(blob);
//       if (localSuccess) {
//         toast.warning('Recording saved locally (upload failed)');
//       } else {
//         toast.error('Failed to save recording');
//       }
//     } catch (localError) {
//       toast.error('Failed to save recording anywhere');
//     }
    
//     setIsRecording(false);
//     setRecorder(null);
//   } finally {
//     setIsRecordingStopping(false);
//   }
// };

// // Helper function for local fallback
// const saveRecordingLocally = (blob) => {
//   try {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     const fileName = `recording_${sessionId}_${Date.now()}.webm`;
    
//     a.href = url;
//     a.download = fileName;
//     a.style.display = 'none';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Cleanup
//     setTimeout(() => {
//       URL.revokeObjectURL(url);
//     }, 1000);
    
//     return true;
//   } catch (error) {
//     console.error('Local save error:', error);
//     return false;
//   }
// };

// // Format file size helper
// const formatFileSize = (bytes) => {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// };

// // Cleanup on component unmount
// // Cleanup on component unmount
// useEffect(() => {
//   return () => {
//     console.log("🧹 Component Unmounting - Cleaning up tracks");

//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup media tracks (Camera/Mic)
//     // Ye sirf tab chalega jab banda page close karega ya back jayega
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // Cleanup recording stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }

//     // Cleanup window tracks
//     if (window.recordingTracks) {
//       window.recordingTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           track.stop();
//         }
//       });
//       window.recordingTracks = null;
//     }
//   };
// }, []); // 🔴 Yahan [recorder, mediaStream] hata kar sirf [] karein

//   const handleClose = () => {
//     setShowRecorder(false);
//     setIsRecording(false);
//   };

// // Permission check useEffect ko update karo
// useEffect(() => {
//   const checkPermissions = async () => {
//     try {
//       addDebugLog('🔍 Checking camera and microphone permissions...');
//       setPermissionStatus('checking');
      
//       // Mobile devices ke liye direct request karo
//       if (isMobile) {
//         addDebugLog('📱 Mobile device detected, requesting permissions directly...');
//         await initializeCamera();
//         return;
//       }
      
//       // Desktop ke liye existing logic
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//       const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
      
//       if (hasVideoPermission && hasAudioPermission) {
//         addDebugLog('✅ Camera and microphone permissions already granted');
//         setPermissionStatus('granted');
//         initializeCamera();
//       } else {
//         addDebugLog('ℹ️ Need to request camera/microphone permissions');
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     } catch (error) {
//       console.error('Error checking permissions:', error);
//       addDebugLog(`❌ Error checking permissions: ${error.message}`);
//       setPermissionStatus('denied');
//       setIsLoading(false);
//     }
//   };

//   checkPermissions();
// }, [isMobile]); // isMobile add karo dependency

// useEffect(() => {
//   if (activeScreenShare?.stream) {
//     // Check if not already zoomed on this screen
//     if (!zoomed || zoomed.userId !== activeScreenShare.userId) {
//       addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
      
//       setZoomed({
//         type: "screen",
//         stream: activeScreenShare.stream,
//         userId: activeScreenShare.userId
//       });
//     }
//   }
// }, [activeScreenShare]);

// useEffect(() => {
//   const resumeAll = () => {
//     document.querySelectorAll("audio").forEach((el) => {
//       el.play().catch(() => {});
//     });
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };

//   document.addEventListener("click", resumeAll, { once: true });
//   document.addEventListener("touchstart", resumeAll, { once: true });

//   return () => {
//     document.removeEventListener("click", resumeAll);
//     document.removeEventListener("touchstart", resumeAll);
//   };
// }, []);


// useEffect(() => {
//   const checkOrientation = () => {
//     // Check if mobile and landscape
//     const isLandscapeMode = window.innerWidth > window.innerHeight;
//     setIsLandscape(isLandscapeMode);
    
//     if (isMobile) {
//       addDebugLog(`📱 Mobile orientation: ${isLandscapeMode ? 'Landscape' : 'Portrait'} (${window.innerWidth}x${window.innerHeight})`);
//     }
//   };

//   // Initial check
//   checkOrientation();

//   // Listen for orientation changes
//   window.addEventListener('resize', checkOrientation);
//   window.addEventListener('orientationchange', checkOrientation);

//   return () => {
//     window.removeEventListener('resize', checkOrientation);
//     window.removeEventListener('orientationchange', checkOrientation);
//   };
// }, [isMobile]);
// useEffect(() => {
//   const handleFirstUserInteraction = () => {
//     addDebugLog('🎵 User interaction detected - enabling all audio');
//     setUserInteracted(true);
//     setShowAudioPermissionModal(false);
//     playAllAudio();
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
//   if (!userInteracted) {
//     document.addEventListener('click', handleFirstUserInteraction, { once: true });
//     document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   }
//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//   };
// }, [userInteracted]);

//   useEffect(() => {
//     viewerAudios.forEach((stream, userId) => {
//       let audioEl = document.getElementById(`viewer-audio-${userId}`);
//       if (!audioEl) {
//         audioEl = document.createElement("audio");
//         audioEl.id = `viewer-audio-${userId}`;
//         audioEl.autoplay = true;
//         audioEl.playsInline = true;
//         audioEl.controls = false;
//         document.body.appendChild(audioEl);
//       }
//       audioEl.srcObject = stream;
//       audioEl.play().catch(err => {
//         console.warn(`Autoplay prevented for ${userId}, waiting for user gesture`, err);
//       });
//     });
//   }, [viewerAudios]);

  
// const openRemoveAudioModal = (participant) => {
//   setAudioRemoveTarget(participant);
// };

// const confirmRemoveAudio = () => {
//   if (audioRemoveTarget) {
//     handleMuteViewerAudio(audioRemoveTarget.socketId);
//     setAudioRemoveTarget(null);
//   }
// }; 
//   const handleNewViewerScreenProducer = useCallback((data) => {
//     addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
//     const socket = getSocket();
//     if (socket) {
//       createConsumer(sessionId || roomCode, data.producerId, data.kind);
//     } else {
//       addDebugLog('❌ Cannot create consumer: Socket not available');
//     }
//   }, [sessionId, roomCode]);

//   const handleViewerAudioPermissionGranted = useCallback((data) => {
//     addDebugLog(`Viewer audio permission granted: ${data.userId}`);
//     const socket = getSocket();
//     if (socket && data.userId !== user?.id) {
//       createConsumer(sessionId || roomCode, data.producerId, 'audio');
//     }
//   }, [sessionId, roomCode, user]);

//   const handleViewerAudioRequest = useCallback((data) => {
//     addDebugLog(`Viewer audio request from: ${data.requestedUserId}`);
//     setViewerAudioRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

// const playAllAudio = () => {
//   addDebugLog('🔊 Playing all audio elements...');
//   setTimeout(() => {
//     // Play all existing audio elements
//     audioElementsRef.current.forEach((audioEl, userId) => {
//       if (audioEl.paused && audioEl.srcObject) {
//         audioEl.play().catch(err => {
//           // Log but don't worry about autoplay errors
//           if (err.name !== 'NotAllowedError') {
//             addDebugLog(`⚠️ Failed to play audio for ${userId}: ${err.message}`);
//           }
//         });
//       }
//     });
//     pendingAudioQueueRef.current.forEach((streamInfo, userId) => {
//       createAndPlayAudioElement(userId, streamInfo.audioStream, streamInfo.userName);
//     });

//     // Clear pending queue
//     pendingAudioQueueRef.current.clear();
//     setPendingAudioStreams(new Map());
    
//     addDebugLog('✅ All audio processing completed');
//   }, 200);
// };

// const createAndPlayAudioElement = (userId, audioStream, userName) => {
//   try {
//     let audioEl = document.getElementById(`viewer-audio-${userId}`);
//         if (audioEl) {
//       // Agar same stream already hai to kuch nahi karo
//       if (audioEl.srcObject === audioStream) {
//         addDebugLog(`✅ Audio already playing for user ${userId}`);
//         return audioEl;
//       }
      
//       // Old stream ko stop karo
//       if (audioEl.srcObject) {
//         audioEl.srcObject.getTracks().forEach(track => track.stop());
//       }
//       audioEl.pause();
//       audioEl.srcObject = null;
//     } else {
//       // Naya audio element create karo
//       audioEl = document.createElement("audio");
//       audioEl.id = `viewer-audio-${userId}`;
//       audioEl.playsInline = true;
//       audioEl.controls = false;
//       audioEl.muted = false;
//       audioEl.setAttribute('data-user-id', userId);
//       audioEl.setAttribute('data-user-name', userName);
//       document.body.appendChild(audioEl);
//     }
//     audioEl.srcObject = audioStream;
//         const playAudio = () => {
//       if (audioEl.paused) {
//         audioEl.play()
//           .then(() => {
//             addDebugLog(`✅ Audio playing for user ${userId}`);
//           })
//           .catch(error => {
//             // Agar play fail ho jaye to retry after short delay
//             if (error.name === 'NotAllowedError') {
//               addDebugLog(`⚠️ Audio play blocked for ${userId}, waiting for user gesture`);
//               // User interaction ke baad automatically play hoga
//             } else {
//               console.warn(`Audio play failed for ${userId}:`, error);
//               // Retry after 500ms
//               setTimeout(() => {
//                 if (audioEl.srcObject === audioStream && audioEl.paused) {
//                   audioEl.play().catch(e => {
//                     addDebugLog(`❌ Retry also failed for ${userId}: ${e.message}`);
//                   });
//                 }
//               }, 500);
//             }
//           });
//       }
//     };
//     if (userInteracted) {
//       // Small delay to avoid race condition
//       setTimeout(playAudio, 100);
//     }
//     audioElementsRef.current.set(userId, audioEl);
//     viewerAudiosRef.current.set(userId, audioStream);
//         setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.set(userId, audioStream);
//       return newMap;
//     });
//     addDebugLog(`🎤 Audio element ready for user ${userId}`);
//     return audioEl;
//   } catch (err) {
//     addDebugLog(`❌ Error creating audio element: ${err?.message || err}`);
//     return null;
//   }
// };
// const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
//   const audioStream = new MediaStream([audioTrack]);
//   const userId = producerInfo.userId;
//   const userName = producerInfo.userName || `User ${userId}`;
//   addDebugLog(`🎵 New audio consumer: ${userId} (${sourceType})`);
//   const existingAudioEl = audioElementsRef.current.get(userId);
//   if (existingAudioEl && existingAudioEl.srcObject === audioStream) {
//     addDebugLog(`⏩ Already have same audio stream for ${userId}, skipping`);
//     return;
//   }

//   if (userInteracted) {
//     createAndPlayAudioElement(userId, audioStream, userName);
//   } else {
//     pendingAudioQueueRef.current.set(userId, {
//       userId,
//       userName,
//       audioStream,
//       sourceType,
//       producerInfo,
//       timestamp: Date.now()
//     });
    
//     setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    
//     // Show permission modal if not already shown
//     if (!showAudioPermissionModal) {
//       setShowAudioPermissionModal(true);
//     }
    
//     addDebugLog(`⏳ Audio queued for user interaction: ${userName}`);
//   }
// };
// const handleEnableAudio = () => {
//   addDebugLog('🎵 User manually enabled audio');
//   setUserInteracted(true);
//   setShowAudioPermissionModal(false);
  
//   // Small delay to ensure state update
//   setTimeout(() => {
//     playAllAudio();
//   }, 100);
// };

//   const handleScreenShareRequest = useCallback((data) => {
//     addDebugLog(`Screen share request from: ${data.requestedUserId}`);
//     setScreenShareRequests(prev => [...prev, {
//       requestedUserId: data.requestedUserId,
//       requesterSocketId: data.requesterSocketId,
//       requesterName: data.requesterName || 'Viewer',
//       timestamp: new Date()
//     }]);
//   }, []);

//   const handleViewerAudioStarted = useCallback((data) => {
//     addDebugLog(`Viewer audio started: ${data.userId}`);
//     setActiveViewerAudio(prev => new Map(prev).set(data.socketId, {
//       userId: data.userId,
//       socketId: data.socketId,
//       producerId: data.producerId
//     }));
//   }, []);

//   const handleViewerAudioMuted = useCallback((data) => {
//     addDebugLog(`Viewer audio muted: ${data.userId}`);
//     setActiveViewerAudio(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(data.socketId);
//       return newMap;
//     });
//   }, []);

//  // ✅ Viewer screen share started handler
// const handleScreenShareStarted = useCallback((data) => {
//   addDebugLog(`Screen share started by viewer: ${data.userId}`);

//   setActiveScreenShare(prev => {
//     if (prev?.source === "streamer") return prev;
//     return {
//       userId: data.userId,
//       userName: data.userName,
//       stream: null, // stream consumer banne ke baad attach hoga
//       source: "viewer-screen"
//     };
//   });
// }, [addDebugLog]);


// const handleScreenShareStopped = useCallback((data) => {
//   addDebugLog(
//     `🛑 Screen share stopped by viewer: ${data.userId}, source: ${data.source}`
//   );

//   // ✅ Reset zoom if same user's screen was zoomed
//   setZoomed((prev) => {
//     if (prev && prev.type === "screen" && prev.userId === data.userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped user: ${data.userId}`);
//       return null;
//     }
//     return prev;
//   });

//   // ✅ Forcefully clear active screen share
//   setActiveScreenShare((prev) => {
//     if (prev && prev.stream) {
//       try {
//         prev.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }
//     addDebugLog(`✅ Forced reset of active screen share (viewer: ${data.userId})`);
//     return null;
//   });
// }, [screenRef]);

//   const handleStopViewerScreenShare = useCallback((targetUserId) => {
//     emitSocketEvent('screen-share-force-stop', {
//       sessionId: sessionId || roomCode,
//       targetUserId
//     });
//     addDebugLog(`Stopped screen share for user: ${targetUserId}`);
//   }, [sessionId, roomCode]);

//   const handleViewerAudioResponse = useCallback((requesterSocketId, allow) => {
//     emitSocketEvent('viewer-audio-response', {
//       sessionId: sessionId || roomCode,
//       requesterSocketId,
//       allow
//     });
    
//     setViewerAudioRequests(prev => 
//       prev.filter(req => req.requesterSocketId !== requesterSocketId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed audio for viewer: ${requesterSocketId}`);
//     } else {
//       addDebugLog(`Denied audio for viewer: ${requesterSocketId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleScreenShareResponse = useCallback((requesterUserId, allow) => {
//     emitSocketEvent('screen-share-response', {
//       sessionId: sessionId || roomCode,
//       requesterUserId,
//       allow
//     });
    
//     setScreenShareRequests(prev => 
//       prev.filter(req => req.requestedUserId !== requesterUserId)
//     );
    
//     if (allow) {
//       addDebugLog(`Allowed screen share for viewer: ${requesterUserId}`);
//     } else {
//       addDebugLog(`Denied screen share for viewer: ${requesterUserId}`);
//     }
//   }, [sessionId, roomCode]);

//   const handleMuteViewerAudio = useCallback((targetSocketId) => {
//     emitSocketEvent('streamer-stop-viewer-audio', {
//   sessionId: sessionId || roomCode,
//   targetSocketId
// });

//     addDebugLog(`Muted viewer audio: ${targetSocketId}`);
//   }, [sessionId, roomCode]);

//   const handleBanParticipant = useCallback((userId) => {
//     emitSocketEvent('ban-participant', {
//       sessionId: sessionId || roomCode,
//       userId
//     });
//     addDebugLog(`Banned participant: ${userId}`);
//   }, [sessionId, roomCode]);


// const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
//   try {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog("❌ No socket available for creating consumer");
//       return;
//     }

//     addDebugLog(`🎯 Creating consumer for producer: ${producerId}`);

//     // Skip if already have consumer
//     const existingConsumer = Array.from(consumers.current.values()).find(
//       (c) => c.producerId === producerId
//     );
//     if (existingConsumer) {
//       addDebugLog(`⚠️ Already have consumer for producer ${producerId}, skipping`);
//       return;
//     }

//     socket.emit(
//       "getProducerInfo",
//       { sessionId: currentSessionId, producerId },
//       async (info) => {
//         if (!info) {
//           addDebugLog(`❌ No producer info for producer: ${producerId}`);
//           return;
//         }

//         addDebugLog(
//           `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}`
//         );

//         // ✅ DEBUG LOG - देखें क्या info आ रहा है
//         console.log("PRODUCER INFO RECEIVED:", {
//           producerId,
//           source: info.source,
//           userId: info.userId,
//           userName: info.userName,
//           currentUser: user?.id
//         });
//         const isViewerScreenAudio = info.source === "viewer-screen-audio";
//         const isViewerMic = info.source === "viewer-mic";
//         const isViewerSource = isViewerScreenAudio || isViewerMic;
//         if (isViewerSource) {
//           addDebugLog(`🎤 Processing viewer audio (${info.source}) from user ${info.userId}`);
//         } else {
//           // अन्य sources के लिए self check करें
//           const isSelfProducer = info.userId?.toString() === user?.id?.toString();
//           const isStreamerAudio = info.source === 'streamer-mic' || info.source === 'mic' || info.source === 'screen-audio';
//           const isStreamerCamera = info.source === 'streamer-camera' || info.source === 'camera';
          
//           if (isSelfProducer) {
//             addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
//             return;
//           }
//           if ((isStreamerAudio || isStreamerCamera) && isSelfProducer) {
//             addDebugLog(`⏩ Skipping streamer media: ${info.source}`);
//             return;
//           }
//         }

//         // store producer state
//         setProducersState((prev) =>
//           new Map(prev).set(producerId, {
//             id: producerId,
//             kind: info.kind,
//             userId: info.userId,
//             userName: info.userName,
//             source: info.source || "camera",
//             paused: false,
//           })
//         );

//         if (!transportId && recvTransportRef.current)
//           transportId = recvTransportRef.current.id;
//         if (!transportId) {
//           addDebugLog("❌ No recv transport available for consumer");
//           return;
//         }

//         socket.emit(
//           "consume",
//           {
//             sessionId: currentSessionId,
//             transportId,
//             producerId,
//             rtpCapabilities: device.rtpCapabilities,
//           },
//           async (response) => {
//             if (response.error || !response.params) {
//               addDebugLog(`❌ Failed to consume: ${response.error}`);
//               return;
//             }

//             const consumerParams = response.params;
//             const transport = transports.current.get(transportId);
//             if (!transport) {
//               addDebugLog(`❌ No transport found for ID: ${transportId}`);
//               return;
//             }

//             try {
//               const consumer = await transport.consume({
//                 id: consumerParams.id,
//                 producerId: consumerParams.producerId,
//                 kind: consumerParams.kind,
//                 rtpParameters: consumerParams.rtpParameters,
//                 appData: { 
//                   source: info.source || "camera",
//                   userId: info.userId,
//                   userName: info.userName
//                 },
//               });

//               consumers.current.set(consumer.id, consumer);
//               addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source})`);

//               // ✅ DEBUG: consumer details
//               console.log("CONSUMER CREATED:", {
//                 id: consumer.id,
//                 kind: consumer.kind,
//                 source: info.source,
//                 track: consumer.track ? "Has track" : "No track",
//                 trackKind: consumer.track?.kind,
//                 trackReadyState: consumer.track?.readyState
//               });

//               // === Handle sources ===
//               if (consumer.track) {
//                 if (info.source === "screen" || info.source === "viewer-screen") {
//                   // 🔹 Screen share VIDEO
//                   const screenStream = new MediaStream([consumer.track]);
//                   setActiveScreenShare({
//                     userId: info.userId,
//                     userName: info.userName || (info.source === "screen" ? "Streamer" : "Viewer"),
//                     stream: screenStream,
//                     source: info.source,
//                   });
//                   addDebugLog(`🖥️ Active screen set (${info.source})`);

//                 } else if (info.source === "viewer-screen-audio") {
//                   // 🔹 Screen share AUDIO - Simplified permission system
//                   console.log("🎵 Handling viewer-screen-audio for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                  
//                 } else if (info.source === "viewer-mic") {
//                   // 🔹 Viewer MIC audio - Simplified permission system
//                   console.log("🎤 Handling viewer-mic for user:", info.userId);
//                   handleAudioConsumer(consumer.track, info, "viewer-mic");
                  
//                 } else if (info.source === "viewer-camera") {
//                   // 🔹 Viewer camera
//                   try {
//                     const videoStream = new MediaStream([consumer.track]);
//                     setViewerCameras((prev) => {
//                       const newMap = new Map(prev);
//                       newMap.set(info.userId, videoStream);
//                       return newMap;
//                     });
//                     addDebugLog(`📷 Viewer camera stored for ${info.userId}`);
//                   } catch (err) {
//                     addDebugLog(`❌ Error storing viewer camera: ${err?.message || err}`);
//                   }

//                 } else if (consumer.track.kind === "video") {
//                   // Streamer video skip
//                   addDebugLog(`⏩ Skipping streamer video: ${info.source}`);

//                 } else if (consumer.track.kind === "audio") {
//                   // Streamer audio skip
//                   addDebugLog(`⏩ Skipping streamer audio: ${info.source}`);

//                 } else {
//                   addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
//                 }
//               } else {
//                 addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
//               }
//               socket.emit(
//                 "consumer-resume",
//                 { sessionId: currentSessionId, consumerId: consumer.id },
//                 (resumeResponse) => {
//                   if (resumeResponse?.success) {
//                     addDebugLog(`✅ Consumer ${consumer.id} resumed`);
//                   } else {
//                     addDebugLog(`❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error}`);
//                   }
//                 }
//               );
//             } catch (error) {
//               addDebugLog(`❌ Error creating consumer: ${error.message}`);
//               console.error("Consumer creation error:", error);
//             }
//           }
//         );
//       }
//     );
//   } catch (error) {
//     addDebugLog(`❌ Error in createConsumer: ${error.message}`);
//     console.error("createConsumer error:", error);
//   }
// };

// const cleanupViewerAudio = (userId) => {
//   addDebugLog(`🧹 Starting audio cleanup for user: ${userId}`);
//   if (pendingAudioQueueRef.current.has(userId)) {
//     const pendingStream = pendingAudioQueueRef.current.get(userId)?.audioStream;
//     if (pendingStream) {
//       try {
//         pendingStream.getTracks().forEach((t) => {
//           if (t.readyState === 'live') {
//             t.stop();
//             addDebugLog(`🛑 Stopped pending audio track: ${t.id}`);
//           }
//         });
//         addDebugLog(`🗑️ Stopped pending audio tracks for user: ${userId}`);
//       } catch (e) {
//         addDebugLog(`⚠️ Error stopping pending audio tracks: ${e.message}`);
//       }
//     }
//     pendingAudioQueueRef.current.delete(userId);
    
//     // Update pending streams state
//     setPendingAudioStreams(prev => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });
    
//     addDebugLog(`✅ Removed from pending audio queue: ${userId}`);
//   }

//   const cleanupAudioElement = () => {
//     const audioEl = audioElementsRef.current.get(userId);
//     if (audioEl) {
//       try {
//         // Pause and clean up the audio element
//         if (!audioEl.paused) {
//           audioEl.pause();
//           addDebugLog(`⏸️ Paused audio element for user: ${userId}`);
//         }
        
//         // Clear srcObject and stop tracks if they exist
//         if (audioEl.srcObject) {
//           const stream = audioEl.srcObject;
//           stream.getTracks().forEach(track => {
//             if (track.readyState === 'live') {
//               track.stop();
//               addDebugLog(`🛑 Stopped audio track: ${track.id}`);
//             }
//           });
//           audioEl.srcObject = null;
//         }
        
//         // Remove from DOM with delay to avoid race conditions
//         setTimeout(() => {
//           try {
//             if (audioEl.parentNode) {
//               audioEl.parentNode.removeChild(audioEl);
//               addDebugLog(`🗑️ Removed audio element from DOM for user: ${userId}`);
//             }
//           } catch (domError) {
//             addDebugLog(`⚠️ Error removing audio element from DOM: ${domError.message}`);
//           }
//         }, 100);
        
//       } catch (e) {
//         addDebugLog(`⚠️ Error in audio element cleanup: ${e.message}`);
//       }
      
//       // Remove from refs
//       audioElementsRef.current.delete(userId);
//     }
//   };

//   // ✅ Step 3: Clean up from viewerAudiosRef
//   const audioStream = viewerAudiosRef.current.get(userId);
//   if (audioStream) {
//     try {
//       audioStream.getTracks().forEach((t) => {
//         if (t.readyState === 'live') {
//           t.stop();
//           addDebugLog(`🛑 Stopped active audio track: ${t.id}`);
//         }
//       });
//     } catch (e) {
//       addDebugLog(`⚠️ Error stopping active audio stream: ${e.message}`);
//     }
//     viewerAudiosRef.current.delete(userId);
//   }

//   cleanupAudioElement();
//   setTimeout(() => {
//     const domAudioElements = document.querySelectorAll(`[data-user-id="${userId}"], #viewer-audio-${userId}`);
//     domAudioElements.forEach(el => {
//       try {
//         if (el.paused === false) {
//           el.pause();
//         }
//         if (el.srcObject) {
//           el.srcObject.getTracks().forEach(track => track.stop());
//           el.srcObject = null;
//         }
//         if (el.parentNode) {
//           el.parentNode.removeChild(el);
//           addDebugLog(`🗑️ Backup cleanup for audio element: ${userId}`);
//         }
//       } catch (e) {
//         addDebugLog(`⚠️ Error in backup DOM cleanup: ${e.message}`);
//       }
//     });
//   }, 200);

//   // ✅ Step 5: Remove screen share audio if exists
//   if (userId === activeScreenShare?.userId) {
//     setTimeout(() => {
//       const screenAudioElements = document.querySelectorAll(`[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`);
//       screenAudioElements.forEach(screenAudioEl => {
//         try {
//           screenAudioEl.pause();
//           screenAudioEl.srcObject = null;
//           if (screenAudioEl.parentNode) {
//             screenAudioEl.parentNode.removeChild(screenAudioEl);
//           }
//           addDebugLog(`🗑️ Cleaned up screen share audio for user: ${userId}`);
//         } catch (e) {
//           addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
//         }
//       });
//     }, 100);
//   }

//   // ✅ Step 6: Update viewerAudios state (with delay to ensure cleanup is done)
//   setTimeout(() => {
//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(userId)) {
//         newMap.delete(userId);
//         addDebugLog(`🔄 Removed from viewerAudios state: ${userId}`);
//       }
//       return newMap;
//     });

//     // ✅ Step 7: Check if we need to hide the audio modal
//     if (pendingAudioStreams.size === 0 && showAudioPermissionModal) {
//       setTimeout(() => {
//         setShowAudioPermissionModal(false);
//         addDebugLog(`🔕 No more pending audio - hiding modal`);
//       }, 300);
//     }

//     addDebugLog(`✅ Completed audio cleanup for user: ${userId}`);
//   }, 300);
// };

// const cleanupViewerCamera = (userId) => {
//   addDebugLog(`📷 Cleaning up camera for user: ${userId}`);
//     setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => {
//             if (track.kind === 'video') {
//               track.stop();
//             }
//           });
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });
// };

// const cleanupViewerMedia = (userId) => {
//   // 🖥️ Screen share cleanup
//   if (activeScreenShare?.userId === userId) {
//     if (activeScreenShare.stream) {
//       try {
//         activeScreenShare.stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer screen tracks", e);
//       }
//     }

//     setActiveScreenShare(null);

//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef", e);
//       }
//     }

//     addDebugLog(`🖥️ Viewer screen share stopped & cleaned for user: ${userId}`);
//   }

//   // 🎤 Audio cleanup
//   if (viewerAudiosRef.current.has(userId)) {
//     const stream = viewerAudiosRef.current.get(userId);
//     if (stream) {
//       try {
//         stream.getTracks().forEach((track) => track.stop());
//       } catch (e) {
//         console.warn("Error stopping viewer audio tracks", e);
//       }
//     }
//     viewerAudiosRef.current.delete(userId);

//     setViewerAudios((prev) => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });

//     addDebugLog(`🎤 Viewer audio stopped for user: ${userId}`);
//   }

//   setViewerCameras((prev) => {
//     const newMap = new Map(prev);
//     if (newMap.has(userId)) {
//       const stream = newMap.get(userId);
//       if (stream) {
//         try {
//           stream.getTracks().forEach((track) => track.stop());
//         } catch (e) {
//           console.warn("Error stopping viewer camera tracks", e);
//         }
//       }
//       newMap.delete(userId);
//       addDebugLog(`📷 Viewer camera stopped for user: ${userId}`);
//     }
//     return newMap;
//   });

//   addDebugLog(`✅ Fully cleaned up media for user: ${userId}`);
// };

// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);


// // ✅ Add this useEffect to handle Zoomed Video without flickering
// useEffect(() => {
//   if (zoomedVideoRef.current && zoomed?.stream) {
//     const videoEl = zoomedVideoRef.current;
    
//     // Only update if stream ID is different to prevent flickering
//     if (videoEl.srcObject?.id !== zoomed.stream.id) {
//       videoEl.srcObject = zoomed.stream;
//       videoEl.play().catch(e => console.warn("Zoomed video play error", e));
//     }
//   } else if (zoomedVideoRef.current && !zoomed) {
//     zoomedVideoRef.current.srcObject = null;
//   }
// }, [zoomed, zoomed?.stream?.id]); // Only runs when zoomed user/stream changes

//   const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-connect', {
//         sessionId: currentSessionId,
//         transportId,
//         dtlsParameters
//       }, (response) => {
//         if (response && response.success) {
//           resolve();
//         } else {
//           reject(new Error(response.error || 'Transport connect failed'));
//         }
//       });
//     });
//   };

//   const handleTransportProduce = (currentSessionId, transportId, kind, rtpParameters, appData) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('transport-produce', {
//         sessionId: currentSessionId,
//         transportId,
//         kind,
//         rtpParameters,
//         appData,
//       }, (response) => {
//         if (response && response.id) {
//           resolve(response.id);
//         } else {
//           reject(new Error(response?.error || 'Produce failed'));
//         }
//       });
//     });
//   };

//   const handlePauseProducer = async (producerId) => {
//     emitSocketEvent('producer-pause', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: true });
//       }
//       return newState;
//     });
//   };

//   const handleResumeProducer = async (producerId) => {
//     emitSocketEvent('producer-resume', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       const producer = newState.get(producerId);
//       if (producer) {
//         newState.set(producerId, { ...producer, paused: false });
//       }
//       return newState;
//     });
//   };

//   const handleCloseProducer = async (producerId) => {
//     emitSocketEvent('producer-close', {
//       sessionId: sessionId || roomCode,
//       producerId: producerId
//     });
    
//     setProducersState(prev => {
//       const newState = new Map(prev);
//       newState.delete(producerId);
//       return newState;
//     });
    
//     producers.current.delete(producerId);
//   };

//   // ========== STREAMING CONTROL FUNCTIONS ==========
//   const startStreaming = async () => {
//     const socket = getSocket();
//     if (socket) {
//       const hasProducers = producers.current.size > 0;
      
//       if (hasProducers) {
//         addDebugLog('ℹ️ Producers already exist, resuming if paused...');
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.paused) {
//             handleResumeProducer(id);
//           }
//         });
//       } else {
//         addDebugLog('🔄 No producers found, initializing media...');
//         await initializeMedia(sessionId || roomCode, iceServers);
//       }
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_started' 
//       });
      
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
//     }
//   };

//   const pauseStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (!producer.paused) {
//           handlePauseProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'PAUSED', 
//         emitEvent: 'streamer_paused' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setIsStreamPaused(true);
//       setLocalPausedState(true);
      
//       if (videoRef.current && !videoRef.current.paused) {
//         videoRef.current.pause();
//       }
//     }
//   };

//   const resumeStreaming = () => {
//     const socket = getSocket();
//     if (socket) {
//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.paused) {
//           handleResumeProducer(id);
//         }
//       });
      
//       emitSocketEvent('streamer_control', { 
//         sessionId: sessionId || roomCode, 
//         status: 'ACTIVE', 
//         emitEvent: 'streamer_resumed' 
//       });
      
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setIsStreamPaused(false);
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }
//   };

//   const endStreaming = async () => {
//   if (window.confirm('Are you sure you want to end the session for all participants?')) {
    
//     // Agar recording chal rahi hai to pehle stop karen
//     if (isRecording) {
//       const stopSuccess = await stopRecordingAPI();
//       if (!stopSuccess) {
//         // Agar recording stop nahi hui to user ko confirm karen
//         const proceed = window.confirm('Recording stop failed. Still end session?');
//         if (!proceed) return;
//       }
//     }
    
//     // Phir session end karen
//     emitSocketEvent('streamer_control', { 
//       sessionId: sessionId || roomCode, 
//       status: 'ENDED', 
//       emitEvent: 'session_ended' 
//     });
//   }
// };

//  const toggleAudio = () => {
//   if (mediaStream) {
//     const audioTrack = mediaStream.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setAudioEnabled(audioTrack.enabled);

//       Array.from(producersState.entries()).forEach(([id, producer]) => {
//         if (producer.source === 'mic') {
//           if (audioTrack.enabled) {
//             handleResumeProducer(id);
//           } else {
//             handlePauseProducer(id);
//           }
//         }
//       });

//       addDebugLog(`🎤 Streamer mic ${audioTrack.enabled ? "on" : "off"} (local playback muted)`);
//     }
//   }
// };

//   const toggleVideo = () => {
//     if (mediaStream) {
//       const videoTrack = mediaStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         setVideoEnabled(videoTrack.enabled);
        
//         Array.from(producersState.entries()).forEach(([id, producer]) => {
//           if (producer.source === 'camera') {
//             if (videoTrack.enabled) {
//               handleResumeProducer(id);
//             } else {
//               handlePauseProducer(id);
//             }
//           }
//         });
        
//         addDebugLog(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
//       }
//     }
//   };
// const startScreenShare = useCallback(async () => {

//   if (activeScreenShare?.stream) {

//     // ❌ CASE 1: Screen share already active
//     toast.info(
//       `📺 A screen share is already active by ${activeScreenShare.userName}.
//       Please wait for it to end before starting a new one.`,
//       {
//         position: "bottom-right",
//         autoClose: 5000,
//       }
//     );

//     addDebugLog("❌ Screen share already active, cannot start new one");

//   } else {

//     // ✅ CASE 2: NO active screen share → ONLY this block runs
//     try {
//       addDebugLog("🖥️ Starting screen share with audio...");

//       const stream = await navigator.mediaDevices.getDisplayMedia({
//         video: {
//           cursor: "always",
//           frameRate: { ideal: 40, max: 70 },
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//         },
//         audio: true,
//       });

//       const videoTrack = stream.getVideoTracks()[0];
//       const audioTrack = stream.getAudioTracks()[0];

//       if (!videoTrack) {
//         addDebugLog("❌ No video track found in screen share stream");
//         return;
//       }

//       if (!sendTransportRef.current) {
//         addDebugLog("❌ No send transport available for screen share");
//         return;
//       }

//       setActiveScreenShare({
//         userId: user.id,
//         userName: user.name || "Streamer",
//         stream,
//         source: "streamer",
//       });

//       // 🎥 VIDEO PRODUCER
//       const videoProducer = await sendTransportRef.current.produce({
//         track: videoTrack,
//         appData: {
//           source: "screen",
//           userId: user.id,
//           userName: user.name || "Streamer",
//         },
//       });

//       addDebugLog(`✅ Screen share video producer created: ${videoProducer.id}`);

//       // 🔊 AUDIO PRODUCER
//       let audioProducer = null;
//       if (audioTrack) {

//         console.log("audio track",audioTrack)
//         audioProducer = await sendTransportRef.current.produce({
//           track: audioTrack,
//           appData: {
//             source: "screen-audio",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         });

//         addDebugLog(
//           `✅ Screen share audio producer created: ${audioProducer.id}`
//         );
//       }

//       socket.emit(
//         "transport-produce-screen",
//         {
//           sessionId: sessionId || roomCode,
//           transportId: sendTransportRef.current.id,
//           kind: "video",
//           rtpParameters: videoProducer.rtpParameters,
//           appData: {
//             source: "screen",
//             userId: user.id,
//             userName: user.name || "Streamer",
//           },
//         },
//         (response) => {
//           if (response?.id) {
//             addDebugLog(`✅ Screen share video registered: ${response.id}`);

//             if (audioProducer) {
//               socket.emit("transport-produce-streamer-screen-audio", {
//                 sessionId: sessionId || roomCode,
//                 transportId: sendTransportRef.current.id,
//                 rtpParameters: audioProducer.rtpParameters,
//                 appData: {
//                   source: "screen-audio",
//                   userId: user.id,
//                   userName: user.name || "Streamer",
//                 },
//               });
//             }

//             socket.emit("screen-share-started", {
//               sessionId: sessionId || roomCode,
//               producerId: response.id,
//               userId: user.id,
//               userName: user.name || "Streamer",
//               hasAudio: !!audioTrack,
//               source: "screen",
//             });

//             addDebugLog(
//               `✅ Screen share started ${
//                 audioTrack ? "with audio" : "without audio"
//               }`
//             );
//           }
//         }
//       );

//       // 🛑 STOP HANDLERS
//       videoTrack.onended = () => stopScreenShare();

//       if (audioTrack) {
//         audioTrack.onended = () =>
//           addDebugLog("🛑 Screen share audio ended");
//       }

//       stream.getTracks().forEach((track) => {
//         track.onended = () => {
//           if (track.kind === "video") stopScreenShare();
//         };
//       });

//       toast.success(
//         `🖥️ Screen sharing started ${
//           audioTrack ? "(with audio)" : "(video only)"
//         }`,
//         {
//           position: "bottom-right",
//           autoClose: 3000,
//         }
//       );

//     } catch (error) {
//       console.error("❌ Screen share error:", error);

//       toast.error("❌ Failed to start screen sharing", {
//         position: "bottom-right",
//         autoClose: 5000,
//       });
//     }
//   }

// }, [
//   activeScreenShare,
//   user,
//   sendTransportRef,
//   stopScreenShare,
//   socket,
//   sessionId,
//   roomCode,
// ]);


// const sendMessage = useCallback(async (text = '', file = null) => {
//   try {
//     let fileData = null;
//     let fileName = null;
//     let fileType = null;
//     let fileSize = null;
    
//     // Agar file hai to base64 mein convert karen (database ke bina direct transfer)
//     if (file) {
//       setUploadingFile(true);
      
//       // File size check (max 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('File size should be less than 5MB');
//         setUploadingFile(false);
//         return;
//       }

//       // File type check
//       const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
//       if (!allowedTypes.includes(file.type)) {
//         toast.error('Only images, PDF and text files are allowed');
//         setUploadingFile(false);
//         return;
//       }

//       // File ko base64 mein convert karen for direct transfer
//       return new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           // Base64 data (data:image/png;base64,XXXXXXXX ke format se prefix hata denge)
//           const base64String = e.target.result;
//           fileData = base64String.split(',')[1]; // Sirf base64 data le rahe hain
//           fileName = file.name;
//           fileType = file.type;
//           fileSize = file.size;
          
//           const messageData = {
//             sessionId: sessionId || roomCode,
//             message: text,
//             fileData: fileData, // Direct base64 data
//             fileName: fileName,
//             fileType: fileType,
//             fileSize: fileSize,
//             timestamp: new Date().toISOString(),
//             type: 'file' // Identify file message
//           };

//           emitSocketEvent('file_message', messageData);
//           setUploadingFile(false);
          
//           // Success feedback
//           toast.success('File sent successfully!');
//           resolve();
//         };
        
//         reader.onerror = () => {
//           console.error('File reading error');
//           setUploadingFile(false);
//           toast.error('Failed to read file');
//           resolve();
//         };
        
//         reader.readAsDataURL(file);
//       });
//     } else {
//       // Normal text message
//       const messageData = {
//         sessionId: sessionId || roomCode,
//         message: text,
//         timestamp: new Date().toISOString(),
//         type: 'text' // Identify text message
//       };

//       emitSocketEvent('chat_message', messageData);
//     }
    
//   } catch (error) {
//     console.error('Error sending message:', error);
//     setUploadingFile(false);
//     toast.error('Failed to send message');
//   }
// }, [sessionId, roomCode]);

//   // ========== TRANSPORT CREATION ==========

//   const createSendTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createSendTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createSendTransport(response.params);
//           transports.current.set(transport.id, transport);
//           sendTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
//             try {
//               const producerId = await handleTransportProduce(
//                 currentSessionId,
//                 transport.id,
//                 kind,
//                 rtpParameters,
//                 appData
//               );
//               callback({ id: producerId });
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ SendTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating send transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   const createRecvTransport = async (currentSessionId) => {
//     return new Promise((resolve, reject) => {
//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (response.error || !response.params) {
//           console.error("❌ createRecvTransport error:", response.error);
//           return reject(response.error);
//         }

//         try {
//           const transport = device.createRecvTransport(response.params);
//           transports.current.set(transport.id, transport);
//           recvTransportRef.current = transport;

//           transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
//             try {
//               await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//               callback();
//             } catch (err) {
//               errback(err);
//             }
//           });

//           addDebugLog("✅ RecvTransport created:", transport.id);
//           resolve(transport);
//         } catch (err) {
//           console.error("❌ Error creating recv transport:", err);
//           reject(err);
//         }
//       });
//     });
//   };

//   // ========== MEDIA INITIALIZATION ==========

//   const setupStreamerMedia = async (currentSessionId) => {
//     try {
//       if (producers.current.size > 0) {
//         addDebugLog('ℹ️ Producers already exist, skipping setup');
//         return;
//       }

//       if (!mediaStream) {
//         throw new Error('No mediaStream available');
//       }      
//     const videoTrack = mediaStream.getVideoTracks()[0];
//       const audioTrack = mediaStream.getAudioTracks()[0];
      
//       if (!videoTrack) {
//         throw new Error('No video track available');
//       }
      
//       if (!audioTrack) {
//         throw new Error('No audio track available');
//       }
      
//       addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
//       addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

//       emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
//         if (!response || response.error || !response.params) {
//           console.error('Failed to create send transport:', response?.error);
//           setMediaError('Failed to create media transport');
//           addDebugLog(`❌ Transport creation error: ${response?.error}`);
//           return;
//         }

//         const transport = device.createSendTransport(response.params);
//         transports.current.set(transport.id, transport);
//         sendTransportRef.current = transport;

//         transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
//           try {
//             await handleTransportConnect(currentSessionId, transport.id, dtlsParameters);
//             callback();
//           } catch (error) {
//             console.error('Transport connect error:', error);
//             errback(error);
//           }
//         });
// transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
//   try {
//     const producerId = await handleTransportProduce(
//       currentSessionId,
//       transport.id,
//       kind,
//       rtpParameters,
//       appData
//     );
//     callback({ id: producerId });
//   } catch (error) {
//     console.error('Transport produce error:', error);
//     errback(error);
//   }
// });

// try {
//   setMediaError(null);
//   addDebugLog('✅ Using existing camera/microphone stream');

//  const videoProducer = await transport.produce({
//   track: videoTrack,
//   appData: { source: 'camera', userId: user?.id }   // 🔥 add userId
// });
//   producers.current.set(videoProducer.id, videoProducer);
//   setProducersState(prev => new Map(prev).set(videoProducer.id, {
//     id: videoProducer.id,
//     kind: 'video',
//     paused: false,
//     source: 'camera'
//   }));
//   addDebugLog(`✅ Video producer created: ${videoProducer.id}`);
  
//   const audioProducer = await transport.produce({
//   track: audioTrack,
//   appData: { source: 'mic', userId: user?.id }      // 🔥 add userId
// });

//   producers.current.set(audioProducer.id, audioProducer);
//   setProducersState(prev => new Map(prev).set(audioProducer.id, {
//     id: audioProducer.id,
//     kind: 'audio',
//     paused: false,
//     source: 'mic'
//   }));
//   addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

//   setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
//   setIsInitializing(false);
//   setIsLoading(false);
  
//   setTimeout(() => {
//     if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
//       videoRef.current.play().catch(error => {
//         console.log('Post-producer autoplay prevented:', error);
//         setShowPlayButton(true);
//       });
//     }
//   }, 500);
  
// } catch (error) {
//   console.error('Error creating producers:', error);
//   addDebugLog(`❌ Producer creation error: ${error.message}`);
//   setIsInitializing(false);
//   setIsLoading(false);
// }
//       });
//     } catch (error) {
//       console.error('Error setting up streamer media:', error);
//       setMediaError('Failed to set up media streaming');
//       addDebugLog(`❌ Media setup error: ${error.message}`);
//       setIsInitializing(false);
//       setIsLoading(false);
//     }
//   };
  
// const initializeMedia = async (currentSessionId, initialIceServers = []) => {
//   try {
//     if (isMediaInitialized) {
//       addDebugLog('ℹ️ Media already initialized, skipping');
//       return;
//     }
    
//     if (!mediaStream) {
//       addDebugLog('❌ No media stream available for initialization');
//       return;
//     }
    
//     setIsMediaInitialized(true);
//     addDebugLog('Initializing media with existing stream...');
    
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for media initialization');
//       return;
//     }
    
//     socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
//       if (response.error || !response.rtpCapabilities) {
//         addDebugLog(`❌ Failed to get router capabilities: ${response.error}`);
//         setMediaError('Failed to initialize media server');
//         setIsMediaInitialized(false);
//         return;
//       }

//       try {
//         await device.load({ routerRtpCapabilities: response.rtpCapabilities });
//         addDebugLog(`✅ Device loaded successfully`);

//         // Create transports
//         await createRecvTransport(currentSessionId);
//         await createSendTransport(currentSessionId);

//         // Setup streamer media
//         await setupStreamerMedia(currentSessionId);

//       } catch (error) {
//         console.error('Error loading device:', error);
//         setMediaError('Failed to initialize media device');
//         setIsMediaInitialized(false);
//         addDebugLog(`❌ Device load error: ${error.message}`);
//       }
//     });
//   } catch (error) {
//     console.error('Error initializing media:', error);
//     setMediaError('Failed to initialize media');
//     setIsMediaInitialized(false);
//     addDebugLog(`❌ Media init error: ${error.message}`);
//   }
// };

//   const joinRoomWithRetry = (retries = 3) => {
//     const socket = getSocket();
//     if (!socket) {
//       addDebugLog('❌ No socket available for joining room');
//       return;
//     }
    
//     if (retries === 0) {
//       console.error('Failed to join room after multiple attempts');
//       addDebugLog('Failed to join room after multiple attempts');
//       alert('Failed to join the session. Please try again.');
//       return;
//     }

//     addDebugLog(`Joining room (attempt ${4 - retries}/3)...`);
    
//     socket.emit('join_room', { 
//       token, 
//       sessionId: sessionId || null,
//       roomCode: roomCode || null,
//     }, (response) => {
//       if (response && response.error) {
//         console.warn(`Join room failed: ${response.error}, retrying... (${retries - 1} attempts left)`);
//         addDebugLog(`Join room failed: ${response.error}, retrying...`);
//         setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
//       }
//     });
//   };
//   // ========== CAMERA AND PERMISSION FUNCTIONS ==========

// const initializeCamera = async () => {
//   try {
//     addDebugLog('🔄 Initializing camera with smart audio optimization...');
//     setIsLoading(true);
//     setIsInitializing(true);
//     setCameraVisible(false);
//     setShowPlayButton(false); // Reset play button
    
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }
    
//     // ✅ SMART AUDIO CONSTRAINTS with complete optimization
//     const audioConstraints = await getOptimizedAudioConstraints(); // ✅ await add karo
    
//     // ✅ EARPHONE DETECTION aur optimization
//     const earphoneInfo = await detectEarphones();
    
//     // ✅ EARPHONE ADJUSTMENT - Force stereo if earphone detected
//     if (earphoneInfo.hasEarphone) {
//       audioConstraints.channelCount = 2;
//       audioConstraints.sampleRate = 48000; // High quality for earphones
      
//       if (earphoneInfo.isBluetooth) {
//         // Bluetooth earphones need special handling
//         audioConstraints.latency = 0.02; // Slightly higher latency for BT
//         addDebugLog('🎧 Bluetooth earphone detected - using optimized settings');
//       } else if (earphoneInfo.isWiredHeadphone) {
//         addDebugLog('🎧 Wired headphone detected - using high quality audio');
//       }
      
//       addDebugLog(`🎧 Earphone detected: ${earphoneInfo.deviceLabels.join(', ')}`);
//     }

//     addDebugLog(`🎵 Using optimized audio: ${audioConstraints.channelCount} channels, ${audioConstraints.sampleRate || 'default'}Hz`);

//     // Mobile-friendly constraints with SMART AUDIO
//     const constraints = {
//       video: {
//         width: { ideal: 1280 },
//         height: { ideal: 720 },
//         frameRate: { ideal: 40, max: 70 },
//       },
//       audio: audioConstraints  // ✅ OPTIMIZED AUDIO CONSTRAINTS
//     };

//     addDebugLog('🎯 Requesting media with constraints:', {
//       video: constraints.video,
//       audio: constraints.audio
//     });

//     const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     console.log('📱 Camera stream obtained with optimized audio');

//     // ✅ VERIFY AUDIO SETTINGS
//     const videoTracks = stream.getVideoTracks();
//     const audioTracks = stream.getAudioTracks();
    
//     if (videoTracks.length === 0) {
//       throw new Error('No video track found in stream');
//     }

//     // Log actual audio settings
//     if (audioTracks.length > 0) {
//       const audioSettings = audioTracks[0].getSettings();
//       addDebugLog(`🎵 Actual audio settings: ${audioSettings.channelCount} channels, ${audioSettings.sampleRate || 'default'}Hz, sampleSize: ${audioSettings.sampleSize || 'N/A'}`);
      
//       // Warn if we got mono but wanted stereo
//       if (earphoneInfo.hasEarphone && audioSettings.channelCount === 1) {
//         addDebugLog('⚠️ Earphone connected but got MONO audio - device limitation');
//       }
      
//       // Log all audio track details
//       audioTracks.forEach((track, index) => {
//         const settings = track.getSettings();
//         addDebugLog(`🎤 Audio Track ${index + 1}:`, {
//           id: track.id,
//           label: track.label,
//           enabled: track.enabled,
//           muted: track.muted,
//           readyState: track.readyState,
//           channelCount: settings.channelCount,
//           sampleRate: settings.sampleRate,
//           sampleSize: settings.sampleSize,
//           latency: settings.latency
//         });
//       });
//     }

//     // Log video track details
//     videoTracks.forEach((track, index) => {
//       const settings = track.getSettings();
//       addDebugLog(`📹 Video Track ${index + 1}:`, {
//         id: track.id,
//         label: track.label,
//         enabled: track.enabled,
//         muted: track.muted,
//         readyState: track.readyState,
//         width: settings.width,
//         height: settings.height,
//         frameRate: settings.frameRate,
//         aspectRatio: settings.aspectRatio
//       });
//     });
    
//     setMediaStream(stream);
//     setMediaError(null);
//     setPermissionStatus('granted');
//     setCameraReady(true);
    
//     addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
    
//     // Setup video element properly
//     setTimeout(() => {
//       if (videoRef.current) {
//         const videoEl = videoRef.current;
//         videoEl.muted = true;
//         videoEl.playsInline = true;
//         videoEl.setAttribute('playsinline', '');
//         videoEl.setAttribute('webkit-playsinline', '');
//         videoEl.srcObject = stream;
        
//         // Video event listeners for better debugging
//         videoEl.onloadedmetadata = () => {
//           addDebugLog('📹 Video metadata loaded');
//         };
        
//         videoEl.oncanplay = () => {
//           addDebugLog('📹 Video can play');
//         };
        
//         videoEl.onerror = (e) => {
//           console.error('📹 Video error:', e);
//           addDebugLog(`❌ Video error: ${e.message}`);
//         };

//         // Auto-play attempt with better timing
//         setTimeout(() => {
//           videoEl.play().then(() => {
//             addDebugLog('✅ Mobile autoplay successful');
//             setIsPlaying(true);
//             setShowPlayButton(false);
//             setIsLoading(false);
//             setIsInitializing(false);
//           }).catch(error => {
//             console.log('📱 Mobile autoplay blocked, waiting for user gesture');
//             addDebugLog(`📱 Autoplay blocked: ${error.message}`);
//             setShowPlayButton(true);
//             setIsLoading(false);
//             setIsInitializing(false);
//           });
//         }, 800); // Slightly longer delay for mobile
//       }
//     }, 500);
    
//   } catch (error) {
//     console.error('❌ Error accessing camera:', error);
//     addDebugLog(`❌ Camera access error: ${error.message}`);
    
//     let errorMessage = `Camera error: ${error.message}`;
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
//       setPermissionStatus('denied');
//     } else if (error.name === 'NotFoundError') {
//       errorMessage = 'No camera found. Please check if camera is connected.';
//     } else if (error.name === 'NotSupportedError') {
//       errorMessage = 'Camera not supported on this device/browser.';
//     } else if (error.name === 'NotReadableError') {
//       errorMessage = 'Camera is already in use by another application.';
//     } else if (error.name === 'OverconstrainedError') {
//       errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...';
//       // Fallback to basic constraints
//       return initializeWithFallbackConstraints();
//     }
    
//     setMediaError(errorMessage);
//     setIsLoading(false);
//     setIsInitializing(false);
//     setShowPlayButton(true);
//   }
// };

// // ✅ Fallback function for constrained errors
// const initializeWithFallbackConstraints = async () => {
//   try {
//     addDebugLog('🔄 Trying fallback camera constraints...');
    
//     const fallbackConstraints = {
//       video: {
//         width: { ideal: 640 },
//         height: { ideal: 480 },
//         frameRate: { ideal: 24 },
//         facingMode: 'user'
//       },
//       audio: {
//         echoCancellation: true,
//         noiseSuppression: true,
//         autoGainControl: true
//       }
//     };

//     const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
//     setMediaStream(stream);
//     setMediaError(null);
//     setPermissionStatus('granted');
//     setCameraReady(true);
    
//     addDebugLog('✅ Fallback camera constraints successful');
    
//     // Setup video element
//     if (videoRef.current) {
//       videoRef.current.srcObject = stream;
//       videoRef.current.play().catch(() => {
//         setShowPlayButton(true);
//       });
//     }
    
//     setIsLoading(false);
//     setIsInitializing(false);
    
//   } catch (fallbackError) {
//     console.error('❌ Fallback camera also failed:', fallbackError);
//     setMediaError(`Camera failed even with basic settings: ${fallbackError.message}`);
//     setPermissionStatus('denied');
//     setIsLoading(false);
//     setIsInitializing(false);
//     setShowPlayButton(true);
//   }
// };
//   const requestCameraPermissions = async () => {
//     try {
//       addDebugLog('🔄 Manually requesting camera permissions...');
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true, 
//         audio: {
//     echoCancellation: true,
//     noiseSuppression: true,
//     autoGainControl: true
//   },
//       });
      
//       stream.getTracks().forEach(track => track.stop());
      
//       setMediaError(null);
//       setPermissionStatus('granted');
//       addDebugLog('✅ Camera permissions granted manually');
      
//       initializeCamera();
//     } catch (error) {
//       console.error('Failed to request camera permissions:', error);
//       setMediaError('Failed to get camera permissions. Please allow access in browser settings.');
//       setPermissionStatus('denied');
//       addDebugLog(`❌ Manual permission request failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };

//   const retryCamera = async () => {
//     try {
//       setMediaError(null);
//       setPermissionStatus('checking');
//       setIsLoading(true);
      
//       Array.from(producersState.keys()).forEach(producerId => {
//         handleCloseProducer(producerId);
//       });
      
//       transports.current.forEach(transport => {
//         try {
//           transport.close();
//         } catch (error) {
//           console.error('Error closing transport:', error);
//         }
//       });
//       transports.current.clear();
      
//       if (mediaStream) {
//         mediaStream.getTracks().forEach(track => track.stop());
//         setMediaStream(null);
//       }
      
//       setIsMediaInitialized(false);
//       setCameraReady(false);
//       setCameraVisible(false);
//       setIsWebSocketInitialized(false);
//       setProducersState(new Map());
      
//       initializeCamera();
      
//       addDebugLog('Camera retry initiated');
//     } catch (error) {
//       console.error('Failed to retry camera:', error);
//       setMediaError('Failed to restart camera');
//       setPermissionStatus('denied');
//       addDebugLog(`Camera retry failed: ${error.message}`);
//       setIsLoading(false);
//     }
//   };
//   // ========== WEBSOCKET INITIALIZATION ==========
//   const initializeWebSocket = () => {
//     if (permissionStatus !== 'granted') {
//       addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
//       return;
//     }

//     addDebugLog('Setting up socket connection...');
//     addDebugLog(`Socket URL: ${import.meta.env.VITE_SOCKET_URL}`);
//     addDebugLog(`Session ID: ${sessionId}`);
//     addDebugLog(`Room Code: ${roomCode}`);

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: { token },
//     transports: ['websocket', 'polling'], 
//     upgrade: true,
//     forceNew: true,
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000,
//     timeout: 20000
//     });

//     newSocket.on('connect', () => {
//       addDebugLog('✅ Socket connected, emitting join_room...');
//       setIsConnected(true);
      
//       joinRoomWithRetry();
//     });


//     newSocket.on('disconnect', () => {
//       addDebugLog('❌ Disconnected from server');
//       setIsConnected(false);
//     });

//     newSocket.on('connect_error', (error) => {
//       console.error('❌ Connection error:', error);
//       addDebugLog(`Connection error: ${error.message}`);
//       setIsConnected(false);
//     });

//     newSocket.on('error', (error) => {
//       console.error('❌ Socket error:', error);
//       addDebugLog(`Socket error: ${error.message}`);
//     });

//     newSocket.on('error_message', (data) => {
//       console.error('Error:', data);
//       addDebugLog(`Error message: ${JSON.stringify(data)}`);
//       alert(data.message || data);
//     });

//     // ========== SOCKET EVENT LISTENERS ==========
//     newSocket.on('new-viewer-screen-producer', (data) => {
//       addDebugLog('📩 Direct new-viewer-screen-producer event received');
//       handleNewViewerScreenProducer(data);
//     });

//     // Recording status events
// newSocket.on('recording_started', (data) => {
//   addDebugLog(`🎬 Recording started: ${data.sessionId}`);
//   setIsRecording(true);
// });

// newSocket.on('recording_stopped', (data) => {
//   addDebugLog(`⏹ Recording stopped: ${data.sessionId}`);
//   setIsRecording(false);
// });

//     newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
//     newSocket.on('viewer-audio-request', handleViewerAudioRequest);
//     newSocket.on('screen-share-request', handleScreenShareRequest);
//     newSocket.on('viewer-audio-started', handleViewerAudioStarted);
//     newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
//     newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
//     newSocket.on('screen-share-stopped-by-viewer', handleScreenShareStopped);
//     newSocket.on("viewer-video-request", handleViewerVideoRequest);


//     newSocket.on("viewer-audio-stopped", ({ userId }) => {
//   cleanupViewerAudio(userId);

//    newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
//   addDebugLog(`🛑 Viewer audio force-stopped: ${userId}`);
//    cleanupViewerAudio(userId); // remove their audio element

//    // Participants list update bhi karo
//    setParticipants(prev =>
//      prev.map(p =>
//        p.userId === userId ? { ...p, hasAudio: false } : p
//      )
//    );
//  });
// });

// newSocket.on("user_left", (data) => {
//   // keep your existing cleanup, but also ensure audio element removed
//   cleanupViewerAudio(data.userId);
//   cleanupViewerMedia(data.userId); // if you already had this
// });


//     // Viewer audio status events
//     newSocket.on('viewer-audio-enabled', (data) => {
//       addDebugLog(`Viewer audio enabled: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, hasAudio: true } : p
//       ));
//     });

//     newSocket.on('viewer-audio-started-global', (data) => {
//       addDebugLog(`Viewer audio started globally: ${data.userId}`);
//       setActiveSpeakers(prev => new Map(prev).set(data.socketId, {
//         userId: data.userId,
//         socketId: data.socketId,
//         userName: data.userName
//       }));
//     });

//     newSocket.on('viewer-audio-muted-global', (data) => {
//       addDebugLog(`Viewer audio muted globally: ${data.userId}`);
//       setActiveSpeakers(prev => {
//         const newMap = new Map(prev);
//         Array.from(newMap.entries()).forEach(([key, value]) => {
//           if (value.userId === data.userId) {
//             newMap.delete(key);
//           }
//         });
//         return newMap;
//       });
//     });

//     newSocket.on('joined_room', (data) => {
//       addDebugLog('✅ Joined room successfully');
//       setSession(data);
//       setParticipants(data.participants || []);
//       setIceServers(data.iceServers || []);
//       setIsLoading(false);
      
//       if (!isMediaInitialized) {
//         initializeMedia(data.sessionId, data.iceServers);
//       }
//     });

//     newSocket.on('ice_servers', (servers) => {
//       addDebugLog(`Received ${servers.length} ICE servers`);
//       setIceServers(servers);
//     });

//     newSocket.on('user_joined', (data) => {
//       addDebugLog(`User joined: ${data.userId}`);
//       setParticipants(prev => [...prev, data]);
//     });

//     newSocket.on('user_left', (data) => {
//       addDebugLog(`User left: ${data.userId}`);
//       setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      
//       // Clean up viewer media
//       cleanupViewerMedia(data.userId);
      
//       // Clean up remote videos
//       const videoToRemove = Array.from(remoteVideosRef.current.entries())
//         .find(([_, video]) => video.dataset?.socketId === data.socketId);
      
//       if (videoToRemove) {
//         const [producerId, video] = videoToRemove;
//         video.remove();
//         remoteVideosRef.current.delete(producerId);
//       }
//     });
//     // Socket event handlers mein ye add karen
// newSocket.on('chat_message', (message) => {
//   addDebugLog(`Chat message from ${message.userId}`);
  
//   // Agar file message hai to usko process karen
//   if (message.type === 'file') {
//     addDebugLog(`File received: ${message.fileName} (${message.fileType})`);
//   }
  
//   setMessages(prev => [...prev, {
//     ...message,
//     id: Date.now() + Math.random(), // Unique ID
//     timestamp: message.timestamp || new Date().toISOString()
//   }]);
// });
//     newSocket.on('streamer_started', () => {
//       addDebugLog('Streamer started streaming');
//       setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false }));
//       setLocalPausedState(false);
//     });

//     newSocket.on('streamer_paused', () => {
//       addDebugLog('Streamer paused streaming');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//     });

//     newSocket.on('streamer_resumed', () => {
//       addDebugLog('Streamer resumed streaming');
//       setRoomState(prev => ({ ...prev, isPaused: false }));
//       setLocalPausedState(false);
      
//       if (videoRef.current && videoRef.current.paused) {
//         videoRef.current.play().catch(error => {
//           console.log('Resume play prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     });
//     // 🛑 Streamer ne ya viewer ne camera stop kiya
// newSocket.on("viewer-video-force-stopped-global", ({ userId }) => {
//   addDebugLog(`🛑 Camera stopped globally for user: ${userId}`);
//   cleanupViewerMedia(userId); // tumhare paas already hai
// });

// newSocket.on("viewer-camera-stopped", ({ userId }) => {
//   addDebugLog(`📷 Viewer camera stopped: ${userId}`);

//   setZoomed((prev) => {
//     if (prev && prev.type === "viewer" && prev.userId === userId) {
//       addDebugLog(`🔄 Resetting zoom for stopped viewer camera: ${userId}`);
//       return null;
//     }
//     return prev;
//   });
//     cleanupViewerCamera(userId);
// });

// newSocket.on("viewer-camera-paused-global", ({ userId }) => {
//   addDebugLog(`⏸️ Viewer camera paused: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))
//   );
// });

// newSocket.on("viewer-camera-resumed-global", ({ userId }) => {
//   addDebugLog(`▶️ Viewer camera resumed: ${userId}`);
//   setParticipants(prev =>
//     prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))
//   );
// });
//     newSocket.on('session_ended', () => {
//       addDebugLog('Session ended by streamer');
//       setRoomState(prev => ({ ...prev, isStreaming: false, isPaused: true }));
//       alert('Session has been ended by the streamer.');
//       navigate('/dashboard');
//     });

//     newSocket.on('session_paused', () => {
//       addDebugLog('Session paused by streamer');
//       setRoomState(prev => ({ ...prev, isPaused: true }));
//       setLocalPausedState(true);
//       alert('Session has been paused by the streamer.');
//     });

//     newSocket.on('producer-paused', (data) => {
//       addDebugLog(`Producer paused: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: true });
//         }
//         return newState;
//       });
//     });

//     newSocket.on('producer-resumed', (data) => {
//       addDebugLog(`Producer resumed: ${data.producerId}`);
//       setProducersState(prev => {
//         const newState = new Map(prev);
//         const producer = newState.get(data.producerId);
//         if (producer) {
//           newState.set(data.producerId, { ...producer, paused: false });
//         }
//         return newState;
//       });
//     });

// newSocket.on("producer-closed", (data) => {
//   addDebugLog(
//     `❌ Producer closed: ${data.producerId}, source: ${data.source}, user: ${data.userId}`
//   );

//   // 🖥️ Screen share cleanup (streamer OR viewer)
//   if (data.source === "screen" || data.source === "viewer-screen") {
//     // 🔴 Forcefully clear state
//     setActiveScreenShare(null);

//     // 🔴 Stop only video tracks from screen share
//     try {
//       if (screenRef.current?.srcObject) {
//         const tracks = screenRef.current.srcObject.getTracks?.() || [];
//         tracks.forEach((t) => {
//           if (t.kind === 'video') {
//             t.stop(); // Only stop video tracks
//           }
//         });
//       }
//     } catch (e) {
//       console.warn("Error stopping screen share tracks on producer-closed", e);
//     }

//     // 🔴 Clear video ref
//     if (screenRef.current) {
//       try {
//         screenRef.current.srcObject = null;
//         screenRef.current.load?.();
//       } catch (e) {
//         console.warn("Error clearing screenRef on producer-closed", e);
//       }
//     }

//     addDebugLog(
//       `✅ Producer closed → forced activeScreenShare reset for ${data.userId}`
//     );
//   }

//   // 🎤 Audio cleanup - ONLY for audio sources
//   if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//     cleanupViewerAudio(data.userId);
//     addDebugLog(`🎤 Viewer audio stopped for user: ${data.userId}`);
//   }

//   // 📷 Camera cleanup - ONLY for camera video
//   if (data.source === "viewer-camera") {
//     setViewerCameras((prev) => {
//       const newMap = new Map(prev);
//       if (newMap.has(data.userId)) {
//         const stream = newMap.get(data.userId);
//         if (stream) {
//           try {
//             // ✅ ONLY stop VIDEO tracks, leave audio tracks alone
//             stream.getTracks().forEach((t) => {
//               if (t.kind === 'video') {
//                 t.stop();
//                 addDebugLog(`📹 Stopped video track for user ${data.userId}`);
//               }
//               // Audio tracks continue playing
//             });
//           } catch (e) {
//             console.warn("Error stopping camera tracks", e);
//           }
//         }
//         newMap.delete(data.userId);
//       }
//       return newMap;
//     });
//     addDebugLog(`📷 Viewer camera removed for user ${data.userId}`);
//   }

//   // 🔊 Streamer audio cleanup - if needed
//   if (data.source === "mic" || data.source === "streamer-mic") {
//     addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
//     // Don't cleanup viewer audio here, this is streamer's audio
//   }
// });


//     newSocket.on("new-producer", (data) => {
//       addDebugLog("📡 New producer available:", data);

//       // Track producer in state
//       setProducersState((prev) => {
//         const updated = new Map(prev);
//         updated.set(data.producerId, {
//           id: data.producerId,
//           kind: data.kind,
//           userId: data.userId,
//           source: data.source || "camera",
//           paused: false,
//         });
//         return updated;
//       });

//       // Handle viewer screen video
//       if (data.source === "viewer-screen") {
//         addDebugLog("🖥️ Consuming viewer screen producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }

//       // Handle viewer mic OR viewer screen audio
//       if (data.source === "viewer-mic" || data.source === "viewer-screen-audio") {
//         addDebugLog("🎤 Consuming viewer audio producer:", data.producerId);
//         createConsumer(sessionId || roomCode, data.producerId, data.kind);
//       }
//       if (data.source === "viewer-camera") {
//   addDebugLog("📷 Consuming viewer camera producer:", data.producerId);
//   createConsumer(sessionId || roomCode, data.producerId, data.kind);
// }
//     });
    
//     newSocket.on('participant_updated', (data) => {
//       addDebugLog(`Participant updated: ${data.userId}`);
//       setParticipants(prev => prev.map(p => 
//         p.userId === data.userId ? { ...p, ...data.updates } : p
//       ));
//     });

//  newSocket.on("participants_list_updated", (data) => {
//   addDebugLog("📋 Participants list updated (snapshot)");
//   console.log("participants list:", data.participants || []);
//   setParticipants(data.participants || []);
// });
//     setSocket(newSocket);
//     socketRef.current = newSocket;
//   };

//   // ========== USE EFFECT HOOKS ==========

//  useEffect(() => {
//   // Initialize media stream refs
//   streamerMediaRef.current = new MediaStream();
//   viewerAudiosRef.current = new Map();

//   return () => {
//     isMountedRef.current = false;

//     // 🎥 Clean up main camera/microphone stream
//     if (mediaStream) {
//       mediaStream.getTracks().forEach(track => track.stop());
//     }

//     // 🖥️ Clean up active screen share (only one can be active)
//     if (activeScreenShare?.stream) {
//       activeScreenShare.stream.getTracks().forEach(track => track.stop());
//     }

//     // 🎤 Clean up all viewer audio streams
//     viewerAudiosRef.current.forEach(stream => {
//       stream.getTracks().forEach(track => track.stop());
//     });

//     // 🎥 Clean up remote video elements
//     remoteVideosRef.current.forEach(video => {
//       if (video && video.srcObject) {
//         video.srcObject.getTracks().forEach(track => track.stop());
//         video.srcObject = null;
//       }
//     });

//     // 🖱️ Remove gesture handlers
//     if (userGestureHandlerRef.current) {
//       document.removeEventListener("click", userGestureHandlerRef.current);
//       document.removeEventListener("touchstart", userGestureHandlerRef.current);
//     }

//     // 🔌 Close all transports
//     transports.current.forEach(transport => transport.close());

//     // 🔗 Close socket connection
//     if (socketRef.current) {
//       socketRef.current.close();
//     }
//   };
// }, []);

//   useEffect(() => {
//     const checkPermissions = async () => {
//       try {
//         addDebugLog('🔍 Checking camera and microphone permissions...');
//         setPermissionStatus('checking');
        
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         const hasVideoPermission = devices.some(device => device.kind === 'videoinput' && device.deviceId !== '');
//         const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.deviceId !== '');
        
//         if (hasVideoPermission && hasAudioPermission) {
//           addDebugLog('✅ Camera and microphone permissions already granted');
//           setPermissionStatus('granted');
//           initializeCamera();
//         } else {
//           addDebugLog('ℹ️ Need to request camera/microphone permissions');
//           setPermissionStatus('denied');
//           setIsLoading(false);
//         }
//       } catch (error) {
//         console.error('Error checking permissions:', error);
//         addDebugLog(`❌ Error checking permissions: ${error.message}`);
//         setPermissionStatus('denied');
//         setIsLoading(false);
//       }
//     };

//     checkPermissions();
//   }, []);


//   useEffect(() => {
//   return () => {
//     // Cleanup recording
//     if (recorder && recorder.state === 'recording') {
//       recorder.stop();
//     }
    
//     // Cleanup recording stream
//     if (recordingStream) {
//       recordingStream.getTracks().forEach(track => track.stop());
//     }
//   };
// }, [recorder, recordingStream]);

//   useEffect(() => {
//     if (permissionStatus === 'granted' && !isWebSocketInitialized) {
//       addDebugLog('🔄 Initializing WebSocket connection...');
//       setIsWebSocketInitialized(true);
//       initializeWebSocket();
//     }
//   }, [permissionStatus, isWebSocketInitialized]);

//   useEffect(() => {
//     const checkCameraVisibility = () => {
//       if (videoRef.current && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        
//         if (hasVideo && videoRef.current.readyState >= 2) {
//           setCameraVisible(true);
//           setIsLoading(false);
//           addDebugLog('✅ Camera video is visible on screen');
//         }
//       }
//     };

//     if (mediaStream) {
//       checkCameraVisibility();
//       const interval = setInterval(checkCameraVisibility, 500);
//       return () => clearInterval(interval);
//     }
//   }, [mediaStream]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
    
//     if (!videoElement || !mediaStream) {
//       setIsPlaying(false);
//       return;
//     }

//     if (videoElement.srcObject !== mediaStream) {
//       videoElement.srcObject = mediaStream;
//       videoElement.muted = true;
//     }

//     const handlePlay = () => {
//       console.log('Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
//       setIsLoading(false);
//     };

//     const handlePause = () => {
//       console.log('Video paused');
//       setIsPlaying(false);
//       setLocalPausedState(true);
      
//       if (!roomState.isPaused) {
//         setShowPlayButton(true);
//       }
//     };

//     const handleError = (e) => {
//       console.error('Video error:', e);
//       setMediaError(true);
//       setIsPlaying(false);
//       setShowPlayButton(true);
//     };

//     const handleLoadedMetadata = () => {
//       console.log('Video metadata loaded');
//       setIsLoading(false);
//       if (!roomState.isPaused && !localPausedState) {
//         videoElement.play().catch(error => {
//           console.log('Autoplay prevented:', error);
//           setShowPlayButton(true);
//         });
//       }
//     };

//     const handleLoadedData = () => {
//       console.log('Video data loaded');
//       setIsLoading(false);
//       if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
//         setCameraVisible(true);
//         setIsLoading(false);
//       }
//     };

//     const handleCanPlay = () => {
//       console.log('Video can play');
//       setIsLoading(false);
//     };

//     videoElement.addEventListener('play', handlePlay);
//     videoElement.addEventListener('pause', handlePause);
//     videoElement.addEventListener('error', handleError);
//     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
//     videoElement.addEventListener('loadeddata', handleLoadedData);
//     videoElement.addEventListener('canplay', handleCanPlay);

//     if (videoElement.readyState >= 2) {
//       if (!videoElement.paused && !videoElement.ended) {
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setLocalPausedState(false);
//         setIsLoading(false);
//       } else if (roomState.isPaused) {
//         setIsPlaying(false);
//         setShowPlayButton(false);
//         setLocalPausedState(true);
//       } else {
//         videoElement.play().catch(error => {
//           console.log('Initial play prevented:', error);
//           setShowPlayButton(true);
//           setLocalPausedState(true);
//         });
//       }
//     }

//     return () => {
//       videoElement.removeEventListener('play', handlePlay);
//       videoElement.removeEventListener('pause', handlePause);
//       videoElement.removeEventListener('error', handleError);
//       videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
//       videoElement.removeEventListener('loadeddata', handleLoadedData);
//       videoElement.removeEventListener('canplay', handleCanPlay);
//     };
//   }, [mediaStream, roomState.isPaused]);

//   useEffect(() => {
//     const videoElement = videoRef.current;
//     if (!videoElement || !mediaStream) return;

//     if (roomState.isPaused && !videoElement.paused) {
//       videoElement.pause();
//       setIsPlaying(false);
//       setShowPlayButton(false);
//       setLocalPausedState(true);
//     } else if (!roomState.isPaused && videoElement.paused && roomState.isStreaming) {
//       videoElement.play().catch(error => {
//         console.log('Play after resume prevented:', error);
//         setShowPlayButton(true);
//         setLocalPausedState(true);
//       });
//     }
//   }, [roomState.isPaused, roomState.isStreaming, mediaStream]);

// // ✅ always keep PiP screen video in sync, even after zoom toggle
// useEffect(() => {
//   if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
//     screenRef.current.srcObject = activeScreenShare.stream;
//     screenRef.current.play().catch(() => {
//       console.warn("Autoplay blocked for screen PiP");
//     });
//   } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
//     screenRef.current.srcObject = null;
//   }
// }, [activeScreenShare?.stream, zoomed]);

//   useEffect(() => {
//     if (mediaStream) {
//       const tracks = mediaStream.getTracks();
//       tracks.forEach(track => {
//         addDebugLog(`Track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
//         if (track.kind === 'video') {
//           const settings = track.getSettings();
//           addDebugLog(`Video settings: ${JSON.stringify({
//             width: settings.width,
//             height: settings.height,
//             frameRate: settings.frameRate,
//             deviceId: settings.deviceId
//           })}`);
//         }
//       });
      
//       const status = checkStreamStatus();
//       if (status.hasVideo && status.hasAudio) {
//         addDebugLog('✅ Stream has both audio and video tracks');
//       } else {
//         addDebugLog('❌ Stream is missing audio or video tracks');
//       }
//     }
//   }, [mediaStream]);
// // 👇 ye effect tumhare component me daal do
// // ✅ Streamer video ke liye
// useEffect(() => {
//   if (!videoRef.current) return;

//   if (!zoomed && mediaStream) {
//     videoRef.current.srcObject = mediaStream;
//     videoRef.current.play().catch(err =>
//       console.warn("Autoplay prevented for camera video:", err)
//     );
//   } else if (zoomed && zoomed.type !== "streamer") {
//     // jab zoomed viewer/screen hai to streamer video hide
//     videoRef.current.srcObject = null;
//   }
// }, [zoomed, mediaStream]);
//   // ========== UI COMPONENTS ==========

// const handlePlayClick = async (e) => {
//   try {
//     e.stopPropagation();
//     console.log('📱 User triggered play');
    
//     if (videoRef.current && mediaStream) {
//       // Ensure video element is properly set up
//       const videoEl = videoRef.current;
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
      
//       // Set source only if needed
//       if (videoEl.srcObject !== mediaStream) {
//         videoEl.srcObject = mediaStream;
//       }
      
//       // User gesture ke saath play
//       await videoEl.play();
//       console.log('✅ Mobile video started via user gesture');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//       setMediaError(false);
//       setLocalPausedState(false);
      
//     }
//   } catch (error) {
//     console.error('❌ Failed to play video on mobile:', error);
    
//     // Specific error handling
//     if (error.name === 'NotAllowedError') {
//       setMediaError('Autoplay blocked. Please tap to play.');
//     } else {
//       setMediaError('Failed to play video');
//     }
    
//     setShowPlayButton(true);
//     setLocalPausedState(true);
//   }
// };

//   // 📷 Jab viewer camera request bhejta hai
// const handleViewerVideoRequest = useCallback((data) => {
//   addDebugLog(`📷 Viewer requested camera: ${data.requesterName} (${data.requestedUserId})`);
  
//   setViewerVideoRequests((prev) => [
//     ...prev,
//     {
//       userId: data.requestedUserId,
//       userName: data.requesterName,
//       socketId: data.socketId
//     }
//   ]);
// }, []);

// // Replace old handleViewerVideoResponse with this:
// const handleViewerVideoResponse = useCallback((requesterSocketId, allow) => {
//   // Use socketRef (safer) or emitSocketEvent helper
//   if (!socketRef.current || !socketRef.current.connected) {
//     addDebugLog('❌ Socket not connected — cannot send viewer-video-response');
//     return;
//   }

//   socketRef.current.emit('viewer-video-response', {
//     sessionId: sessionId || roomCode,
//     requesterSocketId,    // <-- IMPORTANT: server expects this key
//     allow                  // <-- IMPORTANT: server expects `allow` (boolean)
//   });

//   // remove the request UI
//   setViewerVideoRequests(prev => prev.filter(r => r.userId !== requesterSocketId && r.socketId !== requesterSocketId));

//   addDebugLog(`${allow ? '✅' : '❌'} Camera ${allow ? 'approved' : 'denied'} for requester socket: ${requesterSocketId}`);
// }, [sessionId, roomCode]);

//   const checkStreamStatus = useCallback(() => {
//     if (!mediaStream) return false;
    
//     const videoTracks = mediaStream.getVideoTracks();
//     const audioTracks = mediaStream.getAudioTracks();
    
//     const hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
//     const hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    
//     addDebugLog(`Stream status - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
//     return { hasVideo, hasAudio };
//   }, [mediaStream]);

// useEffect(() => {
//   if (!isMobile) return;

//   const handleFirstUserInteraction = () => {
//     addDebugLog('📱 Mobile user interaction detected');
    
//     // Video play try karo user gesture ke baad
//     if (videoRef.current && mediaStream && showPlayButton) {
//       setTimeout(() => {
//         videoRef.current.play().catch(() => {
//           // Still blocked, play button show karo
//           setShowPlayButton(true);
//         });
//       }, 100);
//     }
//   };

//   // Multiple events pe listen karo
//   document.addEventListener('click', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
//   document.addEventListener('touchend', handleFirstUserInteraction, { once: true });

//   return () => {
//     document.removeEventListener('click', handleFirstUserInteraction);
//     document.removeEventListener('touchstart', handleFirstUserInteraction);
//     document.removeEventListener('touchend', handleFirstUserInteraction);
//   };
// }, [isMobile, mediaStream, showPlayButton]);


// // Mobile detection and handlers
// useEffect(() => {
//   const checkMobile = () => {
//     const mobile = window.innerWidth < 768 || 
//                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//     setIsMobile(mobile);
//     if (mobile) {
//       setMobileView('video');
//       setShowThumbnails(false);
//       addDebugLog(`📱 Mobile device detected: ${window.innerWidth}px`);
//     }
//   };

//   checkMobile();
//   window.addEventListener('resize', checkMobile);
  
//   return () => window.removeEventListener('resize', checkMobile);
// }, []);

//   // Full screen handling
//   const toggleFullScreen = () => {
//     if (!document.fullscreenElement) {
//       document.documentElement.requestFullscreen().catch(err => {
//         console.log('Full screen error:', err);
//       });
//       setIsFullScreen(true);
//     } else {
//       document.exitFullscreen();
//       setIsFullScreen(false);
//     }
//   };
//   // Mobile main render
//   if (isMobile) {
//       const mobileHeight = isLandscape ? 'h-[160vh]' : 'h-screen';

//     return (
//       <div className={`flex flex-col ${mobileHeight} bg-black text-white overflow-hidden`}>
//         <MobileHeader
//       session={session}
//       participants={participants}
//       isConnected={isConnected}
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//       showRequests={showRequests}
//       setShowRequests={setShowRequests}
//     />
    
//     <MobileRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       screenShareRequests={screenShareRequests}
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//       handleScreenShareResponse={handleScreenShareResponse}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />
        
//         {/* Main Content Area */}
//         {/* {mobileView === 'video' &&  <MobileVideoView
//         zoomed={zoomed}
//         setZoomed={setZoomed}
//         mediaStream={mediaStream}
//         participants={participants}
//         activeScreenShare={activeScreenShare}
//         setIsPlaying={setIsPlaying}
//         setShowPlayButton={setShowPlayButton}
//         showPlayButton={showPlayButton}
//         setMediaError={setMediaError}
//         mediaError={mediaError}
//         isLoading={isLoading}
//         isInitializing={isInitializing}
//         roomState={roomState}
//         localPausedState={localPausedState}
//         user={user}
//         videoEnabled={videoEnabled}
//         viewerCameras={viewerCameras}
//         showMobileControls={showMobileControls}
//         setShowMobileControls={setShowMobileControls}
//         handlePlayClick={handlePlayClick}
//         isPlaying={isPlaying}
//       />} */}

//         {mobileView === 'video' && (
//         <MobileVideoView
//           zoomed={zoomed}
//           setZoomed={setZoomed}
//           mediaStream={mediaStream}
//           participants={participants}
//           activeScreenShare={activeScreenShare}
//           setIsPlaying={setIsPlaying}
//           setShowPlayButton={setShowPlayButton}
//           showPlayButton={showPlayButton}
//           setMediaError={setMediaError}
//           mediaError={mediaError}
//           isLoading={isLoading}
//           isInitializing={isInitializing}
//           roomState={roomState}
//           localPausedState={localPausedState}
//           user={user}
//           videoEnabled={videoEnabled}
//           viewerCameras={viewerCameras}
//           showMobileControls={showMobileControls}
//           setShowMobileControls={setShowMobileControls}
//           handlePlayClick={handlePlayClick}
//           isPlaying={isPlaying}
//         />
//       )}
//         {mobileView === 'participants' && <MobileParticipantsView
//         participants={participants}
//         activeSpeakers={activeSpeakers}
//         handleMuteViewerAudio={handleMuteViewerAudio}
//         emitSocketEvent={emitSocketEvent}
//         sessionId={sessionId}
//         roomCode={roomCode}
//         addDebugLog={addDebugLog}
//         handleStopViewerScreenShare={handleStopViewerScreenShare}
//         handleBanParticipant={handleBanParticipant}
//       />}
//         {mobileView === 'chat' && <MobileChatView
//         messages={messages}
//         user={user}
//         sendMessage={sendMessage}
//         uploadingFile={uploadingFile}
//       />}
        
//        <MobileNavigation
//       mobileView={mobileView}
//       setMobileView={setMobileView}
//       toggleFullScreen={toggleFullScreen}
//       isFullScreen={isFullScreen}
//     />
    
//     <MobileControls
//   toggleAudio={toggleAudio}
//   audioEnabled={audioEnabled}
//   toggleVideo={toggleVideo}
//   videoEnabled={videoEnabled}
//   roomState={roomState}
//   startStreaming={startStreaming}
//   resumeStreaming={resumeStreaming}
//   pauseStreaming={pauseStreaming}
//   endStreaming={endStreaming}
//   // ✅ New props for recording
//   handleRecordingToggle={handleRecordingToggle}
//   isRecording={isRecording}
//   isRecordingLoading={isRecordingLoading}
//   isRecordingStopping={isRecordingStopping}
// />

//         {/* Mobile Modals */}
//         {showParticipantsModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-h-80 overflow-y-auto">
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-semibold">Manage Participants</h3>
//                 <button 
//                   onClick={() => setShowParticipantsModal(false)}
//                   className="text-gray-400"
//                 >
//                   <FiX className="h-5 w-5" />
//                 </button>
//               </div>
              
//               <div className="space-y-2">
//                 {participants.map((participant, index) => (
//                   <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
//                     <span className="text-sm">{participant.name || 'User'}</span>
//                     <div className="flex space-x-1">
//                       {participant.hasAudio && (
//                         <button
//                           onClick={() => handleMuteViewerAudio(participant.socketId)}
//                           className="bg-red-500 text-white p-1 rounded text-xs"
//                         >
//                           Mute
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // ========== MAIN RENDER ==========

//   if (isLoading && permissionStatus !== 'denied') {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Requesting camera access...</p>
//           {mediaError && (
//             <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//               <p>{mediaError}</p>
//               <button 
//                 onClick={initializeCamera}
//                 className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//               >
//                 Retry
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   if (permissionStatus === 'denied' && !isConnected) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
//           <div className="text-4xl mb-4">🎥</div>
//           <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
//           <p className="text-gray-600 mb-6">
//             To join this live session, you need to allow camera and microphone access.
//           </p>
//           <button
//             onClick={requestCameraPermissions}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
//           >
//             Allow Camera & Microphone
//           </button>
//           <p className="text-sm text-gray-500 mt-4">
//             If you've previously denied access, please check your browser settings.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (!isConnected || !session) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Connecting to session...</p>
//           <div className="mt-4 w-64 mx-auto">
//             <video 
//               ref={videoRef}
//               autoPlay 
//               playsInline 
//               muted={true}
//               className="w-full rounded-lg shadow-lg"
//             />
//             <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }
// return (
//   <div className="flex flex-col h-[115vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
//     {/* Enhanced Header */}
//     <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
//       <div className="flex items-center space-x-4">
//         <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
//           <FiVideo className="h-6 w-6 text-white" />
//         </div>
//         <div>
//           <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//             Stream Control Center
//           </h1>
//           <p className="text-sm text-gray-300 flex items-center space-x-1">
//             <FiRadio className="h-3 w-3 text-green-400" />
//             <span>Room: {session?.roomCode}</span>
//           </p>
//         </div>
        
//         {/* RECORDING TIMER DISPLAY */}
//         {isRecording && (
//           <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
//             <div className="relative">
//               <BsFillRecordFill className="h-4 w-4 text-red-200" />
//               <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
//             </div>
//             <span className="text-sm font-bold text-white font-mono">
//               {formatRecordingTime(recordingTimer)}
//             </span>
//             <span className="text-xs text-red-100 font-medium">REC</span>
            
//             {/* Recording status dot */}
//             <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
//           </div>
//         )}
//       </div>
      
//       <div className="flex items-center space-x-4">
//         {/* Connection Status */}
//         <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
//           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//           <span className="text-sm font-medium">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
//         </div>
        
//         {/* Participants Count */}
//         <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 px-4 py-2 rounded-full backdrop-blur-sm">
//           <FiUsers className="h-4 w-4 text-white" />
//           <span className="text-sm font-medium">
//             {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
//           </span>
//         </div>

//         {/* Additional Recording Info (Optional) */}
//         {isRecording && (
//           <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
//             <span className="text-xs text-red-200 font-medium">Recording Active</span>
//             <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
//           </div>
//         )}

//         {/* Notification Badge for Pending Requests */}
//         {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
//           <div className="relative">
//             <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
//               <FiAlertCircle className="h-5 w-5 text-white" />
//             </button>
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
//               {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
//             </span>
//           </div>
//         )}

//         {/* Sidebar Toggle Button */}
//         <button
//           onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
//           className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
//           title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//         >
//           {sidebarCollapsed ? 
//             <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
//             <FiChevronRight className="h-5 w-5 text-blue-400" />
//           }
//           <span className="text-sm font-medium">
//             {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
//           </span>
//         </button>

//         {/* End Session Button */}
//         <button
//           onClick={endStreaming}
//           className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
//         >
//           <FiLogOut className="h-4 w-4" />
//           <span>End Session</span>
//         </button>
//       </div>
//     </header>

//     {/* Main Content Area */}
//     <div className="flex-1 overflow-hidden relative">
//       {/* Thumbnails Overlay - Will cover entire screen when expanded */}
//       {thumbnailsExpanded && (
//         <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
//           <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/90">
//             <h2 className="text-xl font-bold flex items-center space-x-3">
//               <FiVideo className="h-6 w-6 text-blue-400" />
//               <span>All Cameras ({thumbnailsCount})</span>
//             </h2>
//             <div className="flex items-center space-x-4">
//               {/* Search filter (optional) */}
              
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
//                 title="Exit Full Screen"
//               >
//                 <FiX className="h-6 w-6" />
//               </button>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-6">
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid="streamer"
//                     stream={mediaStream}
//                     userName="You"
//                     onClick={() => {
//                       setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "streamer"}
//                     videoEnabled={videoEnabled}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//                     Host
//                   </div>
//                 </div>
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <div key={uid} className="relative group">
//                   <ThumbnailVideo
//                     uid={uid}
//                     stream={stream}
//                     userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                     onClick={() => {
//                       setZoomed({ type: "viewer", stream, userId: uid });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                     videoEnabled={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
//                     Viewer
//                   </div>
//                 </div>
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <div className="relative group">
//                   <ThumbnailVideo
//                     uid={activeScreenShare.userId}
//                     stream={activeScreenShare.stream}
//                     userName={`${activeScreenShare.userName}'s Screen`}
//                     onClick={() => {
//                       setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                       setShowPlayButton(false);
//                       setThumbnailsExpanded(false);
//                     }}
//                     isZoomed={zoomed?.type === "screen"}
//                     videoEnabled={true}
//                     isScreenShare={true}
//                     expanded={true}
//                   />
//                   <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//                     <FiMonitor className="h-3 w-3 mr-1" />
//                     Screen
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           <div className="p-4 border-t border-gray-700 bg-gray-800/90">
//             <div className="flex justify-between items-center">
//               <div className="text-sm text-gray-400">
//                 Click on any camera to zoom into it
//               </div>
//               <button
//                 onClick={() => setThumbnailsExpanded(false)}
//                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
//               >
//                 Back to Stream
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* When sidebar is collapsed */}
//       {sidebarCollapsed ? (
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//               {/* Zoomed Video View */}
//               {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Expand Sidebar Button */}
//               <div className="absolute right-4 top-4 z-20">
//                 <button
//                   onClick={() => setSidebarCollapsed(false)}
//                   className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
//                   title="Show Sidebar"
//                 >
//                   <FiChevronLeft className="h-5 w-5 text-blue-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           {/* Thumbnails Column - Always visible */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : (
//         /* Original Layout when sidebar is expanded */
//         <div className="flex h-full">
//           {/* Main Video Area */}
//           <div className="flex-1 flex flex-col min-h-0">
//             <div 
//               className="relative flex-1 bg-black overflow-hidden cursor-pointer"
//               onClick={() => {
//                 if (zoomed) {
//                   const element = document.querySelector('.main-video-container');
//                   if (element) {
//                     if (!document.fullscreenElement) {
//                       element.requestFullscreen().catch(err => {
//                         console.log('Full screen error:', err);
//                       });
//                     } else {
//                       document.exitFullscreen();
//                     }
//                   }
//                 }
//               }}
//             >
//          {/* Zoomed Video View */}
// {zoomed ? (
//   <div className="relative w-full h-full main-video-container">
//     <video
//       ref={zoomedVideoRef} // ✅ Use the persistent ref here
//       autoPlay
//       playsInline
//       muted={zoomed.type !== "viewer"} // Viewers should have sound
//       className="absolute inset-0 w-full h-full object-contain bg-black"
//       onError={(e) => {
//         console.error('Zoomed video error:', e);
//         // Don't reset zoomed immediately on minor errors to prevent UI jumps
//       }}
//     />
    
//     <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20">
//       {zoomed.type === "streamer" ? "Your Camera" : 
//        zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//        `${activeScreenShare?.userName}'s Screen`}
//     </div>
//   </div>
// ) : (
//   // Default view - Streamer's camera
//   <video
//     ref={videoRef}
//     autoPlay
//     playsInline
//     muted={true}
//     className="absolute inset-0 w-full h-full object-contain bg-black"
//     onError={(e) => {
//       console.error('Main video error:', e);
//       setMediaError(true);
//     }}
//   />
// )}

//               {/* Status Overlay */}
//               <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
//                 <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//                   <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//                   <span className="font-medium">{isPlaying ? 'Live' : 'Paused'}</span>
//                 </div>
//               </div>

//               {/* Loading States */}
//               {isLoading && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Loading camera...</p>
//                   </div>
//                 </div>
//               )}

//               {isInitializing && (
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//                   <div className="text-center">
//                     <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//                     <p className="text-white font-medium text-lg">Initializing stream...</p>
//                   </div>
//                 </div>
//               )}

//               {/* Play Button */}
//               {showPlayButton && !mediaError && !zoomed && (
//                 <div 
//                   className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//                   onClick={handlePlayClick}
//                 >
//                   <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//                     <FiPlay className="h-16 w-16" />
//                   </div>
//                 </div>
//               )}

//               {/* Media Error State */}
//               {mediaError && !zoomed && (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//                   <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//                     <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//                     <button 
//                       onClick={retryCamera}
//                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200"
//                     >
//                       Retry Camera
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Thumbnails Column */}
//           <div className="w-48 xl:w-56 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Thumbnails header with expand button */}
//             <div className="p-4 border-b border-gray-600 flex items-center justify-between">
//               <h3 className="font-semibold flex items-center space-x-2 text-sm">
//                 <FiVideo className="h-4 w-4 text-blue-400" />
//                 <span>Cameras ({thumbnailsCount})</span>
//               </h3>
//               {thumbnailsCount > 0 && (
//                 <button
//                   onClick={() => setThumbnailsExpanded(true)}
//                   className="p-1 hover:bg-gray-700 rounded transition-colors"
//                   title="View All Cameras"
//                 >
//                   <FiMaximize className="h-4 w-4 text-gray-300" />
//                 </button>
//               )}
//             </div>
            
//             {/* Thumbnails container */}
//             <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideo
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                 />
//               )}
              
//               {/* Viewer cameras */}
//               {[...viewerCameras.entries()].map(([uid, stream]) => (
//                 <ThumbnailVideo
//                   key={uid}
//                   uid={uid}
//                   stream={stream}
//                   userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                   onClick={() => {
//                     setZoomed({ type: "viewer", stream, userId: uid });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                   videoEnabled={true}
//                 />
//               ))}
              
//               {/* Screen share thumbnails */}
//               {activeScreenShare && (
//                 <ThumbnailVideo
//                   uid={activeScreenShare.userId}
//                   stream={activeScreenShare.stream}
//                   userName={`${activeScreenShare.userName}'s Screen`}
//                   onClick={() => {
//                     setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "screen"}
//                   videoEnabled={true}
//                   isScreenShare={true}
//                 />
//               )}
              
//               {/* Empty state */}
//               {thumbnailsCount === 0 && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//                   <div>
//                     <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                     <p>No active cameras</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Sidebar - Expanded */}
//           <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//             {/* Sidebar Toggle Header */}
//             <div className="flex border-b border-gray-600">
//               <button
//                 onClick={() => setSidebarView('participants')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'participants' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiUsers className="h-5 w-5" />
//                 <span className="text-sm font-medium">Participants</span>
//               </button>
//               <button
//                 onClick={() => setSidebarView('chat')}
//                 className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//                   sidebarView === 'chat' 
//                     ? 'bg-gray-700/50 text-white' 
//                     : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//                 }`}
//               >
//                 <FiMessageSquare className="h-5 w-5" />
//                 <span className="text-sm font-medium">Chat</span>
//               </button>
              
//               {/* Collapse button inside sidebar */}
//               <button
//                 onClick={() => setSidebarCollapsed(true)}
//                 className="px-3 text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all duration-200"
//                 title="Hide Sidebar"
//               >
//                 <FiChevronRight className="h-5 w-5" />
//               </button>
//             </div>

//             {/* Participants View */}
//             {sidebarView === 'participants' && (
//               <div className="flex-1 flex flex-col min-h-0">
//                 <div className="p-4 border-b border-gray-600">
//                   <div className="flex items-center justify-between">
//                     <h3 className="font-semibold text-lg flex items-center space-x-2">
//                       <FiUsers className="h-5 w-5 text-blue-400" />
//                       <span>Participants ({participants.length})</span>
//                     </h3>
//                     <button
//                       onClick={() => setShowParticipantsModal(true)}
//                       className="p-1 hover:bg-gray-700 rounded transition-colors"
//                       title="Manage Participants"
//                     >
//                       <FiUsers className="h-5 w-5 text-gray-400" />
//                     </button>
//                   </div>
//                 </div>
                
//                 <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//                   {participants.map((participant, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-colors duration-200"
//                     >
//                       <div className="flex items-center space-x-3">
//                         <div
//                           className={`w-3 h-3 rounded-full ${
//                             activeSpeakers.has(participant.socketId)
//                               ? "bg-green-400 animate-pulse"
//                               : participant.hasAudio
//                               ? "bg-blue-400"
//                               : "bg-gray-400"
//                           }`}
//                         ></div>
//                         <span className="truncate font-medium">
//                           {participant.name || participant.userName || participant.userId || "User"}
//                         </span>
//                       </div>
                      
//                       <div className="flex items-center space-x-2">
//                         {/* Audio permission icon */}
//                         {participant.hasAudio && (
//                           <button
//                             onClick={() => openRemoveAudioModal(participant)}
//                             className="p-1 text-blue-400 hover:text-red-400 transition-colors"
//                             title="Remove Audio Permission"
//                           >
//                             <FiMic className="h-4 w-4" />
//                           </button>
//                         )}

//                         {/* Stop Camera icon */}
//                         {participant.hasVideo && (
//                           <button
//                             onClick={() => {
//                               emitSocketEvent("streamer-stop-viewer-video", {
//                                 sessionId: sessionId || roomCode,
//                                 targetSocketId: participant.socketId,
//                               });
//                               addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
//                             }}
//                             className="p-1 text-green-400 hover:text-red-400 transition-colors"
//                             title="Stop Camera"
//                           >
//                             <FiCameraOff className="h-4 w-4" />
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Chat View */}
//             {sidebarView === 'chat' && (
//               <ChatComponent
//                 messages={messages}
//                 onSendMessage={sendMessage}
//                 currentUserId={user?.id}
//                 uploadingFile={uploadingFile}
//                 socket={socket}
//                 sessionId={sessionId}
//                 roomCode={roomCode}
//               />
//             )}
//           </div>
//         </div>
//       )}
//     </div>


//         {showRecorder && (
//       <ScreenRecorderComponent
//         sessionId={sessionId}
//         roomCode={roomCode}
//         user={user}
//         onClose={() => {
//           setShowRecorder(false);
//           setAutoStartRecording(false);
//         }}
//         autoStart={autoStartRecording}
//         existingMediaStream={mediaStream}
//       />
//     )}

//     {/* Audio Permission Modal */}
//     <AudioPermissionModal
//       isOpen={showAudioPermissionModal}
//       onEnableAudio={handleEnableAudio}
//     />

//     {/* Updated Panels with Proper Z-index */}
//     <ViewerAudioRequestsPanel
//       viewerAudioRequests={viewerAudioRequests}
//       handleViewerAudioResponse={handleViewerAudioResponse}
//     />

//     <ScreenShareRequestsPanel
//       screenShareRequests={screenShareRequests}
//       handleScreenShareResponse={handleScreenShareResponse}
//     />

//     <ActiveViewerAudioPanel
//       activeViewerAudio={activeViewerAudio}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//     />

//     <ActiveScreenSharesPanel
//       activeScreenShare={activeScreenShare}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//     />

//     <ParticipantsModal
//       showParticipantsModal={showParticipantsModal}
//       setShowParticipantsModal={setShowParticipantsModal}
//       participants={participants}
//       activeSpeakers={activeSpeakers}
//       handleMuteViewerAudio={handleMuteViewerAudio}
//       handleStopViewerScreenShare={handleStopViewerScreenShare}
//       emitSocketEvent={emitSocketEvent}
//       sessionId={sessionId}
//       roomCode={roomCode}
//       addDebugLog={addDebugLog}
//       handleBanParticipant={handleBanParticipant}
//     />

//     <ViewerVideoRequestsPanel
//       viewerVideoRequests={viewerVideoRequests}
//       handleViewerVideoResponse={handleViewerVideoResponse}
//     />

//     <ProducerStatus producersState={producersState} />

//     {/* Remove Audio Confirmation Modal */}
//     {audioRemoveTarget && (
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
//           <div className="flex items-center space-x-3 mb-4">
//             <FiAlertCircle className="h-6 w-6 text-red-500" />
//             <h3 className="text-lg font-semibold text-gray-900">Remove Audio?</h3>
//           </div>
//           <p className="text-gray-700 mb-6">
//             Do you want to remove audio for <strong className="text-gray-900">{audioRemoveTarget.name || audioRemoveTarget.userId}</strong>? 
//             They will need to request again to speak.
//           </p>
//           <div className="flex justify-end space-x-3">
//             <button 
//               onClick={() => setAudioRemoveTarget(null)}
//               className="flex items-center space-x-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
//             >
//               <FiX className="h-4 w-4" />
//               <span>Cancel</span>
//             </button>
//             <button 
//               onClick={confirmRemoveAudio}
//               className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//             >
//               <FiCheck className="h-4 w-4" />
//               <span>Remove Audio</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     )}
    
//     {/* Enhanced Controls Footer */}
//  <div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
//   <div className="flex justify-center space-x-6">
//     {/* Start/Resume/Pause Stream Control */}
//     {!roomState.isStreaming ? (
//       <button
//         onClick={startStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Streaming"
//         disabled={isInitializing || isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Start</span>
//       </button>
//     ) : roomState.isPaused ? (
//       <button
//         onClick={resumeStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Resume Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPlay className="text-xl mb-1" />
//         <span className="text-xs font-medium">Resume</span>
//       </button>
//     ) : (
//       <button
//         onClick={pauseStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Pause Streaming"
//         disabled={isRecordingLoading}
//       >
//         <FiPause className="text-xl mb-1" />
//         <span className="text-xs font-medium">Pause</span>
//       </button>
//     )}
    
//     {/* Audio Toggle */}
//     <button
//       onClick={toggleAudio}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         audioEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
//       disabled={isRecordingLoading || isRecordingStopping}
//     >
//       {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
//     </button>

//     {/* Video Toggle */}
//     <button
//       onClick={toggleVideo}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         videoEnabled 
//           ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
//           : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
//       }`}
//       title={videoEnabled ? "Disable Video" : "Enable Video"}
//       disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//     >
//       {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
//       <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
//     </button>
    
//     {/* Smart Screen Share Button */}
//     {activeScreenShare?.source === "streamer" ? (
//       <button
//         onClick={stopScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title={isRecording ? "Stop Screen Share & Recording" : "Stop Screen Share"}
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <div className="relative">
//           <FiSquare className="text-xl mb-1" />
//           {isRecording && (
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
//           )}
//         </div>
//         <span className="text-xs font-medium">
//           {isRecording ? 'Stop Both' : 'Stop Share'}
//         </span>
//         {isRecording && (
//           <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] px-1 rounded">
//             REC
//           </span>
//         )}
//       </button>
//     ) : (
//       <button
//         onClick={startScreenShare}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl hover:from-gray-700 hover:to-gray-800 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="Start Screen Share"
//         disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//       >
//         <MdOutlineScreenShare className="text-xl mb-1" />
//         <span className="text-xs font-medium">Share Screen</span>
//       </button>
//     )}
    
//     {/* Smart Recording Button */}
//     <button
//       onClick={handleRecordingToggle}
//       disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//       className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//         isRecording 
//           ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse' 
//           : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
//       }`}
//       title={
//         isRecording 
//           ? `Stop Recording (${formatRecordingTime(recordingTimer)})` 
//           : activeScreenShare 
//             ? "Record Current Screen Share" 
//             : "Start Screen Recording"
//       }
//     >
//       {isRecordingLoading ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Starting...</span>
//         </>
//       ) : isRecordingStopping ? (
//         <>
//           <FiLoader className="text-xl mb-1 animate-spin" />
//           <span className="text-xs font-medium">Saving...</span>
//         </>
//       ) : isRecording ? (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
//           </div>
//           <span className="text-xs font-medium">Stop REC</span>
          
//           {/* Recording Timer Badge */}
//           <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//             {formatRecordingTime(recordingTimer)}
//           </span>
          
//           {/* Screen Share Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">
//               SCREEN
//             </span>
//           )}
          
//           {/* Recording Size Indicator */}
//           {recordingChunks.length > 0 && (
//             <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] py-0.5 rounded-b-2xl">
//               {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//             </div>
//           )}
//         </>
//       ) : (
//         <>
//           <div className="relative">
//             <BsFillRecordFill className="text-xl mb-1" />
//             {activeScreenShare && (
//               <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
//             )}
//           </div>
//           <span className="text-xs font-medium">
//             {activeScreenShare ? 'Record Share' : 'Record'}
//           </span>
          
//           {/* Tooltip Indicator */}
//           {activeScreenShare && (
//             <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">
//               ✓
//             </span>
//           )}
//         </>
//       )}
//     </button>

//     {/* End Stream Button */}
//     {roomState.isStreaming && (
//       <button
//         onClick={endStreaming}
//         className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700 focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//         title="End Stream for All Participants"
//         disabled={isRecordingLoading || isRecordingStopping}
//       >
//         <FiStopCircle className="text-xl mb-1" />
//         <span className="text-xs font-medium">End Stream</span>
        
//         {/* Warning Indicator if Recording is Active */}
//         {isRecording && (
//           <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">
//             !
//           </span>
//         )}
//       </button>
//     )}
//   </div>
  
//   {/* Recording Status Bar */}
//   {isRecording && (
//     <div className="mt-3 mx-auto max-w-2xl">
//       <div className="flex items-center justify-between text-xs text-gray-300">
//         <div className="flex items-center space-x-2">
//           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
//           <span className="font-medium">Recording Active</span>
//           <span className="text-gray-400">•</span>
//           <span>{formatRecordingTime(recordingTimer)}</span>
//           <span className="text-gray-400">•</span>
//           <span>
//             {activeScreenShare 
//               ? `Recording ${activeScreenShare.userName}'s screen` 
//               : 'Recording screen & audio'}
//           </span>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {recordingChunks.length > 0 && (
//             <>
//               <span className="text-gray-400">Size:</span>
//               <span className="font-mono">
//                 {formatFileSize(recordingChunks.reduce((total, chunk) => total + chunk.size, 0))}
//               </span>
//             </>
//           )}
//         </div>
//       </div>
      
//       {/* Recording Progress Bar */}
//       <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
//         <div 
//           className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
//           style={{ 
//             width: `${Math.min((recordingTimer % 60) / 60 * 100, 100)}%`,
//             animationDuration: '1s'
//           }}
//         ></div>
//       </div>
//     </div>
//   )}
// </div>
//   </div>
// );

// };

// export default LiveSession; 
