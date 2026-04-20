import React, { useState } from 'react';
import { FiUsers, FiMicOff, FiCameraOff, FiSquare, FiX, FiMenu } from 'react-icons/fi';

const MobileParticipantsView = ({ 
  participants, 
  activeSpeakers, 
  handleMuteViewerAudio, 
  emitSocketEvent, 
  sessionId, 
  roomCode, 
  addDebugLog, 
  handleStopViewerScreenShare, 
  handleBanParticipant 
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const handleParticipantAction = (participant, action) => {
    switch (action) {
      case 'mute':
        handleMuteViewerAudio(participant.socketId);
        break;
      case 'stop_camera':
        emitSocketEvent("streamer-stop-viewer-video", {
          sessionId: sessionId || roomCode,
          targetSocketId: participant.socketId,
        });
        addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
        break;
      case 'stop_screen':
        handleStopViewerScreenShare(participant.userId);
        break;
      case 'ban':
        handleBanParticipant(participant.userId);
        break;
      default:
        break;
    }
    setSelectedParticipant(null);
  };

  return (
    <div className="flex-1 bg-gray-900 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <FiUsers className="h-5 w-5 text-blue-400" />
          <span>Participants ({participants.length})</span>
        </h2>
      </div>
      
      <div className="space-y-2 p-4">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div
                className={`w-3 h-3 rounded-full ${
                  activeSpeakers.has(participant.socketId)
                    ? "bg-green-400 animate-pulse"
                    : participant.hasAudio
                    ? "bg-blue-400"
                    : "bg-gray-400"
                }`}
              ></div>
              <div className="flex-1 min-w-0">
                <span className="font-medium block truncate">
                  {participant.name || participant.userName || participant.userId || "User"}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  {participant.hasAudio && (
                    <span className="text-xs text-blue-400 bg-blue-400/20 px-1.5 py-0.5 rounded">
                      🎤
                    </span>
                  )}
                  {participant.hasVideo && (
                    <span className="text-xs text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded">
                      📹
                    </span>
                  )}
                  {participant.isScreenSharing && (
                    <span className="text-xs text-purple-400 bg-purple-400/20 px-1.5 py-0.5 rounded">
                      🖥️
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => setSelectedParticipant(participant)}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FiMenu className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        ))}
      </div>

      {/* Action Menu Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Manage Participant</h3>
                <button 
                  onClick={() => setSelectedParticipant(null)}
                  className="p-2 text-gray-400"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-300 text-sm mt-1">
                {selectedParticipant.name || selectedParticipant.userName || selectedParticipant.userId}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              {/* Mute Audio Button */}
              {selectedParticipant.hasAudio && (
                <button
                  onClick={() => handleParticipantAction(selectedParticipant, 'mute')}
                  className="w-full flex items-center space-x-3 p-3 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                >
                  <FiMicOff className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">Mute Audio</span>
                </button>
              )}

              {/* Stop Camera Button */}
              {selectedParticipant.hasVideo && (
                <button
                  onClick={() => handleParticipantAction(selectedParticipant, 'stop_camera')}
                  className="w-full flex items-center space-x-3 p-3 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                >
                  <FiCameraOff className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">Stop Camera</span>
                </button>
              )}

              {/* Stop Screen Share Button */}
              {selectedParticipant.isScreenSharing && (
                <button
                  onClick={() => handleParticipantAction(selectedParticipant, 'stop_screen')}
                  className="w-full flex items-center space-x-3 p-3 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                >
                  <FiSquare className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">Stop Screen Share</span>
                </button>
              )}

              <button
                onClick={() => setSelectedParticipant(null)}
                className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mt-4"
              >
                <FiX className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400 font-medium">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileParticipantsView;