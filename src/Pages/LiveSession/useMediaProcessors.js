import { useCallback } from 'react';

export const useMediaProcessors = ({ states, setters, refs, helpers }) => {
  // 1. Destructure everything passed from LiveSession
  const { 
    mediaStream, socket, sessionId, roomCode, user, 
    activeScreenShare, userInteracted, showAudioPermissionModal 
  } = states;
  
  const { 
    setIsSpeaking, setSpeakingUsers, setZoomed, setScreenCaptureStream, 
    setScreenCaptureActive, setViewerAudios, setPendingAudioStreams, 
    setViewerCameras, setActiveScreenShare, setParticipants, 
    setHandRaisedUsers, setActiveSpeakers, setViewerAudioRequests, 
    setViewerVideoRequests, setScreenShareRequests, setActiveViewerAudio, 
    setViewerScreenShare, setShowAudioPermissionModal, setAppViewerScreenShare
  } = setters;
  
  const { 
    speakingAudioContextRef, speakingSourceRef, analyserRef, 
    speakingDetectionIntervalRef, localAudioTrackRef, recordingAudioContextRef, recordingDestinationRef, 
    viewerAudiosRef, audioElementsRef, pendingAudioQueueRef, 
    isRecordingRef, screenCaptureStreamRef, consumers, remoteVideosRef, 
    userInteractedRef, viewerScreenRef 
  } = refs;

  const { addDebugLog } = helpers;

  const speakingThreshold = 40; // Same as viewer side

  // ======================================================================
  // ✂️ ALL EXTRACTED FUNCTIONS BELOW
  // ======================================================================
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

      // 👇 NAYA: FAN/AC NOISE FILTER (Highpass at 300Hz)
      const voiceFilter = speakingAudioContextRef.current.createBiquadFilter();
      voiceFilter.type = "highpass";
      voiceFilter.frequency.value = 300; // Fan aur AC ka low-end rumbling noise kaat dega
 
      analyserRef.current = speakingAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      // 👇 Smoothing kam ki hai taaki fast react kare
      analyserRef.current.smoothingTimeConstant = 0.4; 
 
      // 👇 NAYA CONNECTION: Mic -> Filter -> Analyser
      speakingSourceRef.current.connect(voiceFilter);
      voiceFilter.connect(analyserRef.current);
 
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      let lastSpeakingState = false;
      let consecutiveSpeakingCount = 0;
      let consecutiveSilenceCount = 0;
 
      // 👇 Interval ko 100ms kiya hai fast detection ke liye
      speakingDetectionIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !speakingAudioContextRef.current) return;
 
        try {
          analyserRef.current.getByteFrequencyData(dataArray);
 
          // 👇 Average ki jagah Max Volume Peak nikal rahe hain
          let maxVolume = 0;
          for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxVolume) {
              maxVolume = dataArray[i];
            }
          }
 
          // Threshold check (Fan filter ke baad 60 kaafi accurate rahega)
          const isCurrentlySpeaking = maxVolume > 60; 
 
          // Debounce logic
          if (isCurrentlySpeaking) {
            consecutiveSpeakingCount++;
            consecutiveSilenceCount = 0;
          } else {
            consecutiveSilenceCount++;
            consecutiveSpeakingCount = 0;
          }
 
          // 👇 Jaise hi 200ms aawaz aaye, turant ON. Band hone ke liye 800ms ka wait.
          const detectedSpeaking = consecutiveSpeakingCount >= 2;
          const detectedSilence = consecutiveSilenceCount >= 8;
 
          if (detectedSpeaking && !lastSpeakingState) {
            setIsSpeaking(true);
            socket.emit("user_speaking", {
              sessionId: sessionId || roomCode,
              isSpeaking: true,
            });
            lastSpeakingState = true;
            addDebugLog(`🎤 Streamer started speaking (Max Vol: ${maxVolume})`);
          } else if (detectedSilence && lastSpeakingState) {
            setIsSpeaking(false);
            socket.emit("user_stopped_speaking", {
              sessionId: sessionId || roomCode,
            });
            lastSpeakingState = false;
            addDebugLog(`🎤 Streamer stopped speaking`);
          }
        } catch (error) {
          console.error("Streamer speaking detection error:", error);
        }
      }, 100);
 
      addDebugLog("🎤 Streamer speaking detection started with Voice Filter");
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
    // isSpeaking is set via state, so this block logic will use the state setter
    // To handle the `isSpeaking` check properly without adding it to refs, we just fire the socket event anyway
    setIsSpeaking(false);
    if (socket) {
      socket.emit("user_stopped_speaking", {
        sessionId: sessionId || roomCode,
      });
    }
  
    addDebugLog("🎤 Streamer speaking detection stopped");
  };

  // const startSpeakingDetection = () => {
  //   if (!mediaStream || !socket) return;
  
  //   try {
  //     stopSpeakingDetection();
  
  //     const audioTracks = mediaStream.getAudioTracks();
  //     if (audioTracks.length === 0) {
  //       addDebugLog("🎤 No audio track found for speaking detection");
  //       return;
  //     }
  
  //     localAudioTrackRef.current = audioTracks[0];
  
  //     const AudioContext = window.AudioContext || window.webkitAudioContext;
  
  //     // ✅ Use separate AudioContext for speaking detection
  //     speakingAudioContextRef.current = new AudioContext();
  
  //     // Create media stream source from local track (only)
  //     const trackStream = new MediaStream([localAudioTrackRef.current]);
  //     speakingSourceRef.current =
  //       speakingAudioContextRef.current.createMediaStreamSource(trackStream);
  
  //     analyserRef.current = speakingAudioContextRef.current.createAnalyser();
  //     analyserRef.current.fftSize = 256;
  //     analyserRef.current.smoothingTimeConstant = 0.8;
  
  //     speakingSourceRef.current.connect(analyserRef.current);
  
  //     const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
  //     let lastSpeakingState = false;
  //     let consecutiveSpeakingCount = 0;
  //     let consecutiveSilenceCount = 0;
  
  //     speakingDetectionIntervalRef.current = setInterval(() => {
  //       if (!analyserRef.current || !speakingAudioContextRef.current) return;
  
  //       try {
  //         analyserRef.current.getByteFrequencyData(dataArray);
  
  //         let sum = 0;
  //         for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
  //         const averageVolume = sum / dataArray.length;
  
  //         const isCurrentlySpeaking = averageVolume > speakingThreshold;
  
  //         if (isCurrentlySpeaking) {
  //           consecutiveSpeakingCount++;
  //           consecutiveSilenceCount = 0;
  //         } else {
  //           consecutiveSilenceCount++;
  //           consecutiveSpeakingCount = 0;
  //         }
  
  //         const detectedSpeaking = consecutiveSpeakingCount >= 2;
  //         const detectedSilence = consecutiveSilenceCount >= 3;
  
  //         if (detectedSpeaking && !lastSpeakingState) {
  //           setIsSpeaking(true);
  //           socket.emit("user_speaking", {
  //             sessionId: sessionId || roomCode,
  //             isSpeaking: true,
  //           });
  //           lastSpeakingState = true;
  //           addDebugLog(`🎤 Streamer started speaking (volume: ${averageVolume.toFixed(1)})`);
  //         } else if (detectedSilence && lastSpeakingState) {
  //           setIsSpeaking(false);
  //           socket.emit("user_stopped_speaking", {
  //             sessionId: sessionId || roomCode,
  //           });
  //           lastSpeakingState = false;
  //           addDebugLog(`🎤 Streamer stopped speaking (volume: ${averageVolume.toFixed(1)})`);
  //         }
  //       } catch (error) {
  //         console.error("Speaking detection error:", error);
  //       }
  //     }, 500);
  
  //     addDebugLog("🎤 Automatic speaking detection started for streamer");
  //   } catch (error) {
  //     console.error("Error starting speaking detection:", error);
  //     addDebugLog(`❌ Speaking detection error: ${error.message}`);
  //   }
  // };


const startSpeakingDetection = () => {
    if (!mediaStream || !socket) return;
 
    try {
      stopSpeakingDetection();
 
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;
 
      localAudioTrackRef.current = audioTracks[0];
 
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      speakingAudioContextRef.current = new AudioContext();
 
      const trackStream = new MediaStream([localAudioTrackRef.current]);
      speakingSourceRef.current = speakingAudioContextRef.current.createMediaStreamSource(trackStream);

      // 👇 NAYA: FAN/AC NOISE FILTER (Highpass at 300Hz)
      const voiceFilter = speakingAudioContextRef.current.createBiquadFilter();
      voiceFilter.type = "highpass";
      voiceFilter.frequency.value = 300; // Fan aur low-frequency noise ko kaatega
 
      analyserRef.current = speakingAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.4; // 👈 Make snappy
 
      // 👇 NAYA CONNECTION: Track Stream -> Filter -> Analyser
      speakingSourceRef.current.connect(voiceFilter);
      voiceFilter.connect(analyserRef.current);
 
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      let lastSpeakingState = false;
      let consecutiveSpeakingCount = 0;
      let consecutiveSilenceCount = 0;
 
      // 👈 Interval 100ms
      speakingDetectionIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !speakingAudioContextRef.current) return;
 
        try {
          analyserRef.current.getByteFrequencyData(dataArray);
 
          // 👈 Max volume tracking
          let maxVolume = 0;
          for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxVolume) maxVolume = dataArray[i];
          }
 
          // Threshold check (Noise filter lagne ke baad 60 best hai)
          const isCurrentlySpeaking = maxVolume > 60;
 
          if (isCurrentlySpeaking) {
            consecutiveSpeakingCount++;
            consecutiveSilenceCount = 0;
          } else {
            consecutiveSilenceCount++;
            consecutiveSpeakingCount = 0;
          }
 
          const detectedSpeaking = consecutiveSpeakingCount >= 2; // 👈 Quick start (200ms)
          const detectedSilence = consecutiveSilenceCount >= 8;   // 👈 Smooth stop (800ms delay)
 
          if (detectedSpeaking && !lastSpeakingState) {
            setIsSpeaking(true);
            socket.emit("user_speaking", {
              sessionId: sessionId || roomCode,
              isSpeaking: true,
            });
            lastSpeakingState = true;
          } else if (detectedSilence && lastSpeakingState) {
            setIsSpeaking(false);
            socket.emit("user_stopped_speaking", {
              sessionId: sessionId || roomCode,
            });
            lastSpeakingState = false;
          }
        } catch (error) {
          console.error("Speaking detection error:", error);
        }
      }, 100); 
 
      addDebugLog("🎤 Automatic speaking detection started for streamer (with Voice Filter)");
    } catch (error) {
      console.error("Error starting speaking detection:", error);
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
  
    setIsSpeaking(false);
    if (socket) {
      socket.emit("user_stopped_speaking", {
        sessionId: sessionId || roomCode,
      });
    }
  
    addDebugLog("🎤 Speaking detection stopped");
  };

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
      if (pendingAudioQueueRef.current.size === 0 && showAudioPermissionModal) {
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
  
      if (viewerScreenRef?.current) {
        try {
          viewerScreenRef.current.srcObject = null;
          viewerScreenRef.current.load?.();
        } catch (e) {
          console.warn("Error clearing viewerScreenRef", e);
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
      if (pending.sourceType === "viewer-screen-audio" || pending.sourceType === "app-viewer-screen-audio") {
        pendingAudioQueueRef.current.delete(userId);
        
        setPendingAudioStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    }
  };

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
            track.stop();
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

  const cleanupUserOnLeft = useCallback((data) => {
    const leftUserId = data?.userId;
    const leftSocketId = data?.socketId;
  
    if (!leftUserId) return;
  
    addDebugLog(`🧹 cleanupUserOnLeft: userId=${leftUserId}, socketId=${leftSocketId || "n/a"}`);
  
    setParticipants((prev) => prev.filter((p) => p.userId !== leftUserId));
  
    setHandRaisedUsers((prev) => prev.filter((u) => u.userId !== leftUserId));
  
    setSpeakingUsers((prev) => {
      const m = new Map(prev);
      m.delete(leftUserId);
      return m;
    });
  
    setActiveSpeakers((prev) => {
      const m = new Map(prev);
      // values may have {userId, socketId}
      for (const [k, v] of m.entries()) {
        if (v?.userId === leftUserId || (leftSocketId && v?.socketId === leftSocketId)) {
          m.delete(k);
        }
      }
      return m;
    });
  
    setViewerAudioRequests((prev) => prev.filter((r) => r.userId !== leftUserId));
    setViewerVideoRequests((prev) => prev.filter((r) => r.userId !== leftUserId));
    setScreenShareRequests((prev) => prev.filter((r) => r.userId !== leftUserId));
  
    setActiveViewerAudio((prev) => {
      const m = new Map(prev);
      // keys may be userId/socketId; remove both safely
      m.delete(leftUserId);
      if (leftSocketId) m.delete(leftSocketId);
  
      // also remove any values matching this user
      for (const [k, v] of m.entries()) {
        if (v?.userId === leftUserId || (leftSocketId && v?.socketId === leftSocketId)) {
          m.delete(k);
        }
      }
      return m;
    });
  
    // If zoomed is on this user -> unzoom
    setZoomed((prev) => (prev?.userId === leftUserId ? null : prev));
  
    setViewerScreenShare((prev) => {
      if (!prev) return prev;
      if (prev.userId === leftUserId || (leftSocketId && prev.socketId === leftSocketId)) {
        try {
          prev.stream?.getTracks?.()?.forEach((t) => {
            if (t.readyState === "live") t.stop();
          });
        } catch {}
        return null;
      }
      return prev;
    });
  
    setActiveScreenShare((prev) => {
      if (!prev) return prev;
      if (prev.userId === leftUserId || (leftSocketId && prev.socketId === leftSocketId)) {
        try {
          prev.stream?.getTracks?.()?.forEach((t) => {
            if (t.readyState === "live") t.stop();
          });
        } catch {}
        return null;
      }
      return prev;
    });

    // 👇 ✅ NAYA: APP VIEWER SCREEN CLEANUP ADD KIYA
    setAppViewerScreenShare((prev) => {
      if (!prev) return prev;
      if (prev.userId === leftUserId || (leftSocketId && prev.socketId === leftSocketId)) {
        try {
          prev.stream?.getTracks?.()?.forEach((t) => {
            if (t.readyState === "live") t.stop();
          });
        } catch {}
        return null;
      }
      return prev;
    });
  
    setViewerCameras((prev) => {
      const m = new Map(prev);
      const stream = m.get(leftUserId);
      if (stream) {
        try {
          stream.getTracks().forEach((t) => {
            if (t.readyState === "live") t.stop();
          });
        } catch {}
        m.delete(leftUserId);
      }
      return m;
    });
  
    setViewerAudios((prev) => {
      const m = new Map(prev);
      const stream = m.get(leftUserId);
      if (stream) {
        try {
          stream.getTracks().forEach((t) => {
            if (t.readyState === "live") t.stop();
          });
        } catch {}
        m.delete(leftUserId);
      }
      return m;
    });
  
    // audioElementsRef map (if stored by userId)
    try {
      const el = audioElementsRef.current.get(leftUserId);
      if (el) {
        el.pause?.();
        try {
          if (el.srcObject) {
            el.srcObject.getTracks?.()?.forEach((t) => t.stop?.());
          }
        } catch {}
        el.srcObject = null;
        el.remove?.();
        audioElementsRef.current.delete(leftUserId);
      }
    } catch {}
  
    // Remove any DOM audio elements (safe cleanup)
    const possibleSelectors = [
      `#viewer-mic-audio-${leftUserId}`,
      `#audio-${leftUserId}-screen`,
      `#audio-${leftUserId}-viewer-screen-audio`,
      `[data-user-id="${leftUserId}"]`,
    ];
    possibleSelectors.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((node) => {
          try {
            node.pause?.();
            if (node.srcObject) {
              node.srcObject.getTracks?.()?.forEach((t) => t.stop?.());
            }
            node.srcObject = null;
          } catch {}
          node.remove?.();
        });
      } catch {}
    });
  
    // pendingAudioQueueRef cleanup
    try {
      pendingAudioQueueRef.current.delete(`mic-${leftUserId}`);
      pendingAudioQueueRef.current.delete(`viewer-mic-${leftUserId}`);
      pendingAudioQueueRef.current.delete(`screen-${leftUserId}`);
      pendingAudioQueueRef.current.delete(`viewer-screen-audio-${leftUserId}`);
      setPendingAudioStreams(new Map(pendingAudioQueueRef.current));
    } catch {}
  
    // =========================
    // 5) mediasoup consumers cleanup (best-effort by appData.userId)
    // =========================
    try {
      consumers.current?.forEach?.((consumer, key) => {
        const uid =
          consumer?.appData?.userId ||
          consumer?.appData?.peerId ||
          consumer?.appData?.participantId;
  
        if (uid === leftUserId) {
          try { consumer.close(); } catch {}
          consumers.current.delete(key);
        }
      });
    } catch {}
  
    try {
      if (leftSocketId) {
        const toRemove = Array.from(remoteVideosRef.current.entries()).filter(
          ([_, video]) => video?.dataset?.socketId === leftSocketId
        );
  
        toRemove.forEach(([producerId, video]) => {
          try { video.remove(); } catch {}
          remoteVideosRef.current.delete(producerId);
        });
      }
    } catch {}
  }, [
    addDebugLog,
    setParticipants,
    setHandRaisedUsers,
    setSpeakingUsers,
    setActiveSpeakers,
    setViewerAudioRequests,
    setViewerVideoRequests,
    setScreenShareRequests,
    setActiveViewerAudio,
    setZoomed,
    setViewerScreenShare,
    setActiveScreenShare,
    setViewerCameras,
    setViewerAudios,
    setPendingAudioStreams,
  ]);

  const handleAudioConsumer = (audioTrack, producerInfo, sourceType) => {
const normalizedSourceType =
      sourceType === "screen-audio" ||
      sourceType === "viewer-screen-audio" ||
      sourceType === "viewer-screen_audio" ||
      sourceType === "screen_audio"
        ? "viewer-screen-audio"
        : sourceType === "app-viewer-screen-audio" // 👈 ✅ Yahan separate rakho
        ? "app-viewer-screen-audio"
        : "viewer-mic";
  
    const audioStream = new MediaStream([audioTrack]);
    const userId = producerInfo.userId;
    const userName = producerInfo.userName || `User ${userId}`;
    const audioKey = `${normalizedSourceType}-${userId}`;
  
    addDebugLog(`🎵 Processing audio consumer: ${userId} (${normalizedSourceType})`);
  
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

  return {
    startStreamerSpeakingDetection,
    stopStreamerSpeakingDetection,
    startSpeakingDetection,
    stopSpeakingDetection,
    getMixedAudioStream,
    cleanupScreenCapture,
    cleanupViewerAudio,
    cleanupViewerCamera,
    cleanupViewerMedia,
    cleanupScreenShareAudio,
    cleanupOnlyMicrophoneAudio,
    cleanupUserOnLeft,
    handleAudioConsumer,
    playAllAudio,
    createAndPlayAudioElement
  };
};