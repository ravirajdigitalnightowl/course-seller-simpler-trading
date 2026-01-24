import React from 'react';
import { 
  FiAlertCircle, FiMic, FiMonitor, FiVideo, 
  FiCheck, FiX 
} from 'react-icons/fi';

const MobileRequestsPanel = ({ 
  viewerAudioRequests, 
  screenShareRequests, 
  viewerVideoRequests, 
  handleViewerAudioResponse, 
  handleScreenShareResponse, 
  handleViewerVideoResponse 
}) => {
  const totalRequests = viewerAudioRequests.length + screenShareRequests.length + viewerVideoRequests.length;
  
  if (totalRequests === 0) return null;

  return (
    <div className="fixed top-20 right-4 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-w-xs w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiAlertCircle className="h-5 w-5" />
            <span className="font-bold text-sm">Pending Requests</span>
          </div>
          <div className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
            {totalRequests}
          </div>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-3 space-y-3">
        {/* Viewer Audio Requests */}
        {viewerAudioRequests.length > 0 && (
          <div className="border-l-4 border-green-500 pl-3">
            <div className="flex items-center space-x-2 mb-2">
              <FiMic className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-gray-700">Audio Requests</p>
            </div>
            {viewerAudioRequests.map((request, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 mb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800">{request.requesterName}</span>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleViewerAudioResponse(request.requesterSocketId, true)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiCheck className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => handleViewerAudioResponse(request.requesterSocketId, false)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Screen Share Requests */}
        {screenShareRequests.length > 0 && (
          <div className="border-l-4 border-blue-500 pl-3">
            <div className="flex items-center space-x-2 mb-2">
              <FiMonitor className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">Screen Share</p>
            </div>
            {screenShareRequests.map((request, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 mb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800">{request.requesterName}</span>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleScreenShareResponse(request.requestedUserId, true)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiCheck className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => handleScreenShareResponse(request.requestedUserId, false)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Viewer Video Requests */}
        {viewerVideoRequests.length > 0 && (
          <div className="border-l-4 border-purple-500 pl-3">
            <div className="flex items-center space-x-2 mb-2">
              <FiVideo className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-semibold text-gray-700">Camera Requests</p>
            </div>
            {viewerVideoRequests.map((request, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 mb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800">{request.userName}</span>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleViewerVideoResponse(request.userId, true)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiCheck className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => handleViewerVideoResponse(request.userId, false)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors duration-200"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileRequestsPanel;