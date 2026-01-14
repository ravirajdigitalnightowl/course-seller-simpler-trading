import React from 'react';

const ViewerVideoRequestsPanel = ({ viewerVideoRequests, handleViewerVideoResponse }) => {
  if (viewerVideoRequests.length === 0) return null;

  return (
    <div className="absolute top-20 left-4 bg-white text-black p-4 rounded shadow-lg w-72 z-50">
      <h3 className="font-bold mb-2">📷 Camera Requests</h3>
      <div className="space-y-2">
        {viewerVideoRequests.map((req) => (
          <div key={req.userId} className="flex justify-between items-center bg-gray-100 p-2 rounded">
            <span>{req.userName}</span>
            <div className="space-x-2">
              <button
                onClick={() => handleViewerVideoResponse(req.userId, true)}
                className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                ✅
              </button>
              <button
                onClick={() => handleViewerVideoResponse(req.userId, false)}
                className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                ❌
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewerVideoRequestsPanel;