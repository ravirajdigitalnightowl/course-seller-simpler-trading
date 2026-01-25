import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const EchoWarningModal = ({ isOpen, onConfirm, onCancel }) => {
  // Agar modal open nahi hai to kuch render mat karo
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-gray-800 border border-yellow-500 rounded-xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <FiAlertCircle className="h-8 w-8 text-yellow-500" />
          <h3 className="text-xl font-bold text-white">Prevent Audio Echo?</h3>
        </div>
        
        {/* Body Text */}
        <div className="text-gray-300 mb-6 space-y-3">
          <p>
            You are sharing <strong>System Audio</strong>.
          </p>
          <p className="text-sm bg-gray-900/50 p-3 rounded-lg border border-gray-700">
            ⚠️ <strong>Warning:</strong> If you hear this audio through your speakers while your mic is on, it will create a loud echo/feedback loop.
          </p>
          <p>
            Do you want to <strong>Mute Local Playback</strong>? <br/>
            <span className="text-xs text-gray-400">(Your viewers and recording will still capture the audio clearly).</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium"
          >
            No, keep sound
          </button>
          
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold shadow-lg transition-all transform active:scale-95 flex items-center space-x-2"
          >
            <span>Yes, Mute & Fix Echo</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default EchoWarningModal;