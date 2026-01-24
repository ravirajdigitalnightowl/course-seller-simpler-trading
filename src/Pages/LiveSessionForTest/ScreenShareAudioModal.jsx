// ScreenShareAudioModal.jsx
import React from 'react';
import { FiVolumeX, FiCheck } from 'react-icons/fi';

const ScreenShareAudioModal = ({ isOpen, onFixAudio, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 border border-gray-600 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <div className="mx-auto bg-yellow-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <FiVolumeX className="h-8 w-8 text-yellow-400" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          Avoid Echo in Recording?
        </h3>
        
        <p className="text-gray-300 text-sm mb-6">
          Screen sharing audio is detected. To prevent <b>Double Audio (Echo)</b> in your recording, we need to mute the local preview.
          <br/><br/>
          <span className="text-yellow-400 text-xs">
            *This won't affect the recording, only what YOU hear from the browser.*
          </span>
        </p>

        <div className="flex space-x-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
          >
            Ignore
          </button>
          
          <button
            onClick={onFixAudio}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <FiCheck className="w-5 h-5" />
            <span>Fix Audio Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScreenShareAudioModal;