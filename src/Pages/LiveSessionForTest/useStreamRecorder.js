// // hooks/useStreamRecorder.js
// import { useState, useRef, useCallback, useEffect } from 'react';
// import { toast } from 'react-toastify';

// export const useStreamRecorder = (sessionId, userId) => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [recordingSize, setRecordingSize] = useState(0);
//   const [recordedChunks, setRecordedChunks] = useState([]);
//   const [recordingBlob, setRecordingBlob] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);
  
//   const mediaRecorderRef = useRef(null);
//   const streamRef = useRef(null);
//   const timerRef = useRef(null);
//   const chunksRef = useRef([]);

//   // Streamer ke sabhi audio sources collect kare
//   const collectAudioStreams = useCallback(() => {
//     const audioStreams = [];
    
//     // 1. Streamer ke mic se audio
//     const micStream = getMediaStream('mic');
//     if (micStream) {
//       audioStreams.push(micStream.getAudioTracks()[0]);
//     }
    
//     // 2. Streamer ke screen share audio
//     const screenAudioElements = document.querySelectorAll('[data-audio-source="screen"] audio');
//     screenAudioElements.forEach(audioEl => {
//       if (audioEl.srcObject) {
//         const audioTrack = audioEl.srcObject.getAudioTracks()[0];
//         if (audioTrack) audioStreams.push(audioTrack);
//       }
//     });
    
//     // 3. Streamer ke computer audio (system audio agar capture ho raha ho)
//     const systemAudioElements = document.querySelectorAll('[data-audio-source="system"] audio');
//     systemAudioElements.forEach(audioEl => {
//       if (audioEl.srcObject) {
//         const audioTrack = audioEl.srcObject.getAudioTracks()[0];
//         if (audioTrack) audioStreams.push(audioTrack);
//       }
//     });
    
//     return audioStreams;
//   }, []);

//   // Video sources collect kare
//   const collectVideoStreams = useCallback(() => {
//     const videoStreams = [];
    
//     // 1. Streamer ke camera video
//     const cameraVideo = document.querySelector('#streamer-video video');
//     if (cameraVideo && cameraVideo.srcObject) {
//       const videoTrack = cameraVideo.srcObject.getVideoTracks()[0];
//       if (videoTrack) videoStreams.push(videoTrack);
//     }
    
//     // 2. Streamer ke screen share video
//     const screenVideo = document.querySelector('#screen-share-video video');
//     if (screenVideo && screenVideo.srcObject) {
//       const screenTrack = screenVideo.srcObject.getVideoTracks()[0];
//       if (screenTrack) videoStreams.push(screenTrack);
//     }
    
//     return videoStreams;
//   }, []);

//   // Combined stream create kare
//   const createCombinedStream = useCallback(() => {
//     try {
//       const audioTracks = collectAudioStreams();
//       const videoTracks = collectVideoStreams();
      
//       if (audioTracks.length === 0 && videoTracks.length === 0) {
//         throw new Error('No media sources available for recording');
//       }
      
//       // Naya MediaStream create karen
//       const combinedStream = new MediaStream();
      
//       // Sabhi audio tracks add karen
//       audioTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           combinedStream.addTrack(track.clone());
//         }
//       });
      
//       // Sabhi video tracks add karen
//       videoTracks.forEach(track => {
//         if (track.readyState === 'live') {
//           combinedStream.addTrack(track.clone());
//         }
//       });
      
//       console.log(`Created combined stream with ${combinedStream.getAudioTracks().length} audio tracks and ${combinedStream.getVideoTracks().length} video tracks`);
      
//       return combinedStream;
      
//     } catch (error) {
//       console.error('Error creating combined stream:', error);
//       toast.error('Failed to setup recording: ' + error.message);
//       return null;
//     }
//   }, [collectAudioStreams, collectVideoStreams]);

//   // Recording start kare
//   const startRecording = useCallback(async () => {
//     try {
//       // Check if already recording
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//         toast.info('Recording is already in progress');
//         return false;
//       }
      
//       // Combined stream create kare
//       const combinedStream = createCombinedStream();
//       if (!combinedStream) {
//         return false;
//       }
      
//       // Check if stream has any tracks
//       if (combinedStream.getTracks().length === 0) {
//         toast.error('No active media streams to record');
//         return false;
//       }
      
//       streamRef.current = combinedStream;
//       chunksRef.current = [];
      
//       // MediaRecorder options
//       const options = {
//         mimeType: 'video/webm;codecs=h264,opus',
//         audioBitsPerSecond: 128000,
//         videoBitsPerSecond: 2500000
//       };
      
//       // Fallback mime types
//       const mimeTypes = [
//         'video/webm;codecs=h264,opus',
//         'video/webm;codecs=vp9,opus',
//         'video/webm;codecs=vp8,opus',
//         'video/webm'
//       ];
      
//       let supportedMimeType = '';
//       for (const mime of mimeTypes) {
//         if (MediaRecorder.isTypeSupported(mime)) {
//           supportedMimeType = mime;
//           break;
//         }
//       }
      
//       if (!supportedMimeType) {
//         supportedMimeType = '';
//       }
      
//       // MediaRecorder create kare
//       mediaRecorderRef.current = new MediaRecorder(combinedStream, {
//         mimeType: supportedMimeType
//       });
      
//       // Event handlers
//       mediaRecorderRef.current.ondataavailable = (event) => {
//         if (event.data && event.data.size > 0) {
//           chunksRef.current.push(event.data);
//           setRecordingSize(prev => prev + event.data.size);
//         }
//       };
      
//       mediaRecorderRef.current.onstop = () => {
//         const blob = new Blob(chunksRef.current, { 
//           type: mediaRecorderRef.current?.mimeType || 'video/webm' 
//         });
//         setRecordingBlob(blob);
//         setRecordedChunks([...chunksRef.current]);
        
//         // Cleanup
//         if (streamRef.current) {
//           streamRef.current.getTracks().forEach(track => track.stop());
//           streamRef.current = null;
//         }
//       };
      
//       mediaRecorderRef.current.onerror = (event) => {
//         console.error('MediaRecorder error:', event.error);
//         toast.error(`Recording error: ${event.error.name}`);
//         stopRecording();
//       };
      
//       // Start recording
//       mediaRecorderRef.current.start(1000); // 1-second chunks
//       setIsRecording(true);
      
//       // Timer start kare
//       const startTime = Date.now();
//       timerRef.current = setInterval(() => {
//         setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
//       }, 1000);
      
//       toast.success('Recording started!');
//       return true;
      
//     } catch (error) {
//       console.error('Error starting recording:', error);
//       toast.error('Failed to start recording: ' + error.message);
//       return false;
//     }
//   }, [createCombinedStream]);

//   // Recording stop kare
//   const stopRecording = useCallback(async () => {
//     try {
//       if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
//         return null;
//       }
      
//       // Recording stop kare
//       mediaRecorderRef.current.stop();
      
//       // Timer clear kare
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//       }
      
//       setIsRecording(false);
      
//       // Wait for data to be available
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       const blob = new Blob(chunksRef.current, { 
//         type: mediaRecorderRef.current?.mimeType || 'video/webm' 
//       });
      
//       toast.success(`Recording stopped. Duration: ${formatTime(recordingTime)}`);
      
//       // Auto save to server
//       if (blob.size > 0) {
//         await saveRecordingToServer(blob);
//       }
      
//       return blob;
      
//     } catch (error) {
//       console.error('Error stopping recording:', error);
//       toast.error('Error stopping recording');
//       return null;
//     }
//   }, [recordingTime]);

//   // Server par save kare
//   const saveRecordingToServer = useCallback(async (blob) => {
//     try {
//       setIsUploading(true);
      
//       // File size check
//       if (blob.size > 500 * 1024 * 1024) { // 500MB limit
//         toast.error('Recording is too large (max 500MB)');
//         return false;
//       }
      
//       const formData = new FormData();
//       const fileName = `recording_${sessionId}_${Date.now()}.webm`;
      
//       formData.append('recording', blob, fileName);
//       formData.append('sessionId', sessionId);
//       formData.append('userId', userId);
//       formData.append('duration', recordingTime);
//       formData.append('fileSize', blob.size);
      
//       const response = await fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         },
//         body: formData
//       });
      
//       if (!response.ok) {
//         throw new Error('Upload failed');
//       }
      
//       const data = await response.json();
//       toast.success('Recording saved successfully!');
      
//       // Download link provide kare (optional)
//       if (data.downloadUrl) {
//         console.log('Download URL:', data.downloadUrl);
//       }
      
//       return true;
      
//     } catch (error) {
//       console.error('Error uploading recording:', error);
//       toast.error('Failed to upload recording');
      
//       // Fallback: Download locally
//       downloadRecordingLocally(blob);
      
//       return false;
//     } finally {
//       setIsUploading(false);
//       setRecordingTime(0);
//       setRecordingSize(0);
//       chunksRef.current = [];
//       setRecordedChunks([]);
//     }
//   }, [sessionId, userId, recordingTime]);

//   // Local download option
//   const downloadRecordingLocally = useCallback((blob) => {
//     try {
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `recording_${sessionId}_${Date.now()}.webm`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
      
//       toast.info('Recording downloaded locally');
//     } catch (error) {
//       console.error('Download error:', error);
//       toast.error('Failed to download recording');
//     }
//   }, [sessionId]);

//   // Format time helper
//   const formatTime = useCallback((seconds) => {
//     const hrs = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   }, []);

//   // Format size helper
//   const formatSize = useCallback((bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   }, []);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//       }
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//         mediaRecorderRef.current.stop();
//       }
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);

//   return {
//     isRecording,
//     recordingTime,
//     recordingSize,
//     isUploading,
//     recordedChunks,
//     recordingBlob,
//     startRecording,
//     stopRecording,
//     formatTime,
//     formatSize,
//     downloadRecordingLocally
//   };
// };

// // Helper function to get media stream
// const getMediaStream = (source) => {
//   // Ye function tumhare existing media streams fetch karega
//   const videoElements = document.querySelectorAll('video');
//   for (const video of videoElements) {
//     if (video.srcObject && video.dataset.source === source) {
//       return video.srcObject;
//     }
//   }
//   return null;
// };























// hooks/useStreamRecorder.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useStreamRecorder = (sessionId, userId, mediaStream, activeScreenShare) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingSize, setRecordingSize] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  
  // Audio sources directly capture kare
  const captureAudioSources = useCallback(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    
    // 1. Streamer ke mic se audio
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const mediaStreamSource = audioContext.createMediaStreamSource(
          new MediaStream([audioTracks[0]])
        );
        mediaStreamSource.connect(destination);
        console.log('🎤 Mic audio connected to recording');
      }
    }
    
    // 2. Active screen share audio
    if (activeScreenShare?.stream) {
      const screenAudioTracks = activeScreenShare.stream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([screenAudioTracks[0]])
        );
        screenAudioSource.connect(destination);
        console.log('🖥️ Screen audio connected to recording');
      }
    }
    
    // 3. Viewers ke audio (agar record karna chahte hain)
    document.querySelectorAll('audio').forEach((audioEl, index) => {
      if (audioEl.srcObject && !audioEl.muted) {
        try {
          const viewerAudioStream = audioEl.srcObject;
          const viewerAudioTracks = viewerAudioStream.getAudioTracks();
          if (viewerAudioTracks.length > 0 && viewerAudioTracks[0].readyState === 'live') {
            const viewerAudioSource = audioContext.createMediaStreamSource(
              new MediaStream([viewerAudioTracks[0]])
            );
            viewerAudioSource.connect(destination);
            console.log(`👂 Viewer audio ${index + 1} connected to recording`);
          }
        } catch (error) {
          console.warn('Error connecting viewer audio:', error);
        }
      }
    });
    
    return destination.stream;
  }, [mediaStream, activeScreenShare]);

  // Video sources combine kare
  const captureVideoSources = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas size set kare
    canvas.width = 1280;
    canvas.height = 720;
    
    const videoElements = [];
    
    // 1. Streamer camera video
    const cameraVideo = document.getElementById('streamer-video') || 
                       document.querySelector('video[data-source="camera"]');
    if (cameraVideo && cameraVideo.srcObject) {
      videoElements.push({
        video: cameraVideo,
        x: 0,
        y: 0,
        width: 640,
        height: 360
      });
    }
    
    // 2. Active screen share video
    if (activeScreenShare?.stream) {
      const screenVideoElement = document.createElement('video');
      screenVideoElement.srcObject = activeScreenShare.stream;
      screenVideoElement.muted = true;
      screenVideoElement.play();
      
      videoElements.push({
        video: screenVideoElement,
        x: 640,
        y: 0,
        width: 640,
        height: 360
      });
    }
    
    // Agar koi video nahi hai to return null
    if (videoElements.length === 0) {
      return null;
    }
    
    // Canvas stream create kare
    const drawFrame = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      videoElements.forEach(({ video, x, y, width, height }) => {
        if (video.videoWidth && video.videoHeight) {
          ctx.drawImage(video, x, y, width, height);
        }
      });
    };
    
    const frameInterval = setInterval(drawFrame, 33); // ~30fps
    
    // Canvas stream return kare
    const canvasStream = canvas.captureStream(30);
    
    // Cleanup function
    const cleanup = () => {
      clearInterval(frameInterval);
    };
    
    return { stream: canvasStream, cleanup };
  }, [activeScreenShare]);

  // Combined stream create kare - SIMPLIFIED VERSION
  const createCombinedStream = useCallback(() => {
    try {
      console.log('🔄 Creating combined stream...');
      
      const combinedStream = new MediaStream();
      
      // 1. AUDIO TRACKS - Directly add tracks from streams
      
      // Streamer mic audio
      if (mediaStream) {
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
          combinedStream.addTrack(audioTracks[0]);
          console.log('✅ Added mic audio track');
        }
      }
      
      // Screen share audio
      if (activeScreenShare?.stream) {
        const screenAudioTracks = activeScreenShare.stream.getAudioTracks();
        if (screenAudioTracks.length > 0 && screenAudioTracks[0].readyState === 'live') {
          combinedStream.addTrack(screenAudioTracks[0]);
          console.log('✅ Added screen audio track');
        }
      }
      
      // 2. VIDEO TRACKS
      
      // Streamer camera video
      if (mediaStream) {
        const videoTracks = mediaStream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
          combinedStream.addTrack(videoTracks[0]);
          console.log('✅ Added camera video track');
        }
      }
      
      // Screen share video
      if (activeScreenShare?.stream) {
        const screenVideoTracks = activeScreenShare.stream.getVideoTracks();
        if (screenVideoTracks.length > 0 && screenVideoTracks[0].readyState === 'live') {
          combinedStream.addTrack(screenVideoTracks[0]);
          console.log('✅ Added screen video track');
        }
      }
      
      // Check if we have any tracks
      const totalTracks = combinedStream.getTracks().length;
      console.log(`📊 Combined stream has ${totalTracks} tracks`);
      
      if (totalTracks === 0) {
        throw new Error('No active media tracks found');
      }
      
      return combinedStream;
      
    } catch (error) {
      console.error('❌ Error creating combined stream:', error);
      throw error;
    }
  }, [mediaStream, activeScreenShare]);

  // Recording start kare
  const startRecording = useCallback(async () => {
    try {
      console.log('🎬 Starting recording...');
      
      if (isRecording) {
        console.log('⏩ Already recording');
        return false;
      }
      
      // Combined stream create kare
      const combinedStream = createCombinedStream();
      
      if (!combinedStream || combinedStream.getTracks().length === 0) {
        toast.error('No active media found to record');
        return false;
      }
      
      streamRef.current = combinedStream;
      chunksRef.current = [];
      
      // Supported mime types check kare
      let mimeType = '';
      const mimeTypes = [
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        mimeType = '';
        console.warn('No specific mime type supported, using default');
      }
      
      console.log(`🎥 Using mime type: ${mimeType || 'default'}`);
      
      // MediaRecorder create kare
      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(combinedStream, options);
      
      // Event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          setRecordingSize(prev => prev + event.data.size);
          console.log(`📦 Data chunk: ${event.data.size} bytes`);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped, creating blob...');
        
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current.mimeType || 'video/webm'
          });
          setRecordedBlob(blob);
          console.log(`✅ Recording blob created: ${formatSize(blob.size)}`);
          
          // Auto-upload
          saveRecordingToServer(blob);
        } else {
          console.warn('No recording data available');
        }
        
        // Cleanup
        if (streamRef.current) {
          // Don't stop the original tracks, just remove reference
          streamRef.current = null;
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        toast.error(`Recording error: ${event.error.name}`);
        stopRecording();
      };
      
      // Start recording
      mediaRecorderRef.current.start(1000); // 1-second chunks
      setIsRecording(true);
      
      // Timer start kare
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      console.log('✅ Recording started successfully');
      toast.success('Recording started!');
      return true;
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      toast.error(`Failed to start recording: ${error.message}`);
      return false;
    }
  }, [createCombinedStream, isRecording]);

  // Recording stop kare
  const stopRecording = useCallback(async () => {
    try {
      console.log('⏹️ Stopping recording...');
      
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        console.log('⏩ No active recording found');
        return null;
      }
      
      // Stop recording
      mediaRecorderRef.current.stop();
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      
      // Wait a bit for data to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`📊 Final recording time: ${formatTime(recordingTime)}`);
      console.log(`📊 Final recording size: ${formatSize(recordingSize)}`);
      
      return recordedBlob;
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      toast.error('Error stopping recording');
      return null;
    }
  }, [recordingTime, recordingSize, recordedBlob]);

  // Server par save kare
  const saveRecordingToServer = useCallback(async (blob) => {
    if (!blob || blob.size === 0) {
      console.warn('⚠️ Empty blob, skipping upload');
      return false;
    }
    
    try {
      setIsUploading(true);
      console.log('☁️ Uploading recording to server...');
      
      const formData = new FormData();
      const fileName = `recording_${sessionId}_${Date.now()}.webm`;
      
      formData.append('recording', blob, fileName);
      formData.append('sessionId', sessionId);
      formData.append('userId', userId);
      formData.append('duration', recordingTime);
      formData.append('size', blob.size);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Upload successful:', data);
      
      toast.success(`Recording saved! (${formatSize(blob.size)})`);
      
      // Reset state
      setRecordingTime(0);
      setRecordingSize(0);
      chunksRef.current = [];
      
      return true;
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error('Failed to upload. Downloading locally...');
      
      // Download locally as fallback
      downloadRecordingLocally(blob);
      return false;
      
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, userId, recordingTime]);

  // Local download
  const downloadRecordingLocally = useCallback((blob) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${sessionId}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.info('Recording downloaded locally');
      
    } catch (error) {
      console.error('❌ Download error:', error);
      toast.error('Failed to download recording');
    }
  }, [sessionId]);

  // Format helpers
  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingTime,
    recordingSize,
    isUploading,
    recordedBlob,
    startRecording,
    stopRecording,
    formatTime,
    formatSize
  };
};