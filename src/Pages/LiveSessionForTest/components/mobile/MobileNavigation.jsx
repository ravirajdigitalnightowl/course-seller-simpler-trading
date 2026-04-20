import React from 'react';
import { FiVideo, FiUsers, FiMessageSquare, FiMinimize2, FiMaximize2 } from 'react-icons/fi';

const MobileNavigation = ({ mobileView, setMobileView, toggleFullScreen, isFullScreen }) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md border-t border-gray-600">
      <div className="flex justify-around p-2">
        <button
          onClick={() => setMobileView('video')}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${
            mobileView === 'video' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <FiVideo className="h-5 w-5" />
          <span className="text-xs mt-1">Video</span>
        </button>
        
        <button
          onClick={() => setMobileView('participants')}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${
            mobileView === 'participants' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <FiUsers className="h-5 w-5" />
          <span className="text-xs mt-1">People</span>
        </button>
        
        <button
          onClick={() => setMobileView('chat')}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${
            mobileView === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <FiMessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">Chat</span>
        </button>
        
        <button
          onClick={toggleFullScreen}
          className="flex flex-col items-center p-2 rounded-lg transition-all text-gray-400 hover:text-white"
        >
          {isFullScreen ? <FiMinimize2 className="h-5 w-5" /> : <FiMaximize2 className="h-5 w-5" />}
          <span className="text-xs mt-1">{isFullScreen ? 'Exit' : 'Full'}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNavigation;