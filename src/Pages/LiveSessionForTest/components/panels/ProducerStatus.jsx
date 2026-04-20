import React from 'react';

const ProducerStatus = ({ producersState }) => {
  const producersArray = Array.from(producersState.values());
  
  if (producersArray.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute top-12 left-2 bg-black bg-opacity-70 text-xs text-white p-2 rounded">
      <div className="font-semibold mb-1">Producers:</div>
      {producersArray.map(producer => (
        <div key={producer.id} className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${producer.paused ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span>{producer.source}</span>
          <span className="text-gray-400">({producer.kind})</span>
        </div>
      ))}
    </div>
  );
};

export default ProducerStatus;