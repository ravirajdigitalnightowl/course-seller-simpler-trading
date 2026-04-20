import React from 'react';
import { FiPlay, FiX, FiInfo } from 'react-icons/fi';

const StartResumePromptModal = ({
  showStartResumePrompt,
  onDismiss, // ✅ Naya prop add kiya
  roomState,
  resumeStreaming
}) => {
  if (!showStartResumePrompt) return null;

  const isInitialLoad = !roomState?.isStreaming;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="relative bg-gray-800 border border-gray-600 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl mx-4 transform transition-all">
        
        <button
          onClick={onDismiss} // ✅ Yahan update kiya
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          {isInitialLoad ? <FiInfo className="w-8 h-8 text-blue-400" /> : <FiPlay className="w-8 h-8 text-blue-400 ml-1" />}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          {isInitialLoad ? "Ready to go live?" : "Stream is Paused"}
        </h2>
        
        <p className="text-gray-300 text-sm mb-8 leading-relaxed">
          {isInitialLoad 
            ? "Your session setup is complete. Please click the 'Start' button in the bottom controls whenever you are ready to begin broadcasting."
            : "Your stream is currently paused. Participants cannot see or hear you right now. Click Resume to continue your broadcast."}
        </p>
        
        {isInitialLoad ? (
          <button
            onClick={onDismiss} // ✅ Yahan update kiya
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all shadow-lg"
          >
            Got it
          </button>
        ) : (
          <button
            onClick={() => {
              onDismiss(); // ✅ Yahan update kiya
              resumeStreaming();
            }}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg"
          >
            <FiPlay className="w-5 h-5" />
            <span>Resume Stream</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StartResumePromptModal;
















// import React from 'react';
// import { FiPlay, FiX, FiInfo } from 'react-icons/fi'; // FiInfo import kar liya initial state ke liye

// const StartResumePromptModal = ({
//   showStartResumePrompt,
//   setIsPromptDismissed,
//   roomState,
//   startStreaming,
//   resumeStreaming
// }) => {
//   // Agar modal nahi dikhana hai, toh kuch render mat karo
//   if (!showStartResumePrompt) return null;

//   // Check karte hain ki initial load hai ya pause state
//   const isInitialLoad = !roomState?.isStreaming;

//   return (
//     <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
//       <div className="relative bg-gray-800 border border-gray-600 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl mx-4 transform transition-all">
        
//         {/* Close Button (Top Right) */}
//         <button
//           onClick={() => setIsPromptDismissed(true)}
//           className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
//           title="Dismiss"
//         >
//           <FiX className="w-5 h-5" />
//         </button>
        
//         {/* Icon (Load pe Info icon, Pause pe Play icon) */}
//         <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
//           {isInitialLoad ? (
//             <FiInfo className="w-8 h-8 text-blue-400" />
//           ) : (
//             <FiPlay className="w-8 h-8 text-blue-400 ml-1" />
//           )}
//         </div>
        
//         {/* Dynamic Heading */}
//         <h2 className="text-2xl font-bold text-white mb-4">
//           {isInitialLoad ? "Ready to go live?" : "Stream is Paused"}
//         </h2>
        
//         {/* Text Instructions */}
//         <p className="text-gray-300 text-sm mb-8 leading-relaxed">
//           {isInitialLoad 
//             ? "Your session setup is complete. Please click the 'Start' button in the bottom controls whenever you are ready to begin broadcasting."
//             : "Your stream is currently paused. Participants cannot see or hear you right now. Click Resume to continue your broadcast."}
//         </p>
        
//         {/* Conditional Buttons */}
//         {isInitialLoad ? (
//           // Page Load: Sirf dismiss karne ka option (No Play Button)
//           <button
//             onClick={() => setIsPromptDismissed(true)}
//             className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all shadow-lg"
//           >
//             Got it
//           </button>
//         ) : (
//           // Paused State: Direct Resume karne ka button
//           <button
//             onClick={() => {
//               setIsPromptDismissed(true);
//               resumeStreaming();
//             }}
//             className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg"
//           >
//             <FiPlay className="w-5 h-5" />
//             <span>Resume Stream</span>
//           </button>
//         )}

//       </div>
//     </div>
//   );
// };

// export default StartResumePromptModal;










