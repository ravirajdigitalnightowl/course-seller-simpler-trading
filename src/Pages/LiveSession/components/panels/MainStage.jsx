// import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { 
//   FiVideo, 
//   FiVideoOff, 
//   FiMonitor, 
//   FiX, 
//   FiLoader, 
//   FiPlay, 
//   FiAlertCircle, 
//   FiEdit3, 
//   FiMaximize, 
//   FiMinimize 
// } from "react-icons/fi";

// export default function MainStage({
//   // layout control
//   zoomed,
//   setZoomed,

//   // streams/refs
//   mediaStream,
//   videoRef,
//   screenRef,
//   zoomedVideoRef,

//   // zoom label deps
//   participants,
//   activeScreenShare,
//   viewerScreenShare,

//   // whiteboard
//   showWhiteboard,
//   whiteboardSessionInfo,
//   StreamerWhiteboard,
//   ScreenAnnotationWhiteboard, // ✅ NAYA PROP
//   handleCloseWhiteboard,
//   appViewerScreenShare,

//   // ui states
//   isPlaying,
//   isLoading,
//   isInitializing,
//   showPlayButton,
//   mediaError,
//   videoEnabled,

//   // handlers
//   handlePlayClick,
//   retryCamera,

//   // optional: sidebar toggle button render
//   renderSidebarToggleButton,
// }) {
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // --------------------------
//   // Fullscreen Listener
//   // --------------------------
//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       setIsFullscreen(!!document.fullscreenElement);
//     };
//     document.addEventListener("fullscreenchange", handleFullscreenChange);
//     return () => {
//       document.removeEventListener("fullscreenchange", handleFullscreenChange);
//     };
//   }, []);

//   // --------------------------
//   // Fullscreen Button Handler
//   // --------------------------
//   const toggleFullscreen = useCallback((e) => {
//     e.stopPropagation();
//     const el = document.querySelector(".main-video-container");
//     if (!el) return;

//     if (!document.fullscreenElement) {
//       el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
//     } else {
//       document.exitFullscreen().catch(() => {});
//     }
//   }, []);

//   // --------------------------
//   // Zoomed video label
//   // --------------------------
//   const zoomLabel = useMemo(() => {
//     if (!zoomed) return null;

//     if (zoomed.type === "streamer") {
//       return { icon: <FiVideo className="h-4 w-4 text-blue-400" />, text: "Your Camera" };
//     }
//     if (zoomed.type === "viewer") {
//       const nm = participants?.find((p) => p.userId === zoomed.userId)?.name || "Viewer";
//       return { icon: <FiVideo className="h-4 w-4 text-green-400" />, text: `${nm}'s Camera` };
//     }
//     if (zoomed.type === "screen") {
//       const nm = activeScreenShare?.userName || "Streamer";
//       return { icon: <FiMonitor className="h-4 w-4 text-purple-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "viewer-screen") {
//       const nm = viewerScreenShare?.userName || "Viewer";
//       return { icon: <FiMonitor className="h-4 w-4 text-orange-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "app-viewer-screen") {
//       const nm = appViewerScreenShare?.userName || "App Viewer";
//       // Pink color de diya taaki web (orange) aur app (pink) alag dikhein
//       return { icon: <FiMonitor className="h-4 w-4 text-pink-400" />, text: `${nm}'s App Screen` };
//     }
//     if (zoomed.type === "whiteboard") {
//       return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
//     }
//     return null;
//   }, [zoomed, participants, activeScreenShare, viewerScreenShare,appViewerScreenShare]);


//   // ✅ UNIFIED MAIN STAGE VIDEO MANAGER
//   useEffect(() => {
//     // 1. Camera (videoRef)
//     if (videoRef.current) {
//       const shouldPlayCamera = !zoomed || zoomed.type === "streamer";
//       if (shouldPlayCamera && mediaStream) {
//         if (videoRef.current.srcObject !== mediaStream) {
//           videoRef.current.srcObject = mediaStream;
//         }
//         videoRef.current.play().catch(() => {});
//       }
//     }

//     // 2. Streamer Screen Share (screenRef)
//     if (screenRef.current) {
//       const shouldPlayScreen = zoomed?.type === "screen" && activeScreenShare?.stream;
//       if (shouldPlayScreen) {
//         if (screenRef.current.srcObject !== activeScreenShare.stream) {
//           screenRef.current.srcObject = activeScreenShare.stream;
//         }
//         screenRef.current.muted = true; // Streamer ko apni echo nahi sunni chahiye
//         screenRef.current.play().catch(() => {});
//       }
//     }

//     // 3. Zoomed Viewer Camera/Screen (zoomedVideoRef)
//     if (zoomedVideoRef.current) {
//       // const isViewerZoomed = zoomed && (zoomed.type === "viewer" || zoomed.type === "viewer-screen");
//       const isViewerZoomed = zoomed && (zoomed.type === "viewer" || zoomed.type === "viewer-screen" || zoomed.type === "app-viewer-screen");
//       if (isViewerZoomed && zoomed.stream) {
//         if (zoomedVideoRef.current.srcObject !== zoomed.stream) {
//           zoomedVideoRef.current.srcObject = zoomed.stream;
//         }
//         zoomedVideoRef.current.play().catch(() => {});
//       }
//     }
//   }, [zoomed, mediaStream, activeScreenShare?.stream]);

//   // --------------------------
//   // Render
//   // --------------------------
//   return (
//     <div className="relative flex-1 bg-black overflow-hidden main-video-container">
//       {/* Zoomed / Default */}
//       {zoomed ? (
//         <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
//           {zoomed.type === "whiteboard" ? (
//             showWhiteboard && whiteboardSessionInfo ? (
//               <div className="w-full h-full">
//                 <StreamerWhiteboard
//                   key={`whiteboard-${whiteboardSessionInfo.sessionId}`}
//                   sessionId={whiteboardSessionInfo.sessionId}
//                   roomCode={whiteboardSessionInfo.roomCode}
//                   wsToken={whiteboardSessionInfo.wsToken}
//                   sessionInfo={whiteboardSessionInfo}
//                   isActive={showWhiteboard}
//                   onClose={handleCloseWhiteboard}
//                   isStreamer={true}
//                   allowViewersToDraw={true}
//                   mainScreenMode={true}
//                   compact={true}
//                 />
//               </div>
//             ) : (
//               <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//                 <div className="text-white text-center">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
//                   <p className="text-sm">Loading whiteboard...</p>
//                 </div>
//               </div>
//             )
//           ) : (
//             // ✅ NAYA: Aspect-video wrapper enforced completely to match Viewer side
//             <div className="relative aspect-video w-full max-h-full flex items-center justify-center">
//               <video
//                 key={zoomed.type}
//                 ref={
//                   zoomed.type === "screen"
//                     ? screenRef
//                     : zoomed.type === "streamer"
//                     ? videoRef
//                     : zoomedVideoRef
//                 }
//                 autoPlay
//                 playsInline
//                 muted={zoomed.type !== "viewer"}
//                 className="absolute inset-0 w-full h-full object-contain bg-black"
//                 onError={(e) => console.error("Zoomed video error:", e)}
//               />

//               {/* Label */}
//               {zoomLabel && (
//                 <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
//                   {zoomLabel.icon}
//                   <span>{zoomLabel.text}</span>
//                 </div>
//               )}

//               {/* 🎨 NAYA: Screen Share Annotation Overlay Whiteboard */}
//               {zoomed.type === "screen" && ScreenAnnotationWhiteboard && whiteboardSessionInfo && (
//                 <div className="absolute inset-0 z-30 pointer-events-none">
//                   {/* wrapper div ko pointer-events-auto diya hai taaki whiteboard ke tools click ho sakein */}
//                   <div className="relative w-full h-full pointer-events-auto">
//                     <ScreenAnnotationWhiteboard
//                       key={`whiteboard-overlay-${whiteboardSessionInfo.sessionId}`}
//                       sessionId={`${whiteboardSessionInfo.sessionId}-screen`} 
//                       roomCode={whiteboardSessionInfo.roomCode}
//                       wsToken={whiteboardSessionInfo.wsToken}
//                       sessionInfo={whiteboardSessionInfo}
//                       isActive={true}
//                       isStreamer={true}
//                       allowViewersToDraw={true}
//                       compact={true}
//                       onClose={() => {}}
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="relative w-full h-full aspect-video max-h-full mx-auto">
//           <video
//             key="default-cam"
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted={true}
//             className={`absolute inset-0 w-full h-full object-contain bg-black ${
//               zoomed?.type === "whiteboard" ? "invisible" : "visible"
//             }`}
//             onError={(e) => {
//               console.error("Main video error:", e);
//             }}
//           />

//           {/* LIVE badge */}
//           <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg">
//             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
//             <span className="text-sm font-medium">LIVE</span>
//           </div>

//           {!videoEnabled && (
//             <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//               <div className="text-center">
//                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
//                   <FiVideoOff className="h-8 w-8 text-gray-400" />
//                 </div>
//                 <p className="text-white text-sm">Camera is off</p>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Status overlay */}
//       <div className="absolute top-4 left-4 flex items-center space-x-4 z-10 pointer-events-none">
//         <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//           <div className={`w-3 h-3 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
//           <span className="font-medium">{isPlaying ? "Live" : "Paused"}</span>
//         </div>
//       </div>

//       {/* Loading / init */}
//       {isLoading && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Loading camera...</p>
//           </div>
//         </div>
//       )}
//       {isInitializing && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Initializing stream...</p>
//           </div>
//         </div>
//       )}

//       {/* Play */}
//       {showPlayButton && !mediaError && !zoomed && (
//         <div
//           className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//           onClick={(e) => {
//             e.stopPropagation();
//             handlePlayClick?.();
//           }}
//         >
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//             <FiPlay className="h-16 w-16" />
//           </div>
//         </div>
//       )}

//       {/* Media error */}
//       {mediaError && !zoomed && (
//         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//           <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//             <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//             <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 retryCamera?.();
//               }}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
//             >
//               Retry Camera
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ✅ NEW: Fullscreen Toggle Button - right-16 par set kiya taaki right-4 wale arrow se door rahe */}
//       <div className="absolute top-4 right-16 z-50 pointer-events-auto">
//         <button
//           onClick={toggleFullscreen}
//           className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-colors flex items-center justify-center"
//           title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
//         >
//           {isFullscreen ? <FiMinimize className="h-5 w-5 text-white" /> : <FiMaximize className="h-5 w-5 text-white" />}
//         </button>
//       </div>

//       {/* ✅ Sidebar toggle button */}
//       <div className="absolute right-4 top-4 z-[60] pointer-events-auto">
//         {renderSidebarToggleButton?.()}
//       </div>
//     </div>
//   );
// }






// import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { 
//   FiVideo, 
//   FiVideoOff, 
//   FiMonitor, 
//   FiX, 
//   FiLoader, 
//   FiPlay, 
//   FiAlertCircle, 
//   FiEdit3, 
//   FiMaximize, 
//   FiMinimize 
// } from "react-icons/fi";

// export default function MainStage({
//   // layout control
//   zoomed,
//   setZoomed,

//   // streams/refs
//   mediaStream,
//   videoRef,
//   screenRef,
//   zoomedVideoRef,

//   // zoom label deps
//   participants,
//   activeScreenShare,
//   viewerScreenShare,

//   // whiteboard
//   showWhiteboard,
//   whiteboardSessionInfo,
//   StreamerWhiteboard,
//   ScreenAnnotationWhiteboard,
//   handleCloseWhiteboard,
//   appViewerScreenShare,

//   // ui states
//   isPlaying,
//   isLoading,
//   isInitializing,
//   showPlayButton,
//   mediaError,
//   videoEnabled,

//   // handlers
//   handlePlayClick,
//   retryCamera,

//   // optional: sidebar toggle button render
//   renderSidebarToggleButton,
// }) {
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // --------------------------
//   // Fullscreen Listener
//   // --------------------------
//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       setIsFullscreen(!!document.fullscreenElement);
//     };
//     document.addEventListener("fullscreenchange", handleFullscreenChange);
//     return () => {
//       document.removeEventListener("fullscreenchange", handleFullscreenChange);
//     };
//   }, []);

//   // --------------------------
//   // Fullscreen Button Handler
//   // --------------------------
//   const toggleFullscreen = useCallback((e) => {
//     e.stopPropagation();
//     const el = document.querySelector(".main-video-container");
//     if (!el) return;

//     if (!document.fullscreenElement) {
//       el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
//     } else {
//       document.exitFullscreen().catch(() => {});
//     }
//   }, []);

//   // --------------------------
//   // Zoomed video label
//   // --------------------------
//   const zoomLabel = useMemo(() => {
//     if (!zoomed) return null;

//     if (zoomed.type === "streamer") {
//       return { icon: <FiVideo className="h-4 w-4 text-blue-400" />, text: "Your Camera" };
//     }
//     if (zoomed.type === "viewer") {
//       const nm = participants?.find((p) => p.userId === zoomed.userId)?.name || "Viewer";
//       return { icon: <FiVideo className="h-4 w-4 text-green-400" />, text: `${nm}'s Camera` };
//     }
//     if (zoomed.type === "screen") {
//       const nm = activeScreenShare?.userName || "Streamer";
//       return { icon: <FiMonitor className="h-4 w-4 text-purple-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "viewer-screen") {
//       const nm = viewerScreenShare?.userName || "Viewer";
//       return { icon: <FiMonitor className="h-4 w-4 text-orange-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "app-viewer-screen") {
//       const nm = appViewerScreenShare?.userName || "App Viewer";
//       return { icon: <FiMonitor className="h-4 w-4 text-pink-400" />, text: `${nm}'s App Screen` };
//     }
//     if (zoomed.type === "whiteboard") {
//       return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
//     }
//     return null;
//   }, [zoomed, participants, activeScreenShare, viewerScreenShare, appViewerScreenShare]);


//   // ✅ UNIFIED MAIN STAGE VIDEO MANAGER
//   useEffect(() => {
//     // 1. Camera (videoRef)
//     if (videoRef.current) {
//       const shouldPlayCamera = !zoomed || zoomed.type === "streamer";
//       if (shouldPlayCamera && mediaStream) {
//         if (videoRef.current.srcObject !== mediaStream) {
//           videoRef.current.srcObject = mediaStream;
//         }
//         videoRef.current.play().catch(() => {});
//       }
//     }

//     // 2. Streamer Screen Share (screenRef)
//     if (screenRef.current) {
//       const shouldPlayScreen = zoomed?.type === "screen" && activeScreenShare?.stream;
//       if (shouldPlayScreen) {
//         if (screenRef.current.srcObject !== activeScreenShare.stream) {
//           screenRef.current.srcObject = activeScreenShare.stream;
//         }
//         screenRef.current.muted = true; // Streamer ko apni echo nahi sunni chahiye
//         screenRef.current.play().catch(() => {});
//       }
//     }

//     // 3. Zoomed Viewer Camera/Screen (zoomedVideoRef)
//     if (zoomedVideoRef.current) {
//       const isViewerZoomed = zoomed && (zoomed.type === "viewer" || zoomed.type === "viewer-screen" || zoomed.type === "app-viewer-screen");
//       if (isViewerZoomed && zoomed.stream) {
//         if (zoomedVideoRef.current.srcObject !== zoomed.stream) {
//           zoomedVideoRef.current.srcObject = zoomed.stream;
//         }
//         zoomedVideoRef.current.play().catch(() => {});
//       }
//     }
//   }, [zoomed, mediaStream, activeScreenShare?.stream]);

//   // --------------------------
//   // Render
//   // --------------------------
//   return (
//     <div className="relative flex-1 bg-black overflow-hidden main-video-container">
//       {/* Zoomed / Default */}
//       {zoomed ? (
//         <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
//           {zoomed.type === "whiteboard" ? (
//             showWhiteboard && whiteboardSessionInfo ? (
//               <div className="w-full h-full">
//                 <StreamerWhiteboard
//                   key={`whiteboard-${whiteboardSessionInfo.sessionId}`}
//                   sessionId={whiteboardSessionInfo.sessionId}
//                   roomCode={whiteboardSessionInfo.roomCode}
//                   wsToken={whiteboardSessionInfo.wsToken}
//                   sessionInfo={whiteboardSessionInfo}
//                   isActive={showWhiteboard}
//                   onClose={handleCloseWhiteboard}
//                   isStreamer={true}
//                   allowViewersToDraw={true}
//                   mainScreenMode={true}
//                   compact={true}
//                 />
//               </div>
//             ) : (
//               <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//                 <div className="text-white text-center">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
//                   <p className="text-sm">Loading whiteboard...</p>
//                 </div>
//               </div>
//             )
//           ) : (
//             // 🔥 FINAL FIX: Strict 16:9 Wrapper that bounds both Video and Whiteboard
//             <div className="relative w-full max-h-full aspect-video flex items-center justify-center bg-black">
//               <video
//                 key={zoomed.type}
//                 ref={
//                   zoomed.type === "screen"
//                     ? screenRef
//                     : zoomed.type === "streamer"
//                     ? videoRef
//                     : zoomedVideoRef
//                 }
//                 autoPlay
//                 playsInline
//                 muted={zoomed.type !== "viewer"}
//                 // Force video to fill this exact 16:9 box
//                 className="absolute inset-0 w-full h-full object-contain"
//                 onError={(e) => console.error("Zoomed video error:", e)}
//               />

//               {/* Label */}
//               {zoomLabel && (
//                 <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
//                   {zoomLabel.icon}
//                   <span>{zoomLabel.text}</span>
//                 </div>
//               )}

//               {/* 🎨 Screen Share Annotation Overlay Whiteboard locked inside the 16:9 box */}
//               {zoomed.type === "screen" && ScreenAnnotationWhiteboard && whiteboardSessionInfo && (
//                 <div className="absolute inset-0 z-30 pointer-events-none">
//                   {/* wrapper div ko pointer-events-auto diya hai taaki whiteboard ke tools click ho sakein */}
//                   <div className="relative w-full h-full pointer-events-auto">
//                     <ScreenAnnotationWhiteboard
//                       key={`whiteboard-overlay-${whiteboardSessionInfo.sessionId}`}
//                       sessionId={`${whiteboardSessionInfo.sessionId}-screen`} 
//                       roomCode={whiteboardSessionInfo.roomCode}
//                       wsToken={whiteboardSessionInfo.wsToken}
//                       sessionInfo={whiteboardSessionInfo}
//                       isActive={true}
//                       isStreamer={true}
//                       allowViewersToDraw={true}
//                       compact={true}
//                       onClose={() => {}}
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="relative w-full h-full aspect-video max-h-full mx-auto flex items-center justify-center">
//           <video
//             key="default-cam"
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted={true}
//             className={`absolute inset-0 w-full h-full object-contain bg-black ${
//               zoomed?.type === "whiteboard" ? "invisible" : "visible"
//             }`}
//             onError={(e) => {
//               console.error("Main video error:", e);
//             }}
//           />

//           {/* LIVE badge */}
//           <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg">
//             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
//             <span className="text-sm font-medium">LIVE</span>
//           </div>

//           {!videoEnabled && (
//             <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//               <div className="text-center">
//                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
//                   <FiVideoOff className="h-8 w-8 text-gray-400" />
//                 </div>
//                 <p className="text-white text-sm">Camera is off</p>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Status overlay */}
//       <div className="absolute top-4 left-4 flex items-center space-x-4 z-10 pointer-events-none">
//         <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//           <div className={`w-3 h-3 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
//           <span className="font-medium">{isPlaying ? "Live" : "Paused"}</span>
//         </div>
//       </div>

//       {/* Loading / init */}
//       {isLoading && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Loading camera...</p>
//           </div>
//         </div>
//       )}
//       {isInitializing && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Initializing stream...</p>
//           </div>
//         </div>
//       )}

//       {/* Play */}
//       {showPlayButton && !mediaError && !zoomed && (
//         <div
//           className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//           onClick={(e) => {
//             e.stopPropagation();
//             handlePlayClick?.();
//           }}
//         >
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//             <FiPlay className="h-16 w-16" />
//           </div>
//         </div>
//       )}

//       {/* Media error */}
//       {mediaError && !zoomed && (
//         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//           <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//             <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//             <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 retryCamera?.();
//               }}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
//             >
//               Retry Camera
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Fullscreen Toggle Button */}
//       <div className="absolute top-4 right-16 z-50 pointer-events-auto">
//         <button
//           onClick={toggleFullscreen}
//           className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-colors flex items-center justify-center"
//           title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
//         >
//           {isFullscreen ? <FiMinimize className="h-5 w-5 text-white" /> : <FiMaximize className="h-5 w-5 text-white" />}
//         </button>
//       </div>

//       {/* Sidebar toggle button */}
//       <div className="absolute right-4 top-4 z-[60] pointer-events-auto">
//         {renderSidebarToggleButton?.()}
//       </div>
//     </div>
//   );
// }










// import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { 
//   FiVideo, 
//   FiVideoOff, 
//   FiMonitor, 
//   FiX, 
//   FiLoader, 
//   FiPlay, 
//   FiAlertCircle, 
//   FiEdit3, 
//   FiMaximize, 
//   FiMinimize 
// } from "react-icons/fi";

// export default function MainStage({
//   // layout control
//   zoomed,
//   setZoomed,

//   // streams/refs
//   mediaStream,
//   videoRef,
//   screenRef,
//   zoomedVideoRef,

//   // zoom label deps
//   participants,
//   activeScreenShare,
//   viewerScreenShare,

//   // whiteboard
//   showWhiteboard,
//   whiteboardSessionInfo,
//   StreamerWhiteboard,
//   ScreenAnnotationWhiteboard,
//   handleCloseWhiteboard,
//   appViewerScreenShare,

//   // ui states
//   isPlaying,
//   isLoading,
//   isInitializing,
//   showPlayButton,
//   mediaError,
//   videoEnabled,

//   // handlers
//   handlePlayClick,
//   retryCamera,

//   // optional: sidebar toggle button render
//   renderSidebarToggleButton,
// }) {
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // 🔥 NAYA: Dynamic 16:9 Bounding Box Engine
//   const stageRef = useRef(null);
//   const [boxStyle, setBoxStyle] = useState({ width: '100%', height: '100%' });

//   useEffect(() => {
//     const updateBox = () => {
//       if (!stageRef.current) return;
//       const { clientWidth: w, clientHeight: h } = stageRef.current;
//       if (!w || !h) return;
      
//       // Strict 16:9 calculation
//       if (w / h > 16 / 9) {
//         // Screen is wider than 16:9 (e.g. Ultrawide monitor) -> Lock by height
//         setBoxStyle({ width: `${h * (16 / 9)}px`, height: `${h}px` });
//       } else {
//         // Screen is taller than 16:9 (e.g. Macbook 16:10 or Mobile) -> Lock by width
//         setBoxStyle({ width: `${w}px`, height: `${w * (9 / 16)}px` });
//       }
//     };

//     updateBox();
//     window.addEventListener("resize", updateBox);
    
//     // Smooth resize handler
//     const observer = new ResizeObserver(updateBox);
//     if (stageRef.current) observer.observe(stageRef.current);
    
//     return () => {
//       window.removeEventListener("resize", updateBox);
//       observer.disconnect();
//     };
//   }, [zoomed, isFullscreen]);

//   // --------------------------
//   // Fullscreen Listener
//   // --------------------------
//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       setIsFullscreen(!!document.fullscreenElement);
//     };
//     document.addEventListener("fullscreenchange", handleFullscreenChange);
//     return () => {
//       document.removeEventListener("fullscreenchange", handleFullscreenChange);
//     };
//   }, []);

//   // --------------------------
//   // Fullscreen Button Handler
//   // --------------------------
//   const toggleFullscreen = useCallback((e) => {
//     e.stopPropagation();
//     const el = document.querySelector(".main-video-container");
//     if (!el) return;

//     if (!document.fullscreenElement) {
//       el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
//     } else {
//       document.exitFullscreen().catch(() => {});
//     }
//   }, []);

//   // --------------------------
//   // Zoomed video label
//   // --------------------------
//   const zoomLabel = useMemo(() => {
//     if (!zoomed) return null;

//     if (zoomed.type === "streamer") {
//       return { icon: <FiVideo className="h-4 w-4 text-blue-400" />, text: "Your Camera" };
//     }
//     if (zoomed.type === "viewer") {
//       const nm = participants?.find((p) => p.userId === zoomed.userId)?.name || "Viewer";
//       return { icon: <FiVideo className="h-4 w-4 text-green-400" />, text: `${nm}'s Camera` };
//     }
//     if (zoomed.type === "screen") {
//       const nm = activeScreenShare?.userName || "Streamer";
//       return { icon: <FiMonitor className="h-4 w-4 text-purple-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "viewer-screen") {
//       const nm = viewerScreenShare?.userName || "Viewer";
//       return { icon: <FiMonitor className="h-4 w-4 text-orange-400" />, text: `${nm}'s Screen` };
//     }
//     if (zoomed.type === "app-viewer-screen") {
//       const nm = appViewerScreenShare?.userName || "App Viewer";
//       return { icon: <FiMonitor className="h-4 w-4 text-pink-400" />, text: `${nm}'s App Screen` };
//     }
//     if (zoomed.type === "whiteboard") {
//       return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
//     }
//     return null;
//   }, [zoomed, participants, activeScreenShare, viewerScreenShare, appViewerScreenShare]);

//   // ✅ UNIFIED MAIN STAGE VIDEO MANAGER
//   useEffect(() => {
//     // 1. Camera (videoRef)
//     if (videoRef.current) {
//       const shouldPlayCamera = !zoomed || zoomed.type === "streamer";
//       if (shouldPlayCamera && mediaStream) {
//         if (videoRef.current.srcObject !== mediaStream) {
//           videoRef.current.srcObject = mediaStream;
//         }
//         videoRef.current.play().catch(() => {});
//       }
//     }

//     // 2. Streamer Screen Share (screenRef)
//     if (screenRef.current) {
//       const shouldPlayScreen = zoomed?.type === "screen" && activeScreenShare?.stream;
//       if (shouldPlayScreen) {
//         if (screenRef.current.srcObject !== activeScreenShare.stream) {
//           screenRef.current.srcObject = activeScreenShare.stream;
//         }
//         screenRef.current.muted = true; // Streamer ko apni echo nahi sunni chahiye
//         screenRef.current.play().catch(() => {});
//       }
//     }

//     // 3. Zoomed Viewer Camera/Screen (zoomedVideoRef)
//     if (zoomedVideoRef.current) {
//       const isViewerZoomed = zoomed && (zoomed.type === "viewer" || zoomed.type === "viewer-screen" || zoomed.type === "app-viewer-screen");
//       if (isViewerZoomed && zoomed.stream) {
//         if (zoomedVideoRef.current.srcObject !== zoomed.stream) {
//           zoomedVideoRef.current.srcObject = zoomed.stream;
//         }
//         zoomedVideoRef.current.play().catch(() => {});
//       }
//     }
//   }, [zoomed, mediaStream, activeScreenShare?.stream]);

//   // --------------------------
//   // Render
//   // --------------------------
//   return (
//     // 🔥 Parent container with flex-center ensures our 16:9 box is perfectly centered
//     <div ref={stageRef} className="relative flex-1 w-full h-full bg-black overflow-hidden main-video-container flex items-center justify-center">
      
//       {/* Zoomed / Default */}
//       {zoomed ? (
//         // 🔥 This box strictly maintains 16:9 avoiding ANY offset during fullscreen
//         <div style={boxStyle} className="relative bg-black overflow-hidden flex items-center justify-center">
//           {zoomed.type === "whiteboard" ? (
//             showWhiteboard && whiteboardSessionInfo ? (
//               <StreamerWhiteboard
//                 key={`whiteboard-${whiteboardSessionInfo.sessionId}`}
//                 sessionId={whiteboardSessionInfo.sessionId}
//                 roomCode={whiteboardSessionInfo.roomCode}
//                 wsToken={whiteboardSessionInfo.wsToken}
//                 sessionInfo={whiteboardSessionInfo}
//                 isActive={showWhiteboard}
//                 onClose={handleCloseWhiteboard}
//                 isStreamer={true}
//                 allowViewersToDraw={true}
//                 mainScreenMode={true}
//                 compact={true}
//               />
//             ) : (
//               <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//                 <div className="text-white text-center">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
//                   <p className="text-sm">Loading whiteboard...</p>
//                 </div>
//               </div>
//             )
//           ) : (
//             <>
//               <video
//                 key={zoomed.type}
//                 ref={
//                   zoomed.type === "screen"
//                     ? screenRef
//                     : zoomed.type === "streamer"
//                     ? videoRef
//                     : zoomedVideoRef
//                 }
//                 autoPlay
//                 playsInline
//                 muted={zoomed.type !== "viewer"}
//                 // 'object-cover' ensures video fills our strict 16:9 box perfectly without inner black bars
//                 className="absolute inset-0 w-full h-full object-cover"
//                 onError={(e) => console.error("Zoomed video error:", e)}
//               />

//               {/* Label */}
//               {zoomLabel && (
//                 <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
//                   {zoomLabel.icon}
//                   <span>{zoomLabel.text}</span>
//                 </div>
//               )}

//               {/* 🎨 Screen Share Annotation Overlay Whiteboard strictly mapped to the video */}
//               {zoomed.type === "screen" && ScreenAnnotationWhiteboard && whiteboardSessionInfo && (
//                 <div className="absolute inset-0 z-30 pointer-events-none">
//                   <div className="relative w-full h-full pointer-events-auto">
//                     <ScreenAnnotationWhiteboard
//                       key={`whiteboard-overlay-${whiteboardSessionInfo.sessionId}`}
//                       sessionId={`${whiteboardSessionInfo.sessionId}-screen`} 
//                       roomCode={whiteboardSessionInfo.roomCode}
//                       wsToken={whiteboardSessionInfo.wsToken}
//                       sessionInfo={whiteboardSessionInfo}
//                       isActive={true}
//                       isStreamer={true}
//                       allowViewersToDraw={true}
//                       compact={true}
//                       onClose={() => {}}
//                     />
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       ) : (
//         <div style={boxStyle} className="relative bg-black overflow-hidden flex items-center justify-center">
//           <video
//             key="default-cam"
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted={true}
//             className={`absolute inset-0 w-full h-full object-cover bg-black ${
//               zoomed?.type === "whiteboard" ? "invisible" : "visible"
//             }`}
//             onError={(e) => {
//               console.error("Main video error:", e);
//             }}
//           />

//           {/* LIVE badge */}
//           <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg z-20">
//             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
//             <span className="text-sm font-medium">LIVE</span>
//           </div>

//           {!videoEnabled && (
//             <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
//               <div className="text-center">
//                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
//                   <FiVideoOff className="h-8 w-8 text-gray-400" />
//                 </div>
//                 <p className="text-white text-sm">Camera is off</p>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* OVERLAYS (Keep these outside the 16:9 box so they stay at screen edges) */}
      
//       {/* Status overlay */}
//       <div className="absolute top-4 left-4 flex items-center space-x-4 z-10 pointer-events-none">
//         <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
//           <div className={`w-3 h-3 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
//           <span className="font-medium">{isPlaying ? "Live" : "Paused"}</span>
//         </div>
//       </div>

//       {/* Loading / init */}
//       {isLoading && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Loading camera...</p>
//           </div>
//         </div>
//       )}
//       {isInitializing && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
//           <div className="text-center">
//             <FiLoader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
//             <p className="text-white font-medium text-lg">Initializing stream...</p>
//           </div>
//         </div>
//       )}

//       {/* Play Button */}
//       {showPlayButton && !mediaError && !zoomed && (
//         <div
//           className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer z-30"
//           onClick={(e) => {
//             e.stopPropagation();
//             handlePlayClick?.();
//           }}
//         >
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
//             <FiPlay className="h-16 w-16" />
//           </div>
//         </div>
//       )}

//       {/* Media error */}
//       {mediaError && !zoomed && (
//         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
//           <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
//             <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//             <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 retryCamera?.();
//               }}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
//             >
//               Retry Camera
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Fullscreen Toggle Button */}
//       <div className="absolute top-4 right-16 z-50 pointer-events-auto">
//         <button
//           onClick={toggleFullscreen}
//           className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-colors flex items-center justify-center"
//           title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
//         >
//           {isFullscreen ? <FiMinimize className="h-5 w-5 text-white" /> : <FiMaximize className="h-5 w-5 text-white" />}
//         </button>
//       </div>

//       {/* Sidebar toggle button */}
//       <div className="absolute right-4 top-4 z-[60] pointer-events-auto">
//         {renderSidebarToggleButton?.()}
//       </div>
//     </div>
//   );
// }



import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { 
  FiVideo, 
  FiVideoOff, 
  FiMonitor, 
  FiX, 
  FiLoader, 
  FiPlay, 
  FiAlertCircle, 
  FiEdit3, 
  FiMaximize, 
  FiMinimize 
} from "react-icons/fi";

export default function MainStage({
  // layout control
  zoomed,
  setZoomed,

  // streams/refs
  mediaStream,
  videoRef,
  screenRef,
  zoomedVideoRef,

  // zoom label deps
  participants,
  activeScreenShare,
  viewerScreenShare,

  // whiteboard
  showWhiteboard,
  whiteboardSessionInfo,
  StreamerWhiteboard,
  ScreenAnnotationWhiteboard,
  handleCloseWhiteboard,
  appViewerScreenShare,

  // ui states
  isPlaying,
  isLoading,
  isInitializing,
  showPlayButton,
  mediaError,
  videoEnabled,

  // handlers
  handlePlayClick,
  retryCamera,

  // optional: sidebar toggle button render
  renderSidebarToggleButton,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 🔥 THE MASTER FIX: Dynamic 16:9 Bounding Box with Absolute Positioning
  const stageRef = useRef(null);
  const [boxStyle, setBoxStyle] = useState({ 
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '100%', height: '100%' 
  });

  useEffect(() => {
    const updateBox = () => {
      if (!stageRef.current) return;
      const { clientWidth: w, clientHeight: h } = stageRef.current;
      if (!w || !h) return;
      
      // Strict 16:9 calculation with Absolute Positioning
      // Ye sidebar ko kabhi block nahi karega aur expand/shrink perfectly karega
      let newBoxStyle = { 
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' 
      };

      if (w / h > 16 / 9) {
        // Screen is wider than 16:9 -> Lock by height
        newBoxStyle.width = `${h * (16 / 9)}px`;
        newBoxStyle.height = `${h}px`;
      } else {
        // Screen is taller than 16:9 -> Lock by width
        newBoxStyle.width = `${w}px`;
        newBoxStyle.height = `${w * (9 / 16)}px`;
      }
      setBoxStyle(newBoxStyle);
    };

    updateBox();
    window.addEventListener("resize", updateBox);
    
    const observer = new ResizeObserver(updateBox);
    if (stageRef.current) observer.observe(stageRef.current);
    
    return () => {
      window.removeEventListener("resize", updateBox);
      observer.disconnect();
    };
  }, [zoomed, isFullscreen]);

  // --------------------------
  // Fullscreen Listener
  // --------------------------
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // --------------------------
  // Fullscreen Button Handler
  // --------------------------
  const toggleFullscreen = useCallback((e) => {
    e.stopPropagation();
    const el = document.querySelector(".main-video-container");
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // --------------------------
  // Zoomed video label
  // --------------------------
  const zoomLabel = useMemo(() => {
    if (!zoomed) return null;

    if (zoomed.type === "streamer") {
      return { icon: <FiVideo className="h-4 w-4 text-blue-400" />, text: "Your Camera" };
    }
    if (zoomed.type === "viewer") {
      const nm = participants?.find((p) => p.userId === zoomed.userId)?.name || "Viewer";
      return { icon: <FiVideo className="h-4 w-4 text-green-400" />, text: `${nm}'s Camera` };
    }
    if (zoomed.type === "screen") {
      const nm = activeScreenShare?.userName || "Streamer";
      return { icon: <FiMonitor className="h-4 w-4 text-purple-400" />, text: `${nm}'s Screen` };
    }
    if (zoomed.type === "viewer-screen") {
      const nm = viewerScreenShare?.userName || "Viewer";
      return { icon: <FiMonitor className="h-4 w-4 text-orange-400" />, text: `${nm}'s Screen` };
    }
    if (zoomed.type === "app-viewer-screen") {
      const nm = appViewerScreenShare?.userName || "App Viewer";
      return { icon: <FiMonitor className="h-4 w-4 text-pink-400" />, text: `${nm}'s App Screen` };
    }
    if (zoomed.type === "whiteboard") {
      return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
    }
    return null;
  }, [zoomed, participants, activeScreenShare, viewerScreenShare, appViewerScreenShare]);


  // ✅ UNIFIED MAIN STAGE VIDEO MANAGER
  useEffect(() => {
    // 1. Camera (videoRef)
    if (videoRef.current) {
      const shouldPlayCamera = !zoomed || zoomed.type === "streamer";
      if (shouldPlayCamera && mediaStream) {
        if (videoRef.current.srcObject !== mediaStream) {
          videoRef.current.srcObject = mediaStream;
        }
        videoRef.current.play().catch(() => {});
      }
    }

    // 2. Streamer Screen Share (screenRef)
    if (screenRef.current) {
      const shouldPlayScreen = zoomed?.type === "screen" && activeScreenShare?.stream;
      if (shouldPlayScreen) {
        if (screenRef.current.srcObject !== activeScreenShare.stream) {
          screenRef.current.srcObject = activeScreenShare.stream;
        }
        screenRef.current.muted = true; // Streamer ko apni echo nahi sunni chahiye
        screenRef.current.play().catch(() => {});
      }
    }

    // 3. Zoomed Viewer Camera/Screen (zoomedVideoRef)
    if (zoomedVideoRef.current) {
      const isViewerZoomed = zoomed && (zoomed.type === "viewer" || zoomed.type === "viewer-screen" || zoomed.type === "app-viewer-screen");
      if (isViewerZoomed && zoomed.stream) {
        if (zoomedVideoRef.current.srcObject !== zoomed.stream) {
          zoomedVideoRef.current.srcObject = zoomed.stream;
        }
        zoomedVideoRef.current.play().catch(() => {});
      }
    }
  }, [zoomed, mediaStream, activeScreenShare?.stream]);

  // --------------------------
  // Render
  // --------------------------
  return (
    // 🔥 Parent container referencing stageRef to calculate dimensions
    <div ref={stageRef} className="relative flex-1 bg-black overflow-hidden main-video-container flex items-center justify-center">
      
      {/* Zoomed / Default */}
      {zoomed ? (
        // 🔥 The strictly measured 16:9 Absolute Box
        <div style={boxStyle} className="bg-black overflow-hidden flex items-center justify-center">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
                  <p className="text-sm">Loading whiteboard...</p>
                </div>
              </div>
            )
          ) : (
            <>
              <video
                key={zoomed.type}
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
                // 🔥 THE OFFSET KILLER: Ensure video uses 'object-contain' to perfectly match mobile rendering!
                className="absolute inset-0 w-full h-full object-contain"
                onError={(e) => console.error("Zoomed video error:", e)}
              />

              {/* Label */}
              {zoomLabel && (
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
                  {zoomLabel.icon}
                  <span>{zoomLabel.text}</span>
                </div>
              )}

              {/* 🎨 Screen Share Annotation Overlay Whiteboard strictly mapped to the video container */}
              {zoomed.type === "screen" && ScreenAnnotationWhiteboard && whiteboardSessionInfo && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                  <div className="relative w-full h-full pointer-events-auto">
                    <ScreenAnnotationWhiteboard
                      key={`whiteboard-overlay-${whiteboardSessionInfo.sessionId}`}
                      sessionId={`${whiteboardSessionInfo.sessionId}-screen`} 
                      roomCode={whiteboardSessionInfo.roomCode}
                      wsToken={whiteboardSessionInfo.wsToken}
                      sessionInfo={whiteboardSessionInfo}
                      isActive={true}
                      isStreamer={true}
                      allowViewersToDraw={true}
                      compact={true}
                      onClose={() => {}}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div style={boxStyle} className="bg-black overflow-hidden flex items-center justify-center">
          <video
            key="default-cam"
            ref={videoRef}
            autoPlay
            playsInline
            muted={true}
            // 🔥 Consistent object-contain here too
            className={`absolute inset-0 w-full h-full object-contain bg-black ${
              zoomed?.type === "whiteboard" ? "invisible" : "visible"
            }`}
            onError={(e) => {
              console.error("Main video error:", e);
            }}
          />

          {/* LIVE badge */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg z-20">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">LIVE</span>
          </div>

          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
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

      {/* OVERLAYS (Keep these outside the 16:9 box so they stay at screen edges) */}
      
      {/* Status overlay */}
      <div className="absolute top-4 left-4 flex items-center space-x-4 z-10 pointer-events-none">
        <div className="flex items-center space-x-2 bg-black/70 text-sm text-white px-4 py-2 rounded-xl backdrop-blur-sm">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          <span className="font-medium">{isPlaying ? "Live" : "Paused"}</span>
        </div>
      </div>

      {/* Loading / init */}
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
          onClick={(e) => {
            e.stopPropagation();
            handlePlayClick?.();
          }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl">
            <FiPlay className="h-16 w-16" />
          </div>
        </div>
      )}

      {/* Media error */}
      {mediaError && !zoomed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm z-30">
          <div className="text-center p-8 bg-gray-800/80 rounded-2xl max-w-md backdrop-blur-sm">
            <FiAlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-xl mb-2 font-semibold text-white">Camera not available</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                retryCamera?.();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Toggle Button */}
      <div className="absolute top-4 right-16 z-50 pointer-events-auto">
        <button
          onClick={toggleFullscreen}
          className="bg-gray-800/80 hover:bg-gray-700/80 p-3 rounded-lg shadow-lg transition-colors flex items-center justify-center"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <FiMinimize className="h-5 w-5 text-white" /> : <FiMaximize className="h-5 w-5 text-white" />}
        </button>
      </div>

      {/* Sidebar toggle button */}
      <div className="absolute right-4 top-4 z-[60] pointer-events-auto">
        {renderSidebarToggleButton?.()}
      </div>
    </div>
  );
}