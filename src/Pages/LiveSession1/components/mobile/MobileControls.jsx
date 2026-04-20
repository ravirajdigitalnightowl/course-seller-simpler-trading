import React from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPlay, FiPause, FiSquare, FiLogOut } from 'react-icons/fi';
import { MdOutlineScreenShare } from 'react-icons/md';

const MobileControls = ({ 
  toggleAudio, 
  audioEnabled, 
  toggleVideo, 
  videoEnabled, 
  roomState, 
  startStreaming, 
  resumeStreaming, 
  pauseStreaming, 
  activeScreenShare, 
  stopScreenShare, 
  startScreenShare, 
  endStreaming 
}) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md p-3">
      <div className="flex justify-around">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center p-3 rounded-xl ${
            audioEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {audioEnabled ? <FiMic className="h-5 w-5" /> : <FiMicOff className="h-5 w-5" />}
          <span className="text-xs mt-1">Mic</span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center p-3 rounded-xl ${
            videoEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {videoEnabled ? <FiVideo className="h-5 w-5" /> : <FiVideoOff className="h-5 w-5" />}
          <span className="text-xs mt-1">Camera</span>
        </button>

        {/* Stream Control */}
        {!roomState.isStreaming ? (
          <button
            onClick={startStreaming}
            className="flex flex-col items-center p-3 bg-green-600 text-white rounded-xl"
          >
            <FiPlay className="h-5 w-5" />
            <span className="text-xs mt-1">Start</span>
          </button>
        ) : roomState.isPaused ? (
          <button
            onClick={resumeStreaming}
            className="flex flex-col items-center p-3 bg-blue-600 text-white rounded-xl"
          >
            <FiPlay className="h-5 w-5" />
            <span className="text-xs mt-1">Resume</span>
          </button>
        ) : (
          <button
            onClick={pauseStreaming}
            className="flex flex-col items-center p-3 bg-yellow-600 text-white rounded-xl"
          >
            <FiPause className="h-5 w-5" />
            <span className="text-xs mt-1">Pause</span>
          </button>
        )}

        {/* Screen Share */}
        {activeScreenShare?.source === "streamer" ? (
          <button
            onClick={stopScreenShare}
            className="flex flex-col items-center p-3 bg-red-600 text-white rounded-xl"
          >
            <FiSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Stop Share</span>
          </button>
        ) : (
          <button
            onClick={startScreenShare}
            className="flex flex-col items-center p-3 bg-gray-600 text-white rounded-xl"
            disabled
          >
            <MdOutlineScreenShare  className="h-5 w-5" />
            <span className="text-xs mt-1">N/A</span>
          </button>
        )}

        {/* End Stream */}
        {roomState.isStreaming && (
          <button
            onClick={endStreaming}
            className="flex flex-col items-center p-3 bg-red-600 text-white rounded-xl"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="text-xs mt-1">End</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileControls;