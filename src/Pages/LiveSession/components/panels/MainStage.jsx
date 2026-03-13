// import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import { FiVideo, FiVideoOff, FiMonitor, FiX, FiLoader, FiPlay, FiAlertCircle, FiEdit3 } from "react-icons/fi";

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
//   handleCloseWhiteboard,

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

//   // optional: sidebar toggle button render (so we can reuse for collapsed/expanded)
//   renderSidebarToggleButton,
// }) {
//   // --------------------------
//   // Fullscreen click handler
//   // --------------------------
//   const handleContainerClick = useCallback(
//     (e) => {
//       // 🛑 whiteboard zoomed => fullscreen block
//       if (zoomed?.type === "whiteboard") {
//         e.stopPropagation();
//         return;
//       }
//       if (!zoomed) return;

//       const el = document.querySelector(".main-video-container");
//       if (!el) return;

//       if (!document.fullscreenElement) {
//         el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
//       } else {
//         document.exitFullscreen().catch(() => {});
//       }
//     },
//     [zoomed]
//   );

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
//     if (zoomed.type === "whiteboard") {
//       return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
//     }
//     return null;
//   }, [zoomed, participants, activeScreenShare, viewerScreenShare]);

//   // --------------------------
//   // 🎨 Annotation overlay (screen zoom only)
//   // --------------------------
//   const canAnnotate = zoomed?.type === "screen"; // (chaaho to activeScreenShare?.source==='streamer' bhi add kar sakte ho)
//   const [annotateOn, setAnnotateOn] = useState(false);
//   const canvasRef = useRef(null);
//   const isDownRef = useRef(false);
//   const lastRef = useRef({ x: 0, y: 0 });

//   // resize canvas with container
//   useEffect(() => {
//     if (!canAnnotate) {
//       setAnnotateOn(false);
//       return;
//     }

//     const canvas = canvasRef.current;
//     const host = document.querySelector(".main-video-container");
//     if (!canvas || !host) return;

//     const ro = new ResizeObserver(() => {
//       const rect = host.getBoundingClientRect();
//       const dpr = window.devicePixelRatio || 1;

//       canvas.width = Math.max(1, Math.floor(rect.width * dpr));
//       canvas.height = Math.max(1, Math.floor(rect.height * dpr));
//       canvas.style.width = `${rect.width}px`;
//       canvas.style.height = `${rect.height}px`;

//       const ctx = canvas.getContext("2d");
//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//     });

//     ro.observe(host);
//     return () => ro.disconnect();
//   }, [canAnnotate]);

//   const getPos = (e) => {
//     const host = document.querySelector(".main-video-container");
//     const rect = host?.getBoundingClientRect();
//     const x = e.touches?.[0]?.clientX ?? e.clientX;
//     const y = e.touches?.[0]?.clientY ?? e.clientY;
//     return { x: x - (rect?.left || 0), y: y - (rect?.top || 0) };
//   };

//   const drawLine = (a, b) => {
//     const ctx = canvasRef.current?.getContext("2d");
//     if (!ctx) return;
//     ctx.lineWidth = 3;
//     ctx.lineCap = "round";
//     ctx.lineJoin = "round";
//     ctx.strokeStyle = "rgba(0,200,255,0.95)";
//     ctx.beginPath();
//     ctx.moveTo(a.x, a.y);
//     ctx.lineTo(b.x, b.y);
//     ctx.stroke();
//   };

//   const clearCanvas = () => {
//     const ctx = canvasRef.current?.getContext("2d");
//     const host = document.querySelector(".main-video-container");
//     if (!ctx || !host) return;
//     const rect = host.getBoundingClientRect();
//     ctx.clearRect(0, 0, rect.width, rect.height);
//   };

//   const onDown = (e) => {
//     if (!annotateOn) return;
//     e.preventDefault();
//     isDownRef.current = true;
//     lastRef.current = getPos(e);
//   };
//   const onMove = (e) => {
//     if (!annotateOn || !isDownRef.current) return;
//     e.preventDefault();
//     const p = getPos(e);
//     drawLine(lastRef.current, p);
//     lastRef.current = p;
//   };
//   const onUp = (e) => {
//     if (!annotateOn) return;
//     e.preventDefault();
//     isDownRef.current = false;
//   };

//   // zoom change -> reset annotate
//   useEffect(() => {
//     setAnnotateOn(false);
//     isDownRef.current = false;
//   }, [zoomed?.type, zoomed?.userId]);

//   // --------------------------
//   // Render
//   // --------------------------
//   return (
//     <div
//       className="relative flex-1 bg-black overflow-hidden cursor-pointer main-video-container"
//     >
//       {/* Zoomed / Default */}
//       {zoomed ? (
//         <div className="relative w-full h-full">
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

//               {/* 🎨 Annotation toolbar + canvas only for screen zoom */}
//               {canAnnotate && (
//                 <>
//                   <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-black/60 text-white rounded-lg px-3 py-2">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setAnnotateOn((v) => !v);
//                       }}
//                       className={`px-3 py-1 rounded-md text-sm ${
//                         annotateOn ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
//                       }`}
//                       title="Toggle Draw"
//                     >
//                       {annotateOn ? "Drawing ON" : "Draw"}
//                     </button>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         clearCanvas();
//                       }}
//                       className="px-3 py-1 rounded-md text-sm bg-gray-700 hover:bg-gray-600"
//                       title="Clear"
//                     >
//                       Clear
//                     </button>
//                     <div className="text-xs text-gray-200">Scroll: draw OFF karo.</div>
//                   </div>

//                   <canvas
//                     ref={canvasRef}
//                     className="absolute inset-0 z-20"
//                     style={{
//                       pointerEvents: annotateOn ? "auto" : "none",
//                       touchAction: "none",
//                     }}
//                     onMouseDown={onDown}
//                     onMouseMove={onMove}
//                     onMouseUp={onUp}
//                     onMouseLeave={onUp}
//                     onTouchStart={onDown}
//                     onTouchMove={onMove}
//                     onTouchEnd={onUp}
//                   />
//                 </>
//               )}
//             </>
//           )}
//         </div>
//       ) : (
//         <div className="relative w-full h-full">
//           <video
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted={true}
//             className={`absolute inset-0 w-full h-full object-contain bg-black ${
//               zoomed?.type === "whiteboard" ? "invisible" : "visible"
//             }`}
//             // NOTE: srcObject ko usually useEffect se set karte ho; agar tum yahin pass kar rahe ho to yahin rehne do
//             srcObject={mediaStream}
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
//       <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
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

//       {/* Sidebar toggle button (collapsed/expanded) */}
//       {renderSidebarToggleButton?.()}
//     </div>
//   );
// }













import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FiVideo, FiVideoOff, FiMonitor, FiX, FiLoader, FiPlay, FiAlertCircle, FiEdit3 } from "react-icons/fi";

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
  handleCloseWhiteboard,

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
  // --------------------------
  // Fullscreen click handler
  // --------------------------
  const handleContainerClick = useCallback(
    (e) => {
      if (zoomed?.type === "whiteboard") {
        e.stopPropagation();
        return;
      }
      if (!zoomed) return;

      const el = document.querySelector(".main-video-container");
      if (!el) return;

      if (!document.fullscreenElement) {
        el.requestFullscreen().catch((err) => console.log("Full screen error:", err));
      } else {
        document.exitFullscreen().catch(() => {});
      }
    },
    [zoomed]
  );

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
    if (zoomed.type === "whiteboard") {
      return { icon: <FiEdit3 className="h-4 w-4 text-yellow-300" />, text: "Whiteboard" };
    }
    return null;
  }, [zoomed, participants, activeScreenShare, viewerScreenShare]);

  // --------------------------
  // 🎨 Annotation overlay - HIDDEN (future use)
  // --------------------------
  // const canAnnotate = zoomed?.type === "screen";
  // const [annotateOn, setAnnotateOn] = useState(false);
  // const canvasRef = useRef(null);
  // const isDownRef = useRef(false);
  // const lastRef = useRef({ x: 0, y: 0 });

  // // resize canvas with container
  // useEffect(() => {
  //   if (!canAnnotate) {
  //     setAnnotateOn(false);
  //     return;
  //   }
  //   const canvas = canvasRef.current;
  //   const host = document.querySelector(".main-video-container");
  //   if (!canvas || !host) return;
  //   const ro = new ResizeObserver(() => {
  //     const rect = host.getBoundingClientRect();
  //     const dpr = window.devicePixelRatio || 1;
  //     canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  //     canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  //     canvas.style.width = `${rect.width}px`;
  //     canvas.style.height = `${rect.height}px`;
  //     const ctx = canvas.getContext("2d");
  //     ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  //   });
  //   ro.observe(host);
  //   return () => ro.disconnect();
  // }, [canAnnotate]);

  // const getPos = (e) => {
  //   const host = document.querySelector(".main-video-container");
  //   const rect = host?.getBoundingClientRect();
  //   const x = e.touches?.[0]?.clientX ?? e.clientX;
  //   const y = e.touches?.[0]?.clientY ?? e.clientY;
  //   return { x: x - (rect?.left || 0), y: y - (rect?.top || 0) };
  // };

  // const drawLine = (a, b) => {
  //   const ctx = canvasRef.current?.getContext("2d");
  //   if (!ctx) return;
  //   ctx.lineWidth = 3;
  //   ctx.lineCap = "round";
  //   ctx.lineJoin = "round";
  //   ctx.strokeStyle = "rgba(0,200,255,0.95)";
  //   ctx.beginPath();
  //   ctx.moveTo(a.x, a.y);
  //   ctx.lineTo(b.x, b.y);
  //   ctx.stroke();
  // };

  // const clearCanvas = () => {
  //   const ctx = canvasRef.current?.getContext("2d");
  //   const host = document.querySelector(".main-video-container");
  //   if (!ctx || !host) return;
  //   const rect = host.getBoundingClientRect();
  //   ctx.clearRect(0, 0, rect.width, rect.height);
  // };

  // const onDown = (e) => { if (!annotateOn) return; e.preventDefault(); isDownRef.current = true; lastRef.current = getPos(e); };
  // const onMove = (e) => { if (!annotateOn || !isDownRef.current) return; e.preventDefault(); const p = getPos(e); drawLine(lastRef.current, p); lastRef.current = p; };
  // const onUp = (e) => { if (!annotateOn) return; e.preventDefault(); isDownRef.current = false; };

  // // zoom change -> reset annotate
  // useEffect(() => {
  //   setAnnotateOn(false);
  //   isDownRef.current = false;
  // }, [zoomed?.type, zoomed?.userId]);

  // --------------------------
  // Render
  // --------------------------
  return (
    <div
      className="relative flex-1 bg-black overflow-hidden cursor-pointer main-video-container"
    >
      {/* Zoomed / Default */}
      {zoomed ? (
        <div className="relative w-full h-full">
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
                onError={(e) => console.error("Zoomed video error:", e)}
              />

              {/* Label */}
              {zoomLabel && (
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm z-20 flex items-center space-x-2">
                  {zoomLabel.icon}
                  <span>{zoomLabel.text}</span>
                </div>
              )}

              {/* 🎨 Annotation - HIDDEN (future use) */}
              {/* {canAnnotate && (
                <>
                  <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-black/60 text-white rounded-lg px-3 py-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setAnnotateOn((v) => !v); }}
                      className={`px-3 py-1 rounded-md text-sm ${ annotateOn ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600" }`}
                      title="Toggle Draw"
                    >
                      {annotateOn ? "Drawing ON" : "Draw"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearCanvas(); }}
                      className="px-3 py-1 rounded-md text-sm bg-gray-700 hover:bg-gray-600"
                      title="Clear"
                    >
                      Clear
                    </button>
                    <div className="text-xs text-gray-200">Scroll: draw OFF karo.</div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-20"
                    style={{ pointerEvents: annotateOn ? "auto" : "none", touchAction: "none" }}
                    onMouseDown={onDown}
                    onMouseMove={onMove}
                    onMouseUp={onUp}
                    onMouseLeave={onUp}
                    onTouchStart={onDown}
                    onTouchMove={onMove}
                    onTouchEnd={onUp}
                  />
                </>
              )} */}
            </>
          )}
        </div>
      ) : (
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
              console.error("Main video error:", e);
            }}
          />

          {/* LIVE badge */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 text-white px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">LIVE</span>
          </div>

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

      {/* Status overlay */}
      <div className="absolute top-4 left-4 flex items-center space-x-4 z-10">
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

      {/* Play */}
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

      {/* Sidebar toggle button */}
      {renderSidebarToggleButton?.()}
    </div>
  );
}