// import React, { useRef, useEffect, useState } from 'react';
// import { FiPlay, FiX, FiVideoOff, FiLoader } from 'react-icons/fi';
// import ThumbnailVideo from '../ThumbnailVideo';

// const MobileVideoView = ({
//   zoomed,
//   setZoomed,
//   mediaStream,
//   participants,
//   activeScreenShare,
//   setIsPlaying,
//   setShowPlayButton,
//   showPlayButton,
//   setMediaError,
//   mediaError,
//   isLoading,
//   isInitializing,
//   roomState,
//   localPausedState,
//   user,
//   videoEnabled,
//   viewerCameras,
//   showMobileControls,
//   setShowMobileControls,
//   handlePlayClick,
//   isPlaying
// }) => {
//   const videoElementRef = useRef(null);
//   const [videoLoaded, setVideoLoaded] = useState(false);

//   // Video element ko single time setup karo
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl || !mediaStream || zoomed) return;

//     // Ek hi baar setup karo
//     if (videoEl.srcObject !== mediaStream) {
//       console.log('📱 Setting up mobile video element');
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
//       videoEl.srcObject = mediaStream;
//     }

//     // Auto-play try karo with better handling
//     const attemptPlay = async () => {
//       try {
//         await videoEl.play();
//         console.log('✅ Mobile video autoplay successful');
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setVideoLoaded(true);
//       } catch (error) {
//         console.log('📱 Mobile autoplay blocked, showing play button');
//         setShowPlayButton(true);
//         setIsPlaying(false);
//       }
//     };

//     // Small delay ke baad try karo
//     const timer = setTimeout(attemptPlay, 300);
//     return () => clearTimeout(timer);
//   }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

//   // Video events handle karo
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl) return;

//     const handleCanPlay = () => {
//       console.log('📱 Video can play');
//       setVideoLoaded(true);
//     };

//     const handlePlay = () => {
//       console.log('📱 Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//     };

//     const handlePause = () => {
//       console.log('📱 Video paused');
//       setIsPlaying(false);
//       // Only show play button if not intentionally paused
//       if (!roomState.isPaused && !localPausedState) {
//         setShowPlayButton(true);
//       }
//     };

//     videoEl.addEventListener('canplay', handleCanPlay);
//     videoEl.addEventListener('play', handlePlay);
//     videoEl.addEventListener('pause', handlePause);

//     return () => {
//       videoEl.removeEventListener('canplay', handleCanPlay);
//       videoEl.removeEventListener('play', handlePlay);
//       videoEl.removeEventListener('pause', handlePause);
//     };
//   }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

//   return (
//     <div className="flex-1 flex flex-col bg-black overflow-hidden">
//       {/* Main Video Area - 85% height */}
//       <div 
//         className="h-[85%] relative bg-black"
//         onClick={() => setShowMobileControls(!showMobileControls)}
//       >
//         {/* Zoomed Video */}
//         {zoomed ? (
//           <div className="relative w-full h-full">
//             <video
//               key={`zoomed-${zoomed.userId}`}
//               autoPlay
//               playsInline
//               muted={zoomed.type !== "viewer"}
//               className="absolute inset-0 w-full h-full object-cover bg-black"
//               ref={(el) => {
//                 if (el && zoomed.stream) {
//                   el.srcObject = zoomed.stream;
//                   el.muted = zoomed.type !== "viewer";
//                   el.playsInline = true;
//                   el.setAttribute('playsinline', '');
//                   el.setAttribute('webkit-playsinline', '');
//                   el.play().catch(() => {});
//                 }
//               }}
//             />
            
//             <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
//               {zoomed.type === "streamer" ? "Your Camera" : 
//                zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//                `${activeScreenShare?.userName}'s Screen`}
//             </div>
            
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setZoomed(null);
//               }}
//               className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg"
//             >
//               <FiX className="h-4 w-4" />
//             </button>
//           </div>
//         ) : (
//           // Default streamer video - Optimized
//           <video
//             key="main-streamer-video"
//             ref={videoElementRef}
//             muted
//             playsInline
//             className="absolute inset-0 w-full h-full object-cover bg-black"
//             onError={(e) => {
//               console.error('📱 Mobile video error:', e);
//               setMediaError(true);
//               setShowPlayButton(true);
//             }}
//           />
//         )}

//         {/* Status overlay */}
//         <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
//           <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
//           <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
//             {isPlaying ? 'LIVE' : 'PAUSED'}
//           </span>
//           {showPlayButton && !videoLoaded && (
//             <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
//               Loading...
//             </span>
//           )}
//         </div>

//         {/* Play button - Better handling */}
//         {showPlayButton && !mediaError && !zoomed && (
//           <div 
//             className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
//             onClick={(e) => {
//               e.stopPropagation();
//               handlePlayClick(e);
//             }}
//           >
//             <div className="text-center">
//               <div className="bg-blue-600/90 text-white p-5 rounded-full shadow-lg mb-3">
//                 <FiPlay className="h-10 w-10" />
//               </div>
//               <p className="text-white text-sm">Tap to start video</p>
//               {!videoLoaded && (
//                 <p className="text-yellow-300 text-xs mt-1">Video loading...</p>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Loading state - Only show initially */}
//         {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
//           <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
//             <div className="text-center">
//               <FiLoader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
//               <p className="text-white text-sm">Setting up camera...</p>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Permanent Thumbnails Area - 15% height */}
//       <div className="h-[15%] bg-gray-800 border-t border-gray-600 overflow-x-auto">
//         <div className="flex p-1 space-x-2 h-full items-center justify-center">
//           {/* Streamer thumbnail */}
//           {mediaStream && (
//             <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideo
//                 uid="streamer"
//                 stream={mediaStream}
//                 userName="You"
//                 onClick={() => {
//                   setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "streamer"}
//                 videoEnabled={videoEnabled}
//                 isMobile={true}
//               />
//             </div>
//           )}
          
//           {/* Viewer cameras */}
//           {[...viewerCameras.entries()].map(([uid, stream]) => (
//             <div key={uid} className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideo
//                 uid={uid}
//                 stream={stream}
//                 userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                 onClick={() => {
//                   setZoomed({ type: "viewer", stream, userId: uid });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                 videoEnabled={true}
//                 isMobile={true}
//               />
//             </div>
//           ))}
          
//           {/* Screen share */}
//           {activeScreenShare && (
//             <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideo
//                 uid={activeScreenShare.userId}
//                 stream={activeScreenShare.stream}
//                 userName={`${activeScreenShare.userName}'s Screen`}
//                 onClick={() => {
//                   setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "screen"}
//                 videoEnabled={true}
//                 isScreenShare={true}
//                 isMobile={true}
//               />
//             </div>
//           )}

//           {/* Empty state */}
//           {viewerCameras.size === 0 && !activeScreenShare && (
//             <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
//               <div className="text-center">
//                 <FiVideoOff className="h-4 w-4 mx-auto mb-1 opacity-50" />
//                 <p>No other cameras</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MobileVideoView;




















// import React, { useRef, useEffect, useState } from 'react';
// import { FiPlay, FiX, FiVideoOff, FiLoader } from 'react-icons/fi';
// import ThumbnailVideoMobile from './ThumbnailVideoMobile';

// const MobileVideoView = ({
//   zoomed,
//   setZoomed,
//   mediaStream,
//   participants,
//   activeScreenShare,
//   setIsPlaying,
//   setShowPlayButton,
//   showPlayButton,
//   setMediaError,
//   mediaError,
//   isLoading,
//   isInitializing,
//   roomState,
//   localPausedState,
//   user,
//   videoEnabled,
//   viewerCameras,
//   showMobileControls,
//   setShowMobileControls,
//   handlePlayClick,
//   isPlaying
// }) => {
//   const videoElementRef = useRef(null);
//   const [videoLoaded, setVideoLoaded] = useState(false);
//   const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);

//   // Video element setup with aspect ratio detection
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl || !mediaStream || zoomed) return;

//     if (videoEl.srcObject !== mediaStream) {
//       console.log('📱 Setting up mobile video element');
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
//       videoEl.srcObject = mediaStream;
//     }

//     // Detect video aspect ratio
//     const handleLoadedMetadata = () => {
//       if (videoEl.videoWidth && videoEl.videoHeight) {
//         const aspect = videoEl.videoWidth / videoEl.videoHeight;
//         console.log('📱 Video dimensions:', videoEl.videoWidth, 'x', videoEl.videoHeight, 'Aspect:', aspect);
//         setVideoAspectRatio(aspect);
//       }
//     };

//     videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);

//     const attemptPlay = async () => {
//       try {
//         await videoEl.play();
//         console.log('✅ Mobile video autoplay successful');
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setVideoLoaded(true);
//       } catch (error) {
//         console.log('📱 Mobile autoplay blocked, showing play button');
//         setShowPlayButton(true);
//         setIsPlaying(false);
//       }
//     };

//     const timer = setTimeout(attemptPlay, 300);
    
//     return () => {
//       clearTimeout(timer);
//       videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
//     };
//   }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

//   // Video events
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl) return;

//     const handleCanPlay = () => {
//       console.log('📱 Video can play');
//       setVideoLoaded(true);
//     };

//     const handlePlay = () => {
//       console.log('📱 Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//     };

//     const handlePause = () => {
//       console.log('📱 Video paused');
//       setIsPlaying(false);
//       if (!roomState.isPaused && !localPausedState) {
//         setShowPlayButton(true);
//       }
//     };

//     videoEl.addEventListener('canplay', handleCanPlay);
//     videoEl.addEventListener('play', handlePlay);
//     videoEl.addEventListener('pause', handlePause);

//     return () => {
//       videoEl.removeEventListener('canplay', handleCanPlay);
//       videoEl.removeEventListener('play', handlePlay);
//       videoEl.removeEventListener('pause', handlePause);
//     };
//   }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

//   // Calculate video container style based on aspect ratio
//   const getVideoContainerStyle = () => {
//     const mobileViewportHeight = window.innerHeight * 0.85; // 85% of screen height
//     const mobileViewportWidth = window.innerWidth;
    
//     // For portrait videos (mobile cameras usually 9:16 or 3:4)
//     if (videoAspectRatio < 1) {
//       // Portrait video - fit to height, center horizontally
//       return {
//         width: 'auto',
//         height: '100%',
//         maxWidth: '100%',
//         margin: '0 auto',
//         display: 'block'
//       };
//     } else {
//       // Landscape video - fit to width, center vertically
//       return {
//         width: '100%',
//         height: 'auto',
//         maxHeight: '100%',
//         margin: 'auto 0',
//         display: 'block'
//       };
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col bg-black overflow-hidden">
//       {/* Main Video Area - 85% height with improved container */}
//       <div 
//         className="h-[85%] relative bg-black overflow-hidden"
//         onClick={() => setShowMobileControls(!showMobileControls)}
//       >
//         {/* Zoomed Video - Fixed aspect ratio handling */}
//         {zoomed ? (
//           <div className="relative w-full h-full flex items-center justify-center bg-black">
//             <video
//               key={`zoomed-${zoomed.userId}`}
//               autoPlay
//               playsInline
//               muted={zoomed.type !== "viewer"}
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               ref={(el) => {
//                 if (el && zoomed.stream) {
//                   el.srcObject = zoomed.stream;
//                   el.muted = zoomed.type !== "viewer";
//                   el.playsInline = true;
//                   el.setAttribute('playsinline', '');
//                   el.setAttribute('webkit-playsinline', '');
//                   el.play().catch(() => {});
//                 }
//               }}
//             />
            
//             <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
//               {zoomed.type === "streamer" ? "Your Camera" : 
//                zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//                `${activeScreenShare?.userName}'s Screen`}
//             </div>
            
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setZoomed(null);
//               }}
//               className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg"
//             >
//               <FiX className="h-4 w-4" />
//             </button>
//           </div>
//         ) : (
//           // Default streamer video with proper aspect ratio handling
//           <div className="w-full h-full flex items-center justify-center bg-black">
//             <video
//               key="main-streamer-video"
//               ref={videoElementRef}
//               muted
//               playsInline
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               onError={(e) => {
//                 console.error('📱 Mobile video error:', e);
//                 setMediaError(true);
//                 setShowPlayButton(true);
//               }}
//             />
//           </div>
//         )}

//         {/* Status overlay */}
//         <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
//           <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
//           <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
//             {isPlaying ? 'LIVE' : 'PAUSED'}
//           </span>
//           {showPlayButton && !videoLoaded && (
//             <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
//               Loading...
//             </span>
//           )}
//         </div>

//         {/* Play button */}
//         {showPlayButton && !mediaError && !zoomed && (
//           <div 
//             className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
//             onClick={(e) => {
//               e.stopPropagation();
//               handlePlayClick(e);
//             }}
//           >
//             <div className="text-center">
//               <div className="bg-blue-600/90 text-white p-5 rounded-full shadow-lg mb-3">
//                 <FiPlay className="h-10 w-10" />
//               </div>
//               <p className="text-white text-sm">Tap to start video</p>
//               {!videoLoaded && (
//                 <p className="text-yellow-300 text-xs mt-1">Video loading...</p>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Loading state */}
//         {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
//           <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
//             <div className="text-center">
//               <FiLoader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
//               <p className="text-white text-sm">Setting up camera...</p>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Permanent Thumbnails Area - 15% height */}
//       <div className="h-[15%] bg-gray-800 border-t border-gray-600 overflow-x-auto">
//         <div className="flex p-1 space-x-2 h-full items-center justify-center">
//           {/* Streamer thumbnail */}
//           {mediaStream && (
//             <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideoMobile
//                 uid="streamer"
//                 stream={mediaStream}
//                 userName="You"
//                 onClick={() => {
//                   setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "streamer"}
//                 videoEnabled={videoEnabled}
//                 isMobile={true}
//               />
//             </div>
//           )}
          
//           {/* Viewer cameras */}
//           {[...viewerCameras.entries()].map(([uid, stream]) => (
//             <div key={uid} className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideoMobile
//                 uid={uid}
//                 stream={stream}
//                 userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                 onClick={() => {
//                   setZoomed({ type: "viewer", stream, userId: uid });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                 videoEnabled={true}
//                 isMobile={true}
//               />
//             </div>
//           ))}
          
//           {/* Screen share */}
//           {activeScreenShare && (
//             <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
//               <ThumbnailVideoMobile
//                 uid={activeScreenShare.userId}
//                 stream={activeScreenShare.stream}
//                 userName={`${activeScreenShare.userName}'s Screen`}
//                 onClick={() => {
//                   setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                   setShowPlayButton(false);
//                 }}
//                 isZoomed={zoomed?.type === "screen"}
//                 videoEnabled={true}
//                 isScreenShare={true}
//                 isMobile={true}
//               />
//             </div>
//           )}

//           {/* Empty state */}
//           {viewerCameras.size === 0 && !activeScreenShare && (
//             <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
//               <div className="text-center">
//                 <FiVideoOff className="h-4 w-4 mx-auto mb-1 opacity-50" />
//                 <p>No other cameras</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MobileVideoView;














// import React, { useRef, useEffect, useState } from 'react';
// import { FiPlay, FiX, FiVideoOff, FiLoader, FiGrid, FiChevronRight } from 'react-icons/fi';
// import ThumbnailVideoMobile from './ThumbnailVideoMobile';

// const MobileVideoView = ({
//   zoomed,
//   setZoomed,
//   mediaStream,
//   participants,
//   activeScreenShare,
//   setIsPlaying,
//   setShowPlayButton,
//   showPlayButton,
//   setMediaError,
//   mediaError,
//   isLoading,
//   isInitializing,
//   roomState,
//   localPausedState,
//   user,
//   videoEnabled,
//   viewerCameras,
//   showMobileControls,
//   setShowMobileControls,
//   handlePlayClick,
//   isPlaying
// }) => {
//   const videoElementRef = useRef(null);
//   const [videoLoaded, setVideoLoaded] = useState(false);
//   const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);
//   const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  
//   // Calculate total thumbnails count
//   const totalThumbnails = 1 + viewerCameras.size + (activeScreenShare ? 1 : 0);
//   const showViewMore = totalThumbnails > 0; // Show "View More" if more than 3 thumbnails

//   // Video element setup with aspect ratio detection
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl || !mediaStream || zoomed) return;

//     if (videoEl.srcObject !== mediaStream) {
//       console.log('📱 Setting up mobile video element');
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
//       videoEl.srcObject = mediaStream;
//     }

//     // Detect video aspect ratio
//     const handleLoadedMetadata = () => {
//       if (videoEl.videoWidth && videoEl.videoHeight) {
//         const aspect = videoEl.videoWidth / videoEl.videoHeight;
//         console.log('📱 Video dimensions:', videoEl.videoWidth, 'x', videoEl.videoHeight, 'Aspect:', aspect);
//         setVideoAspectRatio(aspect);
//       }
//     };

//     videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);

//     const attemptPlay = async () => {
//       try {
//         await videoEl.play();
//         console.log('✅ Mobile video autoplay successful');
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setVideoLoaded(true);
//       } catch (error) {
//         console.log('📱 Mobile autoplay blocked, showing play button');
//         setShowPlayButton(true);
//         setIsPlaying(false);
//       }
//     };

//     const timer = setTimeout(attemptPlay, 300);
    
//     return () => {
//       clearTimeout(timer);
//       videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
//     };
//   }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

//   // Video events
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl) return;

//     const handleCanPlay = () => {
//       console.log('📱 Video can play');
//       setVideoLoaded(true);
//     };

//     const handlePlay = () => {
//       console.log('📱 Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//     };

//     const handlePause = () => {
//       console.log('📱 Video paused');
//       setIsPlaying(false);
//       if (!roomState.isPaused && !localPausedState) {
//         setShowPlayButton(true);
//       }
//     };

//     videoEl.addEventListener('canplay', handleCanPlay);
//     videoEl.addEventListener('play', handlePlay);
//     videoEl.addEventListener('pause', handlePause);

//     return () => {
//       videoEl.removeEventListener('canplay', handleCanPlay);
//       videoEl.removeEventListener('play', handlePlay);
//       videoEl.removeEventListener('pause', handlePause);
//     };
//   }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

//   // Calculate video container style based on aspect ratio
//   const getVideoContainerStyle = () => {
//     const mobileViewportHeight = window.innerHeight * 0.85; // 85% of screen height
//     const mobileViewportWidth = window.innerWidth;
    
//     // For portrait videos (mobile cameras usually 9:16 or 3:4)
//     if (videoAspectRatio < 1) {
//       // Portrait video - fit to height, center horizontally
//       return {
//         width: 'auto',
//         height: '100%',
//         maxWidth: '100%',
//         margin: '0 auto',
//         display: 'block'
//       };
//     } else {
//       // Landscape video - fit to width, center vertically
//       return {
//         width: '100%',
//         height: 'auto',
//         maxHeight: '100%',
//         margin: 'auto 0',
//         display: 'block'
//       };
//     }
//   };

//   // थंबनेल ओवरले कंपोनेंट
//   const ThumbnailsOverlay = () => (
//     <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
//       {/* Header */}
//       <div className="flex justify-between items-center p-4 border-b border-gray-700">
//         <h2 className="text-lg font-semibold text-white">Select a Video</h2>
//         <button
//           onClick={() => setShowAllThumbnails(false)}
//           className="text-white p-2"
//         >
//           <FiX className="h-6 w-6" />
//         </button>
//       </div>

//       {/* Thumbnails Grid */}
//       <div className="flex-1 overflow-y-auto p-4">
//         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
//           {/* Streamer thumbnail */}
//           {mediaStream && (
//             <div className="aspect-video">
//               <ThumbnailVideoMobile
//                 uid="streamer"
//                 stream={mediaStream}
//                 userName="You (Streamer)"
//                 onClick={() => {
//                   setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "streamer"}
//                 videoEnabled={videoEnabled}
//                 isMobile={true}
//               />
//             </div>
//           )}
          
//           {/* Viewer cameras */}
//           {[...viewerCameras.entries()].map(([uid, stream]) => (
//             <div key={uid} className="aspect-video">
//               <ThumbnailVideoMobile
//                 uid={uid}
//                 stream={stream}
//                 userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                 onClick={() => {
//                   setZoomed({ type: "viewer", stream, userId: uid });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                 videoEnabled={true}
//                 isMobile={true}
//               />
//             </div>
//           ))}
          
//           {/* Screen share */}
//           {activeScreenShare && (
//             <div className="aspect-video">
//               <ThumbnailVideoMobile
//                 uid={activeScreenShare.userId}
//                 stream={activeScreenShare.stream}
//                 userName={`${activeScreenShare.userName}'s Screen`}
//                 onClick={() => {
//                   setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "screen"}
//                 videoEnabled={true}
//                 isScreenShare={true}
//                 isMobile={true}
//               />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Footer */}
     
//     </div>
//   );

//   return (
//     <div className="flex-1 flex flex-col bg-black overflow-hidden">
//       {/* Main Video Area - 85% height with improved container */}
//       <div 
//         className="h-[85%] relative bg-black overflow-hidden"
//         onClick={() => setShowMobileControls(!showMobileControls)}
//       >
//         {/* Zoomed Video - Fixed aspect ratio handling */}
//         {zoomed ? (
//           <div className="relative w-full h-full flex items-center justify-center bg-black">
//             <video
//               key={`zoomed-${zoomed.userId}`}
//               autoPlay
//               playsInline
//               muted={zoomed.type !== "viewer"}
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               ref={(el) => {
//                 if (el && zoomed.stream) {
//                   el.srcObject = zoomed.stream;
//                   el.muted = zoomed.type !== "viewer";
//                   el.playsInline = true;
//                   el.setAttribute('playsinline', '');
//                   el.setAttribute('webkit-playsinline', '');
//                   el.play().catch(() => {});
//                 }
//               }}
//             />
            
//             <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
//               {zoomed.type === "streamer" ? "Your Camera" : 
//                zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//                `${activeScreenShare?.userName}'s Screen`}
//             </div>
            
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setZoomed(null);
//               }}
//               className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg"
//             >
//               <FiX className="h-4 w-4" />
//             </button>
//           </div>
//         ) : (
//           // Default streamer video with proper aspect ratio handling
//           <div className="w-full h-full flex items-center justify-center bg-black">
//             <video
//               key="main-streamer-video"
//               ref={videoElementRef}
//               muted
//               playsInline
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               onError={(e) => {
//                 console.error('📱 Mobile video error:', e);
//                 setMediaError(true);
//                 setShowPlayButton(true);
//               }}
//             />
//           </div>
//         )}

//         {/* Status overlay */}
//         <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
//           <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
//           <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
//             {isPlaying ? 'LIVE' : 'PAUSED'}
//           </span>
//           {showPlayButton && !videoLoaded && (
//             <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
//               Loading...
//             </span>
//           )}
//         </div>

//         {/* Play button */}
//         {showPlayButton && !mediaError && !zoomed && (
//           <div 
//             className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
//             onClick={(e) => {
//               e.stopPropagation();
//               handlePlayClick(e);
//             }}
//           >
//             <div className="text-center">
//               <div className="bg-blue-600/90 text-white p-5 rounded-full shadow-lg mb-3">
//                 <FiPlay className="h-10 w-10" />
//               </div>
//               <p className="text-white text-sm">Tap to start video</p>
//               {!videoLoaded && (
//                 <p className="text-yellow-300 text-xs mt-1">Video loading...</p>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Loading state */}
//         {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
//           <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
//             <div className="text-center">
//               <FiLoader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
//               <p className="text-white text-sm">Setting up camera...</p>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Permanent Thumbnails Area - 15% height */}
//       <div className="h-[15%] bg-gray-800 border-t border-gray-600">
//         <div className="flex h-full items-center">
//           {/* Thumbnails container with horizontal scroll */}
//           <div className="flex-1 overflow-x-auto px-2">
//             <div className="flex space-x-2 h-full items-center py-1">
//               {/* Streamer thumbnail */}
//               {mediaStream && (
//                 <ThumbnailVideoMobile
//                   uid="streamer"
//                   stream={mediaStream}
//                   userName="You"
//                   onClick={() => {
//                     setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                     setShowPlayButton(false);
//                   }}
//                   isZoomed={zoomed?.type === "streamer"}
//                   videoEnabled={videoEnabled}
//                   isMobile={true}
//                 />
//               )}
              
//               {/* First 2 viewer cameras (or all if less than 3) */}
//               {[...viewerCameras.entries()].slice(0, showViewMore ? 2 : 3).map(([uid, stream]) => (
//                 <ThumbnailVideoMobile
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
//                   isMobile={true}
//                 />
//               ))}
              
//               {/* Screen share (if exists and we have space) */}
//               {activeScreenShare && (!showViewMore || viewerCameras.size < 2) && (
//                 <ThumbnailVideoMobile
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
//                   isMobile={true}
//                 />
//               )}

//               {/* View More button if many thumbnails */}
//               {showViewMore && (
//                 <button
//                   onClick={() => setShowAllThumbnails(true)}
//                   className="flex-shrink-0 w-20 h-16 bg-gray-700 rounded-lg flex flex-col items-center justify-center text-white border border-gray-600 active:scale-95 transition-transform"
//                   style={{ WebkitTapHighlightColor: 'transparent' }}
//                 >
//                   <FiGrid className="h-5 w-5 mb-1" />
//                   <span className="text-xs font-medium">View All</span>
//                   <span className="text-[10px] text-gray-300">
//                     +{totalThumbnails - 3} more
//                   </span>
//                 </button>
//               )}

//               {/* Empty state */}
//               {viewerCameras.size === 0 && !activeScreenShare && !mediaStream && (
//                 <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
//                   <div className="text-center">
//                     <FiVideoOff className="h-4 w-4 mx-auto mb-1 opacity-50" />
//                     <p>No videos available</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Optional: Right scroll indicator */}
//           {showViewMore && (
//             <div className="pr-2">
//               <FiChevronRight className="h-4 w-4 text-gray-400" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Thumbnails Overlay Modal */}
//       {showAllThumbnails && <ThumbnailsOverlay />}
//     </div>
//   );
// };

// export default MobileVideoView;












// import React, { useRef, useEffect, useState } from 'react';
// import { FiPlay, FiX, FiVideoOff, FiLoader, FiGrid, FiChevronRight } from 'react-icons/fi';
// import ThumbnailVideoMobile from './ThumbnailVideoMobile';

// const MobileVideoView = ({
//   zoomed,
//   setZoomed,
//   mediaStream,
//   participants,
//   activeScreenShare,
//   setIsPlaying,
//   setShowPlayButton,
//   showPlayButton,
//   setMediaError,
//   mediaError,
//   isLoading,
//   isInitializing,
//   roomState,
//   localPausedState,
//   user,
//   videoEnabled,
//   viewerCameras,
//   showMobileControls,
//   setShowMobileControls,
//   handlePlayClick,
//   isPlaying
// }) => {
//   const videoElementRef = useRef(null);
//   const [videoLoaded, setVideoLoaded] = useState(false);
//   const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);
//   const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  
//   // Calculate total thumbnails count
//   const totalThumbnails = 1 + viewerCameras.size + (activeScreenShare ? 1 : 0);
//   const showViewMore = totalThumbnails > 0; // Show "View More" if more than 3 thumbnails

//   // Video element setup with aspect ratio detection
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl || !mediaStream || zoomed) return;

//     if (videoEl.srcObject !== mediaStream) {
//       console.log('📱 Setting up mobile video element');
//       videoEl.muted = true;
//       videoEl.playsInline = true;
//       videoEl.setAttribute('playsinline', '');
//       videoEl.setAttribute('webkit-playsinline', '');
//       videoEl.srcObject = mediaStream;
//     }

//     // Detect video aspect ratio
//     const handleLoadedMetadata = () => {
//       if (videoEl.videoWidth && videoEl.videoHeight) {
//         const aspect = videoEl.videoWidth / videoEl.videoHeight;
//         console.log('📱 Video dimensions:', videoEl.videoWidth, 'x', videoEl.videoHeight, 'Aspect:', aspect);
//         setVideoAspectRatio(aspect);
//       }
//     };

//     videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);

//     const attemptPlay = async () => {
//       try {
//         await videoEl.play();
//         console.log('✅ Mobile video autoplay successful');
//         setIsPlaying(true);
//         setShowPlayButton(false);
//         setVideoLoaded(true);
//       } catch (error) {
//         console.log('📱 Mobile autoplay blocked, showing play button');
//         setShowPlayButton(true);
//         setIsPlaying(false);
//       }
//     };

//     const timer = setTimeout(attemptPlay, 300);
    
//     return () => {
//       clearTimeout(timer);
//       videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
//     };
//   }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

//   // Video events
//   useEffect(() => {
//     const videoEl = videoElementRef.current;
//     if (!videoEl) return;

//     const handleCanPlay = () => {
//       console.log('📱 Video can play');
//       setVideoLoaded(true);
//     };

//     const handlePlay = () => {
//       console.log('📱 Video started playing');
//       setIsPlaying(true);
//       setShowPlayButton(false);
//     };

//     const handlePause = () => {
//       console.log('📱 Video paused');
//       setIsPlaying(false);
//       if (!roomState.isPaused && !localPausedState) {
//         setShowPlayButton(true);
//       }
//     };

//     videoEl.addEventListener('canplay', handleCanPlay);
//     videoEl.addEventListener('play', handlePlay);
//     videoEl.addEventListener('pause', handlePause);

//     return () => {
//       videoEl.removeEventListener('canplay', handleCanPlay);
//       videoEl.removeEventListener('play', handlePlay);
//       videoEl.removeEventListener('pause', handlePause);
//     };
//   }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

//   // Calculate video container style based on aspect ratio
//   const getVideoContainerStyle = () => {
//     const mobileViewportHeight = window.innerHeight * 0.85; // 85% of screen height
//     const mobileViewportWidth = window.innerWidth;
    
//     // For portrait videos (mobile cameras usually 9:16 or 3:4)
//     if (videoAspectRatio < 1) {
//       // Portrait video - fit to height, center horizontally
//       return {
//         width: 'auto',
//         height: '100%',
//         maxWidth: '100%',
//         margin: '0 auto',
//         display: 'block'
//       };
//     } else {
//       // Landscape video - fit to width, center vertically
//       return {
//         width: '100%',
//         height: 'auto',
//         maxHeight: '100%',
//         margin: 'auto 0',
//         display: 'block'
//       };
//     }
//   };

//   // थंबनेल ओवरले कंपोनेंट
//   const ThumbnailsOverlay = () => (
//     <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
//       {/* Header */}
//       <div className="flex justify-between items-center p-4 border-b border-gray-700">
//         <h2 className="text-lg font-semibold text-white">Select a Video</h2>
//         <button
//           onClick={() => setShowAllThumbnails(false)}
//           className="text-white p-2 hover:bg-gray-700 rounded-full transition-colors"
//         >
//           <FiX className="h-6 w-6" />
//         </button>
//       </div>

//       {/* Thumbnails Grid - बड़े थंबनेल */}
//       <div className="flex-1 overflow-y-auto p-4">
//         <div className="grid grid-cols-2 gap-4">
//           {/* Streamer thumbnail */}
//           {mediaStream && (
//             <div className="h-48">
//               <ThumbnailVideoMobile
//                 uid="streamer"
//                 stream={mediaStream}
//                 userName="You (Streamer)"
//                 onClick={() => {
//                   setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "streamer"}
//                 videoEnabled={videoEnabled}
//                 isMobile={true}
//               />
//             </div>
//           )}
          
//           {/* Viewer cameras */}
//           {[...viewerCameras.entries()].map(([uid, stream]) => (
//             <div key={uid} className="h-48">
//               <ThumbnailVideoMobile
//                 uid={uid}
//                 stream={stream}
//                 userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                 onClick={() => {
//                   setZoomed({ type: "viewer", stream, userId: uid });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                 videoEnabled={true}
//                 isMobile={true}
//               />
//             </div>
//           ))}
          
//           {/* Screen share */}
//           {activeScreenShare && (
//             <div className="h-48">
//               <ThumbnailVideoMobile
//                 uid={activeScreenShare.userId}
//                 stream={activeScreenShare.stream}
//                 userName={`${activeScreenShare.userName}'s Screen`}
//                 onClick={() => {
//                   setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                   setShowPlayButton(false);
//                   setShowAllThumbnails(false);
//                 }}
//                 isZoomed={zoomed?.type === "screen"}
//                 videoEnabled={true}
//                 isScreenShare={true}
//                 isMobile={true}
//               />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="p-4 border-t border-gray-700">
//         <button
//           onClick={() => setShowAllThumbnails(false)}
//           className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
//         >
//           Close
//         </button>
//       </div>
//     </div>
//   );

//   return (
//     <div className="flex-1 flex flex-col bg-black overflow-hidden">
//       {/* Main Video Area - 85% height with improved container */}
//       <div 
//         className="h-[85%] relative bg-black overflow-hidden"
//         onClick={() => setShowMobileControls(!showMobileControls)}
//       >
//         {/* Zoomed Video - Fixed aspect ratio handling */}
//         {zoomed ? (
//           <div className="relative w-full h-full flex items-center justify-center bg-black">
//             <video
//               key={`zoomed-${zoomed.userId}`}
//               autoPlay
//               playsInline
//               muted={zoomed.type !== "viewer"}
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               ref={(el) => {
//                 if (el && zoomed.stream) {
//                   el.srcObject = zoomed.stream;
//                   el.muted = zoomed.type !== "viewer";
//                   el.playsInline = true;
//                   el.setAttribute('playsinline', '');
//                   el.setAttribute('webkit-playsinline', '');
//                   el.play().catch(() => {});
//                 }
//               }}
//             />
            
//             <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm">
//               {zoomed.type === "streamer" ? "Your Camera" : 
//                zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
//                `${activeScreenShare?.userName}'s Screen`}
//             </div>
            
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setZoomed(null);
//               }}
//               className="absolute top-3 right-3 bg-black/70 hover:bg-black/80 text-white p-2.5 rounded-lg transition-colors"
//             >
//               <FiX className="h-5 w-5" />
//             </button>
//           </div>
//         ) : (
//           // Default streamer video with proper aspect ratio handling
//           <div className="w-full h-full flex items-center justify-center bg-black">
//             <video
//               key="main-streamer-video"
//               ref={videoElementRef}
//               muted
//               playsInline
//               className="max-w-full max-h-full"
//               style={getVideoContainerStyle()}
//               onError={(e) => {
//                 console.error('📱 Mobile video error:', e);
//                 setMediaError(true);
//                 setShowPlayButton(true);
//               }}
//             />
//           </div>
//         )}

//         {/* Status overlay */}
//         <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
//           <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
//           <span className="text-sm text-white bg-black/70 px-3 py-1.5 rounded-lg font-medium">
//             {isPlaying ? 'LIVE' : 'PAUSED'}
//           </span>
//           {showPlayButton && !videoLoaded && (
//             <span className="text-sm text-yellow-400 bg-black/70 px-3 py-1.5 rounded-lg">
//               Loading...
//             </span>
//           )}
//         </div>

//         {/* Play button */}
//         {showPlayButton && !mediaError && !zoomed && (
//           <div 
//             className="absolute inset-0 flex items-center justify-center bg-black/70 z-20"
//             onClick={(e) => {
//               e.stopPropagation();
//               handlePlayClick(e);
//             }}
//           >
//             <div className="text-center">
//               <div className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-full shadow-lg mb-4 transition-colors active:scale-95">
//                 <FiPlay className="h-14 w-14" />
//               </div>
//               <p className="text-white text-lg font-medium">Tap to start video</p>
//               {!videoLoaded && (
//                 <p className="text-yellow-300 text-sm mt-2">Video loading...</p>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Loading state */}
//         {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
//           <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
//             <div className="text-center">
//               <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//               <p className="text-white text-lg font-medium">Setting up camera...</p>
//               <p className="text-gray-300 text-sm mt-1">Please wait a moment</p>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Permanent Thumbnails Area - 15% height with बड़े थंबनेल */}
//       <div className="h-[15%] bg-gray-800 border-t border-gray-700">
//         <div className="flex h-full items-center px-1">
//           {/* Thumbnails container with horizontal scroll */}
//           <div className="flex-1 overflow-x-auto">
//             <div className="flex space-x-3 h-full items-center py-2 px-2">
//               {/* Streamer thumbnail - बड़ा किया */}
//               {mediaStream && (
//                 <div className="w-28 h-20 flex-shrink-0">
//                   <ThumbnailVideoMobile
//                     uid="streamer"
//                     stream={mediaStream}
//                     userName="You"
//                     onClick={() => {
//                       setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
//                       setShowPlayButton(false);
//                     }}
//                     isZoomed={zoomed?.type === "streamer"}
//                     videoEnabled={videoEnabled}
//                     isMobile={true}
//                   />
//                 </div>
//               )}
              
//               {/* First 2 viewer cameras (or all if less than 3) - बड़े किए */}
//               {[...viewerCameras.entries()].slice(0, showViewMore ? 2 : 3).map(([uid, stream]) => (
//                 <div key={uid} className="w-28 h-20 flex-shrink-0">
//                   <ThumbnailVideoMobile
//                     uid={uid}
//                     stream={stream}
//                     userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
//                     onClick={() => {
//                       setZoomed({ type: "viewer", stream, userId: uid });
//                       setShowPlayButton(false);
//                     }}
//                     isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
//                     videoEnabled={true}
//                     isMobile={true}
//                   />
//                 </div>
//               ))}
              
//               {/* Screen share (if exists and we have space) - बड़ा किया */}
//               {activeScreenShare && (!showViewMore || viewerCameras.size < 2) && (
//                 <div className="w-28 h-20 flex-shrink-0">
//                   <ThumbnailVideoMobile
//                     uid={activeScreenShare.userId}
//                     stream={activeScreenShare.stream}
//                     userName={`${activeScreenShare.userName}'s Screen`}
//                     onClick={() => {
//                       setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
//                       setShowPlayButton(false);
//                     }}
//                     isZoomed={zoomed?.type === "screen"}
//                     videoEnabled={true}
//                     isScreenShare={true}
//                     isMobile={true}
//                   />
//                 </div>
//               )}

//               {/* View More button if many thumbnails - बड़ा किया */}
//               {showViewMore && (
//                 <button
//                   onClick={() => setShowAllThumbnails(true)}
//                   className="flex-shrink-0 w-28 h-20 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center justify-center text-white border-2 border-gray-600 active:scale-95 transition-all"
//                   style={{ WebkitTapHighlightColor: 'transparent' }}
//                 >
//                   <FiGrid className="h-7 w-7 mb-2" />
//                   <span className="text-sm font-semibold">View All</span>
//                   <span className="text-xs text-gray-300 mt-0.5">
//                     +{totalThumbnails - 3} more
//                   </span>
//                 </button>
//               )}

//               {/* Empty state */}
//               {viewerCameras.size === 0 && !activeScreenShare && !mediaStream && (
//                 <div className="flex-1 flex items-center justify-center text-gray-400">
//                   <div className="text-center">
//                     <FiVideoOff className="h-6 w-6 mx-auto mb-2 opacity-60" />
//                     <p className="text-sm">No videos available</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Right scroll indicator - बड़ा किया */}
//           {showViewMore && (
//             <div className="pr-2">
//               <FiChevronRight className="h-5 w-5 text-gray-400" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Thumbnails Overlay Modal */}
//       {showAllThumbnails && <ThumbnailsOverlay />}
//     </div>
//   );
// };

// export default MobileVideoView;








import React, { useRef, useEffect, useState } from 'react';
import { FiPlay, FiX, FiVideoOff, FiLoader, FiGrid, FiChevronRight } from 'react-icons/fi';
import ThumbnailVideoMobile from './ThumbnailVideoMobile';

const MobileVideoView = ({
  zoomed,
  setZoomed,
  mediaStream,
  participants,
  activeScreenShare,
  setIsPlaying,
  setShowPlayButton,
  showPlayButton,
  setMediaError,
  mediaError,
  isLoading,
  isInitializing,
  roomState,
  localPausedState,
  user,
  videoEnabled,
  viewerCameras,
  showMobileControls,
  setShowMobileControls,
  handlePlayClick,
  isPlaying
}) => {
  const videoElementRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  
  // Calculate total thumbnails count
  const totalThumbnails = 1 + viewerCameras.size + (activeScreenShare ? 1 : 0);
  const showViewMore = totalThumbnails > 0; // Show "View More" if more than 3 thumbnails

  // Video element setup with aspect ratio detection
  useEffect(() => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !mediaStream || zoomed) return;

    if (videoEl.srcObject !== mediaStream) {
      console.log('📱 Setting up mobile video element');
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('webkit-playsinline', '');
      videoEl.srcObject = mediaStream;
    }

    // Detect video aspect ratio
    const handleLoadedMetadata = () => {
      if (videoEl.videoWidth && videoEl.videoHeight) {
        const aspect = videoEl.videoWidth / videoEl.videoHeight;
        console.log('📱 Video dimensions:', videoEl.videoWidth, 'x', videoEl.videoHeight, 'Aspect:', aspect);
        setVideoAspectRatio(aspect);
      }
    };

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);

    const attemptPlay = async () => {
      try {
        await videoEl.play();
        console.log('✅ Mobile video autoplay successful');
        setIsPlaying(true);
        setShowPlayButton(false);
        setVideoLoaded(true);
      } catch (error) {
        console.log('📱 Mobile autoplay blocked, showing play button');
        setShowPlayButton(true);
        setIsPlaying(false);
      }
    };

    const timer = setTimeout(attemptPlay, 300);
    
    return () => {
      clearTimeout(timer);
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

  // Video events
  useEffect(() => {
    const videoEl = videoElementRef.current;
    if (!videoEl) return;

    const handleCanPlay = () => {
      console.log('📱 Video can play');
      setVideoLoaded(true);
    };

    const handlePlay = () => {
      console.log('📱 Video started playing');
      setIsPlaying(true);
      setShowPlayButton(false);
    };

    const handlePause = () => {
      console.log('📱 Video paused');
      setIsPlaying(false);
      if (!roomState.isPaused && !localPausedState) {
        setShowPlayButton(true);
      }
    };

    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);

    return () => {
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
    };
  }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

  // Calculate video container style based on aspect ratio
  const getVideoContainerStyle = () => {
    const mobileViewportHeight = window.innerHeight * 0.85; // 85% of screen height
    const mobileViewportWidth = window.innerWidth;
    
    // For portrait videos (mobile cameras usually 9:16 or 3:4)
    if (videoAspectRatio < 1) {
      // Portrait video - fit to height, center horizontally
      return {
        width: 'auto',
        height: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        display: 'block'
      };
    } else {
      // Landscape video - fit to width, center vertically
      return {
        width: '100%',
        height: 'auto',
        maxHeight: '100%',
        margin: 'auto 0',
        display: 'block'
      };
    }
  };

  // थंबनेल ओवरले कंपोनेंट - बड़े थंबनेल के साथ
  const ThumbnailsOverlay = () => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Select a Video</h2>
        <button
          onClick={() => setShowAllThumbnails(false)}
          className="text-white p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <FiX className="h-6 w-6" />
        </button>
      </div>

      {/* Thumbnails Grid - बड़े थंबनेल के लिए single column layout */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Streamer thumbnail - बड़ा size */}
          {mediaStream && (
            <div className="w-full max-w-sm">
              <div 
                className="relative w-36 h-27 bg-gray-900 rounded-xl overflow-hidden cursor-pointer border-2 border-blue-500"
                onClick={() => {
                  setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                  setShowPlayButton(false);
                  setShowAllThumbnails(false);
                }}
              >
                <video
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el && mediaStream) {
                      el.srcObject = mediaStream;
                      el.muted = true;
                      el.playsInline = true;
                      el.setAttribute('playsinline', '');
                      el.setAttribute('webkit-playsinline', '');
                      el.play().catch(() => {});
                    }
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <div className="text-base font-semibold text-white">You (Streamer)</div>
                  <div className="text-xs text-gray-300 mt-1">Tap to view full screen</div>
                </div>
                <div className="absolute top-3 right-3 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
          
          {/* Viewer cameras - बड़े थंबनेल */}
          {[...viewerCameras.entries()].map(([uid, stream]) => {
            const participant = participants.find(p => p.userId === uid);
            return (
              <div key={uid} className="w-full max-w-sm">
                <div 
                  className="relative w-full h-48 bg-gray-900 rounded-xl overflow-hidden cursor-pointer border-2 border-green-500"
                  onClick={() => {
                    setZoomed({ type: "viewer", stream, userId: uid });
                    setShowPlayButton(false);
                    setShowAllThumbnails(false);
                  }}
                >
                  <video
                    muted
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el && stream) {
                        el.srcObject = stream;
                        el.muted = true;
                        el.playsInline = true;
                        el.setAttribute('playsinline', '');
                        el.setAttribute('webkit-playsinline', '');
                        el.play().catch(() => {});
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <div className="text-base font-semibold text-white">
                      {participant?.name || `User ${uid}`}
                    </div>
                    <div className="text-xs text-gray-300 mt-1">Tap to view full screen</div>
                  </div>
                  <div className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            );
          })}
          
          {/* Screen share - बड़ा थंबनेल */}
          {activeScreenShare && (
            <div className="w-full max-w-sm">
              <div 
                className="relative w-full h-48 bg-gray-900 rounded-xl overflow-hidden cursor-pointer border-2 border-purple-500"
                onClick={() => {
                  setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
                  setShowPlayButton(false);
                  setShowAllThumbnails(false);
                }}
              >
                <video
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el && activeScreenShare.stream) {
                      el.srcObject = activeScreenShare.stream;
                      el.muted = true;
                      el.playsInline = true;
                      el.setAttribute('playsinline', '');
                      el.setAttribute('webkit-playsinline', '');
                      el.play().catch(() => {});
                    }
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <div className="text-base font-semibold text-white">
                    {activeScreenShare.userName}'s Screen
                  </div>
                  <div className="text-xs text-gray-300 mt-1">Screen sharing - Tap to view</div>
                </div>
                <div className="absolute top-3 right-3 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                  Screen
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {/* <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => setShowAllThumbnails(false)}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div> */}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Main Video Area - 85% height with improved container */}
      <div 
        className="h-[85%] relative bg-black overflow-hidden"
        onClick={() => setShowMobileControls(!showMobileControls)}
      >
        {/* Zoomed Video - Fixed aspect ratio handling */}
        {zoomed ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              key={`zoomed-${zoomed.userId}`}
              autoPlay
              playsInline
              muted={zoomed.type !== "viewer"}
              className="max-w-full max-h-full"
              style={getVideoContainerStyle()}
              ref={(el) => {
                if (el && zoomed.stream) {
                  el.srcObject = zoomed.stream;
                  el.muted = zoomed.type !== "viewer";
                  el.playsInline = true;
                  el.setAttribute('playsinline', '');
                  el.setAttribute('webkit-playsinline', '');
                  el.play().catch(() => {});
                }
              }}
            />
            
            <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {zoomed.type === "streamer" ? "Your Camera" : 
               zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
               `${activeScreenShare?.userName}'s Screen`}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomed(null);
              }}
              className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Default streamer video with proper aspect ratio handling
          <div className="w-full h-full flex items-center justify-center bg-black">
            <video
              key="main-streamer-video"
              ref={videoElementRef}
              muted
              playsInline
              className="max-w-full max-h-full"
              style={getVideoContainerStyle()}
              onError={(e) => {
                console.error('📱 Mobile video error:', e);
                setMediaError(true);
                setShowPlayButton(true);
              }}
            />
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            {isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
          {showPlayButton && !videoLoaded && (
            <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
              Loading...
            </span>
          )}
        </div>

        {/* Play button */}
        {showPlayButton && !mediaError && !zoomed && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayClick(e);
            }}
          >
            <div className="text-center">
              <div className="bg-blue-600/90 text-white p-5 rounded-full shadow-lg mb-3">
                <FiPlay className="h-10 w-10" />
              </div>
              <p className="text-white text-sm">Tap to start video</p>
              {!videoLoaded && (
                <p className="text-yellow-300 text-xs mt-1">Video loading...</p>
              )}
            </div>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
            <div className="text-center">
              <FiLoader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Setting up camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Permanent Thumbnails Area - 15% height */}
      <div className="h-[15%] bg-gray-800 border-t border-gray-600">
        <div className="flex h-full items-center">
          {/* Thumbnails container with horizontal scroll */}
          <div className="flex-1 overflow-x-auto px-2">
            <div className="flex space-x-2 h-full items-center py-1">
              {/* Streamer thumbnail */}
              {mediaStream && (
                <ThumbnailVideoMobile
                  uid="streamer"
                  stream={mediaStream}
                  userName="You"
                  onClick={() => {
                    setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                    setShowPlayButton(false);
                  }}
                  isZoomed={zoomed?.type === "streamer"}
                  videoEnabled={videoEnabled}
                  isMobile={true}
                />
              )}
              
              {/* First 2 viewer cameras (or all if less than 3) */}
              {[...viewerCameras.entries()].slice(0, showViewMore ? 2 : 3).map(([uid, stream]) => (
                <ThumbnailVideoMobile
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
                  isMobile={true}
                />
              ))}
              
              {/* Screen share (if exists and we have space) */}
              {activeScreenShare && (!showViewMore || viewerCameras.size < 2) && (
                <ThumbnailVideoMobile
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
                  isMobile={true}
                />
              )}

              {/* View More button if many thumbnails */}
              {showViewMore && (
                <button
                  onClick={() => setShowAllThumbnails(true)}
                  className="flex-shrink-0 w-20 h-16 bg-gray-700 rounded-lg flex flex-col items-center justify-center text-white border border-gray-600 active:scale-95 transition-transform"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <FiGrid className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">View All</span>
                  <span className="text-[10px] text-gray-300">
                    +{totalThumbnails - 3} more
                  </span>
                </button>
              )}

              {/* Empty state */}
              {viewerCameras.size === 0 && !activeScreenShare && !mediaStream && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
                  <div className="text-center">
                    <FiVideoOff className="h-4 w-4 mx-auto mb-1 opacity-50" />
                    <p>No videos available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional: Right scroll indicator */}
          {showViewMore && (
            <div className="pr-2">
              <FiChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails Overlay Modal - बड़े थंबनेल के साथ */}
      {showAllThumbnails && <ThumbnailsOverlay />}
    </div>
  );
};

export default MobileVideoView;