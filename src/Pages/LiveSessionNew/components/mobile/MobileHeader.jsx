import React from 'react';
import { FiVideo, FiUsers, FiAlertCircle, FiMinimize2, FiMaximize2 } from 'react-icons/fi';

const MobileHeader = ({ 
  session, 
  participants, 
  isConnected, 
  viewerAudioRequests, 
  screenShareRequests, 
  viewerVideoRequests, 
  setMobileView, 
  toggleFullScreen, 
  isFullScreen, 
  showRequests, 
  setShowRequests 
}) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md p-3 flex justify-between items-center border-b border-gray-600">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FiVideo className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">Live Session</h1>
          <p className="text-xs text-gray-300">Room: {session?.roomCode}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-300 hidden sm:block">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Participants Count - Clickable */}
        <button
          onClick={() => setMobileView('participants')}
          className="flex items-center space-x-1 bg-gray-700/70 hover:bg-gray-600/70 px-2 py-1 rounded-lg transition-colors"
        >
          <FiUsers className="h-3 w-3 text-blue-400" />
          <span className="text-xs font-medium">{participants.length}</span>
        </button>

        {/* Pending Requests Badge */}
        {(viewerAudioRequests.length > 0 || screenShareRequests.length > 0 || viewerVideoRequests.length > 0) && (
          <button
            onClick={() => setShowRequests(!showRequests)}
            className="relative p-1 bg-yellow-500 rounded-lg animate-pulse"
          >
            <FiAlertCircle className="h-4 w-4 text-white" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-4 w-4 flex items-center justify-center font-bold">
              {viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length}
            </span>
          </button>
        )}

        {/* Full Screen Toggle */}
        <button
          onClick={toggleFullScreen}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {isFullScreen ? <FiMinimize2 className="h-4 w-4" /> : <FiMaximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default MobileHeader;