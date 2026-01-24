// MuteConfirmationModal.js
import React from 'react';
import { FiVolumeX, FiVolume2 } from 'react-icons/fi';

const MuteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">Audio Settings</h3>
        <p className="text-gray-300 mb-6">
          Do you want to mute the screen audio on your local speakers to prevent echo/noise? 
          <br/>
          <span className="text-yellow-400 text-sm mt-2 block">
            (Note: Audio will still be recorded in the video file)
          </span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all"
          >
            <FiVolumeX className="text-lg" />
            Yes, Mute Local Playback (Recommended)
          </button>

          <button
            onClick={() => onConfirm(false)}
            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-all"
          >
            <FiVolume2 className="text-lg" />
            No, Keep Audio On (I use headphones)
          </button>
        </div>
      </div>
    </div>
  );
};

export default MuteConfirmationModal;