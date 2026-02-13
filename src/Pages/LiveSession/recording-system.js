export class RecordingSystem {
  constructor() {
    this.audioMixerWorker = null;
    this.mediaRecorderWorker = null;
    this.processorWorker = null;
    this.isInitialized = false;
    this.recordingStartTime = null;
  }

  async initialize() {
    try {
      console.log('🎬 Initializing recording system...');
      
      // Load workers (अलग-अलग files)
      this.audioMixerWorker = new Worker('audio-mixer.worker.js', { type: 'module' });
      this.mediaRecorderWorker = new Worker('media-recorder.worker.js', { type: 'module' });
      this.processorWorker = new Worker('recording-processor.worker.js', { type: 'module' });
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      console.log('✅ Recording system initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize recording system:', error);
      return false;
    }
  }

  setupMessageHandlers() {
    // Audio mixer worker handlers
    this.audioMixerWorker.onmessage = (e) => {
      const { type, payload } = e.data;
      
      if (type === 'ERROR') {
        console.error('Audio Mixer Error:', payload);
      }
    };

    // Media recorder worker handlers
    this.mediaRecorderWorker.onmessage = (e) => {
      const { type, payload } = e.data;
      
      if (type === 'RECORDING_PROGRESS') {
        // Send progress updates to main thread if needed
        self.postMessage({ type: 'RECORDING_PROGRESS', payload });
      } else if (type === 'ERROR') {
        console.error('Media Recorder Error:', payload);
      }
    };
  }

  async startRecording({ 
    screenStream, 
    micStream, 
    viewerAudios,
    options = {} 
  }) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🎬 Starting recording process...');
      
      // Step 1: Mix all audio sources
      const mixedAudio = await this.mixAllAudio({
        screenStream,
        micStream,
        viewerAudios
      });

      // Step 2: Create recording stream
      const recordingStream = new MediaStream();
      
      // Add screen video
      if (screenStream?.getVideoTracks()[0]) {
        recordingStream.addTrack(screenStream.getVideoTracks()[0]);
      }
      
      // Add mixed audio
      if (mixedAudio) {
        recordingStream.addTrack(mixedAudio);
      }

      // Step 3: Start recording in worker
      await this.startWorkerRecording(recordingStream, options);
      
      this.recordingStartTime = Date.now();
      console.log('✅ Recording started in worker');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async mixAllAudio({ screenStream, micStream, viewerAudios }) {
    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'MIXED_STREAM') {
          this.audioMixerWorker.removeEventListener('message', handler);
          resolve(payload.audioTrack);
        } else if (type === 'ERROR') {
          this.audioMixerWorker.removeEventListener('message', handler);
          reject(payload.error);
        }
      };

      this.audioMixerWorker.addEventListener('message', handler);

      // Initialize audio mixer
      this.audioMixerWorker.postMessage({ type: 'INIT_MIXER' });

      // Add audio sources
      const sources = [];

      // Add microphone audio
      if (micStream?.getAudioTracks()[0]) {
        sources.push({
          streamId: 'mic',
          stream: new MediaStream([micStream.getAudioTracks()[0]]),
          options: { volume: 1.0 }
        });
      }

      // Add screen audio
      if (screenStream?.getAudioTracks()[0]) {
        sources.push({
          streamId: 'screen-audio',
          stream: new MediaStream([screenStream.getAudioTracks()[0]]),
          options: { volume: 0.8 }
        });
      }

      // Add viewer audios
      if (viewerAudios && viewerAudios.size > 0) {
        viewerAudios.forEach((stream, userId) => {
          if (stream?.getAudioTracks()[0]) {
            sources.push({
              streamId: `viewer-${userId}`,
              stream: new MediaStream([stream.getAudioTracks()[0]]),
              options: { volume: 1.0 }
            });
          }
        });
      }

      // Send all sources to mixer
      sources.forEach(source => {
        this.audioMixerWorker.postMessage({
          type: 'ADD_STREAM',
          payload: source
        });
      });

      // Get mixed audio
      this.audioMixerWorker.postMessage({ type: 'GET_MIXED_STREAM' });
    });
  }

  async startWorkerRecording(recordingStream, options) {
    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'RECORDER_INITIALIZED') {
          // Add video track
          const videoTrack = recordingStream.getVideoTracks()[0];
          if (videoTrack) {
            this.mediaRecorderWorker.postMessage({
              type: 'ADD_TRACK',
              payload: {
                track: videoTrack,
                kind: 'video',
                label: 'screen-video'
              }
            });
          }

          // Add audio track
          const audioTrack = recordingStream.getAudioTracks()[0];
          if (audioTrack) {
            this.mediaRecorderWorker.postMessage({
              type: 'ADD_TRACK',
              payload: {
                track: audioTrack,
                kind: 'audio',
                label: 'mixed-audio'
              }
            });
          }

          // Start recording
          setTimeout(() => {
            this.mediaRecorderWorker.postMessage({
              type: 'START_RECORDING',
              payload: { 
                timeSlice: options.timeSlice || 2000,
                videoConstraints: options.videoConstraints
              }
            });
            
            resolve(true);
          }, 100);
          
        } else if (type === 'ERROR') {
          this.mediaRecorderWorker.removeEventListener('message', handler);
          reject(payload);
        }
      };

      this.mediaRecorderWorker.addEventListener('message', handler);

      // Initialize recorder with constraints
      this.mediaRecorderWorker.postMessage({
        type: 'INIT_RECORDER',
        payload: {
          videoConstraints: options.videoConstraints || {
            frameRate: { ideal: 30, max: 30 },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        }
      });
    });
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'RECORDING_COMPLETE') {
          this.mediaRecorderWorker.removeEventListener('message', handler);
          
          // Process the recording
          this.processRecording(payload.blob)
            .then(processedBlob => {
              resolve({
                blob: processedBlob,
                duration: Date.now() - this.recordingStartTime,
                chunksCount: payload.chunksCount,
                mimeType: payload.mimeType
              });
            })
            .catch(error => {
              console.warn('Processing failed, using original:', error);
              resolve({
                blob: payload.blob,
                duration: Date.now() - this.recordingStartTime,
                chunksCount: payload.chunksCount,
                mimeType: payload.mimeType
              });
            });
            
        } else if (type === 'ERROR') {
          this.mediaRecorderWorker.removeEventListener('message', handler);
          reject(payload);
        }
      };

      this.mediaRecorderWorker.addEventListener('message', handler);
      this.mediaRecorderWorker.postMessage({ type: 'STOP_RECORDING' });
    });
  }

  async processRecording(blob) {
    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'RECORDING_READY') {
          this.processorWorker.removeEventListener('message', handler);
          resolve(payload.blob);
        } else if (type === 'ERROR') {
          this.processorWorker.removeEventListener('message', handler);
          reject(payload);
        }
      };

      this.processorWorker.addEventListener('message', handler);

      // Convert blob to array buffer
      const reader = new FileReader();
      reader.onload = () => {
        // Send to processor worker
        this.processorWorker.postMessage({
          type: 'COMBINE_AND_PREPARE',
          payload: {
            mimeType: blob.type,
            duration: Date.now() - this.recordingStartTime
          }
        });
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  async getStats() {
    return new Promise((resolve) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'STATS') {
          this.mediaRecorderWorker.removeEventListener('message', handler);
          resolve(payload);
        }
      };

      this.mediaRecorderWorker.addEventListener('message', handler);
      this.mediaRecorderWorker.postMessage({ type: 'GET_RECORDING_STATS' });
    });
  }

  cleanup() {
    console.log('🧹 Cleaning up recording system...');
    
    if (this.audioMixerWorker) {
      this.audioMixerWorker.postMessage({ type: 'CLEANUP_MIXER' });
      this.audioMixerWorker.terminate();
      this.audioMixerWorker = null;
    }
    
    if (this.mediaRecorderWorker) {
      this.mediaRecorderWorker.postMessage({ type: 'CLEANUP' });
      this.mediaRecorderWorker.terminate();
      this.mediaRecorderWorker = null;
    }
    
    if (this.processorWorker) {
      this.processorWorker.postMessage({ type: 'CLEANUP' });
      this.processorWorker.terminate();
      this.processorWorker = null;
    }
    
    this.isInitialized = false;
    this.recordingStartTime = null;
    console.log('✅ Recording system cleaned up');
  }
}