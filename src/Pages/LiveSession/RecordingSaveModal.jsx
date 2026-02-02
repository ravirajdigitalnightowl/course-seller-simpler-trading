// components/RecordingSaveModal.jsx
import React from 'react';
import { BsFillRecordFill } from "react-icons/bs";
import { FiCheck, FiX, FiStopCircle } from 'react-icons/fi';

const RecordingSaveModal = ({
  isOpen,
  onClose,
  onSaveAndEnd,
  onDiscardAndEnd,
  onContinueRecording,
  recordingTimer,
  recordingChunks,
  isRecording,
  isRecordingStopping,
  formatRecordingTime,
  formatFileSize
}) => {
  if (!isOpen) return null;

  const totalSize = recordingChunks.reduce((total, chunk) => total + chunk.size, 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700 animate-slideUp">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <BsFillRecordFill className="h-8 w-8 text-red-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Recording Active!</h3>
            <p className="text-sm text-gray-400">Recording in progress</p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            You have an active recording. What would you like to do?
          </p>
          
          <div className="bg-gray-700/50 p-4 rounded-lg mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Duration:</span>
              <span className="text-white font-mono font-bold">
                {formatRecordingTime(recordingTimer)}
              </span>
            </div>
            
            {recordingChunks.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">File Size:</span>
                <span className="text-white font-mono">
                  {formatFileSize(totalSize)}
                </span>
              </div>
            )}
            
            {isRecordingStopping && (
              <div className="flex items-center justify-center space-x-2 pt-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-400">Saving recording...</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onSaveAndEnd}
            disabled={isRecordingStopping}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isRecordingStopping ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiCheck className="h-5 w-5" />
                <span>Save Recording & End Session</span>
              </>
            )}
          </button>
          
          <button
            onClick={onContinueRecording}
            disabled={isRecordingStopping}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FiX className="h-5 w-5" />
            <span>Continue Recording</span>
          </button>
          
          <button
            onClick={onDiscardAndEnd}
            disabled={isRecordingStopping}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FiStopCircle className="h-5 w-5" />
            <span>Discard Recording & End Session</span>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            <span className="font-semibold text-amber-400">Tip:</span> Save your recording before ending the session to preserve it for later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecordingSaveModal;