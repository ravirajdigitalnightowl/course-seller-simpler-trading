// MuteScreenAudioModal.jsx
import React from 'react';
import { FiVolumeX, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';

const MuteScreenAudioModal = ({ 
  isOpen, 
  onClose,
  onConfirm 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <FiAlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Mute Screen Audio?</h2>
              <p className="text-xs text-gray-400">Prevent echo during recording</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 flex items-start space-x-3">
            <FiVolumeX className="h-6 w-6 text-red-400 mt-1" />
            <div>
              <p className="text-gray-300">
                Mute the screen audio you hear to prevent echo.
                <br />
                <span className="text-green-400 text-sm">
                  Audio will still be recorded in the video.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <FiX className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <FiCheck className="h-4 w-4" />
            <span>Mute & Start</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MuteScreenAudioModal;