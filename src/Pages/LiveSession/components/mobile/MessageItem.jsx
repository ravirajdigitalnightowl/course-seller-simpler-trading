import React from 'react';

const MessageItem = ({ message, isOwnMessage }) => {
  return (
    <div className={`flex flex-col max-w-[90%] ${isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"}`}>
      <span className="text-xs text-gray-400 mb-1">
        {message.name || "User"}
      </span>
      <div
        className={`px-3 py-2 rounded-2xl text-sm ${
          isOwnMessage
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-100"
        }`}
      >
        {message.message}
      </div>
    </div>
  );
};

export default MessageItem;