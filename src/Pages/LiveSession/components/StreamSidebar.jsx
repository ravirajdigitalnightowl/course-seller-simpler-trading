import React from 'react';
import { 
  FiUsers, 
  FiMessageSquare, 
  FiVolume2, 
  FiMic, 
  FiVideo, 
  FiVideoOff, 
  FiMicOff, 
  FiEdit3, 
  FiXCircle 
} from 'react-icons/fi';
import { TfiHandOpen } from 'react-icons/tfi';
import ChatComponent from '../ChatComponent'; // Adjust path if needed

const StreamSidebar = ({
  sidebarView, setSidebarView, participants, user, handRaisedUsers, speakingUsers, messages, sendMessage, uploadingFile,
  socket, sessionId, roomCode, lowerAllHands, isSpeaking, setShowParticipantsModal, lowerHandForUser, handleMuteViewerAudio,
  emitSocketEvent, addDebugLog,
  handleWhiteboardPermission,
  allowedWhiteboardUsers = [] // 👈 NAYA PROP ADD KIYA
}) => {
  return (
    <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
      <div className="flex border-b border-gray-600">
        <button
          onClick={() => setSidebarView('participants')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
            sidebarView === 'participants' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
          }`}
        >
          <FiUsers className="h-5 w-5" />
          <span className="text-sm font-medium">Participants</span>
        </button>
        <button
          onClick={() => setSidebarView('chat')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
            sidebarView === 'chat' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
          }`}
        >
          <FiMessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium">Chat</span>
        </button>
      </div>

      {sidebarView === 'participants' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center space-x-2">
                <FiUsers className="h-5 w-5 text-blue-400" />
                <span>Participants ({participants.length})</span>
              </h3>
              <div className="flex items-center space-x-2">
                {handRaisedUsers.length > 0 && (
                  <button onClick={lowerAllHands} className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1">
                    <TfiHandOpen className="h-3 w-3" />
                    <span>Lower All</span>
                  </button>
                )}
                {isSpeaking && (
                  <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                )}
                <button onClick={() => setShowParticipantsModal(true)} className="p-1.5 hover:bg-gray-700 rounded-lg">
                  <FiUsers className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
            {participants.filter(p => p.userId !== user?.id).map((participant, index) => {
              const isThisUserSpeaking = speakingUsers.has(participant.userId);
              const hasHandRaised = handRaisedUsers.some(user => user.userId === participant.userId);
              
              // 👇 CHECK KARO KYA IS USER KO PERMISSION HAI YA NAHI
              const canDraw = allowedWhiteboardUsers.includes(participant.userId);

              return (
                <div key={index} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isThisUserSpeaking ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/20' : hasHandRaised ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20' : 'bg-gray-700/40 hover:bg-gray-600/40'
                }`}>
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-medium">
                        {participant.name?.charAt(0)?.toUpperCase() || participant.userId?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate text-sm">{participant.name || "User"}</span>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        {isThisUserSpeaking && <FiVolume2 className="h-3 w-3 text-green-400 animate-pulse" />}
                        {hasHandRaised && !isThisUserSpeaking && <TfiHandOpen className="h-3 w-3 text-yellow-400" />}
                        {participant.hasAudio && !isThisUserSpeaking && <FiMic className="h-3 w-3 text-blue-400" />}
                        {participant.hasVideo && <FiVideo className="h-3 w-3 text-purple-400" />}
                        
                        {/* ✅ Status Icon Dikhayein ki Viewer Draw kar raha hai */}
                        {canDraw && <FiEdit3 className="h-3 w-3 text-indigo-400" title="Can Draw" />}
                      </div>
                    </div>
                  </div>
                  
                  {/* ACTIONS CONTAINER */}
                  <div className="flex items-center space-x-1">
                    
                    {/* ✅ TOGGLE BUTTON LOGIC */}
                    {canDraw ? (
                      <button 
                        onClick={() => handleWhiteboardPermission(participant.userId, false)} 
                        className="p-1.5 bg-orange-700/50 hover:bg-orange-600/50 rounded-lg"
                        title="Revoke Drawing"
                      >
                        <FiXCircle className="h-4 w-4 text-orange-300" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleWhiteboardPermission(participant.userId, true)} 
                        className="p-1.5 bg-indigo-700/50 hover:bg-indigo-600/50 rounded-lg"
                        title="Allow Drawing"
                      >
                        <FiEdit3 className="h-4 w-4 text-indigo-300" />
                      </button>
                    )}

                    {hasHandRaised && (
                      <button onClick={() => lowerHandForUser(participant.userId)} className="p-1.5 bg-yellow-700/50 hover:bg-yellow-600/50 rounded-lg">
                        <TfiHandOpen className="h-4 w-4 text-yellow-300" />
                      </button>
                    )}
                    {participant.hasVideo && (
                      <button onClick={() => {
                          emitSocketEvent("streamer-stop-viewer-video", { sessionId: sessionId || roomCode, targetSocketId: participant.socketId });
                        }} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg">
                        <FiVideoOff className="h-4 w-4 text-gray-300" />
                      </button>
                    )}
                    {participant.hasAudio && (
                      <button onClick={() => handleMuteViewerAudio(participant.socketId)} className="p-1.5 bg-red-700/50 hover:bg-red-600/50 rounded-lg">
                        <FiMicOff className="h-4 w-4 text-red-300" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sidebarView === 'chat' && (
        <ChatComponent
          messages={messages}
          onSendMessage={sendMessage}
          currentUserId={user?.id}
          uploadingFile={uploadingFile}
          socket={socket}
          sessionId={sessionId}
          roomCode={roomCode}
        />
      )}
    </div>
  );
};

export default StreamSidebar;




// import React from 'react';
// import { 
//   FiUsers, 
//   FiMessageSquare, 
//   FiVolume2, 
//   FiMic, 
//   FiVideo, 
//   FiVideoOff, 
//   FiMicOff, 
//   FiEdit3,    // 👈 NAYA IMPORT (Allow Draw ke liye)
//   FiXCircle   // 👈 NAYA IMPORT (Revoke Draw ke liye)
// } from 'react-icons/fi';
// import { TfiHandOpen } from 'react-icons/tfi';
// import ChatComponent from '../ChatComponent'; // Adjust path if needed

// const StreamSidebar = ({
//   sidebarView, setSidebarView, participants, user, handRaisedUsers, speakingUsers, messages, sendMessage, uploadingFile,
//   socket, sessionId, roomCode, lowerAllHands, isSpeaking, setShowParticipantsModal, lowerHandForUser, handleMuteViewerAudio,
//   emitSocketEvent, addDebugLog,
//   handleWhiteboardPermission // 👈 NAYA PROP ADD KIYA
// }) => {
//   return (
//     <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//       <div className="flex border-b border-gray-600">
//         <button
//           onClick={() => setSidebarView('participants')}
//           className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//             sidebarView === 'participants' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//           }`}
//         >
//           <FiUsers className="h-5 w-5" />
//           <span className="text-sm font-medium">Participants</span>
//         </button>
//         <button
//           onClick={() => setSidebarView('chat')}
//           className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//             sidebarView === 'chat' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//           }`}
//         >
//           <FiMessageSquare className="h-5 w-5" />
//           <span className="text-sm font-medium">Chat</span>
//         </button>
//       </div>

//       {sidebarView === 'participants' && (
//         <div className="flex-1 flex flex-col min-h-0">
//           <div className="p-4 border-b border-gray-600">
//             <div className="flex items-center justify-between">
//               <h3 className="font-semibold text-lg flex items-center space-x-2">
//                 <FiUsers className="h-5 w-5 text-blue-400" />
//                 <span>Participants ({participants.length})</span>
//               </h3>
//               <div className="flex items-center space-x-2">
//                 {handRaisedUsers.length > 0 && (
//                   <button onClick={lowerAllHands} className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1">
//                     <TfiHandOpen className="h-3 w-3" />
//                     <span>Lower All</span>
//                   </button>
//                 )}
//                 {isSpeaking && (
//                   <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-lg">
//                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
//                   </div>
//                 )}
//                 <button onClick={() => setShowParticipantsModal(true)} className="p-1.5 hover:bg-gray-700 rounded-lg">
//                   <FiUsers className="h-5 w-5 text-gray-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//             {participants.filter(p => p.userId !== user?.id).map((participant, index) => {
//               const isThisUserSpeaking = speakingUsers.has(participant.userId);
//               const hasHandRaised = handRaisedUsers.some(user => user.userId === participant.userId);
              
//               return (
//                 <div key={index} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
//                   isThisUserSpeaking ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/20' : hasHandRaised ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20' : 'bg-gray-700/40 hover:bg-gray-600/40'
//                 }`}>
//                   <div className="flex items-center space-x-3 flex-1 min-w-0">
//                     <div className="relative">
//                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-medium">
//                         {participant.name?.charAt(0)?.toUpperCase() || participant.userId?.charAt(0)?.toUpperCase() || 'U'}
//                       </div>
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <span className="font-medium truncate text-sm">{participant.name || "User"}</span>
//                       <div className="flex items-center flex-wrap gap-2 mt-1">
//                         {isThisUserSpeaking && <FiVolume2 className="h-3 w-3 text-green-400 animate-pulse" />}
//                         {hasHandRaised && !isThisUserSpeaking && <TfiHandOpen className="h-3 w-3 text-yellow-400" />}
//                         {participant.hasAudio && !isThisUserSpeaking && <FiMic className="h-3 w-3 text-blue-400" />}
//                         {participant.hasVideo && <FiVideo className="h-3 w-3 text-purple-400" />}
//                       </div>
//                     </div>
//                   </div>
                  
//                   {/* ACTIONS CONTAINER */}
//                   <div className="flex items-center space-x-1">
                    
//                     {/* ✅ Allow Whiteboard Draw */}
//                     <button 
//                       onClick={() => handleWhiteboardPermission(participant.userId, true)} 
//                       className="p-1.5 bg-indigo-700/50 hover:bg-indigo-600/50 rounded-lg"
//                       title="Allow Drawing"
//                     >
//                       <FiEdit3 className="h-4 w-4 text-indigo-300" />
//                     </button>

//                     {/* ✅ Revoke Whiteboard Draw */}
//                     <button 
//                       onClick={() => handleWhiteboardPermission(participant.userId, false)} 
//                       className="p-1.5 bg-orange-700/50 hover:bg-orange-600/50 rounded-lg"
//                       title="Revoke Drawing"
//                     >
//                       <FiXCircle className="h-4 w-4 text-orange-300" />
//                     </button>

//                     {hasHandRaised && (
//                       <button onClick={() => lowerHandForUser(participant.userId)} className="p-1.5 bg-yellow-700/50 hover:bg-yellow-600/50 rounded-lg">
//                         <TfiHandOpen className="h-4 w-4 text-yellow-300" />
//                       </button>
//                     )}
//                     {participant.hasVideo && (
//                       <button onClick={() => {
//                           emitSocketEvent("streamer-stop-viewer-video", { sessionId: sessionId || roomCode, targetSocketId: participant.socketId });
//                         }} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg">
//                         <FiVideoOff className="h-4 w-4 text-gray-300" />
//                       </button>
//                     )}
//                     {participant.hasAudio && (
//                       <button onClick={() => handleMuteViewerAudio(participant.socketId)} className="p-1.5 bg-red-700/50 hover:bg-red-600/50 rounded-lg">
//                         <FiMicOff className="h-4 w-4 text-red-300" />
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {sidebarView === 'chat' && (
//         <ChatComponent
//           messages={messages}
//           onSendMessage={sendMessage}
//           currentUserId={user?.id}
//           uploadingFile={uploadingFile}
//           socket={socket}
//           sessionId={sessionId}
//           roomCode={roomCode}
//         />
//       )}
//     </div>
//   );
// };

// export default StreamSidebar;



// import React from 'react';
// import { FiUsers, FiMessageSquare, FiVolume2, FiMic, FiVideo, FiVideoOff, FiMicOff } from 'react-icons/fi';
// import { TfiHandOpen } from 'react-icons/tfi';
// import ChatComponent from '../ChatComponent'; // Adjust path if needed

// const StreamSidebar = ({
//   sidebarView, setSidebarView, participants, user, handRaisedUsers, speakingUsers, messages, sendMessage, uploadingFile,
//   socket, sessionId, roomCode, lowerAllHands, isSpeaking, setShowParticipantsModal, lowerHandForUser, handleMuteViewerAudio,
//   emitSocketEvent, addDebugLog
// }) => {
//   return (
//     <div className="w-80 xl:w-96 flex flex-col bg-gray-800/80 border-l border-gray-600 z-30 h-full">
//       <div className="flex border-b border-gray-600">
//         <button
//           onClick={() => setSidebarView('participants')}
//           className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//             sidebarView === 'participants' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//           }`}
//         >
//           <FiUsers className="h-5 w-5" />
//           <span className="text-sm font-medium">Participants</span>
//         </button>
//         <button
//           onClick={() => setSidebarView('chat')}
//           className={`flex-1 flex items-center justify-center space-x-2 py-3 transition-all duration-200 ${
//             sidebarView === 'chat' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
//           }`}
//         >
//           <FiMessageSquare className="h-5 w-5" />
//           <span className="text-sm font-medium">Chat</span>
//         </button>
//       </div>

//       {sidebarView === 'participants' && (
//         <div className="flex-1 flex flex-col min-h-0">
//           <div className="p-4 border-b border-gray-600">
//             <div className="flex items-center justify-between">
//               <h3 className="font-semibold text-lg flex items-center space-x-2">
//                 <FiUsers className="h-5 w-5 text-blue-400" />
//                 <span>Participants ({participants.length})</span>
//               </h3>
//               <div className="flex items-center space-x-2">
//                 {handRaisedUsers.length > 0 && (
//                   <button onClick={lowerAllHands} className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1">
//                     <TfiHandOpen className="h-3 w-3" />
//                     <span>Lower All</span>
//                   </button>
//                 )}
//                 {isSpeaking && (
//                   <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-lg">
//                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
//                   </div>
//                 )}
//                 <button onClick={() => setShowParticipantsModal(true)} className="p-1.5 hover:bg-gray-700 rounded-lg">
//                   <FiUsers className="h-5 w-5 text-gray-400" />
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
//             {participants.filter(p => p.userId !== user?.id).map((participant, index) => {
//               const isThisUserSpeaking = speakingUsers.has(participant.userId);
//               const hasHandRaised = handRaisedUsers.some(user => user.userId === participant.userId);
              
//               return (
//                 <div key={index} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
//                   isThisUserSpeaking ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/20' : hasHandRaised ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/10 border border-yellow-500/20' : 'bg-gray-700/40 hover:bg-gray-600/40'
//                 }`}>
//                   <div className="flex items-center space-x-3 flex-1 min-w-0">
//                     <div className="relative">
//                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-white font-medium">
//                         {participant.name?.charAt(0)?.toUpperCase() || participant.userId?.charAt(0)?.toUpperCase() || 'U'}
//                       </div>
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <span className="font-medium truncate text-sm">{participant.name || "User"}</span>
//                       <div className="flex items-center flex-wrap gap-2 mt-1">
//                         {isThisUserSpeaking && <FiVolume2 className="h-3 w-3 text-green-400 animate-pulse" />}
//                         {hasHandRaised && !isThisUserSpeaking && <TfiHandOpen className="h-3 w-3 text-yellow-400" />}
//                         {participant.hasAudio && !isThisUserSpeaking && <FiMic className="h-3 w-3 text-blue-400" />}
//                         {participant.hasVideo && <FiVideo className="h-3 w-3 text-purple-400" />}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center space-x-1">
//                     {hasHandRaised && (
//                       <button onClick={() => lowerHandForUser(participant.userId)} className="p-1.5 bg-yellow-700/50 hover:bg-yellow-600/50 rounded-lg">
//                         <TfiHandOpen className="h-4 w-4 text-yellow-300" />
//                       </button>
//                     )}
//                     {participant.hasVideo && (
//                       <button onClick={() => {
//                           emitSocketEvent("streamer-stop-viewer-video", { sessionId: sessionId || roomCode, targetSocketId: participant.socketId });
//                         }} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg">
//                         <FiVideoOff className="h-4 w-4 text-gray-300" />
//                       </button>
//                     )}
//                     {participant.hasAudio && (
//                       <button onClick={() => handleMuteViewerAudio(participant.socketId)} className="p-1.5 bg-red-700/50 hover:bg-red-600/50 rounded-lg">
//                         <FiMicOff className="h-4 w-4 text-red-300" />
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {sidebarView === 'chat' && (
//         <ChatComponent
//           messages={messages}
//           onSendMessage={sendMessage}
//           currentUserId={user?.id}
//           uploadingFile={uploadingFile}
//           socket={socket}
//           sessionId={sessionId}
//           roomCode={roomCode}
//         />
//       )}
//     </div>
//   );
// };

// export default StreamSidebar;