import React from 'react';
import { FiUsers, FiMic, FiCameraOff, FiSquare, FiX } from 'react-icons/fi';

const ParticipantsModal = ({ 
  showParticipantsModal, 
  setShowParticipantsModal, 
  participants, 
  activeSpeakers, 
  handleMuteViewerAudio, 
  handleStopViewerScreenShare,
  emitSocketEvent,
  sessionId,
  roomCode,
  addDebugLog,
  handleBanParticipant 
}) => {
  if (!showParticipantsModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Participants Management</h3>
          <button 
            onClick={() => setShowParticipantsModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          {participants.map((participant, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    activeSpeakers.has(participant.socketId) 
                      ? 'bg-green-500' 
                      : participant.hasAudio 
                        ? 'bg-blue-500' 
                        : 'bg-gray-500'
                  }`}
                ></div>
                <span className="truncate max-w-xs">
                  {participant.userId || 'User'}
                </span>
              </div>
              
              <div className="flex space-x-2">
                {participant.isScreenSharing && (
                  <span 
                    className="bg-yellow-500 text-xs px-2 py-1 rounded" 
                    title="Screen Sharing"
                  >
                    🖥️
                  </span>
                )}
                {participant.hasAudio && (
                  <span 
                    className="bg-blue-500 text-xs px-2 py-1 rounded" 
                    title="Has Audio"
                  >
                    🎤
                  </span>
                )}
                {activeSpeakers.has(participant.socketId) && (
                  <span 
                    className="bg-green-500 text-xs px-2 py-1 rounded" 
                    title="Speaking"
                  >
                    🔊
                  </span>
                )}

                {/* ✅ Mute Audio */}
                {participant.hasAudio && (
                  <button
                    onClick={() => handleMuteViewerAudio(participant.socketId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                    title="Mute Audio"
                  >
                    Mute
                  </button>
                )}

                {/* ✅ Stop Screen Share */}
                {participant.isScreenSharing && (
                  <button
                    onClick={() => handleStopViewerScreenShare(participant.userId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                    title="Stop Screen Share"
                  >
                    Stop
                  </button>
                )}

                {/* ✅ Stop Camera */}
                {participant.hasVideo && (
                  <button
                    onClick={() => {
                      emitSocketEvent("streamer-stop-viewer-video", {
                        sessionId: sessionId || roomCode,
                        targetSocketId: participant.socketId,
                      });
                      addDebugLog(`🛑 Force stopped camera for: ${participant.userId}`);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                    title="Stop Camera"
                  >
                    Stop Camera
                  </button>
                )}

                {/* ✅ Ban Participant */}
                <button
                  onClick={() => handleBanParticipant(participant.userId)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                  title="Ban Participant"
                >
                  Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsModal;