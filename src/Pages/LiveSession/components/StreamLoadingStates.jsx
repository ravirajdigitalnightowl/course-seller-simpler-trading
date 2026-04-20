import React from 'react';

const StreamLoadingStates = ({
  isLoading,
  permissionStatus,
  isConnected,
  session,
  mediaError,
  initializeCamera,
  requestCameraPermissions,
  videoRef
}) => {
  if (isLoading && permissionStatus !== 'denied') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Requesting camera access...</p>
          {mediaError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p>{mediaError}</p>
              <button 
                onClick={initializeCamera}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied' && !isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-4xl mb-4">🎥</div>
          <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-gray-600 mb-6">
            To join this live session, you need to allow camera and microphone access.
          </p>
          <button
            onClick={requestCameraPermissions}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Allow Camera & Microphone
          </button>
          <p className="text-sm text-gray-500 mt-4">
            If you've previously denied access, please check your browser settings.
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to session...</p>
          <div className="mt-4 w-64 mx-auto">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted={true}
              className="w-full rounded-lg shadow-lg"
            />
            <p className="text-sm text-gray-500 mt-2">Camera preview - connecting to session...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StreamLoadingStates;