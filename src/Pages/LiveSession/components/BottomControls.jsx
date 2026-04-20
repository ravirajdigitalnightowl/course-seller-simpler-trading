// import React from 'react';
// import { FiPlay, FiPause, FiMic, FiMicOff, FiVideo, FiVideoOff, FiEdit3, FiStopCircle, FiLoader } from 'react-icons/fi';
// import { MdOutlineScreenShare, MdStopScreenShare } from 'react-icons/md';
// import { BsFillRecordFill } from 'react-icons/bs';

// const BottomControls = ({
//   roomState, startStreaming, pauseStreaming, resumeStreaming, isInitializing, isRecordingLoading, isRecordingStopping,
//   audioEnabled, toggleAudio, videoEnabled, toggleVideo, showWhiteboard, handleCloseWhiteboard, handleOpenWhiteboard,
//   activeScreenShare, stopScreenShare, handleStreamerScreenShareClick, isRecording, screenCaptureActive, handleRecordingToggle,
//   formatRecordingTime, recordingTimer, endStreaming
// }) => {
//   return (
//     <div className="bg-gray-800/80 backdrop-blur-md p-4 border-t border-gray-600 shadow-lg z-40">
//       <div className="flex justify-center space-x-6">
//         {!roomState.isStreaming ? (
//           <button
//             onClick={startStreaming}
//             disabled={isInitializing || isRecordingLoading}
//             className="flex flex-col items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//           >
//             <FiPlay className="text-xl mb-1" />
//             <span className="text-xs font-medium">Start</span>
//           </button>
//         ) : roomState.isPaused ? (
//           <button
//             onClick={resumeStreaming}
//             disabled={isRecordingLoading}
//             className="flex flex-col items-center p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//           >
//             <FiPlay className="text-xl mb-1" />
//             <span className="text-xs font-medium">Resume</span>
//           </button>
//         ) : (
//           <button
//             onClick={pauseStreaming}
//             disabled={isRecordingLoading}
//             className="flex flex-col items-center p-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl hover:from-yellow-700 hover:to-amber-700 transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//           >
//             <FiPause className="text-xl mb-1" />
//             <span className="text-xs font-medium">Pause</span>
//           </button>
//         )}

//         <button
//           onClick={toggleAudio}
//           disabled={isRecordingLoading || isRecordingStopping}
//           className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//             audioEnabled ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700' : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700'
//           }`}
//         >
//           {audioEnabled ? <FiMic className="text-xl mb-1" /> : <FiMicOff className="text-xl mb-1" />}
//           <span className="text-xs font-medium">{audioEnabled ? 'Mic On' : 'Mic Off'}</span>
//         </button>

//         <button
//           onClick={toggleVideo}
//           disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//           className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//             videoEnabled ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700' : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700'
//           }`}
//         >
//           {videoEnabled ? <FiVideo className="text-xl mb-1" /> : <FiVideoOff className="text-xl mb-1" />}
//           <span className="text-xs font-medium">{videoEnabled ? 'Video' : 'No Video'}</span>
//         </button>

//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             showWhiteboard ? handleCloseWhiteboard() : handleOpenWhiteboard();
//           }}
//           className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg relative ${
//             showWhiteboard ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-gray-600 to-gray-700'
//           }`}
//         >
//           <FiEdit3 className="text-xl mb-1" />
//           <span className="text-xs font-medium">{showWhiteboard ? 'Close Board' : 'Whiteboard'}</span>
//           {showWhiteboard && <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] px-1 rounded-full">ON</span>}
//         </button>

//         {activeScreenShare?.source === "streamer" ? (
//           <button
//             onClick={stopScreenShare}
//             disabled={isRecordingLoading || isRecordingStopping}
//             className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative"
//           >
//             <div className="relative">
//               <MdStopScreenShare className="text-xl mb-1" />
//               {isRecording && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>}
//             </div>
//             <span className="text-xs font-medium">Stop Share</span>
//             {isRecording && <span className="absolute -top-1 -left-1 bg-yellow-500 text-black text-[10px] px-1 rounded font-bold">REC</span>}
//           </button>
//         ) : (
//           <button
//             onClick={handleStreamerScreenShareClick}
//             disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//             className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//               screenCaptureActive || isRecording ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-gray-600 to-gray-700'
//             }`}
//           >
//             <MdOutlineScreenShare className="text-xl mb-1" />
//             <span className="text-xs font-medium">{screenCaptureActive || isRecording ? 'Share Active' : 'Share Screen'}</span>
//             {(screenCaptureActive || isRecording) && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">✓</span>}
//           </button>
//         )}

//         <button
//           onClick={handleRecordingToggle}
//           disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//           className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
//             isRecording ? 'bg-gradient-to-r from-red-600 to-red-700 animate-pulse' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
//           }`}
//         >
//           {isRecordingLoading ? (
//             <><FiLoader className="text-xl mb-1 animate-spin" /><span className="text-xs font-medium">Starting...</span></>
//           ) : isRecordingStopping ? (
//             <><FiLoader className="text-xl mb-1 animate-spin" /><span className="text-xs font-medium">Saving...</span></>
//           ) : isRecording ? (
//             <>
//               <div className="relative">
//                 <BsFillRecordFill className="text-xl mb-1" />
//                 <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
//               </div>
//               <span className="text-xs font-medium">Stop REC</span>
//               <span className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
//                 {formatRecordingTime(recordingTimer)}
//               </span>
//               {activeScreenShare && <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-bold px-1 py-0.5 rounded">SHARING</span>}
//             </>
//           ) : (
//             <>
//               <div className="relative">
//                 <BsFillRecordFill className="text-xl mb-1" />
//                 {(screenCaptureActive || activeScreenShare) && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>}
//               </div>
//               <span className="text-xs font-medium">{screenCaptureActive || activeScreenShare ? 'Record Active' : 'Record'}</span>
//               {(screenCaptureActive || activeScreenShare) && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 rounded">✓</span>}
//             </>
//           )}
//         </button>

//         {roomState.isStreaming && (
//           <button
//             onClick={endStreaming}
//             disabled={isRecordingLoading || isRecordingStopping}
//             className="flex flex-col items-center p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl transition-all duration-200 transform hover:scale-110 shadow-lg relative disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//           >
//             <FiStopCircle className="text-xl mb-1" />
//             <span className="text-xs font-medium">End Stream</span>
//             {isRecording && <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">!</span>}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default BottomControls;





// import React from 'react';
// import { 
//   FiPlay, FiPause, FiMic, FiMicOff, FiVideo, FiVideoOff, 
//   FiEdit3, FiStopCircle, FiLoader 
// } from 'react-icons/fi';
// import { MdOutlineScreenShare, MdStopScreenShare } from 'react-icons/md';
// import { BsFillRecordFill } from 'react-icons/bs';

// const BottomControls = ({
//   roomState, startStreaming, pauseStreaming, resumeStreaming, isInitializing, isRecordingLoading, isRecordingStopping,
//   audioEnabled, toggleAudio, videoEnabled, toggleVideo, showWhiteboard, handleCloseWhiteboard, handleOpenWhiteboard,
//   activeScreenShare, stopScreenShare, handleStreamerScreenShareClick, isRecording, screenCaptureActive, handleRecordingToggle,
//   formatRecordingTime, recordingTimer, endStreaming
// }) => {
//   return (
//     <div className="relative w-full bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 p-4 z-40 flex justify-center">
//       {/* ── Floating Dock Container ── */}
//       <div className="flex flex-wrap items-center justify-center gap-3 max-w-6xl mx-auto">
        
//         {/* ── Start / Pause / Resume ── */}
//         {!roomState.isStreaming ? (
//           <button
//             onClick={startStreaming}
//             disabled={isInitializing || isRecordingLoading}
//             className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
//           >
//             <FiPlay className="text-lg" />
//             <span>Start Stream</span>
//           </button>
//         ) : roomState.isPaused ? (
//           <button
//             onClick={resumeStreaming}
//             disabled={isRecordingLoading}
//             className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold shadow-[0_4px_20px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
//           >
//             <FiPlay className="text-lg" />
//             <span>Resume</span>
//           </button>
//         ) : (
//           <button
//             onClick={pauseStreaming}
//             disabled={isRecordingLoading}
//             className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
//           >
//             <FiPause className="text-lg" />
//             <span>Pause</span>
//           </button>
//         )}

//         <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>

//         {/* ── Mic Toggle ── */}
//         <button
//           onClick={toggleAudio}
//           disabled={isRecordingLoading || isRecordingStopping}
//           className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none ${
//             audioEnabled 
//               ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700' 
//               : 'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] border border-transparent'
//           }`}
//         >
//           {audioEnabled ? <FiMic className="text-lg" /> : <FiMicOff className="text-lg" />}
//           <span className="text-sm">{audioEnabled ? 'Mic On' : 'Muted'}</span>
//         </button>

//         {/* ── Video Toggle ── */}
//         <button
//           onClick={toggleVideo}
//           disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//           className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none ${
//             videoEnabled 
//               ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700' 
//               : 'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)] border border-transparent'
//           }`}
//         >
//           {videoEnabled ? <FiVideo className="text-lg" /> : <FiVideoOff className="text-lg" />}
//           <span className="text-sm">{videoEnabled ? 'Video On' : 'Video Off'}</span>
//         </button>

//         <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>

//         {/* ── Whiteboard Toggle ── */}
//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             showWhiteboard ? handleCloseWhiteboard() : handleOpenWhiteboard();
//           }}
//           className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:-translate-y-1 ${
//             showWhiteboard 
//               ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_4px_15px_rgba(99,102,241,0.4)] border border-transparent' 
//               : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
//           }`}
//         >
//           <FiEdit3 className="text-lg" />
//           <span className="text-sm">{showWhiteboard ? 'Close Board' : 'Whiteboard'}</span>
//         </button>

//         {/* ── Screen Share Toggle ── */}
//         {activeScreenShare?.source === "streamer" ? (
//           <button
//             onClick={stopScreenShare}
//             disabled={isRecordingLoading || isRecordingStopping}
//             className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
//           >
//             <MdStopScreenShare className="text-xl" />
//             <span className="text-sm">Stop Share</span>
//           </button>
//         ) : (
//           <button
//             onClick={handleStreamerScreenShareClick}
//             disabled={isInitializing || isRecordingLoading || isRecordingStopping}
//             className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none ${
//               screenCaptureActive || isRecording 
//                 ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-[0_4px_15px_rgba(20,184,166,0.4)] border border-transparent' 
//                 : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
//             }`}
//           >
//             <MdOutlineScreenShare className="text-xl" />
//             <span className="text-sm">{screenCaptureActive || isRecording ? 'Share Active' : 'Share Screen'}</span>
//           </button>
//         )}

//         <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>

//         {/* ── Record Toggle ── */}
//         <button
//           onClick={handleRecordingToggle}
//           disabled={isRecordingLoading || isRecordingStopping || isInitializing}
//           className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none ${
//             isRecording 
//               ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_20px_rgba(220,38,38,0.5)]' 
//               : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
//           }`}
//         >
//           {isRecordingLoading ? (
//             <><FiLoader className="text-lg animate-spin" /><span className="text-sm">Starting...</span></>
//           ) : isRecordingStopping ? (
//             <><FiLoader className="text-lg animate-spin" /><span className="text-sm">Saving...</span></>
//           ) : isRecording ? (
//             <>
//               <div className="relative flex items-center justify-center">
//                 <BsFillRecordFill className="text-lg text-white" />
//                 <div className="absolute w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
//               </div>
//               <span className="text-sm">Stop REC</span>
//               <span className="ml-1 px-2 py-0.5 bg-red-800/80 rounded text-xs font-mono tracking-wider">
//                 {formatRecordingTime(recordingTimer)}
//               </span>
//             </>
//           ) : (
//             <>
//               <BsFillRecordFill className="text-lg text-red-400" />
//               <span className="text-sm text-gray-300">Record</span>
//             </>
//           )}
//         </button>

//         {/* ── End Stream ── */}
//         {roomState.isStreaming && (
//           <>
//             <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>
//             <button
//               onClick={endStreaming}
//               disabled={isRecordingLoading || isRecordingStopping}
//               className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none ml-2 border border-red-500"
//             >
//               <FiStopCircle className="text-lg" />
//               <span>End Stream</span>
//             </button>
//           </>
//         )}
//       </div>

//       {/* ── Quick Status Indicators (Optional subtle text below if needed) ── */}
//       {isRecording && activeScreenShare && (
//         <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-3">
//           <span className="bg-gray-800/90 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700 backdrop-blur-md shadow-lg flex items-center gap-2">
//             <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
//             Sharing Screen & Recording
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default BottomControls;




import React from 'react';
import { 
  FiPlay, FiPause, FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiEdit3, FiStopCircle, FiLoader 
} from 'react-icons/fi';
import { MdOutlineScreenShare, MdStopScreenShare } from 'react-icons/md';
import { BsFillRecordFill } from 'react-icons/bs';

const BottomControlsGamer = ({
  roomState, startStreaming, pauseStreaming, resumeStreaming, isInitializing, isRecordingLoading, isRecordingStopping,
  audioEnabled, toggleAudio, videoEnabled, toggleVideo, showWhiteboard, handleCloseWhiteboard, handleOpenWhiteboard,
  activeScreenShare, stopScreenShare, handleStreamerScreenShareClick, isRecording, screenCaptureActive, handleRecordingToggle,
  formatRecordingTime, recordingTimer, endStreaming
}) => {
  
  // Helper for tooltip
  const Tooltip = ({ text }) => (
    <span className="absolute -top-10 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-gray-700 z-50">
      {text}
    </span>
  );

  return (
    // 👇 YAHAN CHANGES KIYE HAIN: absolute hatakar w-full aur dedicated background diya hai
    <div className="w-full bg-[#0d0e14]/90 backdrop-blur-xl border-t border-gray-800 py-3 z-40 flex flex-wrap items-center justify-center gap-4">
      
      {/* ── Main Stream Controls (Left Island) ── */}
      <div className="flex items-center gap-2 bg-[#1a1b26] p-2 rounded-full border border-gray-700 shadow-xl">
        {!roomState.isStreaming ? (
          <button onClick={startStreaming} disabled={isInitializing || isRecordingLoading}
            className="group relative flex items-center justify-center w-12 h-12 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full transition-transform hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:hover:scale-100">
            <FiPlay className="text-xl ml-1" />
            <Tooltip text="Start Stream" />
          </button>
        ) : roomState.isPaused ? (
          <button onClick={resumeStreaming} disabled={isRecordingLoading}
            className="group relative flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-full transition-transform hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:hover:scale-100">
            <FiPlay className="text-xl ml-1" />
            <Tooltip text="Resume Stream" />
          </button>
        ) : (
          <button onClick={pauseStreaming} disabled={isRecordingLoading}
            className="group relative flex items-center justify-center w-12 h-12 bg-amber-500 hover:bg-amber-400 text-white rounded-full transition-transform hover:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:hover:scale-100">
            <FiPause className="text-xl" />
            <Tooltip text="Pause Stream" />
          </button>
        )}
      </div>

      {/* ── Media Controls (Center Island) ── */}
      <div className="flex items-center gap-2 bg-[#1a1b26] p-2 rounded-full border border-gray-700 shadow-xl">
        
        <button onClick={toggleAudio} disabled={isRecordingLoading || isRecordingStopping}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${
            audioEnabled ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
          }`}>
          {audioEnabled ? <FiMic className="text-xl" /> : <FiMicOff className="text-xl" />}
          <Tooltip text={audioEnabled ? "Mute Mic" : "Unmute Mic"} />
        </button>

        <button onClick={toggleVideo} disabled={isInitializing || isRecordingLoading || isRecordingStopping}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${
            videoEnabled ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
          }`}>
          {videoEnabled ? <FiVideo className="text-xl" /> : <FiVideoOff className="text-xl" />}
          <Tooltip text={videoEnabled ? "Turn Off Video" : "Turn On Video"} />
        </button>

        <div className="w-px h-8 bg-gray-700 mx-1"></div>

        <button onClick={(e) => { e.stopPropagation(); showWhiteboard ? handleCloseWhiteboard() : handleOpenWhiteboard(); }}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 ${
            showWhiteboard ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}>
          <FiEdit3 className="text-xl" />
          <Tooltip text={showWhiteboard ? "Close Whiteboard" : "Open Whiteboard"} />
        </button>

        {activeScreenShare?.source === "streamer" ? (
          <button onClick={stopScreenShare} disabled={isRecordingLoading || isRecordingStopping}
            className="group relative flex items-center justify-center w-12 h-12 bg-rose-600 text-white rounded-full transition-all hover:scale-110 shadow-[0_0_15px_rgba(225,29,72,0.5)] disabled:opacity-50 disabled:hover:scale-100">
            <MdStopScreenShare className="text-xl" />
            <Tooltip text="Stop Screen Share" />
          </button>
        ) : (
          <button onClick={handleStreamerScreenShareClick} disabled={isInitializing || isRecordingLoading || isRecordingStopping}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${
              screenCaptureActive || isRecording ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}>
            <MdOutlineScreenShare className="text-xl" />
            <Tooltip text={screenCaptureActive || isRecording ? "Share Active" : "Share Screen"} />
          </button>
        )}
      </div>

      {/* ── Record & End (Right Island) ── */}
      <div className="flex items-center gap-2 bg-[#1a1b26] p-2 rounded-full border border-gray-700 shadow-xl">
        
        <button onClick={handleRecordingToggle} disabled={isRecordingLoading || isRecordingStopping || isInitializing}
          className={`group relative flex items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 ${
            isRecording 
              ? 'px-4 h-12 bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' 
              : 'w-12 h-12 bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}>
          {isRecordingLoading || isRecordingStopping ? (
            <FiLoader className="text-xl animate-spin" />
          ) : isRecording ? (
            <div className="flex items-center gap-2">
              <BsFillRecordFill className="text-sm" />
              <span className="font-mono text-sm font-bold tracking-wider">{formatRecordingTime(recordingTimer)}</span>
            </div>
          ) : (
            <BsFillRecordFill className="text-xl text-red-400" />
          )}
          <Tooltip text={isRecording ? "Stop Recording" : "Start Recording"} />
        </button>

        {roomState.isStreaming && (
          <>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button onClick={endStreaming} disabled={isRecordingLoading || isRecordingStopping}
              className="group relative flex items-center justify-center w-12 h-12 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-full transition-all hover:scale-110 border border-red-500/50 hover:border-transparent disabled:opacity-50 disabled:hover:scale-100">
              <FiStopCircle className="text-xl" />
              <Tooltip text="End Stream" />
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default BottomControlsGamer;