import React from 'react';
import { FiVideo, FiRadio, FiAlertCircle, FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { BsFillRecordFill } from 'react-icons/bs';

const StreamHeader = ({
  session,
  isRecording,
  recordingTimer,
  formatRecordingTime,
  isConnected,
  pendingRequestsCount,
  sidebarCollapsed,
  setSidebarCollapsed,
  endStreaming
}) => {
  return (
    <header className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-600 shadow-lg z-40">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
          <FiVideo className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Stream Control Center
          </h1>
          <p className="text-sm text-gray-300 flex items-center space-x-1">
            <FiRadio className="h-3 w-3 text-green-400" />
            <span>Room: {session?.roomCode}</span>
          </p>
        </div>
        
        {isRecording && (
          <div className="ml-4 flex items-center space-x-2 bg-gradient-to-r from-red-600/70 to-red-700/70 px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
            <div className="relative">
              <BsFillRecordFill className="h-4 w-4 text-red-200" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-300 rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-bold text-white font-mono">
              {formatRecordingTime(recordingTimer)}
            </span>
            <span className="text-xs text-red-100 font-medium">REC</span>
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2 rounded-full backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {isRecording && (
          <div className="hidden lg:flex items-center space-x-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
            <span className="text-xs text-red-200 font-medium">Recording Active</span>
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
          </div>
        )}

        {pendingRequestsCount > 0 && (
          <div className="relative">
            <button className="bg-yellow-500 p-3 rounded-full animate-pulse shadow-lg hover:bg-yellow-600 transition-colors">
              <FiAlertCircle className="h-5 w-5 text-white" />
            </button>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs h-6 w-6 flex items-center justify-center font-bold shadow-lg">
              {pendingRequestsCount}
            </span>
          </div>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200"
          title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
        >
          {sidebarCollapsed ? 
            <FiChevronLeft className="h-5 w-5 text-blue-400" /> : 
            <FiChevronRight className="h-5 w-5 text-blue-400" />
          }
          <span className="text-sm font-medium">
            {sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
          </span>
        </button>

        <button
          onClick={endStreaming}
          className="flex items-center space-x-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
        >
          <FiLogOut className="h-4 w-4" />
          <span>End Session</span>
        </button>
      </div>
    </header>
  );
};

export default StreamHeader;