let mediaRecorder = null;
let chunks = [];
let recordingStartTime = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'INIT_RECORDER':
        await initRecorder(payload);
        break;

      case 'ADD_TRACK':
        await addTrack(payload);
        break;

      case 'START_RECORDING':
        startRecording(payload);
        break;

      case 'STOP_RECORDING':
        const result = await stopRecording();
        self.postMessage({ type: 'RECORDING_STOPPED', payload: result });
        break;

      case 'GET_RECORDING_STATS':
        getRecordingStats();
        break;

      case 'CLEANUP':
        cleanup();
        break;
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      payload: { error: error.message, type } 
    });
  }
};

async function initRecorder(payload) {
  try {
    // Create MediaStream in worker
    const stream = new MediaStream();
    
    // Apply video optimizations if needed
    if (payload.videoConstraints) {
      // You can apply constraints here if needed
    }

    // Mime types priority list
    const mimeTypes = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    let selectedType = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedType = mime;
        break;
      }
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedType || 'video/webm',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    chunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        
        // Periodic progress update
        self.postMessage({
          type: 'RECORDING_PROGRESS',
          payload: {
            chunksCount: chunks.length,
            totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
            time: Date.now()
          }
        });
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedType || 'video/webm' });
      self.postMessage({
        type: 'RECORDING_COMPLETE',
        payload: { 
          blob,
          chunksCount: chunks.length,
          mimeType: selectedType 
        }
      });
    };

    mediaRecorder.onerror = (error) => {
      self.postMessage({ type: 'RECORDING_ERROR', payload: error.message });
    };

    recordingStartTime = Date.now();
    
    self.postMessage({ 
      type: 'RECORDER_INITIALIZED',
      payload: { streamId: stream.id }
    });

  } catch (error) {
    self.postMessage({ type: 'INIT_ERROR', payload: error.message });
  }
}

async function addTrack({ track, kind, label }) {
  try {
    if (!mediaRecorder || !mediaRecorder.stream) {
      throw new Error('Recorder not initialized');
    }

    // Add track to the MediaStream
    mediaRecorder.stream.addTrack(track);
    
    // Apply content hints
    if ('contentHint' in track) {
      if (track.kind === 'video') {
        track.contentHint = 'motion';
      } else if (track.kind === 'audio') {
        track.contentHint = kind === 'screen-audio' ? 'music' : 'speech';
      }
    }

    self.postMessage({ 
      type: 'TRACK_ADDED', 
      payload: { kind, label, trackId: track.id }
    });
  } catch (error) {
    self.postMessage({ type: 'ADD_TRACK_ERROR', payload: error.message });
  }
}

function startRecording(options = {}) {
  if (!mediaRecorder) {
    self.postMessage({ type: 'ERROR', payload: 'Recorder not initialized' });
    return;
  }

  try {
    // Check if we have at least one track
    if (mediaRecorder.stream.getTracks().length === 0) {
      self.postMessage({ type: 'ERROR', payload: 'No tracks available for recording' });
      return;
    }

    // Start with time slice for better performance
    mediaRecorder.start(options.timeSlice || 2000);
    self.postMessage({ type: 'RECORDING_STARTED' });
  } catch (error) {
    self.postMessage({ type: 'START_ERROR', payload: error.message });
  }
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return { success: false, error: 'Recorder not active' };
  }

  return new Promise((resolve) => {
    const onStop = () => {
      const blob = new Blob(chunks, { 
        type: mediaRecorder.mimeType || 'video/webm' 
      });
      
      resolve({
        success: true,
        blob,
        chunksCount: chunks.length,
        mimeType: mediaRecorder.mimeType,
        duration: Date.now() - recordingStartTime
      });
    };

    if (mediaRecorder.state === 'recording') {
      mediaRecorder.addEventListener('stop', onStop, { once: true });
      mediaRecorder.stop();
    } else {
      onStop();
    }
  });
}

function getRecordingStats() {
  const stats = {
    state: mediaRecorder?.state || 'inactive',
    mimeType: mediaRecorder?.mimeType,
    chunksCount: chunks.length,
    totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
    tracksCount: mediaRecorder?.stream?.getTracks().length || 0
  };
  
  self.postMessage({ type: 'RECORDING_STATS', payload: stats });
}

function cleanup() {
  if (mediaRecorder) {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    // Stop all tracks
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
  
  chunks = [];
  mediaRecorder = null;
  recordingStartTime = null;
}