let processedChunks = [];
let totalSize = 0;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'PROCESS_CHUNK':
        await processChunk(payload);
        break;
        
      case 'COMBINE_AND_PREPARE':
        const result = await combineChunks(payload);
        self.postMessage({
          type: 'RECORDING_READY',
          payload: result
        });
        break;
        
      case 'GET_STATS':
        self.postMessage({
          type: 'STATS',
          payload: {
            chunksProcessed: processedChunks.length,
            totalSize,
            averageSize: processedChunks.length > 0 
              ? Math.round(totalSize / processedChunks.length) 
              : 0
          }
        });
        break;
        
      case 'CLEANUP':
        processedChunks = [];
        totalSize = 0;
        self.postMessage({ type: 'CLEANUP_COMPLETE' });
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message, type }
    });
  }
};

async function processChunk({ buffer, timestamp, index }) {
  try {
    // Simple processing
    processedChunks.push({
      buffer,
      timestamp,
      index,
      size: buffer.byteLength
    });
    
    totalSize += buffer.byteLength;
    
    // Send progress every 5 chunks
    if (processedChunks.length % 5 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        payload: {
          processed: processedChunks.length,
          totalSize
        }
      });
    }
  } catch (error) {
    console.error('Chunk processing error:', error);
    throw error;
  }
}

async function combineChunks({ mimeType, duration, buffer }) {
  try {
    // If we have buffer directly, use it
    if (buffer) {
      const blob = new Blob([buffer], { type: mimeType });
      return {
        blob,
        duration,
        totalChunks: 1,
        totalSize: buffer.byteLength,
        mimeType
      };
    }
    
    // Otherwise process chunks
    processedChunks.sort((a, b) => a.index - b.index);
    
    const totalLength = processedChunks.reduce((sum, chunk) => sum + chunk.buffer.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of processedChunks) {
      combinedBuffer.set(new Uint8Array(chunk.buffer), offset);
      offset += chunk.buffer.byteLength;
    }
    
    const blob = new Blob([combinedBuffer], { type: mimeType });
    
    return {
      blob,
      duration,
      totalChunks: processedChunks.length,
      totalSize,
      mimeType
    };
  } catch (error) {
    throw new Error(`Combine failed: ${error.message}`);
  }
}