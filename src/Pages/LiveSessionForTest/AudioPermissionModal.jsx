// components/AudioPermissionModal.jsx
import React from 'react';
import { FiHeadphones, FiPlay } from 'react-icons/fi';

const AudioPermissionModal = ({ 
  isOpen, 
  onEnableAudio
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 rounded-full">
              <FiHeadphones className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Enable Audio</h2>
              <p className="text-blue-100 text-sm mt-1">
                Click to enable all participant audio
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <FiPlay className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Enable Audio Playback
              </h3>
              <p className="text-gray-600 text-sm">
                Browser requires one-time interaction to play participant audio
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> This enables audio for all current and future participants. 
              Click the button below to start hearing everyone.
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="p-6 pt-0">
          <button
            onClick={onEnableAudio}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-green-600 text-white hover:bg-green-700 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <FiPlay className="h-6 w-6" />
            <span className="text-lg font-bold">Enable All Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPermissionModal;