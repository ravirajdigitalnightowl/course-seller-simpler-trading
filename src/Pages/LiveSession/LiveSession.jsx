

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
import ChatComponent from './ChatComponent';
import AudioPermissionModal from './AudioPermissionModal';
import StreamerWhiteboard from './components/WhiteboardComponent';
import { Dialog } from "@headlessui/react";


import { 
  getRecordingUploadUrl, 
  saveRecordingMetadata,
  getRecordingDownloadUrl,
  formatFileSize
} from './recordingService';

import { toast } from 'react-toastify';

import { 
  // Video/Audio
  FiVideo, FiVideoOff, 
  FiMic, FiMicOff,
  FiCamera, FiCameraOff,
  FiEdit3 ,
  
  // Navigation
  FiUsers, 
  FiMessageSquare,
  FiChevronRight, FiChevronLeft,
  
  // Controls
  FiPlay, FiPause,
  FiStopCircle,
  FiCheck, FiX,
  FiLoader,
  FiLogOut,
  FiAlertCircle,
  FiMaximize,
  
  // Status
  FiCircle,
  FiMonitor,
  FiRadio,
  
  // Speaking/Hand features
          // Hand raise
  FiVolume,      // Volume
  FiVolume2,     // Volume double (speaking)
  FiVolume1      // Volume low
} from 'react-icons/fi';

import { 
  MdOutlineScreenShare, 
  MdStopScreenShare,
  MdPlayArrow,
  MdPause,
  MdStop,
  MdVolumeOff     // For mute status
} from 'react-icons/md';

import { TfiHandOpen } from "react-icons/tfi";
import { createPortal } from "react-dom";



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
  const [showEchoSync, setShowEchoSync] = useState(false);
const [whiteboardSessionInfo, setWhiteboardSessionInfo] = useState(null);
// Viewer screen share ke liye alag state
const [viewerScreenShare, setViewerScreenShare] = useState(null);

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
const [isSpeaking, setIsSpeaking] = useState(false);
const [handRaisedUsers, setHandRaisedUsers] = useState([]);
const [speakingUsers, setSpeakingUsers] = useState(new Map());

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
const [showEndSessionRecordingModal, setShowEndSessionRecordingModal] = useState(false);


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
const recordingAudioContextRef = useRef(null);
const recordingDestinationRef = useRef(null);
const speakingSourceRef = useRef(null);
const speakingAudioContextRef = useRef(null);
const isRecordingRef = useRef(false);

const screenCaptureStreamRef = useRef(null);

const activeScreenShareRef = useRef(null);


const screenCaptureActiveRef = useRef(false);
const viewerScreenRef = useRef(null);


  const streamerMediaRef = useRef(new MediaStream());
  const viewerAudiosRef = useRef(new Map());
  const userInteractedRef = useRef(false);
const showAudioPermissionModalRef = useRef(false);
const audioModalLockRef = useRef(false);

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
const analyserRef = useRef(null);
const speakingDetectionIntervalRef = useRef(null);
const localAudioTrackRef = useRef(null);
const speakingThreshold = 40; // Same as viewer side
const audioDestinationRef = useRef(null);
  const [device] = useState(new mediasoupClient.Device());
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isAudioModalOpen = isRecording && !userInteracted;

  // const thumbnailsCount = (mediaStream ? 1 : 0) + viewerCameras.size + (activeScreenShare ? 1 : 0);
  // Line ~234 par update karo
const thumbnailsCount = (mediaStream ? 1 : 0) + 
                       viewerCameras.size + 
                       (activeScreenShare ? 1 : 0) + 
                       (viewerScreenShare ? 1 : 0); // ✅ YEH ADD KARO

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

  // Automatic speaking detection functions
// ✅ IMPORTANT (top of component):
// const speakingAudioContextRef = useRef(null);
// const speakingSourceRef = useRef(null); // NEW: to disconnect source cleanly

const startStreamerSpeakingDetection = () => {
  if (!mediaStream || !socket) return;

  try {
    // Stop existing detection if any
    stopStreamerSpeakingDetection();

    // Get audio track
    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      addDebugLog("🎤 No audio track found for streamer speaking detection");
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;

    // ✅ Use separate AudioContext for speaking detection (NOT recording)
    speakingAudioContextRef.current = new AudioContext();

    // ✅ Keep a reference to source node so we can disconnect later
    speakingSourceRef.current =
      speakingAudioContextRef.current.createMediaStreamSource(mediaStream);

    analyserRef.current = speakingAudioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    analyserRef.current.smoothingTimeConstant = 0.8;

    speakingSourceRef.current.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let lastSpeakingState = false;
    let consecutiveSpeakingCount = 0;
    let consecutiveSilenceCount = 0;

    speakingDetectionIntervalRef.current = setInterval(() => {
      if (!analyserRef.current || !speakingAudioContextRef.current) return;

      try {
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const averageVolume = sum / dataArray.length;

        const isCurrentlySpeaking = averageVolume > speakingThreshold;

        // Debounce logic
        if (isCurrentlySpeaking) {
          consecutiveSpeakingCount++;
          consecutiveSilenceCount = 0;
        } else {
          consecutiveSilenceCount++;
          consecutiveSpeakingCount = 0;
        }

        const detectedSpeaking = consecutiveSpeakingCount >= 2;
        const detectedSilence = consecutiveSilenceCount >= 3;

        if (detectedSpeaking && !lastSpeakingState) {
          setIsSpeaking(true);
          socket.emit("user_speaking", {
            sessionId: sessionId || roomCode,
            isSpeaking: true,
          });
          lastSpeakingState = true;
          addDebugLog(`🎤 Streamer started speaking (volume: ${averageVolume.toFixed(1)})`);
        } else if (detectedSilence && lastSpeakingState) {
          setIsSpeaking(false);
          socket.emit("user_stopped_speaking", {
            sessionId: sessionId || roomCode,
          });
          lastSpeakingState = false;
          addDebugLog(`🎤 Streamer stopped speaking (volume: ${averageVolume.toFixed(1)})`);
        }
      } catch (error) {
        console.error("Streamer speaking detection error:", error);
      }
    }, 300);

    addDebugLog("🎤 Streamer speaking detection started");
  } catch (error) {
    console.error("Error starting streamer speaking detection:", error);
    addDebugLog(`❌ Streamer speaking detection error: ${error.message}`);
  }
};

const stopStreamerSpeakingDetection = () => {
  if (speakingDetectionIntervalRef.current) {
    clearInterval(speakingDetectionIntervalRef.current);
    speakingDetectionIntervalRef.current = null;
  }

  // ✅ Disconnect source + analyser cleanly
  try { speakingSourceRef.current?.disconnect?.(); } catch {}
  speakingSourceRef.current = null;

  if (analyserRef.current) {
    try { analyserRef.current.disconnect?.(); } catch {}
    analyserRef.current = null;
  }

  // ✅ Close speaking AudioContext (NOT recording)
  if (speakingAudioContextRef.current) {
    speakingAudioContextRef.current.close().catch(() => {});
    speakingAudioContextRef.current = null;
  }

  // If currently speaking, emit stop event
  if (isSpeaking) {
    setIsSpeaking(false);
    if (socket) {
      socket.emit("user_stopped_speaking", {
        sessionId: sessionId || roomCode,
      });
    }
  }

  addDebugLog("🎤 Streamer speaking detection stopped");
};

const startSpeakingDetection = () => {
  if (!mediaStream || !socket) return;

  try {
    stopSpeakingDetection();

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      addDebugLog("🎤 No audio track found for speaking detection");
      return;
    }

    localAudioTrackRef.current = audioTracks[0];

    const AudioContext = window.AudioContext || window.webkitAudioContext;

    // ✅ Use separate AudioContext for speaking detection
    speakingAudioContextRef.current = new AudioContext();

    // Create media stream source from local track (only)
    const trackStream = new MediaStream([localAudioTrackRef.current]);
    speakingSourceRef.current =
      speakingAudioContextRef.current.createMediaStreamSource(trackStream);

    analyserRef.current = speakingAudioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    analyserRef.current.smoothingTimeConstant = 0.8;

    speakingSourceRef.current.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let lastSpeakingState = false;
    let consecutiveSpeakingCount = 0;
    let consecutiveSilenceCount = 0;

    speakingDetectionIntervalRef.current = setInterval(() => {
      if (!analyserRef.current || !speakingAudioContextRef.current) return;

      try {
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const averageVolume = sum / dataArray.length;

        const isCurrentlySpeaking = averageVolume > speakingThreshold;

        if (isCurrentlySpeaking) {
          consecutiveSpeakingCount++;
          consecutiveSilenceCount = 0;
        } else {
          consecutiveSilenceCount++;
          consecutiveSpeakingCount = 0;
        }

        const detectedSpeaking = consecutiveSpeakingCount >= 2;
        const detectedSilence = consecutiveSilenceCount >= 3;

        if (detectedSpeaking && !lastSpeakingState) {
          setIsSpeaking(true);
          socket.emit("user_speaking", {
            sessionId: sessionId || roomCode,
            isSpeaking: true,
          });
          lastSpeakingState = true;
          addDebugLog(`🎤 Streamer started speaking (volume: ${averageVolume.toFixed(1)})`);
        } else if (detectedSilence && lastSpeakingState) {
          setIsSpeaking(false);
          socket.emit("user_stopped_speaking", {
            sessionId: sessionId || roomCode,
          });
          lastSpeakingState = false;
          addDebugLog(`🎤 Streamer stopped speaking (volume: ${averageVolume.toFixed(1)})`);
        }
      } catch (error) {
        console.error("Speaking detection error:", error);
      }
    }, 300);

    addDebugLog("🎤 Automatic speaking detection started for streamer");
  } catch (error) {
    console.error("Error starting speaking detection:", error);
    addDebugLog(`❌ Speaking detection error: ${error.message}`);
  }
};

const stopSpeakingDetection = () => {
  if (speakingDetectionIntervalRef.current) {
    clearInterval(speakingDetectionIntervalRef.current);
    speakingDetectionIntervalRef.current = null;
  }

  // ✅ Disconnect source + analyser cleanly
  try { speakingSourceRef.current?.disconnect?.(); } catch {}
  speakingSourceRef.current = null;

  if (analyserRef.current) {
    try { analyserRef.current.disconnect?.(); } catch {}
    analyserRef.current = null;
  }

  // ✅ Close speaking AudioContext
  if (speakingAudioContextRef.current) {
    speakingAudioContextRef.current.close().catch(() => {});
    speakingAudioContextRef.current = null;
  }

  if (isSpeaking) {
    setIsSpeaking(false);
    if (socket) {
      socket.emit("user_stopped_speaking", {
        sessionId: sessionId || roomCode,
      });
    }
  }

  addDebugLog("🎤 Speaking detection stopped");
};

// Hand control functions
const lowerHandForUser = (userId) => {
  emitSocketEvent('lower_hand', {
    sessionId: sessionId || roomCode,
    targetUserId: userId
  });
  
  toast.info('Hand lowered for user');
  addDebugLog(`✋ Hand lowered for user: ${userId}`);
};

const lowerAllHands = () => {
  if (window.confirm('Lower all raised hands?')) {
    emitSocketEvent('lower_all_hands', {
      sessionId: sessionId || roomCode
    });
    
    setHandRaisedUsers([]);
    toast.success('All hands lowered');
    addDebugLog('🛑 All hands lowered');
  }
};


const startScreenCapture = async (purpose = "share") => {
  try {
    // ✅ Always prefer ref (state async hota hai)
    if (screenCaptureStreamRef.current) {
      addDebugLog(`✅ Reusing existing screen capture (ref) for ${purpose}`);
      return screenCaptureStreamRef.current;
    }

    addDebugLog(`🖥️ Starting new screen capture for ${purpose}`);

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: true,
    });

    // ✅ Set ref FIRST (race-proof)
    screenCaptureStreamRef.current = stream;

    // ✅ Then state
    setScreenCaptureStream(stream);
    setScreenCaptureActive(true);

    // ✅ Track end handler (use refs, not stale state)
    const videoTrack = stream.getVideoTracks?.()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        addDebugLog("🛑 Screen capture ended by system UI");

        // If recording is running -> stop recording
        if (isRecordingRef.current) {
          stopRecording();
        }

        // If streamer share is running -> stop screen share
        if (activeScreenShareRef.current?.source === "streamer") {
          stopScreenShare();
        }

        // Cleanup capture
        cleanupScreenCapture(true);
      };
    }

    addDebugLog(`✅ Screen capture started successfully for ${purpose}`);
    return stream;
  } catch (error) {
    console.error("❌ Screen capture failed:", error);
    toast.error(`Failed to capture screen for ${purpose}`);
    return null;
  }
};

const getOrCreateCapture = async (purpose) => {
  return screenCaptureStreamRef.current || (await startScreenCapture(purpose));
};


useEffect(() => {
  isRecordingRef.current = isRecording;
}, [isRecording]);

useEffect(() => { activeScreenShareRef.current = activeScreenShare; }, [activeScreenShare]);

useEffect(() => { screenCaptureActiveRef.current = screenCaptureActive; }, [screenCaptureActive]);

useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

useEffect(() => {
  screenCaptureStreamRef.current = screenCaptureStream;
}, [screenCaptureStream]);

useEffect(() => {
  userInteractedRef.current = userInteracted;
}, [userInteracted]);

useEffect(() => {
  if (mediaStream && socket && isConnected && audioEnabled) {
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      startStreamerSpeakingDetection();
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [mediaStream, socket, isConnected, audioEnabled]);

// Media stream milte hi speaking detection start karen
useEffect(() => {
  if (mediaStream && socket && isConnected) {
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      startSpeakingDetection();
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [mediaStream, socket, isConnected]);

// Cleanup on component unmount
useEffect(() => {
  return () => {
    stopSpeakingDetection();
  };
}, []);

useEffect(() => {
  showAudioPermissionModalRef.current = showAudioPermissionModal;
}, [showAudioPermissionModal]);


const handleOpenWhiteboard = useCallback(() => {
  if (showWhiteboard) {
    handleCloseWhiteboard();
    return;
  }

  const whiteboardInfo = {
    title: session?.title || "Collaborative Whiteboard",
    roomCode: session?.roomCode || roomCode,
    streamerName: user?.name || "Streamer",
    sessionId: sessionId || roomCode,
    wsToken: token,
    allowViewersToDraw: true,
    isStreamer: true
  };

  setWhiteboardSessionInfo(whiteboardInfo);
  setShowWhiteboard(true);
  setZoomed({ type: "whiteboard", userId: "whiteboard", stream: null });
}, [showWhiteboard, session, roomCode, user, token, sessionId]); // Dependencies add karein [cite: 136, 137, 250, 256]

// ✅ CLOSE WHITEBOARD
const handleCloseWhiteboard = () => {
  setShowWhiteboard(false);
  // ✅ Cleanup ke baad hi session info null karo
  setTimeout(() => {
    setWhiteboardSessionInfo(null);
  }, 100);
  setZoomed(null);
  addDebugLog("📝 Whiteboard closed");
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

    // 1) If any active share stream exists -> record from it
    if (activeScreenShareRef.current?.stream) {
      addDebugLog(`📺 Recording from active screen share: ${activeScreenShareRef.current.userName || ""}`);
      await startRecordingFromScreenShare(activeScreenShareRef.current.stream);
      return;
    }

    // 2) Otherwise -> ensure we have ONE capture stream (NO produce)
    const capture = await getOrCreateCapture("record");
    if (!capture) throw new Error("Screen capture failed");

    addDebugLog("🎬 Recording from capture stream (record-first flow)");
    await startRecordingFromScreenShare(capture);

  } catch (error) {
    console.error("Failed to start recording:", error);
    toast.error("Failed to start recording");
    setIsRecording(false);
  } finally {
    setIsRecordingLoading(false);
  }
};


// ✅ UPDATED: Recording start that supports late viewer audio mixing too
// Key changes:
// 1) Initializes shared mixer via getMixedAudioStream() (sets audioContextRef + destination)
// 2) Ensures AudioContext is resumed (some browsers start it suspended)
// 3) Uses mixed audio track as main audio (fallback to mic if mixing fails)
// 4) Stores recordingStream cleanly

const startRecordingFromScreenShare = async (screenShareStream) => {
  try {
    setIsRecordingLoading(true);

    // =========================
    // 1) Get Streamer Mic Stream
    // =========================
    let currentMicStream = null;

    if (mediaStream?.getAudioTracks?.().length > 0) {
      currentMicStream = mediaStream;
    } else {
      try {
        currentMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.warn("Mic not found for recording");
      }
    }

    // =========================
    // 2) Build / Init shared audio mixer
    //    (Streamer mic + Screen audio + Existing viewers)
    //    Later viewers will be added in handleAudioConsumer() because refs exist now.
    // =========================
    const mixedAudioTrack = getMixedAudioStream(screenShareStream, currentMicStream);

    // ✅ Resume AudioContext if suspended (important on some browsers)
    try {
      if (recordingAudioContextRef.current?.state === "suspended") {
        await recordingAudioContextRef.current.resume();
        addDebugLog("🔊 Recording mixer AudioContext resumed");
      }
    } catch (e) {
      console.warn("AudioContext resume failed:", e);
    }

    // =========================
    // 3) Prepare Recording Stream
    // =========================
    const streamForRecording = new MediaStream();

    // ---- Video: use original screen video track
    const videoTrack = screenShareStream?.getVideoTracks?.()[0];
    if (videoTrack && "contentHint" in videoTrack) {
      videoTrack.contentHint = "motion";
      addDebugLog("🎬 Screen video: contentHint 'motion' applied for recording");
    }
    if (videoTrack) {
      streamForRecording.addTrack(videoTrack);
    } else {
      console.warn("❌ No screen video track found for recording");
    }

    // ---- Optional: screen audio track hint (doesn't get added directly; we mix it)
    const screenAudioTrack = screenShareStream?.getAudioTracks?.()[0];
    if (screenAudioTrack && "contentHint" in screenAudioTrack) {
      screenAudioTrack.contentHint = "music";
      addDebugLog("🎬 Screen audio: contentHint 'music' applied");
    }

    // ---- Audio: prefer mixed track
    if (mixedAudioTrack) {
      if ("contentHint" in mixedAudioTrack) {
        mixedAudioTrack.contentHint = "music";
      }
      streamForRecording.addTrack(mixedAudioTrack);
      addDebugLog("🎚️ Recording audio: using MIXED track (screen + mic + viewers)");
    } else {
      // Fallback to mic only
      const micTrack = currentMicStream?.getAudioTracks?.()[0] || null;
      if (micTrack) {
        if ("contentHint" in micTrack) {
          micTrack.contentHint = "speech";
          addDebugLog("🎬 Mic audio: contentHint 'speech' applied for recording");
        }
        streamForRecording.addTrack(micTrack);
        addDebugLog("🎚️ Recording audio: mixing failed, using MIC fallback");
      } else {
        addDebugLog("⚠️ Recording audio: no mixed track, no mic track (audio will be missing)");
      }
    }

    // =========================
    // 4) Start MediaRecorder
    // =========================
    startMediaRecorder(streamForRecording, screenShareStream, null);

    // =========================
    // 5) State updates
    // =========================
    setRecordingStream(streamForRecording);
    setIsRecording(true);
    setIsRecordingLoading(false);
    startRecordingTimer();

    toast.success("🎬 Recording Started (Mixer Ready for Viewers Audio)!");
  } catch (error) {
    console.error("Error starting recording:", error);
    toast.error("Failed to start recording");
    setIsRecordingLoading(false);
  }
};

const startNewScreenShareWithRecording = async () => {
  try {
    // 1) Ensure we have ONE capture stream (no direct getDisplayMedia here)
    addDebugLog("🎬 Preparing screen capture for recording (no produce/event)...");
    const screenStream =
      screenCaptureStreamRef.current || (await startScreenCapture("record"));

    if (!screenStream) throw new Error("Screen capture failed");

    // Keep ref in sync (if you don't already in startScreenCapture)
    screenCaptureStreamRef.current = screenStream;
    // Optional: if your startScreenCapture doesn't set state, do it here:
    // setScreenCaptureStream(screenStream);
    // setScreenCaptureActive(true);

    // 2) Microphone track (do NOT stop if it's from existing mediaStream)
    let micTrack = null;
    let shouldStopMicTrack = false;

    if (mediaStream && mediaStream.getAudioTracks().length > 0) {
      addDebugLog("🎤 Using existing microphone track for recording");
      micTrack = mediaStream.getAudioTracks()[0]; // ✅ no cloning
      shouldStopMicTrack = false;
    } else {
      try {
        addDebugLog("🎤 Requesting new microphone permission");
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micTrack = micStream.getAudioTracks()[0];
        shouldStopMicTrack = true; // ✅ only stop if we created it
      } catch (micError) {
        addDebugLog("⚠️ Mic permission denied or not available for recording");
      }
    }

    // 3) IMPORTANT CHANGE:
    // ❌ Do NOT call startScreenShareForParticipants(screenStream) here.
    // ✅ Participants share (produce + socket event) only when user clicks actual "Screen Share" button.
    addDebugLog("🧠 Capture ready for recording. Participants share will start only on ScreenShare click.");

    // 4) Build recording stream (screen video + screen audio + mic audio)
    const recordingStream = new MediaStream();

    // Screen video
    screenStream.getVideoTracks().forEach((t) => recordingStream.addTrack(t));

    // Screen/system audio (if available)
    screenStream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));

    // Mic audio (if available)
    if (micTrack) recordingStream.addTrack(micTrack);

    // 5) Start recorder
    startMediaRecorder(recordingStream, screenStream, null);

    // State updates
    setRecordingStream(recordingStream);
    setIsRecording(true);
    startRecordingTimer();
    toast.success("🎬 Screen recording started!");

    // 6) Handle capture stop from browser UI ("Stop sharing")
    const videoTrack = screenStream.getVideoTracks?.()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        addDebugLog("🖥️ Screen capture ended by system UI");

        // If capture ends, recording source ends => stop recording
        stopRecording();

        // If audience screen share was ON, stop it too
        if (activeScreenShareRef.current?.source === "streamer") {
          stopScreenShare();
        }

        // Cleanup mic only if we created a separate mic stream
        if (shouldStopMicTrack && micTrack && micTrack.readyState === "live") {
          micTrack.stop();
        }

        // Force cleanup capture (since it ended anyway)
        // (only if you have cleanupScreenCapture(force))
        if (typeof cleanupScreenCapture === "function") {
          cleanupScreenCapture(true);
        }
      };
    }
  } catch (error) {
    console.error("Error starting new screen share with recording:", error);
    toast.error("Failed to start recording");
    setIsRecording(false);
  } finally {
    setIsRecordingLoading(false);
  }
};

const startScreenShareForParticipants = async (screenStream) => {
  if (!sendTransportRef.current || !user) return;

  try {
    const videoTrack = screenStream.getVideoTracks()[0];
    if (!videoTrack) return;

    if ("contentHint" in videoTrack) {
      videoTrack.contentHint = "motion";
    }

    try {
      await videoTrack.applyConstraints({
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        resizeMode: "crop-and-scale",
      });
    } catch (e) {
      addDebugLog(`⚠️ Screen constraint lock failed: ${e.message}`);
    }

    let videoProducer;
    try {
      videoProducer = await sendTransportRef.current.produce({
        track: videoTrack,
        stopTracks: false,
        appData: {
          source: "screen",
          userId: user.id,
          userName: user.name || "Streamer",
        },
        encodings: [
          { maxBitrate: 350_000, scaleResolutionDownBy: 2 },
          { maxBitrate: 1_500_000, scaleResolutionDownBy: 1 },
        ],
        codecOptions: { videoGoogleStartBitrate: 800 },
      });
    } catch (simulcastErr) {
      videoProducer = await sendTransportRef.current.produce({
        track: videoTrack,
        stopTracks: false,
        appData: {
          source: "screen",
          userId: user.id,
          userName: user.name || "Streamer",
        },
        encodings: [{ maxBitrate: 900_000 }],
        codecOptions: { videoGoogleStartBitrate: 600 },
      });
    }

    // ✅ FIX 1: VIDEO PRODUCER KO SAVE KARO
    if (videoProducer) {
      producers.current.set(videoProducer.id, videoProducer);
      setProducersState((prev) => new Map(prev).set(videoProducer.id, {
        id: videoProducer.id,
        kind: 'video',
        paused: false,
        source: 'screen'
      }));
      addDebugLog(`✅ Screen share VIDEO producer saved: ${videoProducer.id}`);
    }

    const audioTrack = screenStream.getAudioTracks()[0];
    if (audioTrack) {
      if ("contentHint" in audioTrack) {
        audioTrack.contentHint = "music";
      }

      const audioProducer = await sendTransportRef.current.produce({
        track: audioTrack,
        stopTracks: false,
        appData: {
          source: "screen-audio",
          userId: user.id,
          userName: user.name || "Streamer",
        },
      });
      
      // ✅ FIX 2: AUDIO PRODUCER KO SAVE KARO
      if (audioProducer) {
        producers.current.set(audioProducer.id, audioProducer);
        setProducersState((prev) => new Map(prev).set(audioProducer.id, {
          id: audioProducer.id,
          kind: 'audio',
          paused: false,
          source: 'screen-audio'
        }));
        addDebugLog(`✅ Screen share AUDIO producer saved: ${audioProducer.id}`);
      }
    }

    setActiveScreenShare({
      userId: user.id,
      userName: user.name || "Streamer",
      stream: screenStream,
      source: "streamer",
    });

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
      videoBitsPerSecond: 1000000, 
      audioBitsPerSecond: 128000,
    };

    // ✅ 3. Lock Resolution & FPS (Crucial for performance)
    if (videoTrack) {
      try {
        videoTrack.applyConstraints({
          frameRate: { ideal: 24, max: 30 }, // 60fps causes lag, use 30
          width: { ideal: 1280, max: 1280 }, // 720p is efficient
          height: { ideal: 720, max: 720 },
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
    mediaRecorder.start(6000);
    setRecorder(mediaRecorder);

  } catch (error) {
    console.error("Failed to start recorder:", error);
    toast.error("Recording failed to start");
    setIsRecording(false);
    setIsRecordingLoading(false);
  }
};
const cleanupScreenCapture = (force = false) => {
  const stream = screenCaptureStreamRef.current;

  if (stream) {
    try {
      stream.getTracks().forEach((track) => {
        if (track.readyState === "live") track.stop();
      });
    } catch (e) {
      console.warn("cleanupScreenCapture stop tracks error:", e);
    }
  }

  // ✅ Always clear ref + state
  screenCaptureStreamRef.current = null;
  setScreenCaptureStream(null);
  setScreenCaptureActive(false);

  addDebugLog(force ? "🧹 Screen capture cleaned up (force)" : "🧹 Screen capture cleaned up");
};
const stopScreenShare = useCallback(() => {
  addDebugLog("🛑 Stopping screen share...");

  const recordingOn = isRecordingRef.current;

  // 1) Socket notify (only if streamer share was active)
  if (socket && activeScreenShareRef.current?.source === "streamer") {
    socket.emit("streamer-screen-share-stop", {
      sessionId: sessionId || roomCode,
      userId: user?.id,
      source: "streamer",
    });
  }

  // 2) Close screen producers (screen + screen-audio)
  producers.current.forEach((producer, id) => {
    const src = producer?.appData?.source;
    if (src === "screen" || src === "screen-audio") {
      try { producer.close(); } catch (err) {
        addDebugLog(`⚠️ Error closing producer: ${err?.message || err}`);
      }
      producers.current.delete(id);

      setProducersState((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    }
  });

  // 3) Reset active share UI state
  setActiveScreenShare(null);

  // 4) ✅ Capture cleanup ONLY if recording is NOT running
  if (!recordingOn && screenCaptureActiveRef.current) {
    addDebugLog("🧹 Cleaning up screen capture (no active recording)");
    cleanupScreenCapture();
    toast.success("Screen share stopped");
  } else {
    toast.info(recordingOn ? "Screen share stopped (recording continues)" : "Screen share stopped");
  }

  // 5) Reset zoom if it was showing screen
  setZoomed((prev) => (prev?.type === "screen" ? null : prev));

}, [socket, sessionId, roomCode, user, cleanupScreenCapture]);

const stopRecording = useCallback(async () => {
  if (!recorder || recorder.state === "inactive") return;

  try {
    addDebugLog("⏹️ Stopping recording...");
    setIsRecordingStopping(true);

    // ✅ Stop recorder first (async "onstop" will fire later)
    if (recorder.state === "recording") {
      recorder.stop();
    }

    stopRecordingTimer();

    // =========================
    // ✅ 1) Disconnect recording mixer nodes (viewer-mic + viewer-screen-audio)
    // =========================
    try {
      if (window.recordingAudioSources && window.recordingAudioSources.size > 0) {
        addDebugLog(
          `🧹 Disconnecting ${window.recordingAudioSources.size} recording audio sources...`
        );

        window.recordingAudioSources.forEach((obj) => {
          try { obj.source?.disconnect?.(); } catch {}
          try { obj.gainNode?.disconnect?.(); } catch {}
        });

        window.recordingAudioSources.clear();
      }
    } catch (e) {
      console.warn("Failed to disconnect recordingAudioSources:", e);
    }

    // =========================
    // ✅ 2) Stop recording stream tracks
    // =========================
    if (recordingStream) {
      try {
        recordingStream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
      } catch (e) {
        console.warn("Failed stopping recordingStream tracks:", e);
      }
      setRecordingStream(null);
    }

    // =========================
    // ✅ 3) Close RECORDING AudioContext (NOT speaking-detection one)
    // =========================
    if (recordingAudioContextRef.current) {
      try {
        // destination disconnect
        try { recordingDestinationRef.current?.disconnect?.(); } catch {}

        await recordingAudioContextRef.current.close();
      } catch (e) {
        console.warn("Recording AudioContext close failed:", e);
      } finally {
        recordingAudioContextRef.current = null;
        recordingDestinationRef.current = null;
      }
    }

    // =========================
    // ✅ 4) If screen share not running, cleanup capture
    // =========================
    if (!activeScreenShare && screenCaptureActive) {
      addDebugLog("🧹 Cleaning up screen capture (no active screen share)");
      cleanupScreenCapture();
    }

    // =========================
    // ✅ 5) Update UI state
    // =========================
    setIsRecording(false);
    setRecordingSource(null);

    // Keep same behavior as your current code
    stopScreenShare();

    toast.info("Processing recording...");
  } catch (error) {
    console.error("Error stopping recording:", error);
    toast.error("Error stopping recording");
  } finally {
    setIsRecordingStopping(false);
  }
}, [
  recorder,
  recordingStream,
  activeScreenShare,
  screenCaptureActive,
  cleanupScreenCapture,
  stopScreenShare,
  stopRecordingTimer,
]);



// const stopScreenShare = useCallback(() => {
//   addDebugLog("🛑 Stopping screen share...");

//   const recordingOn = isRecordingRef.current;

//   // 1) Socket notify (only if streamer share was active)
//   if (socket) {
//     socket.emit("streamer-screen-share-stop", {
//       sessionId: sessionId || roomCode,
//       userId: user?.id,
//       source: "streamer",
//     });
//   }

//   // 2) Close screen producers (screen + screen-audio)
//   producers.current.forEach((producer, id) => {
//     const src = producer?.appData?.source;
//     if (src === "screen" || src === "screen-audio") {
//       try { producer.close(); } catch (err) {
//         addDebugLog(`⚠️ Error closing producer: ${err?.message || err}`);
//       }
//       producers.current.delete(id);

//       // ✅ YEH LINE ADD KI GAYI HAI: Backend ko explicitly notify karo ki producer close kare
//       emitSocketEvent('producer-close', {
//         sessionId: sessionId || roomCode,
//         producerId: id
//       });

//       setProducersState((prev) => {
//         const m = new Map(prev);
//         m.delete(id);
//         return m;
//       });
//     }
//   });

//   // 3) Reset active share UI state
//   setActiveScreenShare(null);

//   // 4) ✅ Capture cleanup ONLY if recording is NOT running
//   if (!recordingOn && screenCaptureActiveRef.current) {
//     addDebugLog("🧹 Cleaning up screen capture (no active recording)");
//     cleanupScreenCapture();
//     toast.success("Screen share stopped");
//   } else {
//     toast.info(recordingOn ? "Screen share stopped (recording continues)" : "Screen share stopped");
//   }

//   // 5) Reset zoom if it was showing screen
//   setZoomed((prev) => (prev?.type === "screen" ? null : prev));
// }, [socket, sessionId, roomCode, user, cleanupScreenCapture]);
const handleStreamerScreenShareClick = async () => {
  try {
    if (activeScreenShareRef.current?.source === "streamer") {
      stopScreenShare();
      return;
    }

    const capture = await getOrCreateCapture("share");
    if (!capture) return;

    await startScreenShareForParticipants(capture);

    // ✅ Naya Trigger: Modal dikhayein taaki user click kare aur hum mute kar sakein
    setShowEchoSync(true); 

    // ✅ Safety: Turant mute karne ki koshish (agar browser allow kare)
    if (screenRef.current) {
        screenRef.current.muted = true;
        screenRef.current.volume = 0;
        screenRef.current.setAttribute("muted", "true");

    }

    setZoomed({ type: "screen", stream: capture, userId: user?.id });
  } catch (e) {
    console.error("handleStreamerScreenShareClick error:", e);
    toast.error("Failed to start screen share");
  }
};

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
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    // ✅ 1) Create (or reuse) ONE shared audio context for RECORDING only
    if (!recordingAudioContextRef.current) {
      recordingAudioContextRef.current = new AudioContext();
    }
    const audioContext = recordingAudioContextRef.current;

    // ✅ 2) Create (or reuse) ONE shared destination for RECORDING only
    if (!recordingDestinationRef.current) {
      recordingDestinationRef.current = audioContext.createMediaStreamDestination();
    }
    const destination = recordingDestinationRef.current;

    // ✅ 3) Map to prevent duplicate connections (recommended)
    if (!window.recordingAudioSources) {
      window.recordingAudioSources = new Map();
    }

    const safeConnect = (key, stream, gainValue = 1.0) => {
      if (!stream || stream.getAudioTracks?.().length === 0) return;

      // prevent duplicates
      if (window.recordingAudioSources.has(key)) return;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = gainValue;

      source.connect(gainNode).connect(destination);
      window.recordingAudioSources.set(key, { source, gainNode, type: "mixer" });
    };

    // ✅ 4) Mix Streamer Mic (always)
    safeConnect("streamer-mic", micStream, 1.0);

    // ✅ 5) Mix Streamer Screen Audio (if present)
    safeConnect("streamer-screen-audio", screenStream, 0.5);

    // ✅ 6) Mix existing Viewers Audio (skip streamer's own consumed audio)
    const audioEntries = Array.from(viewerAudiosRef.current?.entries?.() || []);
    audioEntries.forEach(([audioKey, stream]) => {
      try {
        const parts = String(audioKey).split("-");
        const userId = parts[parts.length - 1];

        // ✅ Skip streamer's own loopback
        if (userId && user?.id && String(userId) === String(user?.id)) return;

        safeConnect(`viewer-${audioKey}`, stream, 0.8);
      } catch (e) {
        console.warn("Failed mixing viewer audio entry:", audioKey, e);
      }
    });

    // ✅ Return single mixed track to attach in recording stream
    const mixedTrack = destination.stream.getAudioTracks?.()[0] || null;
    return mixedTrack;
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
  if (!activeScreenShare?.stream) return;

  const alreadyOnSameScreen =
    zoomed?.type === "screen" && zoomed?.userId === activeScreenShare.userId;

  if (!alreadyOnSameScreen) {
    addDebugLog(`🔄 Auto-zooming to ${activeScreenShare.source} screen share`);
    setZoomed({
      type: "screen",
      stream: activeScreenShare.stream,
      userId: activeScreenShare.userId
    });
  }
}, [activeScreenShare?.stream, activeScreenShare?.userId, activeScreenShare?.source]);


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
  // =========================
  // 0) Normalize sourceType (Viewer Mic aur Screen Audio ko identify karein)
  // =========================
  const normalizedSourceType =
    sourceType === "screen-audio" ||
    sourceType === "viewer-screen-audio" ||
    sourceType === "viewer-screen_audio" ||
    sourceType === "screen_audio"
      ? "viewer-screen-audio"
      : "viewer-mic";

  const audioStream = new MediaStream([audioTrack]);
  const userId = producerInfo.userId;
  const userName = producerInfo.userName || `User ${userId}`;
  const audioKey = `${normalizedSourceType}-${userId}`;

  addDebugLog(`🎵 Processing audio consumer: ${userId} (${normalizedSourceType})`);

  // =========================
  // 1) UI & LOCAL PLAYBACK (Streamer ko viewer ki awaaz sunne ke liye)
  // =========================
  const existingAudioEl = audioElementsRef.current.get(audioKey);

  const safeReplaceAudioElementStream = (audioEl, newStream) => {
    try {
      if (audioEl?.srcObject) audioEl.srcObject = null;
      audioEl.srcObject = newStream;

      if (userInteractedRef.current) {
        audioEl.play().catch((err) => {
          if (err?.name !== "NotAllowedError") {
            addDebugLog(`⚠️ Playback failed for ${userId}: ${err.message}`);
          }
        });
      } else {
        // Agar user ne interact nahi kiya, toh queue mein daalein
        pendingAudioQueueRef.current.set(audioKey, {
          userId,
          userName,
          audioStream: newStream,
          sourceType: normalizedSourceType,
          timestamp: Date.now(),
        });
        setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
      }
    } catch (e) {
      console.warn("Error in safeReplaceAudioElementStream:", e);
    }
  };

  if (existingAudioEl) {
    addDebugLog(`🔄 Updating existing audio element for ${userId}`);
    safeReplaceAudioElementStream(existingAudioEl, audioStream);
    viewerAudiosRef.current.set(audioKey, audioStream);
  } else {
    const audioElementId = `audio-${userId}-${normalizedSourceType}`;
    let audioEl = document.getElementById(audioElementId);

    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.id = audioElementId;
      audioEl.playsInline = true;
      audioEl.muted = false; // Streamer ko sunayi dena chahiye
      audioEl.setAttribute("data-user-id", userId);
      audioEl.setAttribute("data-source", normalizedSourceType);
      document.body.appendChild(audioEl);
    }

    safeReplaceAudioElementStream(audioEl, audioStream);
    audioElementsRef.current.set(audioKey, audioEl);
    viewerAudiosRef.current.set(audioKey, audioStream);

    if (normalizedSourceType === "viewer-mic") {
      setViewerAudios((prev) => new Map(prev).set(userId, audioStream));
    }
    addDebugLog(`✅ UI Setup complete for ${normalizedSourceType}`);
  }

  // =========================
  // 2) 🔥 RECORDING MIXER (Dynamic Injection)
  // =========================
  // Note: Hum state ki jagah Refs (isRecordingRef) use kar rahe hain kyunki socket listeners
  // aksar closure mein purani state pakad lete hain.
  if (
    isRecordingRef.current &&
    recordingAudioContextRef.current &&
    recordingDestinationRef.current
  ) {
    try {
      // Mixer sources map initialize karein agar nahi hai
      if (!window.recordingAudioSources) window.recordingAudioSources = new Map();

      const sourceKey = `recording-${audioKey}`;

      // ✅ Reconnection Fix: Agar same source pehle se mixer mein hai, toh replace karein
      if (window.recordingAudioSources.has(sourceKey)) {
        const oldObj = window.recordingAudioSources.get(sourceKey);
        try { oldObj?.source?.disconnect(); } catch (e) {}
        try { oldObj?.gainNode?.disconnect(); } catch (e) {}
        window.recordingAudioSources.delete(sourceKey);
        addDebugLog(`🔁 Replacing mixer source for ${sourceKey}`);
      }

      // Recording AudioContext se source create karein
      const newSource = recordingAudioContextRef.current.createMediaStreamSource(audioStream);
      const gainNode = recordingAudioContextRef.current.createGain();

      // Volume settings: Mic thoda loud, Screen audio thoda kam (taki clarity rahe)
      gainNode.gain.value = normalizedSourceType === "viewer-mic" ? 0.8 : 0.6;

      // 🔥 Connect to the Recorder's Destination
      newSource.connect(gainNode).connect(recordingDestinationRef.current);

      // Store for cleanup during stopRecording
      window.recordingAudioSources.set(sourceKey, {
        source: newSource,
        gainNode,
        userId,
        type: normalizedSourceType
      });

      addDebugLog(`🎙️ Dynamic Mix Success: ${normalizedSourceType} of ${userName} added to Recorder`);

      // Track khatam hone par cleanup
      audioTrack.onended = () => {
        const obj = window.recordingAudioSources?.get(sourceKey);
        try { obj?.source?.disconnect(); } catch (e) {}
        try { obj?.gainNode?.disconnect(); } catch (e) {}
        window.recordingAudioSources?.delete(sourceKey);
        addDebugLog(`🧹 Recorder source removed (ended): ${sourceKey}`);
      };

    } catch (err) {
      console.error("Recording mix failed:", err);
      addDebugLog(`❌ Mixer Error: ${err.message}`);
    }
  } else {
    // Gate blocking debug log
    addDebugLog(
      `🧱 Mixer skip: isRecording=${isRecordingRef.current}, MixerCtx=${!!recordingAudioContextRef.current}`
    );
  }
};
const handleEndSession = async () => {

  // 👉 Agar recording chal rahi hai
  if (isRecording) {
    setShowEndSessionRecordingModal(true);
    return;   // ⛔ Direct session end mat karo — pehle modal dikhao
  }

  // 👉 Agar recording nahi chal rahi to normal end session
  actuallyEndSession();
};

const handleEnableAudio = () => {
  addDebugLog('🎵 User manually enabled audio - Syncing Echo Prevention');
  userInteractedRef.current = true;
  setUserInteracted(true);
  setShowAudioPermissionModal(false);

  // ✅ FIX: Agar Streamer khud screen share kar raha hai, to UI element ko MUTE karein
  // Taki speakers se awaaz na nikle aur mic mein wapas na jaye (Echo Loop Break)
  if (activeScreenShareRef.current?.source === "streamer" && screenRef.current) {
    screenRef.current.muted = true;
    screenRef.current.volume = 0;
    addDebugLog("🔇 Streamer local screen playback muted via gesture");
  }

  // Baaki sab audio (viewers) ko play karein
  playAllAudio();
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

  setViewerScreenShare(prev => {
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
    `🛑 Screen share stopped: ${data.userId}, source: ${data.source}`
  );

  // ✅ Only handle VIEWER screen stop here
  if (data.source !== "viewer-screen") {
    addDebugLog(`ℹ️ Ignored stop event (not viewer-screen): ${data.source}`);
    return;
  }

  // ✅ Reset zoom if viewer screen was zoomed
  setZoomed((prev) => {
    if (
      prev &&
      (prev.type === "viewer-screen" || prev.type === "screen") &&
      prev.userId === data.userId
    ) {
      addDebugLog(`🔄 Resetting zoom for stopped viewer: ${data.userId}`);
      return null;
    }
    return prev;
  });

  // ✅ Clear viewer screen share state ONLY
  setViewerScreenShare((prev) => {
    if (prev?.stream) {
      try {
        prev.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping viewer screen tracks", e);
      }
    }
    return null;
  });

  // ✅ Clear viewer screen element if you use separate ref
  if (viewerScreenRef?.current) {
    try {
      viewerScreenRef.current.srcObject = null;
      viewerScreenRef.current.load?.();
    } catch (e) {
      console.warn("Error clearing viewerScreenRef", e);
    }
  }

  addDebugLog(`✅ Viewer screen share cleared for viewer: ${data.userId}`);
}, [setZoomed, setViewerScreenShare]);


const handleViewerScreenShareStopped = useCallback((data) => {
  addDebugLog(`🛑 Viewer screen share stopped: ${data.userId}`);
  
  // ✅ Clear viewer screen share state
  setViewerScreenShare(null);
  
  // ✅ Cleanup viewer screen stream
  if (viewerScreenShare?.stream) {
    try {
      viewerScreenShare.stream.getTracks().forEach((track) => {
        if (track.readyState === 'live') track.stop();
      });
    } catch (e) {
      console.warn("Error stopping viewer screen tracks", e);
    }
  }
  
  // ✅ Cleanup viewer screen audio
  const audioElementId = `audio-${data.userId}-viewer-screen-audio`;
  const audioEl = document.getElementById(audioElementId);
  if (audioEl) {
    audioEl.pause();
    audioEl.srcObject = null;
    if (audioEl.parentNode) {
      audioEl.parentNode.removeChild(audioEl);
    }
  }
  
  // ✅ Reset zoom if this viewer's screen was zoomed
  setZoomed((prev) => {
    if (prev && prev.type === "screen" && prev.userId === data.userId) {
      addDebugLog(`🔄 Resetting zoom for stopped viewer screen: ${data.userId}`);
      return null;
    }
    return prev;
  });
  
  addDebugLog(`✅ Viewer screen share cleared for user: ${data.userId}`);
}, [viewerScreenShare]);

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

    // ✅ Skip if EXACT same producerId consumer already exists
    if (consumers.current.has(producerId)) {
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
          `📡 Producer info: kind=${info.kind}, userId=${info.userId}, source=${info.source}, userName=${info.userName}`
        );

        console.log("PRODUCER INFO RECEIVED:", {
          producerId,
          source: info.source,
          userId: info.userId,
          userName: info.userName,
          currentUser: user?.id,
          isAudio: info.kind === "audio",
        });

        // ✅ Skip self producers (never consume own stuff)
        const isSelfProducer = info.userId?.toString() === user?.id?.toString();
        if (isSelfProducer) {
          addDebugLog(`⏩ Skipping self producer: ${info.source} from ${info.userId}`);
          return;
        }

        // Store producer state (UI/debug)
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

        // Resolve recv transport
        let resolvedTransportId = transportId;
        if (!resolvedTransportId && recvTransportRef.current) {
          resolvedTransportId = recvTransportRef.current.id;
        }
        if (!resolvedTransportId) {
          addDebugLog("❌ No recv transport available for consumer");
          return;
        }

        socket.emit(
          "consume",
          {
            sessionId: currentSessionId,
            transportId: resolvedTransportId,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
          },
          async (response) => {
            if (response?.error || !response?.params) {
              addDebugLog(`❌ Failed to consume: ${response?.error || "No params"}`);
              return;
            }

            const consumerParams = response.params;
            const transport = transports.current.get(resolvedTransportId);
            if (!transport) {
              addDebugLog(`❌ No transport found for ID: ${resolvedTransportId}`);
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
                  userName: info.userName,
                  timestamp: Date.now(),
                },
              });

              // ✅ IMPORTANT: store by PRODUCER ID so skip-check works
              consumers.current.set(producerId, consumer);

              addDebugLog(`✅ Consumer created: ${consumer.id} (${info.source}) for user ${info.userId}`);

              // === HANDLE TRACK ===
              if (!consumer.track) {
                addDebugLog(`⚠️ Consumer created but no track: ${consumer.id} (${info.source})`);
              } else {
                // ===== 1) VIEWER SCREEN (VIDEO) =====
                if (info.source === "viewer-screen") {
                  const screenStream = new MediaStream([consumer.track]);

                  setViewerScreenShare({
                    userId: info.userId,
                    userName: info.userName || "Viewer",
                    stream: screenStream,
                    source: "viewer-screen",
                    producerId: producerId,
                    hasAudio: false,
                  });

                  addDebugLog(`📱 VIEWER screen share stored separately`);
                }

                // ===== 2) VIEWER SCREEN AUDIO =====
                else if (info.source === "viewer-screen-audio") {
                  // ✅ SINGLE PIPELINE: this function already handles
                  // - audio element create/play (userInteracted gate)
                  // - pending queue
                  // - adding to recording mix (viewer-screen-audio allowed)
                  handleAudioConsumer(consumer.track, info, "viewer-screen-audio");

                  // Optional: mark viewerScreenShare hasAudio (no need to keep separate audioStream here)
                  setViewerScreenShare((prev) => {
                    if (prev && prev.userId === info.userId) {
                      return { ...prev, hasAudio: true };
                    }
                    return prev;
                  });

                  addDebugLog(`🔊 Viewer screen-audio handled via handleAudioConsumer`);
                }

                // ===== 3) VIEWER MIC AUDIO =====
                else if (info.source === "viewer-mic") {
                  // ✅ Recommended: also route mic through same pipeline for consistency
                  // (If you want to keep your old code, you can, but this is cleaner)
                  handleAudioConsumer(consumer.track, info, "viewer-mic");
                  addDebugLog(`🎤 Viewer mic handled via handleAudioConsumer`);
                }

                // ===== 4) VIEWER CAMERA (VIDEO) =====
                else if (info.source === "viewer-camera") {
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
                }

                // ===== 5) Other sources =====
                else {
                  // If you later want to consume streamer screen on viewer side,
                  // handle it here (source "screen" and "screen-audio") as needed.
                  addDebugLog(`ℹ️ Unhandled source: ${info.source}, kind: ${consumer.track.kind}`);
                }
              }

              // Resume consumer
              socket.emit(
                "consumer-resume",
                { sessionId: currentSessionId, consumerId: consumer.id },
                (resumeResponse) => {
                  if (resumeResponse?.success) {
                    addDebugLog(`✅ Consumer ${consumer.id} resumed`);
                  } else {
                    addDebugLog(
                      `❌ Failed to resume consumer ${consumer.id}: ${resumeResponse?.error || "unknown"}`
                    );
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
        // setShowAudioPermissionModal(false);
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
      const newEnabledState = !audioTrack.enabled;
      audioTrack.enabled = newEnabledState;
      setAudioEnabled(newEnabledState);

      // Update producers
      Array.from(producersState.entries()).forEach(([id, producer]) => {
        if (producer.source === 'mic') {
          if (newEnabledState) {
            handleResumeProducer(id);
          } else {
            handlePauseProducer(id);
          }
        }
      });

      // 🎤 SPEAKING DETECTION CONTROL
      if (newEnabledState) {
        // Mic ON: Start speaking detection
        setTimeout(() => {
          startSpeakingDetection();
        }, 500); // Small delay to ensure audio track is ready
        
        // Also ensure speaking detection starts immediately for local state
        if (!audioContextRef.current) {
          // Force speaking detection initialization
          const initSpeakingDetection = () => {
            if (mediaStream && socket) {
              try {
                // Setup audio context
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();
                
                const audioTracks = mediaStream.getAudioTracks();
                if (audioTracks.length === 0) return;
                
                // Create media stream source
                const streamSource = audioContextRef.current.createMediaStreamSource(mediaStream);
                
                // Create analyser
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.smoothingTimeConstant = 0.8;
                
                // Connect source to analyser
                streamSource.connect(analyserRef.current);
                
                addDebugLog('🎤 Speaking detection audio context initialized');
              } catch (error) {
                console.error('Error initializing speaking detection:', error);
              }
            }
          };
          
          initSpeakingDetection();
        }
        
        addDebugLog(`🎤 Streamer mic ON - speaking detection started`);
      } else {
        // Mic OFF: Stop speaking detection
        stopSpeakingDetection();
        
        // Ensure we emit stop speaking event if currently speaking
        if (isSpeaking) {
          setIsSpeaking(false);
          if (socket) {
            socket.emit('user_stopped_speaking', {
              sessionId: sessionId || roomCode
            });
            addDebugLog(`🎤 Streamer stopped speaking due to mic off`);
          }
          
          // Also remove from local speaking state
          if (user?.id) {
            setSpeakingUsers(prev => {
              const newMap = new Map(prev);
              newMap.delete(user.id);
              return newMap;
            });
          }
        }
        
        addDebugLog(`🎤 Streamer mic OFF - speaking detection stopped`);
      }

      // Add toast notification
      toast.info(`Microphone ${newEnabledState ? 'enabled' : 'disabled'}`, {
        position: "bottom-right",
        autoClose: 2000,
      });
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
    // 0) Prefer existing capture stream (created by recording-first flow)
    let streamToShare = screenCaptureStreamRef.current;

    // 1) If capture already exists, reuse it (no new capture)
    if (streamToShare) {
      addDebugLog(
        isRecordingRef.current
          ? "🔄 Starting screen share from existing capture (recording already running)"
          : "🔄 Starting screen share from existing capture"
      );

      await startScreenShareForParticipants(streamToShare);

      setActiveScreenShare({
        userId: user.id,
        userName: user.name || "Streamer",
        stream: streamToShare,
        source: "streamer",
      });

      toast.success(
        isRecordingRef.current
          ? "📺 Screen sharing started (from recording capture)"
          : "📺 Screen sharing started"
      );
      return;
    }

    // 2) If no capture exists yet, start fresh capture for sharing
    addDebugLog("🆕 Starting fresh screen capture for sharing");
    const screenStream = await startScreenCapture("share");
    if (!screenStream) throw new Error("Screen capture failed");

    // keep ref in sync (if startScreenCapture already sets state, this is harmless)
    screenCaptureStreamRef.current = screenStream;

    await startScreenShareForParticipants(screenStream);

    setActiveScreenShare({
      userId: user.id,
      userName: user.name || "Streamer",
      stream: screenStream,
      source: "streamer",
    });

    toast.success("📺 Screen sharing started!");
  } catch (error) {
    console.error("Screen share error:", error);
    toast.error("Failed to start screen sharing");
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
  addDebugLog("✅ Using existing camera/microphone stream");

  // ✅ 1) Lock camera constraints BEFORE producing (prevents lag during recording)
  try {
    if (videoTrack && videoTrack.readyState === "live") {
      await videoTrack.applyConstraints({
        frameRate: { ideal: 30, max: 30 },   // ✅ smooth + stable
        width: { ideal: 1280, max: 1280 },   // ✅ 720p
        height: { ideal: 720, max: 720 },
      });
      addDebugLog("📷 Camera constraints applied: 720p @ 24–30fps (simulcast OFF)");
    }
  } catch (err) {
    addDebugLog(`⚠️ Camera constraints failed: ${err?.message || err}`);
  }


  
  // ✅ STEP 2: ADD contentHint HERE (IMPORTANT)
  if (videoTrack && "contentHint" in videoTrack) {
    videoTrack.contentHint = "motion";   // smooth motion encoding
    addDebugLog("🎬 Camera contentHint set to motion");
  }
  // ✅ 2) Produce CAMERA VIDEO (Simulcast OFF)
  const videoProducer = await transport.produce({
    track: videoTrack,

    stopTracks: false, // ✅ important: producer close se local track stop na ho

    appData: { source: "camera", userId: user?.id },

    // ✅ Simulcast REMOVED: NO encodings

    codecOptions: {
      videoGoogleStartBitrate: 400,
      videoGoogleMinBitrate: 150,
      videoGoogleMaxBitrate: 700,
      videoCodingMode: "realtime",
    },
  });

  producers.current.set(videoProducer.id, videoProducer);
  setProducersState((prev) =>
    new Map(prev).set(videoProducer.id, {
      id: videoProducer.id,
      kind: "video",
      paused: false,
      source: "camera",
    })
  );
  addDebugLog(`✅ Video producer created (NO simulcast): ${videoProducer.id}`);

  // ✅ 3) Produce MIC AUDIO (as-is, but add stopTracks false for safety)
  const audioProducer = await transport.produce({
    track: audioTrack,
    stopTracks: false, // ✅ safe
    appData: { source: "mic", userId: user?.id },
  });

  producers.current.set(audioProducer.id, audioProducer);
  setProducersState((prev) =>
    new Map(prev).set(audioProducer.id, {
      id: audioProducer.id,
      kind: "audio",
      paused: false,
      source: "mic",
    })
  );
  addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

  setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
  setIsInitializing(false);
  setIsLoading(false);

  setTimeout(() => {
    if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
      videoRef.current.play().catch((error) => {
        console.log("Post-producer autoplay prevented:", error);
        setShowPlayButton(true);
      });
    }
  }, 500);

}  catch (error) {
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

  // सिर्फ स्क्रीन शेयर audio के लिए
const cleanupScreenShareAudio = (userId) => {
  addDebugLog(`🧹 Cleaning up screen share audio for user: ${userId}`);
  
  // सिर्फ screen-audio elements हटाएं
  const screenAudioElements = document.querySelectorAll(
    `[data-screen-audio-user="${userId}"], #viewer-screen-share-audio-${userId}`
  );
  
  screenAudioElements.forEach(screenAudioEl => {
    try {
      screenAudioEl.pause();
      if (screenAudioEl.srcObject) {
        screenAudioEl.srcObject.getTracks().forEach(track => track.stop());
        screenAudioEl.srcObject = null;
      }
      if (screenAudioEl.parentNode) {
        screenAudioEl.parentNode.removeChild(screenAudioEl);
      }
      addDebugLog(`🗑️ Cleaned up screen share audio element for user: ${userId}`);
    } catch (e) {
      addDebugLog(`⚠️ Error cleaning screen share audio: ${e.message}`);
    }
  });
  
  // pending audio queue से भी हटाएं
  if (pendingAudioQueueRef.current.has(userId)) {
    const pending = pendingAudioQueueRef.current.get(userId);
    if (pending.sourceType === "viewer-screen-audio") {
      pendingAudioQueueRef.current.delete(userId);
      
      setPendingAudioStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  }
};

// सिर्फ microphone audio के लिए
const cleanupOnlyMicrophoneAudio = (userId) => {
  addDebugLog(`🎤 Cleaning up only microphone audio for user: ${userId}`);
  
  // viewerAudios में से सिर्फ viewer-mic वाला stream हटाएं
  setViewerAudios(prev => {
    const newMap = new Map(prev);
    if (newMap.has(userId)) {
      const stream = newMap.get(userId);
      // सिर्फ उन्हीं tracks को stop करें जो viewer-mic के हैं
      if (stream) {
        stream.getTracks().forEach(track => {
          // यहाँ आपको track के metadata से पता लगाना होगा कि यह viewer-mic है या viewer-screen-audio
          // या फिर आप separate maps रख सकते हैं
        });
      }
      newMap.delete(userId);
    }
    return newMap;
  });
  
  // Audio elements को सही तरीके से manage करें
  const micAudioElements = document.querySelectorAll(
    `[data-audio-source="viewer-mic"][data-user-id="${userId}"], #viewer-mic-audio-${userId}`
  );
  
  micAudioElements.forEach(audioEl => {
    try {
      audioEl.pause();
      if (audioEl.srcObject) {
        audioEl.srcObject.getTracks().forEach(track => track.stop());
        audioEl.srcObject = null;
      }
    } catch (e) {
      console.warn("Error cleaning microphone audio element", e);
    }
  });
};

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
    frameRate: { ideal: 24, max: 24 }, // ✅ 40 fps
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
    newSocket.on('screen-share-stopped-by-viewer', handleViewerScreenShareStopped);
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


// Socket event handlers mein yeh add karen:
// Participant speaking status
newSocket.on('participant_speaking_status', (data) => {
  addDebugLog(`🎤 Speaking status: ${data.userId} - ${data.isSpeaking}`);
  
  setSpeakingUsers(prev => {
    const newMap = new Map(prev);
    if (data.isSpeaking) {
      newMap.set(data.userId, {
        userId: data.userId,
        userName: data.userName || participants.find(p => p.userId === data.userId)?.name,
        timestamp: new Date()
      });
    } else {
      newMap.delete(data.userId);
    }
    return newMap;
  });
});

// Add these socket event listeners in initializeWebSocket() function:

// Participant speaking status (FROM BACKEND)
newSocket.on('participant_speaking_status', (data) => {
  addDebugLog(`🎤 Speaking status received: ${data.userId} - ${data.isSpeaking}`);
  
  setSpeakingUsers(prev => {
    const newMap = new Map(prev);
    if (data.isSpeaking) {
      newMap.set(data.userId, {
        userId: data.userId,
        userName: data.userName || participants.find(p => p.userId === data.userId)?.name || 'User',
        timestamp: new Date()
      });
    } else {
      newMap.delete(data.userId);
    }
    return newMap;
  });
});


// All hands down event
newSocket.on('all_hands_down', () => {
  addDebugLog('🛑 All hands lowered by streamer');
  setHandRaisedUsers([]);
});

// Hand raise status
newSocket.on('hand_raise_status', (data) => {
  addDebugLog(`✋ Hand raise status: ${data.userId} - ${data.isHandRaised}`);
  
  setHandRaisedUsers(prev => {
    const updated = prev.filter(user => user.userId !== data.userId);
    
    if (data.isHandRaised) {
      updated.push({
        userId: data.userId,
        userName: data.userName || participants.find(p => p.userId === data.userId)?.name,
        timestamp: new Date()
      });
    }
    
    // Sort by timestamp (oldest first)
    return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  });
});

// All hands down event
newSocket.on('all_hands_down', () => {
  addDebugLog('🛑 All hands lowered by streamer');
  setHandRaisedUsers([]);
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

  // helper: close & delete consumer by producerId (if you store by producerId)
  const closeConsumerByProducerId = (pId) => {
    try {
      const c = consumers.current.get(pId);
      if (c) {
        try { c.close(); } catch {}
        consumers.current.delete(pId);
        addDebugLog(`🧹 Closed consumer mapped to producer ${pId}`);
      }
    } catch (e) {
      console.warn("closeConsumerByProducerId error:", e);
    }
  };

  // helper: remove any DOM audio element if exists
  const removeAudioElById = (id) => {
    try {
      const el = document.getElementById(id);
      if (el) {
        try { el.pause(); } catch {}
        el.srcObject = null;
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    } catch (e) {
      console.warn("removeAudioElById error:", e);
    }
  };

  // ==============================
  // 1) STREAMER SCREEN cleanup (VIDEO + AUDIO)
  // ==============================
  if (data.source === "screen" || data.source === "screen-audio") {
    // ✅ Close consumer for this producer (prevents "audio keeps coming" bug)
    closeConsumerByProducerId(data.producerId);

    // ✅ If streamer screen share is closing, clear active screen share
    // (for audio close also clear, because both belong to same share session)
    setActiveScreenShare((prev) => {
      if (!prev) return prev;
      if (prev.userId?.toString() === data.userId?.toString()) return null;
      return prev;
    });

    // ✅ Stop ONLY VIDEO tracks from screenRef (don't touch audio to avoid side effects)
    // (screen preview should be video-only anyway)
    try {
      const obj = screenRef.current?.srcObject;
      const tracks = obj?.getTracks?.() || [];
      tracks.forEach((t) => {
        if (t.kind === "video") t.stop();
      });
    } catch (e) {
      console.warn("Error stopping streamer screen tracks", e);
    }

    // ✅ Clear screenRef only when video producer closed (optional but safe)
    if (data.source === "screen" && screenRef.current) {
      try {
        screenRef.current.srcObject = null;
        screenRef.current.load?.();
      } catch (e) {
        console.warn("Error clearing screenRef", e);
      }
    }

    // ✅ Reset zoom if streamer screen was zoomed
    setZoomed((prev) => {
      if (
        prev &&
        (prev.type === "screen" || prev.type === "streamer-screen") &&
        prev.userId?.toString() === data.userId?.toString()
      ) {
        addDebugLog(`🔄 Resetting zoom for streamer screen stop: ${data.userId}`);
        return null;
      }
      return prev;
    });

    // ✅ EXTRA: If any stray audio element was created for streamer screen-audio, remove it
    // (IDs may vary depending on your old code; keep both common patterns)
    removeAudioElById(`audio-${data.userId}-screen-audio`);
    removeAudioElById(`audio-${data.userId}-screen`);

    // ✅ Also clear pending queue entries (avoid "plays later" surprise)
    try {
      pendingAudioQueueRef.current.delete(`screen-${data.userId}`);
      pendingAudioQueueRef.current.delete(`viewer-screen-audio-${data.userId}`);
      pendingAudioQueueRef.current.delete(`screen-audio-${data.userId}`);
      setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    } catch (e) {
      console.warn("Pending queue cleanup error:", e);
    }

    addDebugLog(`✅ Streamer screen producer closed → cleaned (${data.source})`);
  }

  // ==============================
  // 2) VIEWER SCREEN cleanup (VIDEO)
  // ==============================
  if (data.source === "viewer-screen") {
    closeConsumerByProducerId(data.producerId);

    // ✅ Reset zoom if viewer screen was zoomed
    setZoomed((prev) => {
      if (
        prev &&
        (prev.type === "viewer-screen" || prev.type === "screen") &&
        prev.userId?.toString() === data.userId?.toString()
      ) {
        addDebugLog(`🔄 Resetting zoom for viewer screen stop: ${data.userId}`);
        return null;
      }
      return prev;
    });

    // ✅ Clear viewer screen state (stop only video)
    setViewerScreenShare((prev) => {
      if (prev?.stream) {
        try {
          prev.stream.getTracks().forEach((t) => {
            if (t.kind === "video") t.stop();
          });
        } catch (e) {
          console.warn("Error stopping viewer screen tracks", e);
        }
      }
      return null;
    });

    // ✅ Clear viewer screen ref if you use it
    if (typeof viewerScreenRef !== "undefined" && viewerScreenRef?.current) {
      try {
        viewerScreenRef.current.srcObject = null;
        viewerScreenRef.current.load?.();
      } catch (e) {
        console.warn("Error clearing viewerScreenRef", e);
      }
    }

    addDebugLog(`✅ Viewer screen producer closed → viewerScreenShare cleared`);
  }

  // ==============================
  // 3) VIEWER SCREEN AUDIO cleanup
  // ==============================
  if (data.source === "viewer-screen-audio") {
    closeConsumerByProducerId(data.producerId);

    // Your existing cleanup (should remove audio element + refs)
    cleanupScreenShareAudio(data.userId);

    // Also remove common legacy element ids, just in case
    removeAudioElById(`audio-${data.userId}-screen`);
    removeAudioElById(`audio-${data.userId}-viewer-screen-audio`);

    // Remove pending queue entries
    try {
      pendingAudioQueueRef.current.delete(`screen-${data.userId}`);
      pendingAudioQueueRef.current.delete(`viewer-screen-audio-${data.userId}`);
      setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    } catch (e) {
      console.warn("Pending queue cleanup error:", e);
    }

    addDebugLog(`🎤 Viewer screen audio stopped for user: ${data.userId}`);
  }

  // ==============================
  // 4) VIEWER MIC cleanup
  // ==============================
  if (data.source === "viewer-mic") {
    closeConsumerByProducerId(data.producerId);

    cleanupOnlyMicrophoneAudio(data.userId);

    // Remove pending queue entries
    try {
      pendingAudioQueueRef.current.delete(`mic-${data.userId}`);
      pendingAudioQueueRef.current.delete(`viewer-mic-${data.userId}`);
      setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    } catch (e) {
      console.warn("Pending queue cleanup error:", e);
    }

    addDebugLog(`🎤 Viewer microphone stopped for user: ${data.userId}`);
  }

  // ==============================
  // 5) CAMERA cleanup - ONLY VIDEO
  // ==============================
  if (data.source === "viewer-camera") {
    closeConsumerByProducerId(data.producerId);

    setViewerCameras((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(data.userId)) {
        const stream = newMap.get(data.userId);
        if (stream) {
          try {
            stream.getTracks().forEach((t) => {
              if (t.kind === "video") {
                t.stop();
                addDebugLog(`📹 Stopped camera video track for user ${data.userId}`);
              }
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

  // ==============================
  // 6) Streamer mic (no viewer cleanup)
  // ==============================
  if (data.source === "mic" || data.source === "streamer-mic") {
    closeConsumerByProducerId(data.producerId);
    addDebugLog(`🎤 Streamer audio producer closed: ${data.userId}`);
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

  useEffect(() => {
  if (screenRef.current && activeScreenShare?.stream && !(zoomed && zoomed.type === "screen")) {
    screenRef.current.srcObject = activeScreenShare.stream;
    
    // ✅ FIX: Streamer ke liye local playback MUTE rakhein
    if (activeScreenShare.source === "streamer" || activeScreenShare.userId === user?.id) {
      screenRef.current.muted = true; 
    } else {
      // Viewer ka share hai to sunayi dena chahiye
      screenRef.current.muted = false;
    }

    screenRef.current.play().catch((err) => {
      console.warn("Autoplay blocked for screen PiP", err);
    });
  } else if (screenRef.current && (!activeScreenShare?.stream || (zoomed && zoomed.type === "screen"))) {
    screenRef.current.srcObject = null;
  }
}, [activeScreenShare?.stream, activeScreenShare?.source, activeScreenShare?.userId, zoomed, user?.id]);
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

const actuallyEndSession = () => {
  socket.emit("end-session", { sessionId });
  navigate("/dashboard");
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
useEffect(() => {
  if (!zoomed || !zoomed.stream) return;

  const el =
    zoomed.type === "screen"
      ? screenRef.current
      : zoomed.type === "streamer"
        ? videoRef.current
        : zoomedVideoRef.current;

  if (!el) return;

  if (el.srcObject !== zoomed.stream) {
    el.srcObject = zoomed.stream;
  }

  const p = el.play?.();
  if (p?.catch) p.catch(() => {});
}, [zoomed?.type, zoomed?.stream, zoomed?.userId]);



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
              <span>All Streams ({thumbnailsCount})</span>
            </h2>
            <div className="flex items-center space-x-4">
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
              {/* ✅ WHITEBOARD THUMBNAIL - Only show when whiteboard is open */}
              {showWhiteboard && (
                <div className="relative group">
                  <ThumbnailVideo
                    uid="whiteboard"
                    stream={null}
                    userName="Whiteboard"
                    onClick={() => {
                      setZoomed({ type: "whiteboard", stream: null, userId: "whiteboard" });
                      setShowPlayButton(false);
                      setThumbnailsExpanded(false);
                    }}
                    isZoomed={zoomed?.type === "whiteboard"}
                    videoEnabled={true}
                    expanded={true}
                    isWhiteboard={true}
                    showWhiteboard={showWhiteboard}
                    onCloseWhiteboard={handleCloseWhiteboard}
                  />
                  <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
                    <FiEdit3 className="h-3 w-3 mr-1" />
                    Whiteboard
                  </div>
                </div>
              )}

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

              {/* ✅ YEH ADD KARO - Viewer Screen Share Thumbnail */}
{viewerScreenShare?.stream && (
  <div className="relative group">
    <ThumbnailVideo
      uid={viewerScreenShare.userId}
      stream={viewerScreenShare.stream}
      userName={`${viewerScreenShare.userName}'s Screen`}
      onClick={() => {
        setZoomed({ 
          type: "viewer-screen", 
          stream: viewerScreenShare.stream, 
          userId: viewerScreenShare.userId 
        });
        setShowPlayButton(false);
      }}
      isZoomed={zoomed?.type === "viewer-screen" && zoomed.userId === viewerScreenShare.userId}
      videoEnabled={true}
      isScreenShare={true}
    />
    <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
      <FiMonitor className="h-3 w-3 mr-1" />
      Viewer Screen
    </div>
  </div>
)}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700 bg-gray-800/90">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Click on any stream to zoom into it
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
              className="relative flex-1 bg-black overflow-hidden cursor-pointer main-video-container"
              onClick={(e) => {
                // 🛑 AGAR WHITEBOARD ZOOMED HAI TO FULLSCREEN MAT KARO
                if (zoomed?.type === "whiteboard") {
                  e.stopPropagation();
                  return;
                }
                
                // Warna normal full-screen logic
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
                <div className="relative w-full h-full">
                  {/* 🎨 CASE 1: WHITEBOARD - Video player ki jagah whiteboard */}
                  {zoomed.type === "whiteboard" ? (
                    showWhiteboard && whiteboardSessionInfo ? (
                      <StreamerWhiteboard
                        key={`whiteboard-${whiteboardSessionInfo.sessionId}`}
                        sessionId={whiteboardSessionInfo.sessionId}
                        roomCode={whiteboardSessionInfo.roomCode}
                        wsToken={whiteboardSessionInfo.wsToken}
                        sessionInfo={whiteboardSessionInfo}
                        isActive={showWhiteboard}
                        onClose={handleCloseWhiteboard}
                        isStreamer={true}
                        allowViewersToDraw={true}
                        mainScreenMode={true}
                        compact={true}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                          <p className="text-sm">Loading whiteboard...</p>
                        </div>
                      </div>
                    )
                  ) : (
                    /* 🎥 CASE 2: REGULAR VIDEO - Camera ya Screen Share */
                    <>
                      <video
                        ref={
                          zoomed.type === "screen" 
                            ? screenRef
                            : zoomed.type === "streamer" 
                              ? videoRef
                              : zoomedVideoRef
                        }
                        autoPlay
                        playsInline
                        muted={zoomed.type !== "viewer"}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                        
                        onError={(e) => {
                          console.error('Zoomed video error:', e);
                        }}
                      />
                      
                      {/* Video Label */}
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
                        {zoomed.type === "streamer" && (
                          <>
                            <FiVideo className="h-4 w-4 text-blue-400" />
                            <span>Your Camera</span>
                          </>
                        )}
                        {zoomed.type === "viewer" && (
                          <>
                            <FiVideo className="h-4 w-4 text-green-400" />
                            <span>
                              {participants.find(p => p.userId === zoomed.userId)?.name || 'Viewer'}'s Camera
                            </span>
                          </>
                        )}
                        {zoomed.type === "screen" && (
                          <>
                            <FiMonitor className="h-4 w-4 text-purple-400" />
                            <span>
                              {activeScreenShare?.userName || 'Streamer'}'s Screen
                            </span>
                          </>
                        )}

                        {zoomed.type === "viewer-screen" && (
            <>
              <FiMonitor className="h-4 w-4 text-orange-400" />
              <span>{viewerScreenShare?.userName}'s Screen</span>
            </>
          )}
                      </div>

                      {/* Close button for whiteboard (only when whiteboard is zoomed) */}
                      {zoomed.type === "whiteboard" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseWhiteboard();
                          }}
                          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full z-30 transition-colors"
                          title="Close Whiteboard"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* 🎬 DEFAULT VIEW - Streamer's Camera */
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={true}
                    className={`absolute inset-0 w-full h-full object-contain bg-black ${
    zoomed?.type === "whiteboard" ? "invisible" : "visible"
  }`}
                    srcObject={mediaStream}
                    onError={(e) => {
                      console.error('Main video error:', e);
                      setMediaError(true);
                    }}
                  />
                  
                  {/* Live Badge */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">LIVE</span>
                    {session?.roomCode && (
                      <>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-sm">{session.roomCode}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Camera Off Placeholder */}
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FiVideoOff className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-white text-sm">Camera is off</p>
                      </div>
                    </div>
                  )}
                </div>
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
                <span>Streams ({thumbnailsCount})</span>
              </h3>
              {thumbnailsCount > 0 && (
                <button
                  onClick={() => setThumbnailsExpanded(true)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="View All Streams"
                >
                  <FiMaximize className="h-4 w-4 text-gray-300" />
                </button>
              )}
            </div>
            
            {/* Thumbnails container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
              {/* ✅ WHITEBOARD THUMBNAIL - Only show when whiteboard is open */}
              {showWhiteboard && (
                <ThumbnailVideo
                  uid="whiteboard"
                  stream={null}
                  userName="Whiteboard"
                  onClick={() => {
                    setZoomed({ type: "whiteboard", stream: null, userId: "whiteboard" });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "whiteboard"}
                  videoEnabled={true}
                  isWhiteboard={true}
                  showWhiteboard={showWhiteboard}
                  onCloseWhiteboard={handleCloseWhiteboard}
                />
              )}

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
                  stream={
        activeScreenShare.stream?.getVideoTracks?.()[0]
          ? new MediaStream([activeScreenShare.stream.getVideoTracks()[0]])
          : activeScreenShare.stream
      }
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

                {viewerScreenShare?.stream && (
    <div className="relative group">
      <ThumbnailVideo
        uid={viewerScreenShare.userId}
        stream={viewerScreenShare?.stream}
        userName={`${viewerScreenShare.userName}'s Screen`}
        onClick={() => {
          setZoomed({ 
            type: "viewer-screen", 
            stream: viewerScreenShare.stream, 
            userId: viewerScreenShare.userId 
          });
          setShowPlayButton(false);
          setThumbnailsExpanded(false);
        }}
        isZoomed={zoomed?.type === "viewer-screen" && zoomed.userId === viewerScreenShare.userId}
        videoEnabled={true}
        isScreenShare={true}
        expanded={true}
      />
      <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
        <FiMonitor className="h-3 w-3 mr-1" />
        Viewer Screen
      </div>
    </div>
  )}



              
              {/* Empty state */}
              {thumbnailsCount === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <div>
                    <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active streams</p>
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
              className="relative flex-1 bg-black overflow-hidden cursor-pointer main-video-container"
              onClick={(e) => {
                // 🛑 AGAR WHITEBOARD ZOOMED HAI TO FULLSCREEN MAT KARO
                if (zoomed?.type === "whiteboard") {
                  e.stopPropagation();
                  return;
                }
                
                // Warna normal full-screen logic
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
                <div className="relative w-full h-full">
                  {/* 🎨 CASE 1: WHITEBOARD - Video player ki jagah whiteboard */}
                  {zoomed.type === "whiteboard" ? (
                    showWhiteboard && whiteboardSessionInfo ? (
                      <StreamerWhiteboard
                        key={`whiteboard-${whiteboardSessionInfo.sessionId}`}
                        sessionId={whiteboardSessionInfo.sessionId}
                        roomCode={whiteboardSessionInfo.roomCode}
                        wsToken={whiteboardSessionInfo.wsToken}
                        sessionInfo={whiteboardSessionInfo}
                        isActive={showWhiteboard}
                        onClose={handleCloseWhiteboard}
                        isStreamer={true}
                        allowViewersToDraw={true}
                        mainScreenMode={true}
                        compact={true}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                          <p className="text-sm">Loading whiteboard...</p>
                        </div>
                      </div>
                    )
                  ) : (
                    /* 🎥 CASE 2: REGULAR VIDEO - Camera ya Screen Share */
                    <>
                      <video
                        ref={
                          zoomed.type === "screen" 
                            ? screenRef
                            : zoomed.type === "streamer" 
                              ? videoRef
                              : zoomedVideoRef
                        }
                        autoPlay
                        playsInline
                        muted={zoomed.type !== "viewer"}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                        
                        onError={(e) => {
                          console.error('Zoomed video error:', e);
                        }}
                      />
                      
                      {/* Video Label */}
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
                        {zoomed.type === "streamer" && (
                          <>
                            <FiVideo className="h-4 w-4 text-blue-400" />
                            <span>Your Camera</span>
                          </>
                        )}
                        {zoomed.type === "viewer" && (
                          <>
                            <FiVideo className="h-4 w-4 text-green-400" />
                            <span>
                              {participants.find(p => p.userId === zoomed.userId)?.name || 'Viewer'}'s Camera
                            </span>
                          </>
                        )}
                        {zoomed.type === "screen" && (
                          <>
                            <FiMonitor className="h-4 w-4 text-purple-400" />
                            <span>
                              {activeScreenShare?.userName || 'Streamer'}'s Screen
                            </span>
                          </>
                        )}
                      </div>

                      {/* Close button for whiteboard (only when whiteboard is zoomed) */}
                      {zoomed.type === "whiteboard" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseWhiteboard();
                          }}
                          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full z-30 transition-colors"
                          title="Close Whiteboard"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* 🎬 DEFAULT VIEW - Streamer's Camera */
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={true}
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    srcObject={mediaStream}
                    onError={(e) => {
                      console.error('Main video error:', e);
                      setMediaError(true);
                    }}
                  />
                  
                  {/* Live Badge */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">LIVE</span>
                    {session?.roomCode && (
                      <>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-sm">{session.roomCode}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Camera Off Placeholder */}
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FiVideoOff className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-white text-sm">Camera is off</p>
                      </div>
                    </div>
                  )}
                </div>
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

              {/* Collapse Sidebar Button */}
              <div className="absolute right-4 top-4 z-20">
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-all duration-200"
                  title="Hide Sidebar"
                >
                  <FiChevronRight className="h-5 w-5 text-blue-400" />
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
                <span>Streams ({thumbnailsCount})</span>
              </h3>
              {thumbnailsCount > 0 && (
                <button
                  onClick={() => setThumbnailsExpanded(true)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="View All Streams"
                >
                  <FiMaximize className="h-4 w-4 text-gray-300" />
                </button>
              )}
            </div>
            
            {/* Thumbnails container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
              {/* ✅ WHITEBOARD THUMBNAIL - Only show when whiteboard is open */}
              {showWhiteboard && (
                <ThumbnailVideo
                  uid="whiteboard"
                  stream={null}
                  userName="Whiteboard"
                  onClick={() => {
                    setZoomed({ type: "whiteboard", stream: null, userId: "whiteboard" });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "whiteboard"}
                  videoEnabled={true}
                  isWhiteboard={true}
                  showWhiteboard={showWhiteboard}
                  onCloseWhiteboard={handleCloseWhiteboard}
                />
              )}

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
                  stream={
        activeScreenShare.stream?.getVideoTracks?.()[0]
          ? new MediaStream([activeScreenShare.stream.getVideoTracks()[0]])
          : activeScreenShare.stream
      }
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
               {viewerScreenShare?.stream && (
    <ThumbnailVideo
      uid={viewerScreenShare.userId}
      stream={viewerScreenShare.stream}
      userName={`${viewerScreenShare.userName}'s Screen`}
      onClick={() => {
        setZoomed({ 
          type: "viewer-screen", 
          stream: viewerScreenShare.stream, 
          userId: viewerScreenShare.userId 
        });
        setShowPlayButton(false);
      }}
      isZoomed={zoomed?.type === "viewer-screen" && zoomed.userId === viewerScreenShare.userId}
      videoEnabled={true}
      isScreenShare={true}
    />
  )}
              
              {/* Empty state */}
              {thumbnailsCount === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
                  <div>
                    <FiVideoOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active streams</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Expanded (Participants/Chat) */}
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
                    <div className="flex items-center space-x-2">
                      {/* Lower All Hands Button */}
                      {handRaisedUsers.length > 0 && (
                        <button
                          onClick={lowerAllHands}
                          className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
                          title="Lower All Hands"
                        >
                          <TfiHandOpen className="h-3 w-3" />
                          <span>Lower All ({handRaisedUsers.length})</span>
                        </button>
                      )}
                      
                      {/* Show streamer speaking status badge */}
                      {isSpeaking && (
                        <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-lg">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-400 font-medium">You're Speaking</span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setShowParticipantsModal(true)}
                        className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Manage Participants"
                      >
                        <FiUsers className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="text-lg font-bold text-white">{participants.length}</div>
                      <div className="text-xs text-gray-300">Total</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-900/30 rounded-lg">
                      <div className="text-lg font-bold text-yellow-300">{handRaisedUsers.length}</div>
                      <div className="text-xs text-yellow-300">Hands Raised</div>
                    </div>
                    <div className="text-center p-2 bg-green-900/30 rounded-lg">
                      <div className="text-lg font-bold text-green-300">{speakingUsers.size}</div>
                      <div className="text-xs text-green-300">Speaking</div>
                    </div>
                  </div>
                </div>
                
                {/* All Participants List - Viewers Only */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
                  {participants
                    .filter(p => p.userId !== user?.id)
                    .map((participant, index) => {
                      const isThisUserSpeaking = speakingUsers.has(participant.userId);
                      const hasHandRaised = handRaisedUsers.some(user => user.userId === participant.userId);
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                            isThisUserSpeaking
                              ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/20'
                              : hasHandRaised
                              ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20'
                              : 'bg-gray-700/40 hover:bg-gray-600/40'
                          }`}
                        >
                          {/* Left side: Participant info */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="relative">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-medium">
                                {participant.name?.charAt(0)?.toUpperCase() || 
                                 participant.userName?.charAt(0)?.toUpperCase() || 
                                 participant.userId?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              
                              {/* Multiple status indicators */}
                              <div className="absolute -bottom-1 -right-1 flex space-x-1">
                                {isThisUserSpeaking && (
                                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse border-2 border-gray-800"></div>
                                )}
                                
                                {hasHandRaised && !isThisUserSpeaking && (
                                  <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-gray-800"></div>
                                )}
                              </div>
                            </div>
                            
                            {/* Name and status */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium truncate text-sm">
                                  {participant.name || participant.userName || participant.userId || "User"}
                                </span>
                                
                                <div className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                                  #{index + 1}
                                </div>
                              </div>
                              
                              {/* Status indicators inline */}
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                {isThisUserSpeaking && (
                                  <div className="flex items-center space-x-1 bg-green-900/30 px-2 py-0.5 rounded">
                                    <FiVolume2 className="h-3 w-3 text-green-400 animate-pulse" />
                                    <span className="text-xs text-green-400 font-medium">SPEAKING</span>
                                  </div>
                                )}
                                
                                {hasHandRaised && !isThisUserSpeaking && (
                                  <div className="flex items-center space-x-1 bg-yellow-900/30 px-2 py-0.5 rounded">
                                    <TfiHandOpen className="h-3 w-3 text-yellow-400" />
                                    <span className="text-xs text-yellow-400 font-medium">HAND RAISED</span>
                                  </div>
                                )}
                                
                                {participant.hasAudio && !isThisUserSpeaking && (
                                  <div className="flex items-center space-x-1">
                                    <FiMic className="h-3 w-3 text-blue-400" />
                                    <span className="text-xs text-blue-400">Mic On</span>
                                  </div>
                                )}
                                
                                {participant.hasVideo && (
                                  <div className="flex items-center space-x-1">
                                    <FiVideo className="h-3 w-3 text-purple-400" />
                                    <span className="text-xs text-purple-400">Camera</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side: Action buttons */}
                          <div className="flex items-center space-x-1">
                            {hasHandRaised && (
                              <button
                                onClick={() => lowerHandForUser(participant.userId)}
                                className="p-1.5 bg-yellow-700/50 hover:bg-yellow-600/50 rounded-lg transition-colors"
                                title="Lower Hand"
                              >
                                <TfiHandOpen className="h-4 w-4 text-yellow-300" />
                              </button>
                            )}
                            
                            {participant.hasVideo && (
                              <button
                                onClick={() => {
                                  emitSocketEvent("streamer-stop-viewer-video", {
                                    sessionId: sessionId || roomCode,
                                    targetSocketId: participant.socketId,
                                  });
                                  addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
                                  toast.info(`Stopped ${participant.name}'s camera`, {
                                    position: "bottom-right",
                                    autoClose: 2000,
                                  });
                                }}
                                className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                title="Stop Camera"
                              >
                                <FiVideoOff className="h-4 w-4 text-gray-300" />
                              </button>
                            )}
                            
                            {participant.hasAudio && (
                              <button
                                onClick={() => {
                                  emitSocketEvent("streamer-stop-viewer-audio", {
                                    sessionId: sessionId || roomCode,
                                    targetSocketId: participant.socketId,
                                  });
                                  addDebugLog(`🔇 Muted viewer: ${participant.userId}`);
                                  toast.info(`Muted ${participant.name}`, {
                                    position: "bottom-right",
                                    autoClose: 2000,
                                  });
                                }}
                                className="p-1.5 bg-red-700/50 hover:bg-red-600/50 rounded-lg transition-colors"
                                title="Mute User"
                              >
                                <FiMicOff className="h-4 w-4 text-red-300" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  }
                  
                  {/* Empty State */}
                  {participants.filter(p => p.userId !== user?.id).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <FiUsers className="h-16 w-16 mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">No viewers yet</p>
                      <p className="text-sm text-center max-w-sm">
                        Share the room code with viewers to invite them to join the session
                      </p>
                      {session?.roomCode && (
                        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                          <p className="text-sm text-gray-300 mb-1">Room Code:</p>
                          <p className="text-lg font-mono font-bold text-blue-400">{session.roomCode}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Legend at bottom */}
                <div className="p-3 border-t border-gray-700 bg-gray-800/50">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span>Speaking</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span>Hand Raised</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FiMic className="h-3 w-3 text-blue-400" />
                      <span>Mic On</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FiVideo className="h-3 w-3 text-purple-400" />
                      <span>Camera On</span>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      {speakingUsers.size} speaking • {handRaisedUsers.length} hands raised
                    </div>
                  </div>
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

{/* ✅ YAHAN PASTE KAREIN - Sabse last mein, main closing div se pehle */}
    {isRecording && !userInteracted && (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999]"> {/* z-index badha diya */}
        <div className="bg-gray-800 p-8 rounded-2xl border border-blue-500/30 text-center max-w-md shadow-2xl mx-4">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiVolume2 className="h-10 w-10 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Optimize Audio</h2>
          <p className="text-gray-300 mb-8 text-sm">
            To prevent echo during screen recording, we need to sync your audio context. 
            Please click the button below.
          </p>
          <button
            onClick={handleEnableAudio}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
          >
            <FiCheck className="h-5 w-5" />
            <span>Enable Echo-Free Audio</span>
          </button>
        </div>
      </div>
    )}


    

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
      activeScreenShare={viewerScreenShare}
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (showWhiteboard) {
              handleCloseWhiteboard();
            } else {
              handleOpenWhiteboard();
            }
          }}
          className={`flex flex-col items-center p-4 rounded-2xl focus:outline-none transition-all duration-200 transform hover:scale-110 shadow-lg ${
            showWhiteboard 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
              : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
          }`}
          title={showWhiteboard ? "Close Whiteboard" : "Open Collaborative Whiteboard"}
        >
          <FiEdit3 className="text-xl mb-1" />
          <span className="text-xs font-medium">
            {showWhiteboard ? 'Close Board' : 'Whiteboard'}
          </span>
          
          {/* Whiteboard active indicator */}
          {showWhiteboard && (
            <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] px-1 rounded-full">
              ON
            </span>
          )}
        </button>
        
        {/* Smart Screen Share Button */}
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
  onClick={handleStreamerScreenShareClick}
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
        
        {/* Smart Recording Button */}
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
      
      {/* Status Bar */}
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

        {showEndSessionRecordingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[420px] text-center shadow-xl">
              <h2 className="text-lg font-bold text-gray-800">
                🎬 Recording is still ON
              </h2>
              <p className="mt-3 text-gray-600">
                Do you want to save this recording before ending the session?
              </p>
              <div className="mt-5 flex justify-center gap-4">
                <button
                  onClick={async () => {
                    await stopRecording();
                    setShowEndSessionRecordingModal(false);
                    actuallyEndSession();
                  }}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg"
                >
                  ✅ Save & End
                </button>
                <button
                  onClick={() => {
                    setShowEndSessionRecordingModal(false);
                    actuallyEndSession();
                  }}
                  className="bg-red-600 text-white px-5 py-2 rounded-lg"
                >
                  ❌ End Without Saving
                </button>
              </div>
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




{/* Echo Prevention Modal - Only appears on Screen Share start */}

      </div>
    </div>
  </div>
);

};

export default LiveSession;