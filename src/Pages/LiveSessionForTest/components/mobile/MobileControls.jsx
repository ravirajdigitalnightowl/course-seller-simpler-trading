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









import React from 'react';
import { 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff, 
  FiPlay, 
  FiPause, 
  FiLogOut,
  FiLoader 
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
  // New props for recording
  handleRecordingToggle,
  isRecording,
  isRecordingLoading,
  isRecordingStopping
}) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md p-3 border-t border-gray-700">
      <div className="flex justify-around">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center p-3 rounded-xl transition-all ${
            audioEnabled 
              ? 'bg-green-600/90 hover:bg-green-700 text-white' 
              : 'bg-red-600/90 hover:bg-red-700 text-white'
          } active:scale-95`}
        >
          {audioEnabled ? (
            <FiMic className="h-5 w-5" />
          ) : (
            <FiMicOff className="h-5 w-5" />
          )}
          <span className="text-xs mt-1 font-medium">
            {audioEnabled ? 'Mic On' : 'Mic Off'}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center p-3 rounded-xl transition-all ${
            videoEnabled 
              ? 'bg-green-600/90 hover:bg-green-700 text-white' 
              : 'bg-red-600/90 hover:bg-red-700 text-white'
          } active:scale-95`}
        >
          {videoEnabled ? (
            <FiVideo className="h-5 w-5" />
          ) : (
            <FiVideoOff className="h-5 w-5" />
          )}
          <span className="text-xs mt-1 font-medium">
            {videoEnabled ? 'Cam On' : 'Cam Off'}
          </span>
        </button>

        {/* Recording Button */}
        <button
          onClick={handleRecordingToggle}
          disabled={isRecordingLoading || isRecordingStopping || (!isRecording && !roomState.isStreaming)}
          className={`flex flex-col items-center p-3 rounded-xl transition-all relative ${
            isRecording 
              ? 'bg-red-600/90 hover:bg-red-700 text-white animate-pulse' 
              : (!roomState.isStreaming ? 'bg-gray-500/50 text-gray-400' : 'bg-gray-600/90 hover:bg-gray-700 text-white')
          } active:scale-95 ${(isRecordingLoading || isRecordingStopping) ? 'opacity-70' : ''}`}
          title={
            !roomState.isStreaming && !isRecording 
              ? "Start streaming first" 
              : isRecording 
                ? "Stop Recording" 
                : "Start Recording"
          }
        >
          {(isRecordingLoading || isRecordingStopping) ? (
            <>
              <FiLoader className="h-5 w-5 animate-spin" />
              <span className="text-xs mt-1 font-medium">
                {isRecordingLoading ? 'Starting...' : 'Stopping...'}
              </span>
            </>
          ) : isRecording ? (
            <>
              <BsFillRecordCircleFill className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Stop Rec</span>
              {/* Recording indicator dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            </>
          ) : (
            <>
              <BsFillRecordFill className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Record</span>
            </>
          )}
        </button>

        {/* Stream Control */}
        {!roomState.isStreaming ? (
          <button
            onClick={startStreaming}
            className="flex flex-col items-center p-3 bg-green-600/90 hover:bg-green-700 text-white rounded-xl transition-all active:scale-95"
          >
            <FiPlay className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Start</span>
          </button>
        ) : roomState.isPaused ? (
          <button
            onClick={resumeStreaming}
            className="flex flex-col items-center p-3 bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95"
          >
            <FiPlay className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Resume</span>
          </button>
        ) : (
          <button
            onClick={pauseStreaming}
            className="flex flex-col items-center p-3 bg-yellow-600/90 hover:bg-yellow-700 text-white rounded-xl transition-all active:scale-95"
          >
            <FiPause className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Pause</span>
          </button>
        )}

        {/* End Stream */}
        <button
          onClick={endStreaming}
          className="flex flex-col items-center p-3 bg-red-600/90 hover:bg-red-700 text-white rounded-xl transition-all active:scale-95"
        >
          <FiLogOut className="h-5 w-5" />
          <span className="text-xs mt-1 font-medium">End</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;