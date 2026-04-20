// public/RecordingWorker.js (या src/workers/RecordingWorker.js)
let recorder = null;
let chunks = [];

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch(type) {
    case 'start':
      startRecording(data.streams, data.options);
      break;
      
    case 'stop':
      stopRecording();
      break;
      
    case 'pause':
      if (recorder && recorder.state === 'recording') {
        recorder.pause();
      }
      break;
      
    case 'resume':
      if (recorder && recorder.state === 'paused') {
        recorder.resume();
      }
      break;
  }
};

async function startRecording(streams, options) {
  try {
    // 1. Combine all streams (सिर्फ video + audio tracks)
    const videoTracks = [];
    const audioTracks = [];
    
    streams.forEach(stream => {
      videoTracks.push(...stream.getVideoTracks());
      audioTracks.push(...stream.getAudioTracks());
    });
    
    // 2. Create final recording stream
    const recordingStream = new MediaStream([
      ...videoTracks,
      ...audioTracks  // Direct tracks - NO MIXING in worker
    ]);
    
    // 3. Start MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus') 
      ? 'video/webm;codecs=h264,opus' 
      : 'video/webm';
    
    recorder = new MediaRecorder(recordingStream, {
      mimeType,
      videoBitsPerSecond: 2000000,
      audioBitsPerSecond: 128000,
      ...options
    });
    
    chunks = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        
        // Send progress update to main thread
        self.postMessage({
          type: 'progress',
          chunkSize: event.data.size,
          totalChunks: chunks.length,
          totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0)
        });
      }
    };
    
    recorder.onstop = async () => {
      // Create final blob
      const blob = new Blob(chunks, { type: mimeType });
      
      // Send blob back to main thread
      self.postMessage({
        type: 'complete',
        blob: blob
      }, [blob]); // Transfer blob for better performance
      
      // Cleanup
      chunks = [];
      recorder = null;
    };
    
    recorder.onerror = (error) => {
      self.postMessage({
        type: 'error',
        error: error.message || 'Recording failed'
      });
    };
    
    // Start recording with 2-second chunks
    recorder.start(2000);
    
    self.postMessage({ type: 'started' });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
  }
}