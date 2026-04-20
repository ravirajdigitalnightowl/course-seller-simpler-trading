import React from 'react';

const ActiveScreenSharesPanel = ({ activeScreenShare, handleStopViewerScreenShare }) => {
  if (!activeScreenShare) return null;

  return (
    <div className="absolute top-128 right-4 bg-white text-black p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Active Screen Share</h3>
      <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
        <span className="text-sm">{activeScreenShare.userName || activeScreenShare.userId}</span>

        {activeScreenShare.source === "viewer-screen" && (
          <button 
            onClick={() => handleStopViewerScreenShare(activeScreenShare.userId)}
            className="bg-red-500 text-white p-1 rounded text-xs"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveScreenSharesPanel;