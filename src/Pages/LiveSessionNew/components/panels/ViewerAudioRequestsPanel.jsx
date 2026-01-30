import React from 'react';

const ViewerAudioRequestsPanel = ({ viewerAudioRequests, handleViewerAudioResponse }) => {
  if (viewerAudioRequests.length === 0) return null;
  
  return (
    <div className="absolute top-64 left-4 bg-white text-black p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Audio Permission Requests</h3>
      <div className="space-y-2">
        {viewerAudioRequests.map((request, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
            <span className="text-sm">{request.requesterName} wants to speak</span>
            <div className="flex space-x-1">
              <button 
                onClick={() => handleViewerAudioResponse(request.requesterSocketId, true)}
                className="bg-green-500 text-white p-1 rounded text-xs"
              >
                Allow
              </button>
              <button 
                onClick={() => handleViewerAudioResponse(request.requesterSocketId, false)}
                className="bg-red-500 text-white p-1 rounded text-xs"
              >
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewerAudioRequestsPanel;