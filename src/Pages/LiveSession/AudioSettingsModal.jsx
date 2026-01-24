// src/components/AudioSettingsModal.js

import React from 'react';
import { FiVolumeX, FiVolume2, FiCheck } from 'react-icons/fi';

const AudioSettingsModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full p-6 animate-fadeIn">
        
        <h3 className="text-xl font-bold text-white mb-2">Recording Audio Settings</h3>
        <p className="text-gray-400 text-sm mb-6">
          To prevent echo/noise loop during screen sharing, how should the local preview behave?
          <br/>
          <span className="text-yellow-500 text-xs mt-1 block font-medium">
            (Note: The recording file WILL ALWAYS have audio. This only affects what you hear right now.)
          </span>
        </p>

        <div className="space-y-3">
          {/* Option 1: Mute (Recommended for Speakers) */}
          <button
            onClick={() => onConfirm(true)} // true = Mute Local
            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all group border border-transparent hover:border-blue-400"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600">
                <FiVolumeX className="text-white h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Mute Local Preview</p>
                <p className="text-blue-200 text-xs">Recommended if using Speakers (Prevents Echo)</p>
              </div>
            </div>
            <FiCheck className="text-white h-5 w-5" />
          </button>

          {/* Option 2: Unmute (Headphones) */}
          <button
            onClick={() => onConfirm(false)} // false = Keep Audio On
            className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all group border border-gray-600 hover:border-gray-500"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-600 rounded-lg group-hover:bg-gray-500">
                <FiVolume2 className="text-gray-300 h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-200">Keep Audio On</p>
                <p className="text-gray-400 text-xs">Only if using Headphones</p>
              </div>
            </div>
          </button>
        </div>

        <button 
          onClick={onClose}
          className="mt-6 text-gray-500 text-xs hover:text-gray-300 w-full text-center hover:underline"
        >
          Cancel Recording
        </button>
      </div>
    </div>
  );
};

export default AudioSettingsModal;