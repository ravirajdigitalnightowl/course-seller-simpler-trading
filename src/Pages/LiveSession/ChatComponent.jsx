// import React, { useState, useRef, useEffect } from 'react';
// import { FiSend, FiImage, FiSmile, FiLoader, FiMessageSquare, FiX, FiDownload, FiFile } from 'react-icons/fi';
// import EmojiPicker from 'emoji-picker-react';
// import { toast } from 'react-toastify';

// // Message display component
// const MessageItem = ({ message, isOwnMessage }) => {
//   const [imageError, setImageError] = useState(false);

//   // File type check karne ke liye helper function
//   const isImageFile = (fileType) => {
//     return fileType && fileType.startsWith('image/');
//   };

//   const isPDFFile = (fileType) => {
//     return fileType === 'application/pdf';
//   };

//   const isDocumentFile = (fileType) => {
//     return fileType && (
//       fileType.includes('word') || 
//       fileType.includes('document') ||
//       fileType === 'application/pdf' ||
//       fileType === 'text/plain'
//     );
//   };

//   const getFileIcon = (fileType) => {
//     if (isImageFile(fileType)) return '🖼️';
//     if (isPDFFile(fileType)) return '📄';
//     if (fileType.includes('word')) return '📝';
//     if (fileType === 'text/plain') return '📄';
//     return '📎';
//   };

//   // Data URL se download handle karna
//   const handleDownload = () => {
//     if (message.fileData) {
//       try {
//         const link = document.createElement('a');
//         link.href = message.fileData;
//         link.download = message.fileName || 'download';
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         toast.success('Download started!');
//       } catch (error) {
//         console.error('Download error:', error);
//         toast.error('Download failed');
//       }
//     }
//   };

//   // File size format karna
//   const formatFileSize = (bytes) => {
//     if (!bytes) return 'Unknown size';
//     if (bytes < 1024) return bytes + ' bytes';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     return (bytes / 1024 / 1024).toFixed(1) + ' MB';
//   };

//   return (
//     <div className={`flex flex-col max-w-[85%] ${
//       isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
//     }`}>
//       <span className="text-xs text-gray-400 mb-1 px-2">
//         {message.name || "User"}
//       </span>
      
//       <div className={`px-4 py-2 rounded-2xl text-sm break-words backdrop-blur-sm ${
//         isOwnMessage
//           ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
//           : "bg-gray-700/50 text-gray-100 border border-gray-600"
//       }`}>
//         {/* File/Image Display */}
//         {message.fileData && (
//           <div className="mb-2">
//             {isImageFile(message.fileType) ? (
//               // Image display from data URL
//               <div className="relative">
//                 <img 
//                   src={message.fileData} 
//                   alt={message.fileName || "Shared image"}
//                   className="max-w-full max-h-64 rounded-lg object-contain border border-gray-600 bg-black"
//                   onError={() => setImageError(true)}
//                 />
//                 {imageError && (
//                   <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded mt-1">
//                     Failed to load image
//                   </div>
//                 )}
//                 <button
//                   onClick={handleDownload}
//                   className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors"
//                   title="Download image"
//                 >
//                   <FiDownload className="h-4 w-4" />
//                 </button>
//               </div>
//             ) : (
//               // Document file display
//               <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-600 min-w-64">
//                 <span className="text-2xl flex-shrink-0">{getFileIcon(message.fileType)}</span>
//                 <div className="flex-1 min-w-0">
//                   <p className="font-medium text-sm truncate text-white">
//                     {message.fileName}
//                   </p>
//                   <p className="text-xs text-gray-400">
//                     {formatFileSize(message.fileSize)}
//                   </p>
//                   <p className="text-xs text-gray-500 capitalize">
//                     {message.fileType?.split('/')[1] || message.fileType}
//                   </p>
//                 </div>
//                 <button 
//                   onClick={handleDownload}
//                   className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs transition-colors flex-shrink-0"
//                 >
//                   <FiDownload className="h-3 w-3" />
//                   <span>Save</span>
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
        
//         {/* Text Message */}
//         {message.message && (
//           <div className="whitespace-pre-wrap">
//             {message.message}
//           </div>
//         )}
        
//         {/* Timestamp */}
//         <div className={`text-xs mt-1 ${
//           isOwnMessage ? 'text-blue-200' : 'text-gray-400'
//         }`}>
//           {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
//             hour: '2-digit', 
//             minute: '2-digit' 
//           }) : 'Just now'}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Main Chat Component
// const ChatComponent = ({ 
//   messages = [], 
//   onSendMessage, 
//   currentUserId, 
//   uploadingFile = false,
//   socket,
//   sessionId,
//   roomCode
// }) => {
//   const [chatInput, setChatInput] = useState('');
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const fileInputRef = useRef(null);
//   const messagesEndRef = useRef(null);

//   // Auto scroll to bottom when new messages arrive
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // File ko data URL mein convert karne ka function
//   const fileToDataURL = (file) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });
//   };

//   // Handle file select and send
//   const handleFileSelect = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     // File validation
//     if (file.size > 5 * 1024 * 1024) {
//       toast.error('File size should be less than 5MB');
//       return;
//     }

//     const allowedTypes = [
//       'image/jpeg', 'image/png', 'image/gif', 'image/webp',
//       'application/pdf',
//       'text/plain',
//       'application/msword',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ];
    
//     if (!allowedTypes.includes(file.type)) {
//       toast.error('File type not supported. Please select images, PDFs, or documents.');
//       return;
//     }

//     try {
//       setUploading(true);
      
//       // File ko data URL mein convert karen
//       const fileData = await fileToDataURL(file);
      
//       // Message data prepare karen
//       const messageData = {
//         fileData: fileData, // Base64 data
//         fileName: file.name,
//         fileType: file.type,
//         fileSize: file.size,
//         message: chatInput || "" // Optional text message
//       };

//       // Socket se directly bhejen
//       if (socket && socket.connected) {
//         socket.emit('file_message', {
//           sessionId: sessionId || roomCode,
//           messageData: messageData
//         });
        
//         toast.success('File sent successfully!');
//         setChatInput(''); // Clear input after sending
//       } else {
//         toast.error('Not connected to chat');
//       }

//       e.target.value = ''; // Reset input
//     } catch (error) {
//       console.error('File send error:', error);
//       toast.error('Failed to send file');
//     } finally {
//       setUploading(false);
//     }
//   };

//   // Handle text message send
//   const handleSendMessage = () => {
//     if (chatInput && chatInput.trim()) {
//       onSendMessage(chatInput.trim());
//       setChatInput("");
//       setShowEmojiPicker(false);
//     }
//   };

//   // Handle Enter key press
//   const handleKeyPress = (e) => {
//     if (e.key === "Enter" && chatInput && chatInput.trim()) {
//       handleSendMessage();
//     }
//   };

//   // Handle emoji selection
//   const handleEmojiSelect = (emojiData) => {
//     try {
//       let emojiChar = '';
      
//       if (emojiData.emoji) {
//         emojiChar = emojiData.emoji;
//       } else if (emojiData.native) {
//         emojiChar = emojiData.native;
//       } else if (emojiData.unified) {
//         // Convert unified code to emoji
//         emojiChar = String.fromCodePoint(...emojiData.unified.split('-').map(u => '0x' + u));
//       } else {
//         return;
//       }
      
//       // Safely update input
//       setChatInput(prev => {
//         const currentText = prev || '';
//         return currentText + emojiChar;
//       });
      
//     } catch (error) {
//       console.error('Error handling emoji:', error);
//       toast.error('Failed to add emoji');
//     }
    
//     setShowEmojiPicker(false);
//   };

//   return (
//     <div className="flex-1 flex flex-col min-h-0 relative">
//       {/* Messages */}
//       <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
//         {messages.length === 0 ? (
//           <div className="flex items-center justify-center h-full text-gray-400">
//             <div className="text-center">
//               <FiMessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
//               <p className="text-sm">No messages yet...</p>
//               <p className="text-xs mt-1">Start a conversation!</p>
//             </div>
//           </div>
//         ) : (
//           messages.map((message, index) => (
//             <MessageItem 
//               key={message.id || index}
//               message={message}
//               isOwnMessage={message.userId === currentUserId}
//             />
//           ))
//         )}
        
//         {(uploading || uploadingFile) && (
//           <div className="flex justify-center">
//             <div className="bg-gray-700/50 px-4 py-2 rounded-lg flex items-center space-x-2">
//               <FiLoader className="h-4 w-4 animate-spin text-blue-400" />
//               <span className="text-sm text-gray-300">
//                 {uploading ? 'Sending file...' : 'Uploading...'}
//               </span>
//             </div>
//           </div>
//         )}
        
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Emoji Picker with better positioning */}
//       {showEmojiPicker && (
//         <div className="absolute bottom-16 right-4 z-50">
//           <div className="bg-white rounded-lg shadow-xl border border-gray-300 relative">
//             <button
//               onClick={() => setShowEmojiPicker(false)}
//               className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
//             >
//               <FiX className="h-4 w-4" />
//             </button>
//             <EmojiPicker
//               onEmojiClick={handleEmojiSelect}
//               height={350}
//               width={300}
//               searchDisabled={false}
//               skinTonesDisabled={true}
//             />
//           </div>
//         </div>
//       )}

//       {/* Input Area */}
//       <div className="p-4 bg-gray-750 border-t border-gray-600">
//         <div className="flex items-center space-x-2">
//           {/* File Attachment Button */}
//           <button
//             onClick={() => fileInputRef.current?.click()}
//             disabled={uploading}
//             className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//             title="Attach file (Images, PDF, Documents)"
//           >
//             <FiFile className="h-5 w-5" />
//           </button>

//           {/* Emoji Picker Button */}
//           <button
//             onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//             className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
//             title="Add emoji"
//           >
//             <FiSmile className="h-5 w-5" />
//           </button>

//           {/* Hidden File Input */}
//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileSelect}
//             accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"
//             className="hidden"
//           />

//           {/* Message Input */}
//           <div className="flex-1">
//             <input
//               type="text"
//               value={chatInput}
//               onChange={(e) => setChatInput(e.target.value)}
//               onKeyPress={handleKeyPress}
//               placeholder="Type a message or attach a file..."
//               className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
//               disabled={uploading}
//             />
//           </div>

//           {/* Send Button */}
//           <button
//             onClick={handleSendMessage}
//             disabled={!chatInput || !chatInput.trim() || uploading}
//             className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             title="Send message"
//           >
//             <FiSend className="h-5 w-5" />
//           </button>
//         </div>
        
//         {/* File type hint */}
//         <div className="text-xs text-gray-500 mt-2 text-center">
//           Supported: Images, PDF, Text, Word documents (Max 5MB)
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatComponent;
















import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiImage, FiSmile, FiLoader, FiMessageSquare, FiX, FiDownload, FiFile } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';

// Message display component
const MessageItem = ({ message, isOwnMessage }) => {
  const [imageError, setImageError] = useState(false);

  // File type check karne ke liye helper function
  const isImageFile = (fileType) => {
    return fileType && fileType.startsWith('image/');
  };

  const isPDFFile = (fileType) => {
    return fileType === 'application/pdf';
  };

  const isDocumentFile = (fileType) => {
    return fileType && (
      fileType.includes('word') || 
      fileType.includes('document') ||
      fileType === 'application/pdf' ||
      fileType === 'text/plain'
    );
  };

  const getFileIcon = (fileType) => {
    if (isImageFile(fileType)) return '🖼️';
    if (isPDFFile(fileType)) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType === 'text/plain') return '📄';
    return '📎';
  };

  // Data URL se download handle karna
  const handleDownload = () => {
    if (message.fileData) {
      try {
        const link = document.createElement('a');
        link.href = message.fileData;
        link.download = message.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Download failed');
      }
    }
  };

  // File size format karna
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex flex-col max-w-[85%] ${
      isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
    }`}>
      <span className="text-xs text-gray-400 mb-1 px-2">
        {message.name || "User"}
      </span>
      
      <div className={`px-4 py-2 rounded-2xl text-sm break-words backdrop-blur-sm ${
        isOwnMessage
          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
          : "bg-gray-700/50 text-gray-100 border border-gray-600"
      }`}>
        {/* File/Image Display */}
        {message.fileData && (
          <div className="mb-2">
            {isImageFile(message.fileType) ? (
              // Image display from data URL
              <div className="relative">
                <img 
                  src={message.fileData} 
                  alt={message.fileName || "Shared image"}
                  className="max-w-full max-h-64 rounded-lg object-contain border border-gray-600 bg-black"
                  onError={() => setImageError(true)}
                />
                {imageError && (
                  <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded mt-1">
                    Failed to load image
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors"
                  title="Download image"
                >
                  <FiDownload className="h-4 w-4" />
                </button>
              </div>
            ) : (
              // Document file display
              <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-600 min-w-64">
                <span className="text-2xl flex-shrink-0">{getFileIcon(message.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-white">
                    {message.fileName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(message.fileSize)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {message.fileType?.split('/')[1] || message.fileType}
                  </p>
                </div>
                <button 
                  onClick={handleDownload}
                  className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs transition-colors flex-shrink-0"
                >
                  <FiDownload className="h-3 w-3" />
                  <span>Save</span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Text Message */}
        {message.message && (
          <div className="whitespace-pre-wrap">
            {message.message}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-xs mt-1 ${
          isOwnMessage ? 'text-blue-200' : 'text-gray-400'
        }`}>
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'Just now'}
        </div>
      </div>
    </div>
  );
};

// Main Chat Component
const ChatComponent = ({ 
  messages = [], 
  onSendMessage, 
  currentUserId, 
  uploadingFile = false,
  socket,
  sessionId,
  roomCode
}) => {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // File ko data URL mein convert karne ka function
  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file select and send
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported. Please select images, PDFs, or documents.');
      return;
    }

    try {
      setUploading(true);
      
      // File ko data URL mein convert karen
      const fileData = await fileToDataURL(file);
      
      // Message data prepare karen
      const messageData = {
        fileData: fileData, // Base64 data
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        message: chatInput || "" // Optional text message
      };

      // Socket se directly bhejen
      if (socket && socket.connected) {
        socket.emit('file_message', {
          sessionId: sessionId || roomCode,
          messageData: messageData
        });
        
        toast.success('File sent successfully!');
        setChatInput(''); // Clear input after sending
      } else {
        toast.error('Not connected to chat');
      }

      e.target.value = ''; // Reset input
    } catch (error) {
      console.error('File send error:', error);
      toast.error('Failed to send file');
    } finally {
      setUploading(false);
    }
  };

  // Handle text message send
  const handleSendMessage = () => {
    if (chatInput && chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput("");
      setShowEmojiPicker(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && chatInput && chatInput.trim()) {
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData) => {
    try {
      let emojiChar = '';
      
      if (emojiData.emoji) {
        emojiChar = emojiData.emoji;
      } else if (emojiData.native) {
        emojiChar = emojiData.native;
      } else if (emojiData.unified) {
        // Convert unified code to emoji
        emojiChar = String.fromCodePoint(...emojiData.unified.split('-').map(u => '0x' + u));
      } else {
        return;
      }
      
      // Safely update input
      setChatInput(prev => {
        const currentText = prev || '';
        return currentText + emojiChar;
      });
      
    } catch (error) {
      console.error('Error handling emoji:', error);
      toast.error('Failed to add emoji');
    }
    
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <FiMessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No messages yet...</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem 
              key={message.id || index}
              message={message}
              isOwnMessage={message.userId === currentUserId}
            />
          ))
        )}
        
        {(uploading || uploadingFile) && (
          <div className="flex justify-center">
            <div className="bg-gray-700/50 px-4 py-2 rounded-lg flex items-center space-x-2">
              <FiLoader className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-sm text-gray-300">
                {uploading ? 'Sending file...' : 'Uploading...'}
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker with better positioning */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-300 relative">
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
            >
              <FiX className="h-4 w-4" />
            </button>
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              height={350}
              width={300}
              searchDisabled={false}
              skinTonesDisabled={true}
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-gray-750 border-t border-gray-600">
        <div className="flex items-center space-x-2">
          {/* File Attachment Button */}
          {/* <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file (Images, PDF, Documents)"
          >
            <FiFile className="h-5 w-5" />
          </button> */}

          {/* Emoji Picker Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
            title="Add emoji"
          >
            <FiSmile className="h-5 w-5" />
          </button>

          {/* Hidden File Input */}
          {/* <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"
            className="hidden"
          /> */}

          {/* Message Input */}
          <div className="flex-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message or attach a file..."
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              disabled={uploading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!chatInput || !chatInput.trim() || uploading}
            className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <FiSend className="h-5 w-5" />
          </button>
        </div>
        
        {/* File type hint */}
        {/* <div className="text-xs text-gray-500 mt-2 text-center">
          Supported: Images, PDF, Text, Word documents (Max 5MB)
        </div> */}
      </div>
    </div>
  );
};

export default ChatComponent;