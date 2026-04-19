// import React from 'react';
// import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPlay, FiPause, FiSquare, FiLogOut } from 'react-icons/fi';
// import { MdOutlineScreenShare } from 'react-icons/md';

// const MobileControls = ({ 
//   toggleAudio, 
//   audioEnabled, 
//   toggleVideo, 
//   videoEnabled, 
//   roomState, 
//   startStreaming, 
//   resumeStreaming, 
//   pauseStreaming, 
//   activeScreenShare, 
//   stopScreenShare, 
//   startScreenShare, 
//   endStreaming 
// }) => {
//   return (
//     <div className="bg-gray-800/90 backdrop-blur-md p-3">
//       <div className="flex justify-around">
//         {/* Audio Toggle */}
//         <button
//           onClick={toggleAudio}
//           className={`flex flex-col items-center p-3 rounded-xl ${
//             audioEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
//           }`}
//         >
//           {audioEnabled ? <FiMic className="h-5 w-5" /> : <FiMicOff className="h-5 w-5" />}
//           <span className="text-xs mt-1">Mic</span>
//         </button>

//         {/* Video Toggle */}
//         <button
//           onClick={toggleVideo}
//           className={`flex flex-col items-center p-3 rounded-xl ${
//             videoEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
//           }`}
//         >
//           {videoEnabled ? <FiVideo className="h-5 w-5" /> : <FiVideoOff className="h-5 w-5" />}
//           <span className="text-xs mt-1">Camera</span>
//         </button>

//         {/* Stream Control */}
//         {!roomState.isStreaming ? (
//           <button
//             onClick={startStreaming}
//             className="flex flex-col items-center p-3 bg-green-600 text-white rounded-xl"
//           >
//             <FiPlay className="h-5 w-5" />
//             <span className="text-xs mt-1">Start</span>
//           </button>
//         ) : roomState.isPaused ? (
//           <button
//             onClick={resumeStreaming}
//             className="flex flex-col items-center p-3 bg-blue-600 text-white rounded-xl"
//           >
//             <FiPlay className="h-5 w-5" />
//             <span className="text-xs mt-1">Resume</span>
//           </button>
//         ) : (
//           <button
//             onClick={pauseStreaming}
//             className="flex flex-col items-center p-3 bg-yellow-600 text-white rounded-xl"
//           >
//             <FiPause className="h-5 w-5" />
//             <span className="text-xs mt-1">Pause</span>
//           </button>
//         )}

//         {/* Screen Share */}
//         {activeScreenShare?.source === "streamer" ? (
//           <button
//             onClick={stopScreenShare}
//             className="flex flex-col items-center p-3 bg-red-600 text-white rounded-xl"
//           >
//             <FiSquare className="h-5 w-5" />
//             <span className="text-xs mt-1">Stop Share</span>
//           </button>
//         ) : (
//           <button
//             onClick={startScreenShare}
//             className="flex flex-col items-center p-3 bg-gray-600 text-white rounded-xl"
//             disabled
//           >
//             <MdOutlineScreenShare  className="h-5 w-5" />
//             <span className="text-xs mt-1">N/A</span>
//           </button>
//         )}

//         {/* End Stream */}
//         {roomState.isStreaming && (
//           <button
//             onClick={endStreaming}
//             className="flex flex-col items-center p-3 bg-red-600 text-white rounded-xl"
//           >
//             <FiLogOut className="h-5 w-5" />
//             <span className="text-xs mt-1">End</span>
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MobileControls;









// import React from 'react';
// import { 
//   FiMic, 
//   FiMicOff, 
//   FiVideo, 
//   FiVideoOff, 
//   FiPlay, 
//   FiPause, 
//   FiLogOut,
//   FiLoader 
// } from 'react-icons/fi';
// import { BsFillRecordFill, BsFillRecordCircleFill } from 'react-icons/bs';

// const MobileControls = ({ 
//   toggleAudio, 
//   audioEnabled, 
//   toggleVideo, 
//   videoEnabled, 
//   roomState, 
//   startStreaming, 
//   resumeStreaming, 
//   pauseStreaming, 
//   endStreaming,
//   // New props for recording
//   handleRecordingToggle,
//   isRecording,
//   isRecordingLoading,
//   isRecordingStopping
// }) => {
//   return (
//     <div className="bg-gray-800/90 backdrop-blur-md p-3 border-t border-gray-700">
//       <div className="flex justify-around">
//         {/* Audio Toggle */}
//         <button
//           onClick={toggleAudio}
//           className={`flex flex-col items-center p-3 rounded-xl transition-all ${
//             audioEnabled 
//               ? 'bg-green-600/90 hover:bg-green-700 text-white' 
//               : 'bg-red-600/90 hover:bg-red-700 text-white'
//           } active:scale-95`}
//         >
//           {audioEnabled ? (
//             <FiMic className="h-5 w-5" />
//           ) : (
//             <FiMicOff className="h-5 w-5" />
//           )}
//           <span className="text-xs mt-1 font-medium">
//             {audioEnabled ? 'Mic On' : 'Mic Off'}
//           </span>
//         </button>

//         {/* Video Toggle */}
//         <button
//           onClick={toggleVideo}
//           className={`flex flex-col items-center p-3 rounded-xl transition-all ${
//             videoEnabled 
//               ? 'bg-green-600/90 hover:bg-green-700 text-white' 
//               : 'bg-red-600/90 hover:bg-red-700 text-white'
//           } active:scale-95`}
//         >
//           {videoEnabled ? (
//             <FiVideo className="h-5 w-5" />
//           ) : (
//             <FiVideoOff className="h-5 w-5" />
//           )}
//           <span className="text-xs mt-1 font-medium">
//             {videoEnabled ? 'Cam On' : 'Cam Off'}
//           </span>
//         </button>

//         {/* Recording Button */}
//         <button
//           onClick={handleRecordingToggle}
//           disabled={isRecordingLoading || isRecordingStopping || (!isRecording && !roomState.isStreaming)}
//           className={`flex flex-col items-center p-3 rounded-xl transition-all relative ${
//             isRecording 
//               ? 'bg-red-600/90 hover:bg-red-700 text-white animate-pulse' 
//               : (!roomState.isStreaming ? 'bg-gray-500/50 text-gray-400' : 'bg-gray-600/90 hover:bg-gray-700 text-white')
//           } active:scale-95 ${(isRecordingLoading || isRecordingStopping) ? 'opacity-70' : ''}`}
//           title={
//             !roomState.isStreaming && !isRecording 
//               ? "Start streaming first" 
//               : isRecording 
//                 ? "Stop Recording" 
//                 : "Start Recording"
//           }
//         >
//           {(isRecordingLoading || isRecordingStopping) ? (
//             <>
//               <FiLoader className="h-5 w-5 animate-spin" />
//               <span className="text-xs mt-1 font-medium">
//                 {isRecordingLoading ? 'Starting...' : 'Stopping...'}
//               </span>
//             </>
//           ) : isRecording ? (
//             <>
//               <BsFillRecordCircleFill className="h-5 w-5" />
//               <span className="text-xs mt-1 font-medium">Stop Rec</span>
//               {/* Recording indicator dot */}
//               <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
//             </>
//           ) : (
//             <>
//               <BsFillRecordFill className="h-5 w-5" />
//               <span className="text-xs mt-1 font-medium">Record</span>
//             </>
//           )}
//         </button>

//         {/* Stream Control */}
//         {!roomState.isStreaming ? (
//           <button
//             onClick={startStreaming}
//             className="flex flex-col items-center p-3 bg-green-600/90 hover:bg-green-700 text-white rounded-xl transition-all active:scale-95"
//           >
//             <FiPlay className="h-5 w-5" />
//             <span className="text-xs mt-1 font-medium">Start</span>
//           </button>
//         ) : roomState.isPaused ? (
//           <button
//             onClick={resumeStreaming}
//             className="flex flex-col items-center p-3 bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95"
//           >
//             <FiPlay className="h-5 w-5" />
//             <span className="text-xs mt-1 font-medium">Resume</span>
//           </button>
//         ) : (
//           <button
//             onClick={pauseStreaming}
//             className="flex flex-col items-center p-3 bg-yellow-600/90 hover:bg-yellow-700 text-white rounded-xl transition-all active:scale-95"
//           >
//             <FiPause className="h-5 w-5" />
//             <span className="text-xs mt-1 font-medium">Pause</span>
//           </button>
//         )}

//         {/* End Stream */}
//         <button
//           onClick={endStreaming}
//           className="flex flex-col items-center p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-xl transition-all active:scale-95"
//         >
//           <FiLogOut className="h-5 w-5" />
//           <span className="text-xs mt-1 font-medium">End</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// export default MobileControls;


import React from 'react';
import { 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff, 
  FiPlay, 
  FiPause, 
  FiLogOut,
  FiLoader,
  FiStopCircle
} from 'react-icons/fi';
import { BsFillRecordFill, BsFillRecordCircleFill } from 'react-icons/bs';

const MobileControls = ({ 
  toggleAudio, 
  audioEnabled, 
  toggleVideo, 
  videoEnabled, 
  roomState, 
  startStreaming, 
  resumeStreaming, 
  pauseStreaming, 
  endStreaming,
  handleRecordingToggle,
  isRecording,
  isRecordingLoading,
  isRecordingStopping
}) => {
  return (
    <div className="w-full bg-[#0d0e14]/95 backdrop-blur-2xl border-t border-white/5 pt-4 pb-6 px-4 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] mt-auto">
      <div className="flex items-center justify-between max-w-md mx-auto relative px-1">
        
        {/* ── 1. Audio Toggle ── */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 active:scale-90 ${
            audioEnabled 
              ? 'text-gray-300 hover:bg-gray-800/50' 
              : 'bg-red-500/15 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
        >
          {audioEnabled ? <FiMic className="text-2xl mb-1" /> : <FiMicOff className="text-2xl mb-1" />}
          <span className="text-[10px] font-semibold tracking-wider">{audioEnabled ? 'Mic' : 'Muted'}</span>
        </button>

        {/* ── 2. Video Toggle ── */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 active:scale-90 ${
            videoEnabled 
              ? 'text-gray-300 hover:bg-gray-800/50' 
              : 'bg-red-500/15 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
        >
          {videoEnabled ? <FiVideo className="text-2xl mb-1" /> : <FiVideoOff className="text-2xl mb-1" />}
          <span className="text-[10px] font-semibold tracking-wider">{videoEnabled ? 'Video' : 'Off'}</span>
        </button>

        {/* ── 3. Center Floating Action (Stream Control) ── */}
        <div className="relative -top-8 flex flex-col items-center">
          {!roomState.isStreaming ? (
            <button
              onClick={startStreaming}
              className="flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white rounded-full shadow-[0_8px_25px_rgba(16,185,129,0.5)] transition-transform active:scale-90 border-4 border-[#0d0e14]"
            >
              <FiPlay className="text-2xl ml-1" />
            </button>
          ) : roomState.isPaused ? (
            <button
              onClick={resumeStreaming}
              className="flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-400 to-blue-600 text-white rounded-full shadow-[0_8px_25px_rgba(59,130,246,0.5)] transition-transform active:scale-90 border-4 border-[#0d0e14]"
            >
              <FiPlay className="text-2xl ml-1" />
            </button>
          ) : (
            <button
              onClick={pauseStreaming}
              className="flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-600 text-white rounded-full shadow-[0_8px_25px_rgba(245,158,11,0.5)] transition-transform active:scale-90 border-4 border-[#0d0e14]"
            >
              <FiPause className="text-2xl" />
            </button>
          )}
          {/* Label underneath floating button */}
          <span className="absolute -bottom-5 text-[11px] font-bold text-gray-400 tracking-wider uppercase">
            {!roomState.isStreaming ? 'Start' : roomState.isPaused ? 'Resume' : 'Pause'}
          </span>
        </div>

        {/* ── 4. Recording Toggle ── */}
        <button
          onClick={handleRecordingToggle}
          disabled={isRecordingLoading || isRecordingStopping || (!isRecording && !roomState.isStreaming)}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 active:scale-90 disabled:opacity-40 disabled:active:scale-100 ${
            isRecording 
              ? 'bg-red-600/20 text-red-500 border border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse' 
              : 'text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          {(isRecordingLoading || isRecordingStopping) ? (
            <FiLoader className="text-2xl mb-1 animate-spin text-gray-400" />
          ) : isRecording ? (
            <div className="relative flex items-center justify-center">
              <BsFillRecordCircleFill className="text-xl mb-1" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            </div>
          ) : (
            <BsFillRecordFill className="text-xl mb-1" />
          )}
          <span className="text-[10px] font-semibold tracking-wider">
            {(isRecordingLoading || isRecordingStopping) ? 'Wait...' : isRecording ? 'Rec On' : 'Record'}
          </span>
        </button>

        {/* ── 5. End Stream ── */}
        <button
          onClick={endStreaming}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 active:scale-90 text-gray-400 hover:bg-red-500/10 hover:text-red-500"
        >
          <FiLogOut className="text-xl mb-1" />
          <span className="text-[10px] font-semibold tracking-wider">End</span>
        </button>

      </div>
    </div>
  );
};

export default MobileControls;