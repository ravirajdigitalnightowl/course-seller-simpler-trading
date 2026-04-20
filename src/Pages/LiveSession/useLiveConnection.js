import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getOptimizedAudioConstraints, detectEarphones } from './audioConstraints';
import { toast } from 'react-toastify';

export const useLiveConnection = ({
  // Core Context
  sessionId, roomCode, token, user, device,
  // Refs
  videoRef, screenRef, socketRef, sendTransportRef, recvTransportRef,
  producers, consumers, transports, remoteVideosRef, isRecordingRef, 
  viewerScreenRef, pendingAudioQueueRef, isMountedRef,
  // States
  mediaStream, isMobile, permissionStatus, isMediaInitialized, roomState,
  producersState,
  // Setters
  setSocket, setIsConnected, setParticipants, setMessages,
  setProducersState, setRoomState, setLocalPausedState,
  setPermissionStatus, setIsLoading, setIsInitializing, setCameraVisible,
  setShowPlayButton, setMediaError, setCameraReady, setIsMediaInitialized,
  setViewerScreenShare, setZoomed, setSpeakingUsers, setHandRaisedUsers,
  setViewerAudioRequests, setScreenShareRequests, setActiveSpeakers, setActiveViewerAudio,
  setMediaStream, setIceServers, setSession, setViewerVideoRequests,
  setIsPlaying, setIsWebSocketInitialized, setIsRecording, setViewerCameras,
  // Helpers & External Processors
  addDebugLog, getSocket, emitSocketEvent, cleanupViewerMedia, 
  cleanupViewerCamera, cleanupScreenShareAudio, cleanupOnlyMicrophoneAudio, setAppViewerScreenShare,
  cleanupUserOnLeft, handleAudioConsumer, startRecordingTimer
}) => {

  // ==========================================
  // 1. ALL CAMERA & PERMISSION FUNCTIONS
  // ==========================================
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
      
      const audioConstraints = await getOptimizedAudioConstraints(); 
      const earphoneInfo = await detectEarphones();
      
      if (earphoneInfo.hasEarphone) {
        audioConstraints.channelCount = 2;
        audioConstraints.sampleRate = 48000; // High quality for earphones
        
        if (earphoneInfo.isBluetooth) {
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
          facingMode: { ideal: "user" },     // front camera
          width: { ideal: 640, max: 640 },   // viewer-like
          height: { ideal: 360, max: 360 },  // viewer-like
          frameRate: { ideal: 24, max: 24 }, // 24 fps
        },
        audio: audioConstraints
      };

      addDebugLog('🎯 Requesting media with constraints:', { video: constraints.video, audio: constraints.audio });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📱 Camera stream obtained with optimized audio');

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length === 0) {
        throw new Error('No video track found in stream');
      }

      setMediaStream(stream);
      setMediaError(null);
      setPermissionStatus('granted');
      setCameraReady(true);
      
      addDebugLog(`✅ Camera ready: ${videoTracks[0].label}, Audio: ${audioTracks.length} tracks`);
      
      setTimeout(() => {
        if (videoRef.current) {
          const videoEl = videoRef.current;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('webkit-playsinline', '');
          videoEl.srcObject = stream;
          
          videoEl.onloadedmetadata = () => addDebugLog('📹 Video metadata loaded');
          videoEl.oncanplay = () => addDebugLog('📹 Video can play');
          videoEl.onerror = (e) => {
            console.error('📹 Video error:', e);
            addDebugLog(`❌ Video error: ${e.message}`);
          };

          setTimeout(() => {
            videoEl.play().then(() => {
              addDebugLog('✅ Autoplay successful');
              setIsPlaying(true);
              setShowPlayButton(false);
              setIsLoading(false);
              setIsInitializing(false);
            }).catch(error => {
              console.log('📱 Autoplay blocked, waiting for user gesture');
              addDebugLog(`📱 Autoplay blocked: ${error.message}`);
              setShowPlayButton(true);
              setIsLoading(false);
              setIsInitializing(false);
            });
          }, 800);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      addDebugLog(`❌ Camera access error: ${error.message}`);
      
      let errorMessage = `Camera error: ${error.message}`;
      if (error.name === 'NotAllowedError') errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
      else if (error.name === 'NotFoundError') errorMessage = 'No camera found. Please check if camera is connected.';
      else if (error.name === 'NotSupportedError') errorMessage = 'Camera not supported on this device/browser.';
      else if (error.name === 'NotReadableError') errorMessage = 'Camera is already in use by another application.';
      else if (error.name === 'OverconstrainedError') errorMessage = 'Camera constraints cannot be satisfied. Trying with default settings...'; 
      
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
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
        try { transport.close(); } catch (error) { console.error('Error closing transport:', error); }
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

  // ==========================================
  // 2. MEDIASOUP TRANSPORT & PRODUCER LOGIC
  // ==========================================
  const handleTransportConnect = (currentSessionId, transportId, dtlsParameters) => {
    return new Promise((resolve, reject) => {
      emitSocketEvent('transport-connect', { sessionId: currentSessionId, transportId, dtlsParameters }, (response) => {
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
      emitSocketEvent('transport-produce', { sessionId: currentSessionId, transportId, kind, rtpParameters, appData }, (response) => {
        if (response && response.id) {
          resolve(response.id);
        } else {
          reject(new Error(response?.error || 'Produce failed'));
        }
      });
    });
  };

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
            } catch (err) { errback(err); }
          });

          transport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
              const producerId = await handleTransportProduce(currentSessionId, transport.id, kind, rtpParameters, appData);
              callback({ id: producerId });
            } catch (err) { errback(err); }
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
            } catch (err) { errback(err); }
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

  const setupStreamerMedia = async (currentSessionId) => {
    try {
      if (producers.current.size > 0) {
        addDebugLog('ℹ️ Producers already exist, skipping setup');
        return;
      }
      if (!mediaStream) throw new Error('No mediaStream available');
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && "contentHint" in videoTrack) {
        videoTrack.contentHint = "motion";
      }
      const audioTrack = mediaStream.getAudioTracks()[0];
      
      if (!videoTrack) throw new Error('No video track available');
      if (!audioTrack) throw new Error('No audio track available');
      
      addDebugLog(`Video track: ${videoTrack.id}, readyState: ${videoTrack.readyState}`);
      addDebugLog(`Audio track: ${audioTrack.id}, readyState: ${audioTrack.readyState}`);

      emitSocketEvent('createWebRtcTransport', { sessionId: currentSessionId }, async (response) => {
        if (!response || response.error || !response.params) {
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
          } catch (error) { errback(error); }
        });

        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
          try {
            const producerId = await handleTransportProduce(currentSessionId, transport.id, kind, rtpParameters, appData);
            callback({ id: producerId });
          } catch (error) { errback(error); }
        });

        try {
          setMediaError(null);
          
          try {
            if (videoTrack && videoTrack.readyState === "live") {
              await videoTrack.applyConstraints({
                frameRate: { ideal: 30, max: 30 }, 
                width: { ideal: 1280, max: 1280 }, 
                height: { ideal: 720, max: 720 },
              });
              addDebugLog("📷 Camera constraints applied: 720p @ 24–30fps");
            }
          } catch (err) { addDebugLog(`⚠️ Camera constraints failed: ${err?.message || err}`); }
          
          const vp8Codec = device.rtpCapabilities.codecs.find(
            (c) => c.mimeType.toLowerCase() === 'video/vp8'
          );

          const videoProducer = await transport.produce({
            track: videoTrack,
            codec: vp8Codec,
            stopTracks: false, 
            appData: { source: "camera", userId: user?.id },
            codecOptions: { videoGoogleStartBitrate: 400, videoGoogleMinBitrate: 150, videoGoogleMaxBitrate: 700, videoCodingMode: "realtime" },
          });

          producers.current.set(videoProducer.id, videoProducer);
          setProducersState((prev) => new Map(prev).set(videoProducer.id, { id: videoProducer.id, kind: "video", paused: false, source: "camera" }));
          addDebugLog(`✅ Video producer created (NO simulcast): ${videoProducer.id}`);

          const audioProducer = await transport.produce({
            track: audioTrack,
            stopTracks: false,
            appData: { source: "mic", userId: user?.id },
          });

          producers.current.set(audioProducer.id, audioProducer);
          setProducersState((prev) => new Map(prev).set(audioProducer.id, { id: audioProducer.id, kind: "audio", paused: false, source: "mic" }));
          addDebugLog(`✅ Audio producer created: ${audioProducer.id}`);

          setRoomState((prev) => ({ ...prev, isStreaming: true, isPaused: false }));
          setIsInitializing(false);
          setIsLoading(false);

          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused && !roomState.isPaused) {
              videoRef.current.play().catch((error) => {
                setShowPlayButton(true);
              });
            }
          }, 500);

        } catch (error) {
          addDebugLog(`❌ Producer creation error: ${error.message}`);
          setIsInitializing(false);
          setIsLoading(false);
        }
      });
    } catch (error) {
      setMediaError('Failed to set up media streaming');
      addDebugLog(`❌ Media setup error: ${error.message}`);
      setIsInitializing(false);
      setIsLoading(false);
    }
  };

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
  //     if (!socket) return;
      
  //     socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
  //       if (response.error || !response.rtpCapabilities) {
  //         setMediaError('Failed to initialize media server');
  //         setIsMediaInitialized(false);
  //         return;
  //       }
  //       try {
  //         await device.load({ routerRtpCapabilities: response.rtpCapabilities });
  //         addDebugLog(`✅ Device loaded successfully`);
  //         await createRecvTransport(currentSessionId);
  //         await createSendTransport(currentSessionId);
  //         await setupStreamerMedia(currentSessionId);
  //       } catch (error) {
  //         setMediaError('Failed to initialize media device');
  //         setIsMediaInitialized(false);
  //         addDebugLog(`❌ Device load error: ${error.message}`);
  //       }
  //     });
  //   } catch (error) {
  //     setMediaError('Failed to initialize media');
  //     setIsMediaInitialized(false);
  //     addDebugLog(`❌ Media init error: ${error.message}`);
  //   }
  // };


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
      if (!socket) return;
      socket.emit('getRouterRtpCapabilities', { sessionId: currentSessionId }, async (response) => {
        if (response.error || !response.rtpCapabilities) {
          setMediaError('Failed to initialize media server');
          setIsMediaInitialized(false);
          return;
        }
        try {
          await device.load({ routerRtpCapabilities: response.rtpCapabilities });
          addDebugLog(`✅ Device loaded successfully`);
  
          await createRecvTransport(currentSessionId);
          await createSendTransport(currentSessionId);
          await setupStreamerMedia(currentSessionId);

       // ✅ Backend ab complete data bhej raha hai, isliye direct loop chalayein
          socket.emit("getProducers", { sessionId: currentSessionId }, (producersList) => {
            if (producersList && producersList.length > 0) {
              setProducersState((prev) => {
                const updatedState = new Map(prev);
                
                producersList.forEach((p) => {
                  // State mein add karein (Viewer modal list ke liye)
                  updatedState.set(p.id, { 
                    id: p.id, 
                    kind: p.kind, 
                    userId: p.userId,  // Ye ab perfectly string aur valid hoga
                    userName: p.userName,
                    source: p.source, 
                    paused: false 
                  });
                  
                  // Inko auto-consume karein (viewer-camera ko chhor kar)
                  if (
                    p.source === "viewer-screen" || 
                    p.source === "viewer-screen-audio" || 
                    p.source === "viewer-mic" ||
                    p.source === "app-viewer-screen" ||       // 👈 ✅ YEH ADD KARO
                    p.source === "app-viewer-screen-audio"
                  ) {
                    createConsumer(currentSessionId, p.id, p.kind);
                  }
                });
                
                return updatedState;
              });
            }
          });
        } catch (error) {
          setMediaError('Failed to initialize media device');
          setIsMediaInitialized(false);
          addDebugLog(`❌ Device load error: ${error.message}`);
        }
      });
    } catch (error) {
      setMediaError('Failed to initialize media');
      setIsMediaInitialized(false);
      addDebugLog(`❌ Media init error: ${error.message}`);
    }
  };


 const createConsumer = async (currentSessionId, producerId, kind, transportId = null) => {
  try {
    const socket = getSocket();
    if (!socket) return;

    if (consumers.current.has(producerId)) return;

    socket.emit("getProducerInfo", { sessionId: currentSessionId, producerId }, async (info) => {
      if (!info) return;

      const isSelfProducer = info.userId?.toString() === user?.id?.toString();
      if (isSelfProducer) return;

      // ✅ ProducersState update - viewer-screen bhi ab track hoga
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

      let resolvedTransportId = transportId;
      if (!resolvedTransportId && recvTransportRef.current) {
        resolvedTransportId = recvTransportRef.current.id;
      }
      if (!resolvedTransportId) {
        addDebugLog(`❌ No transport found for producer: ${producerId}`);
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
            addDebugLog(`❌ Consume failed for ${producerId}: ${response?.error}`);
            return;
          }

          const consumerParams = response.params;
          const transport = transports.current.get(resolvedTransportId);
          if (!transport) {
            addDebugLog(`❌ Transport not found: ${resolvedTransportId}`);
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

            consumers.current.set(producerId, consumer);
            addDebugLog(
              `✅ Consumer created: ${consumer.id} (${info.source}) for user ${info.userId}`
            );

            if (consumer.track) {
              // ✅ FIX 1: viewer-screen - stream properly set karo (prev state merge karo)
              if (info.source === "viewer-screen") {
                try {
                  const screenStream = new MediaStream([consumer.track]);
                  setViewerScreenShare((prev) => {
                    // Agar pehle se same user ka entry hai to stream update karo
                    if (prev && prev.userId?.toString() === info.userId?.toString()) {
                      return { ...prev, stream: screenStream, producerId };
                    }
                    // Fresh entry
                    return {
                      userId: info.userId,
                      userName: info.userName || "Viewer",
                      stream: screenStream,
                      source: "viewer-screen",
                      producerId,
                      hasAudio: false,
                    };
                  });

                  // ✅ FIX 2: Auto-zoom viewer screen share to main stage
                  setZoomed({
                    type: "viewer-screen",
                    stream: screenStream,
                    userId: info.userId,
                  });

                  addDebugLog(
                    `✅ Viewer screen share stream set for user: ${info.userId}`
                  );
                } catch (err) {
                  addDebugLog(`❌ viewer-screen stream error: ${err.message}`);
                }

              // ✅ viewer-screen-audio - pehle jaise hi
              } else if (info.source === "viewer-screen-audio") {
                handleAudioConsumer(consumer.track, info, "viewer-screen-audio");
                setViewerScreenShare((prev) => {
                  if (prev && prev.userId?.toString() === info.userId?.toString()) {
                    return { ...prev, hasAudio: true };
                  }
                  return prev;
                });

              // ✅ viewer-mic - pehle jaise hi
              }
              else if (info.source === "app-viewer-screen") {
                try {
                  const screenStream = new MediaStream([consumer.track]);
                  setAppViewerScreenShare((prev) => {
                    if (prev && prev.userId?.toString() === info.userId?.toString()) {
                      return { ...prev, stream: screenStream, producerId };
                    }
                    return {
                      userId: info.userId,
                      userName: info.userName || "App Viewer",
                      stream: screenStream,
                      source: "app-viewer-screen",
                      producerId,
                      hasAudio: false,
                    };
                  });
                  // Zoom on main stage
                  setZoomed({ type: "app-viewer-screen", stream: screenStream, userId: info.userId });
                  addDebugLog(`✅ App Viewer screen share stream set for user: ${info.userId}`);
                } catch (err) {
                  addDebugLog(`❌ app-viewer-screen stream error: ${err.message}`);
                }

              // ✅ NAYA: APP VIEWER SCREEN AUDIO
              } else if (info.source === "app-viewer-screen-audio") {
                handleAudioConsumer(consumer.track, info, "app-viewer-screen-audio");
                setAppViewerScreenShare((prev) => {
                  if (prev && prev.userId?.toString() === info.userId?.toString()) {
                    return { ...prev, hasAudio: true };
                  }
                  return prev;
                });
              }
              
              else if (info.source === "viewer-mic") {
                handleAudioConsumer(consumer.track, info, "viewer-mic");

              // ✅ viewer-camera - pehle jaise hi
              } else if (info.source === "viewer-camera") {
                try {
                  const videoStream = new MediaStream([consumer.track]);
                  setViewerCameras((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(info.userId, videoStream);
                    return newMap;
                  });
                  addDebugLog(
                    `✅ Viewer camera stream set for user: ${info.userId}`
                  );
                } catch (err) {
                  addDebugLog(`❌ viewer-camera stream error: ${err.message}`);
                }
              }
            } else {
              addDebugLog(`⚠️ Consumer track is null for producer: ${producerId}`);
            }

            // ✅ Consumer resume - same as before
            socket.emit(
              "consumer-resume",
              { sessionId: currentSessionId, consumerId: consumer.id },
              (resumeResponse) => {
                if (resumeResponse?.success) {
                  addDebugLog(`✅ Consumer ${consumer.id} resumed`);
                } else {
                  addDebugLog(`⚠️ Consumer resume issue: ${consumer.id}`);
                }
              }
            );
          } catch (error) {
            console.error("Consumer creation error:", error);
            addDebugLog(`❌ Consumer creation threw error: ${error.message}`);
          }
        }
      );
    });
  } catch (error) {
    console.error("createConsumer error:", error);
    addDebugLog(`❌ createConsumer outer error: ${error.message}`);
  }
};

  const handlePauseProducer = async (producerId) => {
    emitSocketEvent('producer-pause', { sessionId: sessionId || roomCode, producerId: producerId });
    setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(producerId);
      if (producer) newState.set(producerId, { ...producer, paused: true });
      return newState;
    });
  };

  const handleResumeProducer = async (producerId) => {
    emitSocketEvent('producer-resume', { sessionId: sessionId || roomCode, producerId: producerId });
    setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(producerId);
      if (producer) newState.set(producerId, { ...producer, paused: false });
      return newState;
    });
  };

  const handleCloseProducer = async (producerId) => {
    emitSocketEvent('producer-close', { sessionId: sessionId || roomCode, producerId: producerId });
    setProducersState(prev => {
      const newState = new Map(prev);
      newState.delete(producerId);
      return newState;
    });
    producers.current.delete(producerId);
  };

  // ==========================================
  // 3. SOCKET LISTENERS & HANDLERS
  // ==========================================
  const handleNewViewerScreenProducer = useCallback((data) => {
    addDebugLog(`New viewer screen producer: ${data.producerId} from user: ${data.userId}`);
    const socket = getSocket();
    if (socket) createConsumer(sessionId || roomCode, data.producerId, data.kind);
  }, [sessionId, roomCode]);

  const handleViewerAudioPermissionGranted = useCallback((data) => {
    const socket = getSocket();
    if (socket && data.userId !== user?.id) createConsumer(sessionId || roomCode, data.producerId, 'audio');
  }, [sessionId, roomCode, user]);

  const handleViewerAudioRequest = useCallback((data) => {
    setViewerAudioRequests(prev => [...prev, {
      requestedUserId: data.requestedUserId, requesterSocketId: data.requesterSocketId, requesterName: data.requesterName || 'Viewer', timestamp: new Date()
    }]);
  }, []);

  const handleScreenShareRequest = useCallback((data) => {
    setScreenShareRequests(prev => [...prev, {
      requestedUserId: data.requestedUserId, requesterSocketId: data.requesterSocketId, requesterName: data.requesterName || 'Viewer', timestamp: new Date()
    }]);
  }, []);

  const handleViewerAudioStarted = useCallback((data) => {
    setActiveViewerAudio(prev => new Map(prev).set(data.socketId, { userId: data.userId, socketId: data.socketId, producerId: data.producerId }));
  }, []);

  const handleViewerAudioMuted = useCallback((data) => {
    setActiveViewerAudio(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.socketId);
      return newMap;
    });
  }, []);

const handleScreenShareStarted = useCallback((data) => {
  setViewerScreenShare((prev) => {
    if (prev?.source === "streamer") return prev;
    if (prev?.userId?.toString() === data.userId?.toString() && prev?.stream) {
      return prev;
    }
    return {
      userId: data.userId,
      userName: data.userName,
      stream: null,
      source: "viewer-screen",
      hasAudio: false,
    };
  });

  setTimeout(async () => {
    const sock = socketRef.current;
    if (!sock) return;

    // ✅ STEP 1: Pehle producers fetch karo aur consume karo
    sock.emit(
      "getProducersByUser",
      { sessionId: sessionId || roomCode, userId: data.userId },
      async (producers) => {
        if (Array.isArray(producers)) {
          producers.forEach((p) => {
            if (
              p.source === "viewer-screen" ||
              p.source === "viewer-screen-audio" ||
              p.source === "app-viewer-screen" ||       // 👈 ✅ YEH ADD KARO
                    p.source === "app-viewer-screen-audio"
            ) {
              addDebugLog(
                `🖥️ Manually consuming viewer screen producer: ${p.producerId} (${p.source})`
              );
              createConsumer(sessionId || roomCode, p.producerId, p.kind);
            }
          });
          
          // Note: Recording start/update logic has been completely removed from here.
          // The Auto-Mixer useEffect will automatically catch the new audio track 
          // once createConsumer finishes and adds it to the viewerAudios state!

        } else {
          addDebugLog(`⚠️ getProducersByUser returned no data for user: ${data.userId}`);
        }
      }
    );
  }, 800);
}, [sessionId, roomCode]);

  const handleScreenShareStopped = useCallback((data) => {
    if (data.source !== "viewer-screen") return;

    setZoomed((prev) => {
      if (prev && (prev.type === "viewer-screen" || prev.type === "screen") && prev.userId === data.userId) return null;
      return prev;
    });

    setViewerScreenShare((prev) => {
      if (prev?.stream) {
        try { prev.stream.getTracks().forEach((track) => track.stop()); } catch (e) {}
      }
      return null;
    });

    if (viewerScreenRef?.current) {
      try {
        viewerScreenRef.current.srcObject = null;
        viewerScreenRef.current.load?.();
      } catch (e) {}
    }
  }, [setZoomed, setViewerScreenShare]);

const handleViewerScreenShareStopped = useCallback(async (data) => {
  console.log("🛑 Viewer/App screen share stopped:", data);

  // ✅ 1. Web Viewer ka state clear karo
  setViewerScreenShare((prev) => {
    if (prev?.userId?.toString() === data.userId?.toString()) return null;
    return prev;
  });

  // ✅ 2. App Viewer ka state clear karo (IS SE PANEL GAYAB HOGA)
  if (typeof setAppViewerScreenShare === 'function') {
    setAppViewerScreenShare((prev) => {
      if (prev?.userId?.toString() === data.userId?.toString()) return null;
      return prev;
    });
  }

  // ✅ 3. Zoom hatane ka logic (isme 'app-viewer-screen' add kiya)
  setZoomed((prev) => {
    if (
      prev && 
      (prev.type === "screen" || prev.type === "viewer-screen" || prev.type === "app-viewer-screen") && 
      prev.userId?.toString() === data.userId?.toString()
    ) {
      return null;
    }
    return prev;
  });

  // ✅ 4. App Screen Share ka Audio DOM se clear karo taaki background noise na rahe
  if (typeof cleanupScreenShareAudio === 'function') {
    cleanupScreenShareAudio(data.userId);
  }

}, [setZoomed, setViewerScreenShare, setAppViewerScreenShare, cleanupScreenShareAudio]);
  const handleViewerVideoRequest = useCallback((data) => {
    setViewerVideoRequests((prev) => [ ...prev, { userId: data.requestedUserId, userName: data.requesterName, socketId: data.socketId } ]);
  }, []);

  const joinRoomWithRetry = (retries = 3) => {
    const socket = getSocket();
    if (!socket) return;
    
    if (retries === 0) {
      alert('Failed to join the session. Please try again.');
      return;
    }
    
    socket.emit('join_room', { token, sessionId: sessionId || null, roomCode: roomCode || null }, (response) => {
      if (response && response.error) {
        setTimeout(() => joinRoomWithRetry(retries - 1), 1000);
      }
    });
  };

  const initializeWebSocket = () => {
    if (permissionStatus !== 'granted') {
      addDebugLog('❌ Cannot initialize WebSocket without camera permissions');
      return;
    }

    addDebugLog('Setting up socket connection...');
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

    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));
    newSocket.on('error_message', (data) => alert(data.message || data));

    // Listeners
    newSocket.on('new-viewer-screen-producer', handleNewViewerScreenProducer);
    newSocket.on('recording_started', () => setIsRecording(true));
    newSocket.on('recording_stopped', () => setIsRecording(false));
    newSocket.on('viewer-audio-permission-granted', handleViewerAudioPermissionGranted);
    newSocket.on('viewer-audio-request', handleViewerAudioRequest);
    newSocket.on('screen-share-request', handleScreenShareRequest);
    newSocket.on('viewer-audio-started', handleViewerAudioStarted);
    newSocket.on('viewer-audio-muted', handleViewerAudioMuted);
    newSocket.on('screen-share-started-by-viewer', handleScreenShareStarted);
    newSocket.on('screen-share-stopped-by-viewer', handleViewerScreenShareStopped);
    newSocket.on("viewer-video-request", handleViewerVideoRequest);

    newSocket.on("viewer-audio-stopped", ({ userId }) => {
      cleanupViewerAudio?.(userId);
    });

    newSocket.on("viewer-audio-force-stopped", ({ userId }) => {
      cleanupViewerAudio?.(userId); 
      setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, hasAudio: false } : p));
    });

    newSocket.on("user_left", (data) => {
      try {
        cleanupUserOnLeft(data);
        cleanupViewerMedia?.(data?.userId);
        // 👇 User ke jaane par uske saare producers hatao
        setProducersState((prev) => {
          const newMap = new Map(prev);
          for (const [id, producer] of newMap.entries()) {
            if (producer.userId === data.userId) {
              newMap.delete(id);
            }
          }
          return newMap;
        });
        if (data?.socketId) {
          const toRemove = Array.from(remoteVideosRef.current.entries()).filter(([_, video]) => video?.dataset?.socketId === data.socketId);
          toRemove.forEach(([producerId, video]) => {
            try { video.remove(); } catch {}
            remoteVideosRef.current.delete(producerId);
          });
        }

      } catch (e) {}
    });

    newSocket.on('participant_speaking_status', (data) => {
      setSpeakingUsers(prev => {
        const newMap = new Map(prev);
        if (data.isSpeaking) {
          newMap.set(data.userId, { userId: data.userId, userName: data.userName, timestamp: new Date() });
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    });

    newSocket.on('hand_raise_status', (data) => {
      setHandRaisedUsers(prev => {
        const updated = prev.filter(user => user.userId !== data.userId);
        if (data.isHandRaised) {
          updated.push({ userId: data.userId, userName: data.userName, timestamp: new Date() });
        }
        return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });
    });

    newSocket.on('all_hands_down', () => setHandRaisedUsers([]));
    newSocket.on('viewer-audio-enabled', (data) => setParticipants(prev => prev.map(p => p.userId === data.userId ? { ...p, hasAudio: true } : p)));
    newSocket.on('viewer-audio-started-global', (data) => setActiveSpeakers(prev => new Map(prev).set(data.socketId, { userId: data.userId, socketId: data.socketId, userName: data.userName })));
    newSocket.on('viewer-audio-muted-global', (data) => setActiveSpeakers(prev => {
      const newMap = new Map(prev);
      Array.from(newMap.entries()).forEach(([key, value]) => { if (value.userId === data.userId) newMap.delete(key); });
      return newMap;
    }));

    newSocket.on('joined_room', (data) => {
      setSession(data);
      setParticipants(data.participants || []);
      setIceServers(data.iceServers || []);
      setIsLoading(false);
      if (!isMediaInitialized) initializeMedia(data.sessionId, data.iceServers);
    });

    newSocket.on('ice_servers', (servers) => setIceServers(servers));
    newSocket.on('user_joined', (data) => setParticipants(prev => [...prev, data]));

    newSocket.on('chat_history', (data) => {
      if (!isMountedRef.current) return;
      setMessages(data.messages || []);
    });

    newSocket.on('chat_message', (message) => setMessages(prev => [...prev, { ...message, id: Date.now() + Math.random(), timestamp: message.timestamp || new Date().toISOString() }]));
    newSocket.on('streamer_started', () => { setRoomState(prev => ({ ...prev, isStreaming: true, isPaused: false })); setLocalPausedState(false); });
    newSocket.on('streamer_paused', () => { setRoomState(prev => ({ ...prev, isPaused: true })); setLocalPausedState(true); });
    newSocket.on('streamer_resumed', () => {
      setRoomState(prev => ({ ...prev, isPaused: false }));
      setLocalPausedState(false);
      if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => setShowPlayButton(true));
    });

    newSocket.on("viewer-video-force-stopped-global", ({ userId }) => cleanupViewerMedia(userId));
    newSocket.on("viewer-camera-stopped", ({ userId }) => {
      setZoomed((prev) => (prev && prev.type === "viewer" && prev.userId === userId ? null : prev));
      setProducersState((prev) => {
        const newMap = new Map(prev);
        for (const [id, producer] of newMap.entries()) {
          if (producer.userId === userId && producer.source === "viewer-camera") {
            newMap.delete(id);
          }
        }
        return newMap;
      });
      cleanupViewerCamera(userId);
    });

    newSocket.on("viewer-camera-paused-global", ({ userId }) => setParticipants(prev => prev.map(p => (p.userId === userId ? { ...p, hasVideo: false } : p))));
    newSocket.on("viewer-camera-resumed-global", ({ userId }) => setParticipants(prev => prev.map(p => (p.userId === userId ? { ...p, hasVideo: true } : p))));
    
    newSocket.on('producer-paused', (data) => setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(data.producerId);
      if (producer) newState.set(data.producerId, { ...producer, paused: true });
      return newState;
    }));

    newSocket.on('producer-resumed', (data) => setProducersState(prev => {
      const newState = new Map(prev);
      const producer = newState.get(data.producerId);
      if (producer) newState.set(data.producerId, { ...producer, paused: false });
      return newState;
    }));

    newSocket.on("producer-closed", (data) => {
      const closeConsumerByProducerId = (pId) => {
        try {
          const c = consumers.current.get(pId);
          if (c) {
            try { c.close(); } catch {}
            consumers.current.delete(pId);
          }
        } catch (e) {}
      };

      const removeAudioElById = (id) => {
        try {
          const el = document.getElementById(id);
          if (el) {
            try { el.pause(); } catch {}
            el.srcObject = null;
            if (el.parentNode) el.parentNode.removeChild(el);
          }
        } catch (e) {}
      };

      if (data.source === "screen" || data.source === "screen-audio") {
        closeConsumerByProducerId(data.producerId);
        setActiveScreenShare((prev) => (prev?.userId?.toString() === data.userId?.toString() ? null : prev));
        try {
          const obj = screenRef.current?.srcObject;
          obj?.getTracks?.().forEach((t) => { if (t.kind === "video") t.stop(); });
        } catch (e) {}
        
        if (data.source === "screen" && screenRef.current) {
          try { screenRef.current.srcObject = null; screenRef.current.load?.(); } catch (e) {}
        }
        
        setZoomed((prev) => (prev && (prev.type === "screen" || prev.type === "streamer-screen") && prev.userId?.toString() === data.userId?.toString() ? null : prev));
        removeAudioElById(`audio-${data.userId}-screen-audio`);
        removeAudioElById(`audio-${data.userId}-screen`);
        
        try {
          pendingAudioQueueRef.current.delete(`screen-${data.userId}`);
          pendingAudioQueueRef.current.delete(`viewer-screen-audio-${data.userId}`);
          pendingAudioQueueRef.current.delete(`screen-audio-${data.userId}`);
        } catch (e) {}
      }

      if (data.source === "viewer-screen") {
        closeConsumerByProducerId(data.producerId);
        setZoomed((prev) => (prev && (prev.type === "viewer-screen" || prev.type === "screen") && prev.userId?.toString() === data.userId?.toString() ? null : prev));
        setViewerScreenShare((prev) => {
          if (prev?.stream) { try { prev.stream.getTracks().forEach((t) => { if (t.kind === "video") t.stop(); }); } catch (e) {} }
          return null;
        });
        if (viewerScreenRef?.current) { try { viewerScreenRef.current.srcObject = null; viewerScreenRef.current.load?.(); } catch (e) {} }
      }

      if (data.source === "viewer-screen-audio") {
        closeConsumerByProducerId(data.producerId);
        cleanupScreenShareAudio(data.userId);
        removeAudioElById(`audio-${data.userId}-screen`);
        removeAudioElById(`audio-${data.userId}-viewer-screen-audio`);
        try { pendingAudioQueueRef.current.delete(`screen-${data.userId}`); pendingAudioQueueRef.current.delete(`viewer-screen-audio-${data.userId}`); } catch (e) {}
      }

      if (data.source === "viewer-mic") {
        closeConsumerByProducerId(data.producerId);
        cleanupOnlyMicrophoneAudio(data.userId);
        try { pendingAudioQueueRef.current.delete(`mic-${data.userId}`); pendingAudioQueueRef.current.delete(`viewer-mic-${data.userId}`); } catch (e) {}
      }

      if (data.source === "viewer-camera") {
        closeConsumerByProducerId(data.producerId);
          setProducersState((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.producerId);
        return newMap;
      });
        setViewerCameras((prev) => {
          const newMap = new Map(prev);
          if (newMap.has(data.userId)) {
            const stream = newMap.get(data.userId);
            if (stream) { try { stream.getTracks().forEach((t) => { if (t.kind === "video") t.stop(); }); } catch (e) {} }
            newMap.delete(data.userId);
          }
          return newMap;
        });
      }

      if (data.source === "mic" || data.source === "streamer-mic") {
        closeConsumerByProducerId(data.producerId);
      }

      // ✅ NAYA: APP VIEWER SCREEN CLEANUP
      if (data.source === "app-viewer-screen") {
        closeConsumerByProducerId(data.producerId);
        setZoomed((prev) => (prev && (prev.type === "app-viewer-screen" || prev.type === "screen") && prev.userId?.toString() === data.userId?.toString() ? null : prev));
        
        setAppViewerScreenShare((prev) => {
          if (prev?.stream) { try { prev.stream.getTracks().forEach((t) => { if (t.kind === "video") t.stop(); }); } catch (e) {} }
          return null;
        });
      }

      // ✅ NAYA: APP VIEWER AUDIO CLEANUP
      if (data.source === "app-viewer-screen-audio") {
        closeConsumerByProducerId(data.producerId);
        cleanupScreenShareAudio(data.userId); // Yeh function same use ho jayega
        removeAudioElById(`audio-${data.userId}-app-viewer-screen-audio`);
        try { pendingAudioQueueRef.current.delete(`app-viewer-screen-audio-${data.userId}`); } catch (e) {}
      }
    
    });

  newSocket.on("new-producer", (data) => {
      if (data.source === "mixed-audio") return;

      setProducersState((prev) => {
        const updated = new Map(prev);
        updated.set(data.producerId, { 
          id: data.producerId, 
          kind: data.kind, 
          userId: data.userId, 
          source: data.source || "camera", 
          paused: false 
        });
        return updated;
      });

      // UPDATE: "viewer-camera" ko yahan se hata diya gaya hai.
      // Ab ye sirf screen-share, mic, aur screen-audio ko hi auto-consume karega.
      if (
        data.source === "viewer-screen" || 
        data.source === "viewer-mic" || 
        data.source === "viewer-screen-audio" ||
        data.source === "app-viewer-screen" ||
        data.source === "app-viewer-screen-audio"
      ) {
        createConsumer(sessionId || roomCode, data.producerId, data.kind);
      }
    });

    newSocket.on('participant_updated', (data) => setParticipants(prev => prev.map(p => p.userId === data.userId ? { ...p, ...data.updates } : p)));
    newSocket.on("participants_list_updated", (data) => setParticipants(data.participants || []));

    setSocket(newSocket);
    socketRef.current = newSocket;
  };

  return {
    initializeCamera,
    requestCameraPermissions,
    retryCamera,
    initializeWebSocket,
    initializeMedia,
    createConsumer,
    handlePauseProducer,
    handleResumeProducer,
    handleCloseProducer
  };
};