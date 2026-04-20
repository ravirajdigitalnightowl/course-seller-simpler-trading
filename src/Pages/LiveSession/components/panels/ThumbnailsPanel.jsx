// import React, { useMemo, useCallback } from "react";
// import { FiEdit3, FiMonitor } from "react-icons/fi";
// import ThumbnailVideo from "../ThumbnailVideo";

// const ThumbnailsPanel = ({
//   variant = "column", // "overlay" | "column"
//   thumbnailsCount = 0,
//   setThumbnailsExpanded,

//   showWhiteboard,
//   handleCloseWhiteboard,

//   setShowPlayButton,
//   setZoomed,

//   mediaStream,
//   videoEnabled,
//   userId,

//   viewerCameras, // Map(uid => stream)
//   participantNameById, // Map(uid => name)

//   activeScreenShare, // { stream, userId, userName } | null
//   viewerScreenShare, // { stream, userId, userName } | null

//   zoomed,
// }) => {
//   const isOverlay = variant === "overlay";

//   // ✅ screen stream wrapper: new MediaStream(...) render ke andar mat banao
//   const activeScreenVideoStream = useMemo(() => {
//     const s = activeScreenShare?.stream;
//     if (!s) return null;
//     const vt = s.getVideoTracks?.()[0];
//     return vt ? new MediaStream([vt]) : s;
//   }, [activeScreenShare?.stream]);

//   const handleThumbClick = useCallback(
//     (payload) => {
//       setZoomed(payload);
//       setShowPlayButton(false);
//       if (isOverlay) setThumbnailsExpanded(false);
//     },
//     [setZoomed, setShowPlayButton, isOverlay, setThumbnailsExpanded]
//   );

//   const viewerCameraEntries = useMemo(() => {
//     return viewerCameras ? Array.from(viewerCameras.entries()) : [];
//   }, [viewerCameras]);

//   // ------------------ Thumbs ------------------
//   const whiteboardThumb = showWhiteboard ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="whiteboard"
//         stream={null}
//         userName="Whiteboard"
//         onClick={() =>
//           handleThumbClick({ type: "whiteboard", stream: null, userId: "whiteboard" })
//         }
//         isZoomed={zoomed?.type === "whiteboard"}
//         videoEnabled={true}
//         expanded={isOverlay}
//         isWhiteboard={true}
//         showWhiteboard={showWhiteboard}
//         onCloseWhiteboard={handleCloseWhiteboard}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//           <FiEdit3 className="h-3 w-3 mr-1" />
//           Whiteboard
//         </div>
//       )}
//     </div>
//   ) : null;

//   const streamerThumb = mediaStream ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="streamer"
//         stream={mediaStream}
//         userName="You"
//         onClick={() => handleThumbClick({ type: "streamer", stream: mediaStream, userId })}
//         isZoomed={zoomed?.type === "streamer"}
//         videoEnabled={videoEnabled}
//         expanded={isOverlay}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//           Host
//         </div>
//       )}
//     </div>
//   ) : null;

//   const activeScreenThumb =
//     activeScreenShare?.stream && activeScreenVideoStream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={activeScreenShare.userId || "screen"}
//           stream={activeScreenVideoStream}
//           userName={`${activeScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "screen",
//               stream: activeScreenShare.stream,
//               userId: activeScreenShare.userId,
//             })
//           }
//           isZoomed={zoomed?.type === "screen"}
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//       </div>
//     ) : null;

//   const viewerScreenThumb =
//     viewerScreenShare?.stream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={viewerScreenShare.userId}
//           stream={viewerScreenShare.stream}
//           userName={`${viewerScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "viewer-screen",
//               stream: viewerScreenShare.stream,
//               userId: viewerScreenShare.userId,
//             })
//           }
//           isZoomed={
//             zoomed?.type === "viewer-screen" && zoomed?.userId === viewerScreenShare.userId
//           }
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//         {isOverlay && (
//           <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//             <FiMonitor className="h-3 w-3 mr-1" />
//             Viewer Screen
//           </div>
//         )}
//       </div>
//     ) : null;

//   const viewerCameraThumbs = viewerCameraEntries.map(([uid, stream]) => (
//     <div key={uid} className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid={uid}
//         stream={stream}
//         userName={participantNameById?.get(uid) || `User ${uid}`}
//         onClick={() => handleThumbClick({ type: "viewer", stream, userId: uid })}
//         isZoomed={zoomed?.type === "viewer" && zoomed?.userId === uid}
//         videoEnabled={true}
//         expanded={isOverlay}
//       />
//     </div>
//   ));

//   // ------------------ Layouts ------------------
//   if (isOverlay) {
//     return (
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//           {whiteboardThumb}
//           {streamerThumb}
//           {viewerCameraThumbs}
//           {activeScreenThumb}
//           {viewerScreenThumb}

//           {thumbnailsCount === 0 && (
//             <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
//               No streams available
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }

//   // column (sidebar)
//   return (
//     <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//       {whiteboardThumb}
//       {streamerThumb}
//       {viewerCameraThumbs}
//       {activeScreenThumb}
//       {viewerScreenThumb}

//       {thumbnailsCount === 0 && (
//         <div className="text-gray-500 text-sm text-center p-3">No streams</div>
//       )}
//     </div>
//   );
// };

// export default React.memo(ThumbnailsPanel);
























// import React, { useMemo, useCallback } from "react";
// import { FiEdit3, FiMonitor, FiGrid } from "react-icons/fi";
// import ThumbnailVideo from "../ThumbnailVideo";

// const ThumbnailsPanel = ({
//   variant = "column", // "overlay" | "column"
//   thumbnailsCount = 0,
//   setThumbnailsExpanded,

//   showWhiteboard,
//   handleCloseWhiteboard,

//   setShowPlayButton,
//   setZoomed,

//   mediaStream,
//   videoEnabled,
//   userId,

//   viewerCameras, // Map(uid => stream)
//   participantNameById, // Map(uid => name)

//   activeScreenShare, // { stream, userId, userName } | null
//   viewerScreenShare, // { stream, userId, userName } | null

//   zoomed,

//   // ✅ PROPS FOR PAGINATION
//   viewerVideoPage = 0,
//   setViewerVideoPage,
//   totalViewerProducersCount = 0,
// }) => {
//   const isOverlay = variant === "overlay";

//   // ✅ screen stream wrapper: new MediaStream(...) render ke andar mat banao
//   const activeScreenVideoStream = useMemo(() => {
//     const s = activeScreenShare?.stream;
//     if (!s) return null;
//     const vt = s.getVideoTracks?.()[0];
//     return vt ? new MediaStream([vt]) : s;
//   }, [activeScreenShare?.stream]);

//   const handleThumbClick = useCallback(
//     (payload) => {
//       setZoomed(payload);
//       setShowPlayButton(false);
//       if (isOverlay && setThumbnailsExpanded) setThumbnailsExpanded(false);
//     },
//     [setZoomed, setShowPlayButton, isOverlay, setThumbnailsExpanded]
//   );

//   const viewerCameraEntries = useMemo(() => {
//     return viewerCameras ? Array.from(viewerCameras.entries()) : [];
//   }, [viewerCameras]);

//   // ------------------ Thumbs (ALWAYS VISIBLE) ------------------
//   const whiteboardThumb = showWhiteboard ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="whiteboard"
//         stream={null}
//         userName="Whiteboard"
//         onClick={() => handleThumbClick({ type: "whiteboard", stream: null, userId: "whiteboard" })}
//         isZoomed={zoomed?.type === "whiteboard"}
//         videoEnabled={true}
//         expanded={isOverlay}
//         isWhiteboard={true}
//         showWhiteboard={showWhiteboard}
//         onCloseWhiteboard={handleCloseWhiteboard}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//           <FiEdit3 className="h-3 w-3 mr-1" />
//           Whiteboard
//         </div>
//       )}
//     </div>
//   ) : null;

//   const streamerThumb = mediaStream ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="streamer"
//         stream={mediaStream}
//         userName="You"
//         onClick={() => handleThumbClick({ type: "streamer", stream: mediaStream, userId })}
//         isZoomed={zoomed?.type === "streamer"}
//         videoEnabled={videoEnabled}
//         expanded={isOverlay}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//           Host
//         </div>
//       )}
//     </div>
//   ) : null;

//   const activeScreenThumb =
//     activeScreenShare?.stream && activeScreenVideoStream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={activeScreenShare.userId || "screen"}
//           stream={activeScreenVideoStream}
//           userName={`${activeScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "screen",
//               stream: activeScreenShare.stream,
//               userId: activeScreenShare.userId,
//             })
//           }
//           isZoomed={zoomed?.type === "screen"}
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//       </div>
//     ) : null;

//   const viewerScreenThumb =
//     viewerScreenShare?.stream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={viewerScreenShare.userId}
//           stream={viewerScreenShare.stream}
//           userName={`${viewerScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "viewer-screen",
//               stream: viewerScreenShare.stream,
//               userId: viewerScreenShare.userId,
//             })
//           }
//           isZoomed={zoomed?.type === "viewer-screen" && zoomed?.userId === viewerScreenShare.userId}
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//         {isOverlay && (
//           <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//             <FiMonitor className="h-3 w-3 mr-1" />
//             Viewer Screen
//           </div>
//         )}
//       </div>
//     ) : null;

//   // 🚨 VIEWER CAMERAS: Sidebar me sirf zoomed wala, Modal me sab!
//   const viewerCameraThumbs = viewerCameraEntries
//     .filter(([uid, stream]) => {
//       if (isOverlay) return true; // Modal me sab dikhao
//       return zoomed?.type === "viewer" && zoomed?.userId === uid; // Sidebar me sirf select kiya hua dikhao
//     })
//     .map(([uid, stream]) => (
//       <div key={uid} className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={uid}
//           stream={stream}
//           userName={participantNameById?.get(uid) || `User ${uid}`}
//           onClick={() => handleThumbClick({ type: "viewer", stream, userId: uid })}
//           isZoomed={zoomed?.type === "viewer" && zoomed?.userId === uid}
//           videoEnabled={true}
//           expanded={isOverlay}
//         />
//       </div>
//     ));

//   // ------------------ Layouts ------------------
  
//   // 1. MODAL VIEW (Overlay)
//   if (isOverlay) {
//     const VIDEOS_PER_PAGE = 4; // Should match the LiveSession master controller
//     const totalPages = Math.max(1, Math.ceil(totalViewerProducersCount / VIDEOS_PER_PAGE));

//     return (
//       <div className="flex flex-col h-full">
//         {/* Thumbnails Grid */}
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
//           {whiteboardThumb}
//           {streamerThumb}
//           {activeScreenThumb}
//           {viewerScreenThumb}
//           {viewerCameraThumbs}

//           {/* Agar bilkul koi stream nahi hai */}
//           {!mediaStream && viewerCameraEntries.length === 0 && !activeScreenShare && !viewerScreenShare && !showWhiteboard && (
//             <div className="col-span-full flex items-center justify-center text-gray-500 text-sm text-center p-4">
//               No streams available
//             </div>
//           )}
//         </div>

//         {/* ✅ PAGINATION CONTROLS (Only for Modal) */}
//         {totalPages > 1 && (
//           <div className="flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700 mt-8 shadow-lg">
//             <button
//               onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.max(0, prev - 1))}
//               disabled={viewerVideoPage === 0}
//               className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
//                 viewerVideoPage === 0
//                   ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
//                   : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
//               }`}
//             >
//               Previous
//             </button>
            
//             <div className="text-gray-400 font-medium text-sm flex items-center space-x-2">
//               <span>Page</span>
//               <span className="text-white bg-gray-700 px-2 py-1 rounded-md">{viewerVideoPage + 1}</span>
//               <span>of</span>
//               <span className="text-white bg-gray-700 px-2 py-1 rounded-md">{totalPages}</span>
//             </div>
            
//             <button
//               onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.min(totalPages - 1, prev + 1))}
//               disabled={viewerVideoPage >= totalPages - 1}
//               className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
//                 viewerVideoPage >= totalPages - 1
//                   ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
//                   : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
//               }`}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // 2. SIDEBAR VIEW (Column)
//   return (
//     <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700 relative pb-16">
//       {whiteboardThumb}
//       {streamerThumb}
//       {activeScreenThumb}
//       {viewerScreenThumb}
//       {viewerCameraThumbs}

//       {!mediaStream && viewerCameraEntries.length === 0 && !activeScreenShare && !viewerScreenShare && !showWhiteboard && (
//         <div className="text-gray-500 text-sm text-center p-3">No streams</div>
//       )}

//       {/* "View All Streams" Button stuck at bottom of sidebar (similar to viewer side) */}
//       {totalViewerProducersCount > 0 && setThumbnailsExpanded && (
//         <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-md z-20">
//           <button
//             onClick={() => setThumbnailsExpanded(true)}
//             className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg group"
//           >
//             <FiGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
//             <span>All Viewers</span>
//             <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-bold ml-1">
//               {totalViewerProducersCount}
//             </span>
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default React.memo(ThumbnailsPanel);



// import React, { useMemo, useCallback } from "react";
// import { FiEdit3, FiMonitor, FiGrid } from "react-icons/fi";
// import ThumbnailVideo from "../ThumbnailVideo";

// const ThumbnailsPanel = ({
//   variant = "column",
//   thumbnailsCount = 0,
//   setThumbnailsExpanded,

//   showWhiteboard,
//   handleCloseWhiteboard,

//   setShowPlayButton,
//   setZoomed,

//   mediaStream,
//   videoEnabled,
//   userId,

//   viewerCameras, 
//   participantNameById, 

//   activeScreenShare, 
//   viewerScreenShare, 

//   zoomed,

//   // ✅ PROPS FOR PAGINATION
//   viewerVideoPage = 0,
//   setViewerVideoPage,
//   totalViewerProducersCount = 0,

//   // ✅ NAYA PROP FOR PINNING VIEWER
//   setPinnedViewerId,
// }) => {
//   const isOverlay = variant === "overlay";

//   const activeScreenVideoStream = useMemo(() => {
//     const s = activeScreenShare?.stream;
//     if (!s) return null;
//     const vt = s.getVideoTracks?.()[0];
//     return vt ? new MediaStream([vt]) : s;
//   }, [activeScreenShare?.stream]);

//   const handleThumbClick = useCallback(
//     (payload) => {
//       setZoomed(payload);
      
//       // ✅ Agar VIEWER select hua hai, toh usko Pin kar do
//       if (payload.type === "viewer" && setPinnedViewerId) {
//         setPinnedViewerId(payload.userId);
//       }

//       setShowPlayButton(false);
//       if (isOverlay && setThumbnailsExpanded) setThumbnailsExpanded(false);
//     },
//     [setZoomed, setShowPlayButton, isOverlay, setThumbnailsExpanded, setPinnedViewerId]
//   );

//   const viewerCameraEntries = useMemo(() => {
//     return viewerCameras ? Array.from(viewerCameras.entries()) : [];
//   }, [viewerCameras]);

//   // ------------------ Thumbs Components ------------------
//   const whiteboardThumb = showWhiteboard ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="whiteboard"
//         stream={null}
//         userName="Whiteboard"
//         onClick={() => handleThumbClick({ type: "whiteboard", stream: null, userId: "whiteboard" })}
//         isZoomed={zoomed?.type === "whiteboard"}
//         videoEnabled={true}
//         expanded={isOverlay}
//         isWhiteboard={true}
//         showWhiteboard={showWhiteboard}
//         onCloseWhiteboard={handleCloseWhiteboard}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
//           <FiEdit3 className="h-3 w-3 mr-1" />
//           Whiteboard
//         </div>
//       )}
//     </div>
//   ) : null;

//   const streamerThumb = mediaStream ? (
//     <div className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid="streamer"
//         stream={mediaStream}
//         userName="You"
//         onClick={() => handleThumbClick({ type: "streamer", stream: mediaStream, userId })}
//         isZoomed={zoomed?.type === "streamer"}
//         videoEnabled={videoEnabled}
//         expanded={isOverlay}
//       />
//       {isOverlay && (
//         <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
//           Host
//         </div>
//       )}
//     </div>
//   ) : null;

//   const activeScreenThumb =
//     activeScreenShare?.stream && activeScreenVideoStream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={activeScreenShare.userId || "screen"}
//           stream={activeScreenVideoStream}
//           userName={`${activeScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "screen",
//               stream: activeScreenShare.stream,
//               userId: activeScreenShare.userId,
//             })
//           }
//           isZoomed={zoomed?.type === "screen"}
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//       </div>
//     ) : null;

//   const viewerScreenThumb =
//     viewerScreenShare?.stream ? (
//       <div className={isOverlay ? "relative group" : ""}>
//         <ThumbnailVideo
//           uid={viewerScreenShare.userId}
//           stream={viewerScreenShare.stream}
//           userName={`${viewerScreenShare.userName || "User"}'s Screen`}
//           onClick={() =>
//             handleThumbClick({
//               type: "viewer-screen",
//               stream: viewerScreenShare.stream,
//               userId: viewerScreenShare.userId,
//             })
//           }
//           isZoomed={zoomed?.type === "viewer-screen" && zoomed?.userId === viewerScreenShare.userId}
//           videoEnabled={true}
//           isScreenShare={true}
//           expanded={isOverlay}
//         />
//       </div>
//     ) : null;

//   // ✅ Sirf Viewer Cameras map honge.
//   // Master Controller ab exactly utne hi videos bhej raha hai jitne ki zaroorat hai (pinned wala ya current page wale).
//   const viewerCameraThumbs = viewerCameraEntries.map(([uid, stream]) => (
//     <div key={uid} className={isOverlay ? "relative group" : ""}>
//       <ThumbnailVideo
//         uid={uid}
//         stream={stream}
//         userName={participantNameById?.get(uid) || `User ${uid}`}
//         onClick={() => handleThumbClick({ type: "viewer", stream, userId: uid })}
//         isZoomed={zoomed?.type === "viewer" && zoomed?.userId === uid}
//         videoEnabled={true}
//         expanded={isOverlay}
//       />
//     </div>
//   ));

//   // ------------------ Layouts ------------------
  
//   // 1. MODAL VIEW (Overlay) - Jaha sirf viewers dikhenge
//   if (isOverlay) {
//     const VIDEOS_PER_PAGE = 4;
//     const totalPages = Math.max(1, Math.ceil(totalViewerProducersCount / VIDEOS_PER_PAGE));

//     return (
//       <div className="flex flex-col h-full">
//         {/* Thumbnails Grid */}
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          
//           {/* 🚨 MODAL MEIN SIRF VIEWER CAMERAS DIKHENGE */}
//           {viewerCameraThumbs}

//           {viewerCameraEntries.length === 0 && (
//             <div className="col-span-full flex items-center justify-center text-gray-500 text-sm text-center p-4">
//               No viewer cameras available
//             </div>
//           )}
//         </div>

//         {/* ✅ PAGINATION CONTROLS */}
//         {totalPages > 1 && (
//           <div className="flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700 mt-8 shadow-lg">
//             <button
//               onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.max(0, prev - 1))}
//               disabled={viewerVideoPage === 0}
//               className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
//                 viewerVideoPage === 0
//                   ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
//                   : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
//               }`}
//             >
//               Previous
//             </button>
            
//             <div className="text-gray-400 font-medium text-sm flex items-center space-x-2">
//               <span>Page</span>
//               <span className="text-white bg-gray-700 px-2 py-1 rounded-md">{viewerVideoPage + 1}</span>
//               <span>of</span>
//               <span className="text-white bg-gray-700 px-2 py-1 rounded-md">{totalPages}</span>
//             </div>
            
//             <button
//               onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.min(totalPages - 1, prev + 1))}
//               disabled={viewerVideoPage >= totalPages - 1}
//               className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
//                 viewerVideoPage >= totalPages - 1
//                   ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
//                   : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
//               }`}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // 2. SIDEBAR VIEW (Column) - Jaha sabkuch dikhega
//   return (
//     <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700 relative pb-16">
      
//       {/* 🚨 SIDEBAR MEIN SAB KUCH DIKHEGA (Streamer, Whiteboard, Pinned Viewer etc.) */}
//       {whiteboardThumb}
//       {streamerThumb}
//       {activeScreenThumb}
//       {viewerScreenThumb}
//       {viewerCameraThumbs}

//       {!mediaStream && viewerCameraEntries.length === 0 && !activeScreenShare && !viewerScreenShare && !showWhiteboard && (
//         <div className="text-gray-500 text-sm text-center p-3">No streams</div>
//       )}

//       {/* "View All Viewers" Button */}
//       {totalViewerProducersCount > 0 && setThumbnailsExpanded && (
//         <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-md z-20">
//           <button
//             onClick={() => setThumbnailsExpanded(true)}
//             className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg group"
//           >
//             <FiGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
//             <span>All Viewers</span>
//             <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-bold ml-1">
//               {totalViewerProducersCount}
//             </span>
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default React.memo(ThumbnailsPanel);










import React, { useMemo, useCallback } from "react";
import { FiEdit3, FiMonitor, FiGrid } from "react-icons/fi";
import ThumbnailVideo from "../ThumbnailVideo";

const ThumbnailsPanel = ({
  variant = "column", // "overlay" | "column"
  thumbnailsCount = 0,
  setThumbnailsExpanded,

  showWhiteboard,
  handleCloseWhiteboard,

  setShowPlayButton,
  setZoomed,

  mediaStream,
  videoEnabled,
  userId,

  viewerCameras, // Map(uid => stream)
  participantNameById, // Map(uid => name)

  activeScreenShare, // { stream, userId, userName } | null
  viewerScreenShare, // { stream, userId, userName } | null

  zoomed,

  // ✅ PROPS FOR PAGINATION
  viewerVideoPage = 0,
  setViewerVideoPage,
  totalViewerProducersCount = 0,
  appViewerScreenShare,

  // ✅ NAYA PROP FOR PINNING VIEWER
  setPinnedViewerId,
}) => {
  const isOverlay = variant === "overlay";

  // ✅ screen stream wrapper: new MediaStream(...) render ke andar mat banao
  const activeScreenVideoStream = useMemo(() => {
    const s = activeScreenShare?.stream;
    if (!s) return null;
    const vt = s.getVideoTracks?.()[0];
    return vt ? new MediaStream([vt]) : s;
  }, [activeScreenShare?.stream]);

  const handleThumbClick = useCallback(
    (payload) => {
      setZoomed(payload);
      
      // ✅ Agar VIEWER select hua hai, toh usko Pin kar do
      if (payload.type === "viewer" && setPinnedViewerId) {
        setPinnedViewerId(payload.userId);
      }

      setShowPlayButton(false);
      if (isOverlay && setThumbnailsExpanded) setThumbnailsExpanded(false);
    },
    [setZoomed, setShowPlayButton, isOverlay, setThumbnailsExpanded, setPinnedViewerId]
  );

  const viewerCameraEntries = useMemo(() => {
    return viewerCameras ? Array.from(viewerCameras.entries()) : [];
  }, [viewerCameras]);

  // ------------------ Thumbs (ALWAYS VISIBLE) ------------------
  const whiteboardThumb = showWhiteboard ? (
    <div className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid="whiteboard"
        stream={null}
        userName="Whiteboard"
        onClick={() => handleThumbClick({ type: "whiteboard", stream: null, userId: "whiteboard" })}
        isZoomed={zoomed?.type === "whiteboard"}
        videoEnabled={true}
        expanded={isOverlay}
        isWhiteboard={true}
        showWhiteboard={showWhiteboard}
        onCloseWhiteboard={handleCloseWhiteboard}
      />
      {isOverlay && (
        <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
          <FiEdit3 className="h-3 w-3 mr-1" />
          Whiteboard
        </div>
      )}
    </div>
  ) : null;

  const streamerThumb = mediaStream ? (
    <div className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid="streamer"
        stream={mediaStream}
        userName="You"
        onClick={() => handleThumbClick({ type: "streamer", stream: mediaStream, userId })}
        isZoomed={zoomed?.type === "streamer"}
        videoEnabled={videoEnabled}
        expanded={isOverlay}
      />
      {isOverlay && (
        <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
          Host
        </div>
      )}
    </div>
  ) : null;

  const activeScreenThumb =
    activeScreenShare?.stream && activeScreenVideoStream ? (
      <div className={isOverlay ? "relative group" : ""}>
        <ThumbnailVideo
          uid={activeScreenShare.userId || "screen"}
          stream={activeScreenVideoStream}
          userName={`${activeScreenShare.userName || "User"}'s Screen`}
          onClick={() =>
            handleThumbClick({
              type: "screen",
              stream: activeScreenShare.stream,
              userId: activeScreenShare.userId,
            })
          }
          isZoomed={zoomed?.type === "screen"}
          videoEnabled={true}
          isScreenShare={true}
          expanded={isOverlay}
        />
      </div>
    ) : null;

  const viewerScreenThumb =
    viewerScreenShare?.stream ? (
      <div className={isOverlay ? "relative group" : ""}>
        <ThumbnailVideo
          uid={viewerScreenShare.userId}
          stream={viewerScreenShare.stream}
          userName={`${viewerScreenShare.userName || "User"}'s Screen`}
          onClick={() =>
            handleThumbClick({
              type: "viewer-screen",
              stream: viewerScreenShare.stream,
              userId: viewerScreenShare.userId,
            })
          }
          isZoomed={zoomed?.type === "viewer-screen" && zoomed?.userId === viewerScreenShare.userId}
          videoEnabled={true}
          isScreenShare={true}
          expanded={isOverlay}
        />
        {isOverlay && (
          <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
            <FiMonitor className="h-3 w-3 mr-1" />
            Viewer Screen
          </div>
        )}
      </div>
    ) : null;
   const appViewerScreenThumb =
    appViewerScreenShare?.stream ? (
      <div className={isOverlay ? "relative group" : ""}>
        <ThumbnailVideo
          uid={appViewerScreenShare.userId}
          stream={appViewerScreenShare.stream}
          userName={`${appViewerScreenShare.userName || "App Viewer"}'s Screen`}
          onClick={() =>
            handleThumbClick({
              type: "app-viewer-screen",
              stream: appViewerScreenShare.stream,
              userId: appViewerScreenShare.userId,
            })
          }
          isZoomed={zoomed?.type === "app-viewer-screen" && zoomed?.userId === appViewerScreenShare.userId}
          videoEnabled={true}
          isScreenShare={true}
          expanded={isOverlay}
        />
        {isOverlay && (
          <div className="absolute top-2 left-2 bg-pink-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
            <FiMonitor className="h-3 w-3 mr-1" />
            App Screen
          </div>
        )}
      </div>
    ) : null;
  // 🚨 VIEWER CAMERAS: Sidebar me sirf zoomed wala, Modal me sab!
  const viewerCameraThumbs = viewerCameraEntries.map(([uid, stream]) => (
    <div key={uid} className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid={uid}
        stream={stream}
        userName={participantNameById?.get(uid) || `User ${uid}`}
        onClick={() => handleThumbClick({ type: "viewer", stream, userId: uid })}
        isZoomed={zoomed?.type === "viewer" && zoomed?.userId === uid}
        videoEnabled={true}
        expanded={isOverlay}
      />
    </div>
  ));

  // ------------------ Layouts ------------------
  
  // 1. MODAL VIEW (Overlay)
  if (isOverlay) {
    const VIDEOS_PER_PAGE = 3; // ✅ Updated to 3 per page
    const totalPages = Math.max(1, Math.ceil(totalViewerProducersCount / VIDEOS_PER_PAGE));

    return (
      <div className="flex flex-col h-full">
        {/* Thumbnails Grid */}
        <div className="flex-1 flex items-center justify-center p-4">
          {/* ✅ UI UPDATED FOR 3 VIDEOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl w-full">
            
            {/* 🚨 MODAL MEIN SIRF VIEWER CAMERAS DIKHENGE */}
            {viewerCameraThumbs}

            {viewerCameraEntries.length === 0 && (
              <div className="col-span-full flex items-center justify-center text-gray-500 text-sm text-center p-10 bg-gray-800/50 rounded-xl">
                No viewer cameras available
              </div>
            )}
          </div>
        </div>

        {/* ✅ PAGINATION CONTROLS (Only for Modal) */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700 mt-4 shadow-lg shrink-0">
            <button
              onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.max(0, prev - 1))}
              disabled={viewerVideoPage === 0}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewerVideoPage === 0
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
              }`}
            >
              Previous
            </button>
            
            <div className="text-gray-400 font-medium text-sm flex items-center space-x-2">
              <span>Page</span>
              <span className="text-white bg-gray-700 px-3 py-1 rounded-md">{viewerVideoPage + 1}</span>
              <span>of</span>
              <span className="text-white bg-gray-700 px-3 py-1 rounded-md">{totalPages}</span>
            </div>
            
            <button
              onClick={() => setViewerVideoPage && setViewerVideoPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={viewerVideoPage >= totalPages - 1}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewerVideoPage >= totalPages - 1
                  ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. SIDEBAR VIEW (Column) - Jaha sabkuch dikhega
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700 relative pb-16">
      
      {/* 🚨 SIDEBAR MEIN SAB KUCH DIKHEGA (Streamer, Whiteboard, Pinned Viewer etc.) */}
      {whiteboardThumb}
      {appViewerScreenThumb}
      {streamerThumb}
      {activeScreenThumb}
      {viewerScreenThumb}
      {viewerCameraThumbs}

      {!mediaStream && viewerCameraEntries.length === 0 && !activeScreenShare && !viewerScreenShare && !appViewerScreenShare && !showWhiteboard && (
        <div className="text-gray-500 text-sm text-center p-3">No streams</div>
      )}

      {/* "View All Viewers" Button stuck at bottom of sidebar */}
      {totalViewerProducersCount > 0 && setThumbnailsExpanded && (
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-md z-20">
          <button
            onClick={() => setThumbnailsExpanded(true)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg group"
          >
            <FiGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>All Viewers</span>
            <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full font-bold ml-1">
              {totalViewerProducersCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ThumbnailsPanel);