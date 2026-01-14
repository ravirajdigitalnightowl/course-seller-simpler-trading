import React from 'react';

const ActiveViewerAudioPanel = ({ activeViewerAudio, handleMuteViewerAudio }) => {
  if (activeViewerAudio.size === 0) return null;
  
  return (
    <div className="absolute top-96 right-4 bg-white text-black p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Active Speakers</h3>
      <div className="space-y-2">
        {Array.from(activeViewerAudio.values()).map((viewer, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
            <span className="text-sm">{viewer.userId}</span>
            <button 
              onClick={() => handleMuteViewerAudio(viewer.socketId)}
              className="bg-red-500 text-white p-1 rounded text-xs"
            >
              Mute
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveViewerAudioPanel;