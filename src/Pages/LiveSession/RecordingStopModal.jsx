// components/RecordingStopModal.jsx
import React from 'react';
import { FiAlertCircle, FiSave, FiX, FiDownload } from 'react-icons/fi';
import { BsFillRecordFill } from 'react-icons/bs';

const RecordingStopModal = ({ 
  isOpen, 
  onClose, 
  onSaveRecording, 
  onLeaveWithoutSaving,
  recordingTimer,
  isRecordingStopping
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <FiAlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Recording in Progress!</h3>
              <p className="text-gray-400 text-sm mt-1">
                Active recording will be lost if you leave without saving.
              </p>
            </div>
          </div>
        </div>

        {/* Recording Info */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <BsFillRecordFill className="h-6 w-6 text-red-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <span className="text-lg font-bold text-white">Recording Active</span>
                <p className="text-sm text-gray-400">
                  {recordingTimer} seconds recorded
                </p>
              </div>
            </div>
            <div className="bg-gray-700 px-3 py-1 rounded-lg">
              <span className="text-white font-mono font-bold">{recordingTimer}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className="text-green-400 font-medium">● Recording</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Action Required:</span>
              <span className="text-yellow-400 font-medium">Save before leaving</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6">
          <div className="space-y-3">
            {/* Save Recording Button */}
            <button
              onClick={onSaveRecording}
              disabled={isRecordingStopping}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecordingStopping ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving Recording...</span>
                </>
              ) : (
                <>
                  <FiSave className="h-5 w-5" />
                  <span>Save Recording & End Session</span>
                </>
              )}
            </button>

            {/* Leave Without Saving Button */}
            <button
              onClick={onLeaveWithoutSaving}
              disabled={isRecordingStopping}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiX className="h-5 w-5" />
              <span>Leave Without Saving</span>
            </button>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel & Continue Session
            </button>
          </div>

          {/* Warning Message */}
          <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-300 text-center">
              ⚠️ Unsaved recordings cannot be recovered once the session ends
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingStopModal;