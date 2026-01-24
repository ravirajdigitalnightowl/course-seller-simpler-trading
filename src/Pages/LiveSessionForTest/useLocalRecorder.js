



























//gemini

// import { useState, useRef, useCallback, useEffect } from 'react';
// import { toast } from 'react-toastify';

// export const useLocalRecorder = (sessionId, userId, mediaStream, activeScreenShare, viewerAudios) => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);

//   // Refs for Media Recorder & Audio
//   const mediaRecorderRef = useRef(null);
//   const chunksRef = useRef([]);
//   const timerRef = useRef(null);
//   const audioContextRef = useRef(null);
//   const clonedTracksRef = useRef([]); // Sirf Mic tracks yahan store honge cleanup ke liye

//   // --- COMPOSITING REFS (Canvas & Hidden Videos) ---
//   const canvasRef = useRef(null);            
//   const ctxRef = useRef(null);              
//   const screenVideoRef = useRef(null);       
//   const cameraVideoRef = useRef(null);       
//   const compositingIntervalRef = useRef(null); 

//   // --- 1. INITIALIZE CANVAS & HIDDEN VIDEO ELEMENTS ---
//   useEffect(() => {
//     // 1. Setup Canvas
//     const canvas = document.createElement('canvas');
//     canvas.width = 1920;
//     canvas.height = 1080;
//     canvasRef.current = canvas;
    
//     const ctx = canvas.getContext('2d', { alpha: false }); 
//     ctx.imageSmoothingEnabled = true;
//     ctx.imageSmoothingQuality = 'medium'; 
//     ctxRef.current = ctx;

//     // 2. Create Hidden Container
//     const hiddenContainer = document.createElement('div');
//     hiddenContainer.id = "recorder-hidden-container"; // ID for debugging if needed
//     hiddenContainer.style.position = 'fixed';
//     hiddenContainer.style.top = '-9999px';
//     hiddenContainer.style.left = '-9999px';
//     hiddenContainer.style.opacity = '0';
//     hiddenContainer.style.pointerEvents = 'none';
//     document.body.appendChild(hiddenContainer);

//     // 3. Setup Screen Video Element (MUST BE MUTED)
//     const sVideo = document.createElement('video');
//     sVideo.setAttribute('playsinline', 'true');
//     sVideo.setAttribute('webkit-playsinline', 'true');
//     sVideo.muted = true; // Essential for echo prevention
//     sVideo.volume = 0;
//     sVideo.autoplay = true;
//     hiddenContainer.appendChild(sVideo);
//     screenVideoRef.current = sVideo;

//     // 4. Setup Camera Video Element
//     const cVideo = document.createElement('video');
//     cVideo.setAttribute('playsinline', 'true');
//     cVideo.setAttribute('webkit-playsinline', 'true');
//     cVideo.muted = true;
//     cVideo.volume = 0;
//     cVideo.autoplay = true;
//     hiddenContainer.appendChild(cVideo);
//     cameraVideoRef.current = cVideo;

//     return () => {
//         if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
//         if (hiddenContainer.parentNode) document.body.removeChild(hiddenContainer);
//         if (audioContextRef.current) audioContextRef.current.close();
//     };
//   }, []);

//   // --- 2. SYNC STREAMS (VISUALS ONLY) ---
  
//   // A. Camera Sync
//   useEffect(() => {
//     const videoEl = cameraVideoRef.current;
//     if (videoEl && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         if (videoTracks.length > 0) {
//             const videoOnlyStream = new MediaStream([videoTracks[0]]);
//             videoEl.srcObject = videoOnlyStream;
//             videoEl.muted = true;
//             videoEl.play().catch(e => console.error("Hidden Cam play error", e));
//         }
//     }
//   }, [mediaStream]);

//   // B. Screen Sync (CRITICAL STEP FOR ECHO)
//   useEffect(() => {
//     const screenEl = screenVideoRef.current;
//     if (screenEl) {
//         if (activeScreenShare?.stream) {
//             const videoTracks = activeScreenShare.stream.getVideoTracks();
//             if (videoTracks.length > 0) {
//                 // Clear previous
//                 screenEl.srcObject = null;
                
//                 // Create new stream with ONLY video track
//                 // (Audio hum AudioContext se handle karenge, video element se nahi)
//                 const videoOnlyStream = new MediaStream([videoTracks[0]]);
                
//                 screenEl.srcObject = videoOnlyStream;
//                 screenEl.muted = true; // FORCE MUTE
//                 screenEl.volume = 0;
                
//                 screenEl.play().catch(e => console.error("Hidden Screen play error", e));
//             }
//         } else {
//             screenEl.srcObject = null;
//         }
//     }
//   }, [activeScreenShare]);

//   // --- 3. DRAWING LOOP (CANVAS COMPOSITING) ---
//   const startCompositing = useCallback(() => {
//     const drawFrame = () => {
//         const canvas = canvasRef.current;
//         const ctx = ctxRef.current;
//         const screenVid = screenVideoRef.current;
//         const cameraVid = cameraVideoRef.current;

//         if (canvas && ctx) {
//             // Background Black
//             ctx.fillStyle = '#000000';
//             ctx.fillRect(0, 0, canvas.width, canvas.height);

//             // Draw Screen Share
//             if (screenVid && screenVid.readyState >= 2 && screenVid.srcObject) {
//                 // Aspect Ratio maintain karte hue draw karein
//                 const hRatio = canvas.width / screenVid.videoWidth;
//                 const vRatio = canvas.height / screenVid.videoHeight;
//                 const ratio = Math.min(hRatio, vRatio);
//                 const cx = (canvas.width - screenVid.videoWidth * ratio) / 2;
//                 const cy = (canvas.height - screenVid.videoHeight * ratio) / 2;
//                 ctx.drawImage(screenVid, 0, 0, screenVid.videoWidth, screenVid.videoHeight, cx, cy, screenVid.videoWidth * ratio, screenVid.videoHeight * ratio);
//             } else {
//                 // Placeholder Text
//                 ctx.fillStyle = '#111111';
//                 ctx.fillRect(0, 0, canvas.width, canvas.height);
//                 ctx.font = 'bold 40px Arial';
//                 ctx.fillStyle = '#555555';
//                 ctx.textAlign = 'center';
//                 ctx.fillText("Waiting for Screen Share...", canvas.width / 2, canvas.height / 2);
//             }

//             // Draw Camera (PiP - Picture in Picture)
//             if (cameraVid && cameraVid.readyState >= 2 && cameraVid.srcObject) {
//                 const camWidth = 350;  
//                 const camHeight = (cameraVid.videoHeight / cameraVid.videoWidth) * camWidth; 
//                 const padding = 30;
//                 // Bottom-Right Corner
//                 const x = canvas.width - camWidth - padding;
//                 const y = canvas.height - camHeight - padding;
                
//                 // Border
//                 ctx.strokeStyle = '#ffffff';
//                 ctx.lineWidth = 4;
//                 ctx.strokeRect(x, y, camWidth, camHeight);
//                 // Video
//                 ctx.drawImage(cameraVid, x, y, camWidth, camHeight);
//             }
//         }
//     };

//     if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
//     compositingIntervalRef.current = setInterval(drawFrame, 33); // ~30 FPS
//   }, []);

//   // --- 4. FILE SAVING HELPER ---
//   const saveRecordingFile = useCallback((blob) => {
//     if (blob.size === 0) return;
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const filename = `Session_HD_${sessionId}_${timestamp}.webm`;
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
//     setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
//     setIsUploading(false);
//   }, [sessionId]);

//   // --- 5. START RECORDING (AUDIO LOGIC HERE) ---
//   const startRecording = useCallback(async () => {
//     if (isRecording) return;
//     console.log("🎬 Starting HD Recording...");
    
//     chunksRef.current = [];
//     clonedTracksRef.current = []; 
    
//     // 1. Start Visuals
//     startCompositing();
//     const canvasStream = canvasRef.current.captureStream(30);

//     // 2. Audio Mixing (Crucial for Echo Prevention)
//     try {
//         const AudioContext = window.AudioContext || window.webkitAudioContext;
//         const ctx = new AudioContext({ latencyHint: 'interactive' }); 
//         audioContextRef.current = ctx;

//         if (ctx.state === 'suspended') await ctx.resume();

//         // Destination Node (Ye sirf Recorder me jayega, Speakers me nahi)
//         const dest = ctx.createMediaStreamDestination();
//         let hasAudio = false;

//         // --- A. MIC AUDIO (CLONE IT) ---
//         // Mic Input hai, isse Clone karna safe hai aur zaroori hai.
//         if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//             console.log("🎤 Adding Mic to Recorder (Cloned)");
//             const micTrack = mediaStream.getAudioTracks()[0].clone();
//             clonedTracksRef.current.push(micTrack); // Cleanup list me daalo
            
//             const micStream = new MediaStream([micTrack]);
//             const micSource = ctx.createMediaStreamSource(micStream);
//             micSource.connect(dest); 
//             hasAudio = true;
//         }

//         // --- B. SCREEN AUDIO (DO NOT CLONE) ---
//         // System Audio Output hai. Agar clone kiya to Chrome double play karega.
//         if (activeScreenShare?.stream) {
//             const screenAudioTracks = activeScreenShare.stream.getAudioTracks();
//             if (screenAudioTracks.length > 0) {
//                 console.log("🖥️ Adding Screen Audio to Recorder (Original Track)");
                
//                 // Original Track use karo directly
//                 const screenTrack = screenAudioTracks[0]; 
                
//                 // Isse clonedTracksRef me push MAT karna (kyunki ye original hai)
//                 const screenStream = new MediaStream([screenTrack]);
//                 const screenSource = ctx.createMediaStreamSource(screenStream);
                
//                 screenSource.connect(dest); // Sirf destination se connect karo
//                 hasAudio = true;
//             }
//         }

//         // --- C. VIEWER AUDIO (DO NOT CLONE) ---
//         if (viewerAudios && viewerAudios.size > 0) {
//             viewerAudios.forEach((stream) => {
//                if (stream.getAudioTracks().length > 0) {
//                    const viewerTrack = stream.getAudioTracks()[0];
//                    const viewerStream = new MediaStream([viewerTrack]);
//                    const viewerSource = ctx.createMediaStreamSource(viewerStream);
//                    viewerSource.connect(dest);
//                    hasAudio = true;
//                }
//             });
//        }

//         // Mix Final Audio into Canvas Stream
//         if (hasAudio) {
//             const mixedTracks = dest.stream.getAudioTracks();
//             if (mixedTracks.length > 0) {
//                 canvasStream.addTrack(mixedTracks[0]);
//             }
//         }

//     } catch (err) {
//         console.error("❌ Audio mixing failed", err);
//     }

//     // --- 3. MediaRecorder Initialization ---
//     try {
//         const mimeTypes = [
//             'video/webm;codecs=vp9,opus', 
//             'video/webm;codecs=vp8,opus', 
//             'video/webm'
//         ];
//         let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        
//         // High Bitrate (6Mbps) for HD
//         const options = { mimeType: selectedMimeType, videoBitsPerSecond: 6000000 };
//         mediaRecorderRef.current = new MediaRecorder(canvasStream, options);

//         mediaRecorderRef.current.ondataavailable = (e) => {
//             if (e.data.size > 0) chunksRef.current.push(e.data);
//         };

//         mediaRecorderRef.current.onstop = () => {
//             // Audio Context Cleanup
//             if (audioContextRef.current) {
//                 audioContextRef.current.close();
//                 audioContextRef.current = null;
//             }
            
//             // Only stop CLONED tracks (Mic). 
//             // DO NOT stop Original Screen Tracks here.
//             if (clonedTracksRef.current) {
//                 clonedTracksRef.current.forEach(track => track.stop());
//                 clonedTracksRef.current = [];
//             }
//         };

//         mediaRecorderRef.current.start(1000); 
//         setIsRecording(true);

//         // Timer
//         const startTime = Date.now();
//         timerRef.current = setInterval(() => {
//             setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
//         }, 1000);
        
//         toast.success("HD Recording Started");

//     } catch (e) {
//         console.error("❌ Recorder failed", e);
//         toast.error("Failed to start recorder");
//     }

//   }, [isRecording, mediaStream, activeScreenShare, viewerAudios, startCompositing]);

//   // --- 6. STOP RECORDING ---
//   const stopRecording = useCallback(async () => {
//     if (!isRecording) return;
    
//     setIsUploading(true);

//     // Stop compositing loop
//     if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);

//     // Stop MediaRecorder
//     if (mediaRecorderRef.current?.state === 'recording') {
//         mediaRecorderRef.current.stop();
//     }

//     // Stop Timer
//     if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//     }

//     setIsRecording(false);
//     setRecordingTime(0);
    
//     // Delay to collect last chunk
//     setTimeout(() => {
//         if (chunksRef.current.length > 0) {
//             const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
//             saveRecordingFile(blob);
//         } else {
//             setIsUploading(false);
//         }
//     }, 500);
    
//     return true;
//   }, [isRecording, saveRecordingFile]);

//   // --- 7. CLEANUP ON UNMOUNT ---
//   useEffect(() => {
//       return () => {
//           if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
//           if (timerRef.current) clearInterval(timerRef.current);
//           if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
//           if (audioContextRef.current) audioContextRef.current.close();
//           if (clonedTracksRef.current) {
//              clonedTracksRef.current.forEach(track => track.stop());
//           }
//       }
//   }, []);

//   // Helpers
//   const formatTime = (seconds) => {
//       const mins = Math.floor(seconds / 60);
//       const secs = seconds % 60;
//       return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatSize = (bytes) => {
//       if (bytes === 0) return '0 B';
//       const k = 1024;
//       const sizes = ['B', 'KB', 'MB', 'GB'];
//       const i = Math.floor(Math.log(bytes) / Math.log(k));
//       return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   return { 
//     isRecording, 
//     recordingTime, 
//     isUploading, 
//     startRecording, 
//     stopRecording, 
//     formatTime,
//     formatSize
//   };
// };




//gemini ke duara framerate badhaya gya 


// import { useState, useRef, useCallback, useEffect } from 'react';
// import { toast } from 'react-toastify';

// export const useLocalRecorder = (sessionId, userId, mediaStream, activeScreenShare, viewerAudios) => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);

//   // Refs for Media Recorder & Audio
//   const mediaRecorderRef = useRef(null);
//   const chunksRef = useRef([]);
//   const timerRef = useRef(null);
//   const audioContextRef = useRef(null);
//   const clonedTracksRef = useRef([]); // Sirf Mic tracks yahan store honge cleanup ke liye

//   // --- COMPOSITING REFS (Canvas & Hidden Videos) ---
//   const canvasRef = useRef(null);             
//   const ctxRef = useRef(null);               
//   const screenVideoRef = useRef(null);        
//   const cameraVideoRef = useRef(null);        
//   const compositingIntervalRef = useRef(null); 

//   // --- 1. INITIALIZE CANVAS & HIDDEN VIDEO ELEMENTS ---
//   useEffect(() => {
//     // 1. Setup Canvas
//     const canvas = document.createElement('canvas');
//     canvas.width = 1920;
//     canvas.height = 1080;
//     canvasRef.current = canvas;
    
//     const ctx = canvas.getContext('2d', { alpha: false }); 
//     ctx.imageSmoothingEnabled = true;
//     ctx.imageSmoothingQuality = 'medium'; 
//     ctxRef.current = ctx;

//     // 2. Create Hidden Container
//     const hiddenContainer = document.createElement('div');
//     hiddenContainer.id = "recorder-hidden-container"; // ID for debugging if needed
//     hiddenContainer.style.position = 'fixed';
//     hiddenContainer.style.top = '-9999px';
//     hiddenContainer.style.left = '-9999px';
//     hiddenContainer.style.opacity = '0';
//     hiddenContainer.style.pointerEvents = 'none';
//     document.body.appendChild(hiddenContainer);

//     // 3. Setup Screen Video Element (MUST BE MUTED)
//     const sVideo = document.createElement('video');
//     sVideo.setAttribute('playsinline', 'true');
//     sVideo.setAttribute('webkit-playsinline', 'true');
//     sVideo.muted = true; // Essential for echo prevention
//     sVideo.volume = 0;
//     sVideo.autoplay = true;
//     hiddenContainer.appendChild(sVideo);
//     screenVideoRef.current = sVideo;

//     // 4. Setup Camera Video Element
//     const cVideo = document.createElement('video');
//     cVideo.setAttribute('playsinline', 'true');
//     cVideo.setAttribute('webkit-playsinline', 'true');
//     cVideo.muted = true;
//     cVideo.volume = 0;
//     cVideo.autoplay = true;
//     hiddenContainer.appendChild(cVideo);
//     cameraVideoRef.current = cVideo;

//     return () => {
//         if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
//         if (hiddenContainer.parentNode) document.body.removeChild(hiddenContainer);
//         if (audioContextRef.current) audioContextRef.current.close();
//     };
//   }, []);

//   // --- 2. SYNC STREAMS (VISUALS ONLY) ---
  
//   // A. Camera Sync
//   useEffect(() => {
//     const videoEl = cameraVideoRef.current;
//     if (videoEl && mediaStream) {
//         const videoTracks = mediaStream.getVideoTracks();
//         if (videoTracks.length > 0) {
//             const videoOnlyStream = new MediaStream([videoTracks[0]]);
//             videoEl.srcObject = videoOnlyStream;
//             videoEl.muted = true;
//             videoEl.play().catch(e => console.error("Hidden Cam play error", e));
//         }
//     }
//   }, [mediaStream]);

//   // B. Screen Sync (CRITICAL STEP FOR ECHO)
//   useEffect(() => {
//     const screenEl = screenVideoRef.current;
//     if (screenEl) {
//         if (activeScreenShare?.stream) {
//             const videoTracks = activeScreenShare.stream.getVideoTracks();
//             if (videoTracks.length > 0) {
//                 // Clear previous
//                 screenEl.srcObject = null;
                
//                 // Create new stream with ONLY video track
//                 // (Audio hum AudioContext se handle karenge, video element se nahi)
//                 const videoOnlyStream = new MediaStream([videoTracks[0]]);
                
//                 screenEl.srcObject = videoOnlyStream;
//                 screenEl.muted = true; // FORCE MUTE
//                 screenEl.volume = 0;
                
//                 screenEl.play().catch(e => console.error("Hidden Screen play error", e));
//             }
//         } else {
//             screenEl.srcObject = null;
//         }
//     }
//   }, [activeScreenShare]);

//   // --- 3. DRAWING LOOP (CANVAS COMPOSITING) ---
//   const startCompositing = useCallback(() => {
//     const drawFrame = () => {
//         const canvas = canvasRef.current;
//         const ctx = ctxRef.current;
//         const screenVid = screenVideoRef.current;
//         const cameraVid = cameraVideoRef.current;

//         if (canvas && ctx) {
//             // Background Black
//             ctx.fillStyle = '#000000';
//             ctx.fillRect(0, 0, canvas.width, canvas.height);

//             // Draw Screen Share
//             if (screenVid && screenVid.readyState >= 2 && screenVid.srcObject) {
//                 // Aspect Ratio maintain karte hue draw karein
//                 const hRatio = canvas.width / screenVid.videoWidth;
//                 const vRatio = canvas.height / screenVid.videoHeight;
//                 const ratio = Math.min(hRatio, vRatio);
//                 const cx = (canvas.width - screenVid.videoWidth * ratio) / 2;
//                 const cy = (canvas.height - screenVid.videoHeight * ratio) / 2;
//                 ctx.drawImage(screenVid, 0, 0, screenVid.videoWidth, screenVid.videoHeight, cx, cy, screenVid.videoWidth * ratio, screenVid.videoHeight * ratio);
//             } else {
//                 // Placeholder Text
//                 ctx.fillStyle = '#111111';
//                 ctx.fillRect(0, 0, canvas.width, canvas.height);
//                 ctx.font = 'bold 40px Arial';
//                 ctx.fillStyle = '#555555';
//                 ctx.textAlign = 'center';
//                 ctx.fillText("Waiting for Screen Share...", canvas.width / 2, canvas.height / 2);
//             }

//             // Draw Camera (PiP - Picture in Picture)
//             if (cameraVid && cameraVid.readyState >= 2 && cameraVid.srcObject) {
//                 const camWidth = 350;  
//                 const camHeight = (cameraVid.videoHeight / cameraVid.videoWidth) * camWidth; 
//                 const padding = 30;
//                 // Bottom-Right Corner
//                 const x = canvas.width - camWidth - padding;
//                 const y = canvas.height - camHeight - padding;
                
//                 // Border
//                 ctx.strokeStyle = '#ffffff';
//                 ctx.lineWidth = 4;
//                 ctx.strokeRect(x, y, camWidth, camHeight);
//                 // Video
//                 ctx.drawImage(cameraVid, x, y, camWidth, camHeight);
//             }
//         }
//     };

//     if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
    
//     // 🔥 UPDATED: 16ms interval for ~60 FPS
//     compositingIntervalRef.current = setInterval(drawFrame, 16); 
//   }, []);

//   // --- 4. FILE SAVING HELPER ---
//   const saveRecordingFile = useCallback((blob) => {
//     if (blob.size === 0) return;
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const filename = `Session_HD_${sessionId}_${timestamp}.webm`;
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
//     setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
//     setIsUploading(false);
//   }, [sessionId]);

//   // --- 5. START RECORDING (AUDIO LOGIC HERE) ---
//   const startRecording = useCallback(async () => {
//     if (isRecording) return;
//     console.log("🎬 Starting HD 60FPS Recording...");
    
//     chunksRef.current = [];
//     clonedTracksRef.current = []; 
    
//     // 1. Start Visuals
//     startCompositing();
    
//     // 🔥 UPDATED: Capture at 60 FPS
//     const canvasStream = canvasRef.current.captureStream(60);

//     // 2. Audio Mixing (Crucial for Echo Prevention)
//     try {
//         const AudioContext = window.AudioContext || window.webkitAudioContext;
//         const ctx = new AudioContext({ latencyHint: 'interactive' }); 
//         audioContextRef.current = ctx;

//         if (ctx.state === 'suspended') await ctx.resume();

//         // Destination Node (Ye sirf Recorder me jayega, Speakers me nahi)
//         const dest = ctx.createMediaStreamDestination();
//         let hasAudio = false;

//         // --- A. MIC AUDIO (CLONE IT) ---
//         // Mic Input hai, isse Clone karna safe hai aur zaroori hai.
//         if (mediaStream && mediaStream.getAudioTracks().length > 0) {
//             console.log("🎤 Adding Mic to Recorder (Cloned)");
//             const micTrack = mediaStream.getAudioTracks()[0].clone();
//             clonedTracksRef.current.push(micTrack); // Cleanup list me daalo
            
//             const micStream = new MediaStream([micTrack]);
//             const micSource = ctx.createMediaStreamSource(micStream);
//             micSource.connect(dest); 
//             hasAudio = true;
//         }

//         // --- B. SCREEN AUDIO (DO NOT CLONE) ---
//         // System Audio Output hai. Agar clone kiya to Chrome double play karega.
//         if (activeScreenShare?.stream) {
//             const screenAudioTracks = activeScreenShare.stream.getAudioTracks();
//             if (screenAudioTracks.length > 0) {
//                 console.log("🖥️ Adding Screen Audio to Recorder (Original Track)");
                
//                 // Original Track use karo directly
//                 const screenTrack = screenAudioTracks[0]; 
                
//                 // Isse clonedTracksRef me push MAT karna (kyunki ye original hai)
//                 const screenStream = new MediaStream([screenTrack]);
//                 const screenSource = ctx.createMediaStreamSource(screenStream);
                
//                 screenSource.connect(dest); // Sirf destination se connect karo
//                 hasAudio = true;
//             }
//         }

//         // --- C. VIEWER AUDIO (DO NOT CLONE) ---
//         if (viewerAudios && viewerAudios.size > 0) {
//             viewerAudios.forEach((stream) => {
//                if (stream.getAudioTracks().length > 0) {
//                    const viewerTrack = stream.getAudioTracks()[0];
//                    const viewerStream = new MediaStream([viewerTrack]);
//                    const viewerSource = ctx.createMediaStreamSource(viewerStream);
//                    viewerSource.connect(dest);
//                    hasAudio = true;
//                }
//             });
//        }

//         // Mix Final Audio into Canvas Stream
//         if (hasAudio) {
//             const mixedTracks = dest.stream.getAudioTracks();
//             if (mixedTracks.length > 0) {
//                 canvasStream.addTrack(mixedTracks[0]);
//             }
//         }

//     } catch (err) {
//         console.error("❌ Audio mixing failed", err);
//     }

//     // --- 3. MediaRecorder Initialization ---
//     try {
//         const mimeTypes = [
//             'video/webm;codecs=vp9,opus', 
//             'video/webm;codecs=vp8,opus', 
//             'video/webm'
//         ];
//         let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        
//         // 🔥 UPDATED: Increased Bitrate to 8Mbps for better 60FPS quality
//         const options = { mimeType: selectedMimeType, videoBitsPerSecond: 8000000 };
//         mediaRecorderRef.current = new MediaRecorder(canvasStream, options);

//         mediaRecorderRef.current.ondataavailable = (e) => {
//             if (e.data.size > 0) chunksRef.current.push(e.data);
//         };

//         mediaRecorderRef.current.onstop = () => {
//             // Audio Context Cleanup
//             if (audioContextRef.current) {
//                 audioContextRef.current.close();
//                 audioContextRef.current = null;
//             }
            
//             // Only stop CLONED tracks (Mic). 
//             // DO NOT stop Original Screen Tracks here.
//             if (clonedTracksRef.current) {
//                 clonedTracksRef.current.forEach(track => track.stop());
//                 clonedTracksRef.current = [];
//             }
//         };

//         mediaRecorderRef.current.start(1000); 
//         setIsRecording(true);

//         // Timer
//         const startTime = Date.now();
//         timerRef.current = setInterval(() => {
//             setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
//         }, 1000);
        
//         toast.success("HD 60FPS Recording Started");

//     } catch (e) {
//         console.error("❌ Recorder failed", e);
//         toast.error("Failed to start recorder");
//     }

//   }, [isRecording, mediaStream, activeScreenShare, viewerAudios, startCompositing]);

//   // --- 6. STOP RECORDING ---
//   const stopRecording = useCallback(async () => {
//     if (!isRecording) return;
    
//     setIsUploading(true);

//     // Stop compositing loop
//     if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);

//     // Stop MediaRecorder
//     if (mediaRecorderRef.current?.state === 'recording') {
//         mediaRecorderRef.current.stop();
//     }

//     // Stop Timer
//     if (timerRef.current) {
//         clearInterval(timerRef.current);
//         timerRef.current = null;
//     }

//     setIsRecording(false);
//     setRecordingTime(0);
    
//     // Delay to collect last chunk
//     setTimeout(() => {
//         if (chunksRef.current.length > 0) {
//             const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
//             saveRecordingFile(blob);
//         } else {
//             setIsUploading(false);
//         }
//     }, 500);
    
//     return true;
//   }, [isRecording, saveRecordingFile]);

//   // --- 7. CLEANUP ON UNMOUNT ---
//   useEffect(() => {
//       return () => {
//           if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
//           if (timerRef.current) clearInterval(timerRef.current);
//           if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
//           if (audioContextRef.current) audioContextRef.current.close();
//           if (clonedTracksRef.current) {
//              clonedTracksRef.current.forEach(track => track.stop());
//           }
//       }
//   }, []);

//   // Helpers
//   const formatTime = (seconds) => {
//       const mins = Math.floor(seconds / 60);
//       const secs = seconds % 60;
//       return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatSize = (bytes) => {
//       if (bytes === 0) return '0 B';
//       const k = 1024;
//       const sizes = ['B', 'KB', 'MB', 'GB'];
//       const i = Math.floor(Math.log(bytes) / Math.log(k));
//       return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   return { 
//     isRecording, 
//     recordingTime, 
//     isUploading, 
//     startRecording, 
//     stopRecording, 
//     formatTime,
//     formatSize
//   };
// };













import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useLocalRecorder = (sessionId, userId, mediaStream, activeScreenShare, viewerAudios) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for Media Recorder & Audio
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const clonedTracksRef = useRef([]); // Sirf Mic tracks yahan store honge cleanup ke liye
  
  // Ref for Cloned Screen Track (To fix flickering)
  const clonedScreenTrackRef = useRef(null); 

  // --- COMPOSITING REFS (Canvas & Hidden Videos) ---
  const canvasRef = useRef(null);              
  const ctxRef = useRef(null);                 
  const screenVideoRef = useRef(null);         
  const cameraVideoRef = useRef(null);         
  const compositingIntervalRef = useRef(null); 

  // --- 1. INITIALIZE CANVAS & HIDDEN VIDEO ELEMENTS ---
  useEffect(() => {
    // 1. Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    canvasRef.current = canvas;
    
    const ctx = canvas.getContext('2d', { alpha: false }); 
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium'; 
    ctxRef.current = ctx;

    // 2. Create Hidden Container
    const hiddenContainer = document.createElement('div');
    hiddenContainer.id = "recorder-hidden-container"; // ID for debugging if needed
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.top = '-9999px';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.opacity = '0';
    hiddenContainer.style.pointerEvents = 'none';
    document.body.appendChild(hiddenContainer);

    // 3. Setup Screen Video Element (MUST BE MUTED)
    const sVideo = document.createElement('video');
    sVideo.setAttribute('playsinline', 'true');
    sVideo.setAttribute('webkit-playsinline', 'true');
    sVideo.muted = true; // Essential for echo prevention
    sVideo.volume = 0;
    sVideo.autoplay = true;
    hiddenContainer.appendChild(sVideo);
    screenVideoRef.current = sVideo;

    // 4. Setup Camera Video Element
    const cVideo = document.createElement('video');
    cVideo.setAttribute('playsinline', 'true');
    cVideo.setAttribute('webkit-playsinline', 'true');
    cVideo.muted = true;
    cVideo.volume = 0;
    cVideo.autoplay = true;
    hiddenContainer.appendChild(cVideo);
    cameraVideoRef.current = cVideo;

    return () => {
        if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
        if (hiddenContainer.parentNode) document.body.removeChild(hiddenContainer);
        if (audioContextRef.current) audioContextRef.current.close();
        
        // Cleanup cloned screen track on unmount
        if (clonedScreenTrackRef.current) {
            clonedScreenTrackRef.current.stop();
        }
    };
  }, []);

  // --- 2. SYNC STREAMS (VISUALS ONLY) ---
  
  // A. Camera Sync
  useEffect(() => {
    const videoEl = cameraVideoRef.current;
    if (videoEl && mediaStream) {
        const videoTracks = mediaStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const videoOnlyStream = new MediaStream([videoTracks[0]]);
            videoEl.srcObject = videoOnlyStream;
            videoEl.muted = true;
            videoEl.play().catch(e => console.error("Hidden Cam play error", e));
        }
    }
  }, [mediaStream]);

  // B. Screen Sync (CRITICAL FIX FOR FLICKERING)
  useEffect(() => {
    const screenEl = screenVideoRef.current;
    
    if (screenEl) {
        if (activeScreenShare?.stream) {
            const videoTracks = activeScreenShare.stream.getVideoTracks();
            if (videoTracks.length > 0) {
                // Clear previous src
                screenEl.srcObject = null;
                
                // 🛑 Cleanup previous clone if exists
                if (clonedScreenTrackRef.current) {
                    clonedScreenTrackRef.current.stop();
                    clonedScreenTrackRef.current = null;
                }

                // 🔥 UPDATE 1: Clone the track to separate recorder from main screen
                const originalTrack = videoTracks[0];
                const clonedTrack = originalTrack.clone(); 
                clonedScreenTrackRef.current = clonedTrack; // Store ref for cleanup

                // Create new stream with CLONED track
                const videoOnlyStream = new MediaStream([clonedTrack]);
                
                screenEl.srcObject = videoOnlyStream;
                screenEl.muted = true; // FORCE MUTE
                screenEl.volume = 0;
                
                screenEl.play().catch(e => console.error("Hidden Screen play error", e));
            }
        } else {
            screenEl.srcObject = null;
             // Cleanup if screen share stops
             if (clonedScreenTrackRef.current) {
                clonedScreenTrackRef.current.stop();
                clonedScreenTrackRef.current = null;
            }
        }
    }
  }, [activeScreenShare]);

  // --- 3. DRAWING LOOP (CANVAS COMPOSITING) ---
  const startCompositing = useCallback(() => {
    const drawFrame = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const screenVid = screenVideoRef.current;
        const cameraVid = cameraVideoRef.current;

        if (canvas && ctx) {
            // Background Black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Screen Share
            if (screenVid && screenVid.readyState >= 2 && screenVid.srcObject) {
                // Aspect Ratio maintain karte hue draw karein
                const hRatio = canvas.width / screenVid.videoWidth;
                const vRatio = canvas.height / screenVid.videoHeight;
                const ratio = Math.min(hRatio, vRatio);
                const cx = (canvas.width - screenVid.videoWidth * ratio) / 2;
                const cy = (canvas.height - screenVid.videoHeight * ratio) / 2;
                ctx.drawImage(screenVid, 0, 0, screenVid.videoWidth, screenVid.videoHeight, cx, cy, screenVid.videoWidth * ratio, screenVid.videoHeight * ratio);
            } else {
                // Placeholder Text
                ctx.fillStyle = '#111111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'bold 40px Arial';
                ctx.fillStyle = '#555555';
                ctx.textAlign = 'center';
                ctx.fillText("Waiting for Screen Share...", canvas.width / 2, canvas.height / 2);
            }

            // Draw Camera (PiP - Picture in Picture)
            if (cameraVid && cameraVid.readyState >= 2 && cameraVid.srcObject) {
                const camWidth = 350;  
                const camHeight = (cameraVid.videoHeight / cameraVid.videoWidth) * camWidth; 
                const padding = 30;
                // Bottom-Right Corner
                const x = canvas.width - camWidth - padding;
                const y = canvas.height - camHeight - padding;
                
                // Border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, camWidth, camHeight);
                // Video
                ctx.drawImage(cameraVid, x, y, camWidth, camHeight);
            }
        }
    };

    if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
    
    // 🔥 KEPT 16ms (60 FPS) as requested - No Change here
    compositingIntervalRef.current = setInterval(drawFrame, 16); 
  }, []);

  // --- 4. FILE SAVING HELPER ---
  const saveRecordingFile = useCallback((blob) => {
    if (blob.size === 0) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Session_HD_${sessionId}_${timestamp}.webm`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 2000);
    setIsUploading(false);
  }, [sessionId]);

  // --- 5. START RECORDING (AUDIO LOGIC HERE) ---
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    console.log("🎬 Starting HD 60FPS Recording...");
    
    chunksRef.current = [];
    clonedTracksRef.current = []; 
    
    // 1. Start Visuals
    startCompositing();
    
    // 🔥 KEPT 60 FPS Capture
    const canvasStream = canvasRef.current.captureStream(60);

    // 2. Audio Mixing (Crucial for Echo Prevention)
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext({ latencyHint: 'interactive' }); 
        audioContextRef.current = ctx;

        if (ctx.state === 'suspended') await ctx.resume();

        // Destination Node (Ye sirf Recorder me jayega, Speakers me nahi)
        const dest = ctx.createMediaStreamDestination();
        let hasAudio = false;

        // --- A. MIC AUDIO (CLONE IT) ---
        // Mic Input hai, isse Clone karna safe hai aur zaroori hai.
        if (mediaStream && mediaStream.getAudioTracks().length > 0) {
            console.log("🎤 Adding Mic to Recorder (Cloned)");
            const micTrack = mediaStream.getAudioTracks()[0].clone();
            clonedTracksRef.current.push(micTrack); // Cleanup list me daalo
            
            const micStream = new MediaStream([micTrack]);
            const micSource = ctx.createMediaStreamSource(micStream);
            micSource.connect(dest); 
            hasAudio = true;
        }

        // --- B. SCREEN AUDIO (DO NOT CLONE) ---
        // System Audio Output hai. Agar clone kiya to Chrome double play karega.
        if (activeScreenShare?.stream) {
            const screenAudioTracks = activeScreenShare.stream.getAudioTracks();
            if (screenAudioTracks.length > 0) {
                console.log("🖥️ Adding Screen Audio to Recorder (Original Track)");
                
                // Original Track use karo directly for Audio Context
                const screenTrack = screenAudioTracks[0]; 
                
                // Isse clonedTracksRef me push MAT karna (kyunki ye original hai)
                const screenStream = new MediaStream([screenTrack]);
                const screenSource = ctx.createMediaStreamSource(screenStream);
                
                screenSource.connect(dest); // Sirf destination se connect karo
                hasAudio = true;
            }
        }

        // --- C. VIEWER AUDIO (DO NOT CLONE) ---
        if (viewerAudios && viewerAudios.size > 0) {
            viewerAudios.forEach((stream) => {
               if (stream.getAudioTracks().length > 0) {
                   const viewerTrack = stream.getAudioTracks()[0];
                   const viewerStream = new MediaStream([viewerTrack]);
                   const viewerSource = ctx.createMediaStreamSource(viewerStream);
                   viewerSource.connect(dest);
                   hasAudio = true;
               }
            });
       }

        // Mix Final Audio into Canvas Stream
        if (hasAudio) {
            const mixedTracks = dest.stream.getAudioTracks();
            if (mixedTracks.length > 0) {
                canvasStream.addTrack(mixedTracks[0]);
            }
        }

    } catch (err) {
        console.error("❌ Audio mixing failed", err);
    }

    // --- 3. MediaRecorder Initialization ---
    try {
        const mimeTypes = [
            'video/webm;codecs=vp9,opus', 
            'video/webm;codecs=vp8,opus', 
            'video/webm'
        ];
        let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        
        // 🔥 KEPT 8Mbps Bitrate for 60FPS
        const options = { mimeType: selectedMimeType, videoBitsPerSecond: 8000000 };
        mediaRecorderRef.current = new MediaRecorder(canvasStream, options);

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            // Audio Context Cleanup
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            
            // Only stop CLONED tracks (Mic). 
            // DO NOT stop Original Screen Tracks here.
            if (clonedTracksRef.current) {
                clonedTracksRef.current.forEach(track => track.stop());
                clonedTracksRef.current = [];
            }
        };

        mediaRecorderRef.current.start(1000); 
        setIsRecording(true);

        // Timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        
        toast.success("HD 60FPS Recording Started");

    } catch (e) {
        console.error("❌ Recorder failed", e);
        toast.error("Failed to start recorder");
    }

  }, [isRecording, mediaStream, activeScreenShare, viewerAudios, startCompositing]);

  // --- 6. STOP RECORDING ---
  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    
    setIsUploading(true);

    // Stop compositing loop
    if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);

    // Stop MediaRecorder
    if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
    }

    // Stop Timer
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    
    // Delay to collect last chunk
    setTimeout(() => {
        if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
            saveRecordingFile(blob);
        } else {
            setIsUploading(false);
        }
    }, 500);
    
    return true;
  }, [isRecording, saveRecordingFile]);

  // --- 7. CLEANUP ON UNMOUNT ---
  useEffect(() => {
      return () => {
          if (compositingIntervalRef.current) clearInterval(compositingIntervalRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
          if (audioContextRef.current) audioContextRef.current.close();
          if (clonedTracksRef.current) {
             clonedTracksRef.current.forEach(track => track.stop());
          }
          if (clonedScreenTrackRef.current) {
             clonedScreenTrackRef.current.stop();
          }
      }
  }, []);

  // Helpers
  const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return { 
    isRecording, 
    recordingTime, 
    isUploading, 
    startRecording, 
    stopRecording, 
    formatTime,
    formatSize
  };
};