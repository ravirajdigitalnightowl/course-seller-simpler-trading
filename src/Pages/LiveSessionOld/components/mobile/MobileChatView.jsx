import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiImage, FiSmile, FiSend, FiLoader } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';
import MessageItem from './MessageItem';

const MobileChatView = ({ 
  messages, 
  user, 
  sendMessage, 
  uploadingFile 
}) => {
  const [localMessages, setLocalMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  // Messages sync karen
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const handleSendMessage = (text = '', file = null) => {
    if ((text.trim() || file) && sendMessage) {
      sendMessage(text, file);
      setInputMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // File size check (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }

      // File type check
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only images, PDF and text files are allowed');
        return;
      }

      handleSendMessage('', file);
      e.target.value = ''; // Reset input
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputMessage(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <FiMessageSquare className="h-5 w-5 text-blue-400" />
          <span>Chat</span>
          {uploadingFile && (
            <div className="flex items-center space-x-1 text-yellow-400 text-sm">
              <FiLoader className="h-3 w-3 animate-spin" />
              <span>Uploading...</span>
            </div>
          )}
        </h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FiMessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm mt-2 text-center">
              Start a conversation by sending a message or sharing a file
            </p>
          </div>
        ) : (
          localMessages.map((message, index) => (
            <MessageItem 
              key={message.id || index}
              message={message}
              isOwnMessage={message.userId === user?.id}
            />
          ))
        )}
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-0 right-0 z-50">
          <div className="bg-white mx-4 rounded-lg shadow-xl border border-gray-300">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              height={350}
              width="100%"
              previewConfig={{ showPreview: false }}
              searchDisabled
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-end space-x-2">
          {/* File Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <FiImage className="h-5 w-5" />
          </button>

          {/* Emoji Picker Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Add emoji"
          >
            <FiSmile className="h-5 w-5" />
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain"
            className="hidden"
          />

          {/* Message Input */}
          <div className="flex-1 bg-gray-700 rounded-lg border border-gray-600 focus-within:border-blue-500 transition-colors">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-transparent text-white px-3 py-2 text-sm focus:outline-none"
              disabled={uploadingFile}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage(inputMessage.trim())}
            disabled={!inputMessage.trim() || uploadingFile}
            className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <FiSend className="h-5 w-5" />
          </button>
        </div>

        {/* File Type Hint */}
        <div className="text-xs text-gray-400 mt-2 text-center">
          Supports: Images, PDF, Text files (Max 5MB)
        </div>
      </div>
    </div>
  );
};

export default MobileChatView;