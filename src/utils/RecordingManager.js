import { toast } from 'react-toastify';

export class RecordingManager {
  constructor() {
    this.recordingWorker = null;
    this.processingWorker = null;
    this.isInitialized = false;
    this.recordingStartTime = null;
    this.onProgressCallback = null;
    this.mediaRecorder = null;
    this.recordingStream = null;
    this.chunks = [];
    this.audioContext = null;
    this.audioDestination = null;
    this.audioSources = new Map();
  }

  // Initialize workers (for processing only)
  async initialize() {
    try {
      console.log('🎬 Initializing RecordingManager...');
      
      // Only processing worker (no recording worker)
      this.processingWorker = new Worker(new URL('../workers/processingWorker.js', import.meta.url));
      
      // Setup error handlers
      this.setupErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ RecordingManager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize RecordingManager:', error);
      return false;
    }
  }

  setupErrorHandlers() {
    const handleWorkerError = (workerName, error) => {
      console.error(`${workerName} error:`, error);
      toast.error(`${workerName} error: ${error.message || error}`);
    };

    if (this.processingWorker) {
      this.processingWorker.onerror = (e) => handleWorkerError('ProcessingWorker', e);
    }
  }

  // Audio mixing in main thread
  mixAudioInMainThread({ screenStream, micStream, viewerAudios }) {
    try {
      console.log('🎵 Mixing audio in main thread...');
      
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.audioDestination = this.audioContext.createMediaStreamDestination();
      
      // Mix microphone
      if (micStream?.getAudioTracks().length > 0) {
        const micSource = this.audioContext.createMediaStreamSource(
          new MediaStream([micStream.getAudioTracks()[0]])
        );
        const micGain = this.audioContext.createGain();
        micGain.gain.value = 1.0;
        micSource.connect(micGain).connect(this.audioDestination);
        this.audioSources.set('mic', { source: micSource, gain: micGain });
      }

      // Mix screen audio
      if (screenStream?.getAudioTracks().length > 0) {
        const screenSource = this.audioContext.createMediaStreamSource(
          new MediaStream([screenStream.getAudioTracks()[0]])
        );
        const screenGain = this.audioContext.createGain();
        screenGain.gain.value = 0.8;
        screenSource.connect(screenGain).connect(this.audioDestination);
        this.audioSources.set('screen-audio', { source: screenSource, gain: screenGain });
      }

      // Mix viewer audios
      if (viewerAudios.size > 0) {
        viewerAudios.forEach((stream, userId) => {
          if (stream?.getAudioTracks().length > 0) {
            try {
              const viewerSource = this.audioContext.createMediaStreamSource(
                new MediaStream([stream.getAudioTracks()[0]])
              );
              const viewerGain = this.audioContext.createGain();
              viewerGain.gain.value = 1.0;
              viewerSource.connect(viewerGain).connect(this.audioDestination);
              this.audioSources.set(`viewer-${userId}`, { 
                source: viewerSource, 
                gain: viewerGain 
              });
            } catch (err) {
              console.warn(`Could not mix viewer ${userId} audio:`, err);
            }
          }
        });
      }

      // Get mixed audio track
      const mixedAudioTrack = this.audioDestination.stream.getAudioTracks()[0];
      
      if (mixedAudioTrack && 'contentHint' in mixedAudioTrack) {
        mixedAudioTrack.contentHint = 'speech';
      }
      
      console.log('✅ Audio mixed successfully in main thread');
      return mixedAudioTrack;
      
    } catch (error) {
      console.error('❌ Audio mixing failed:', error);
      return null;
    }
  }

  // Start recording in MAIN THREAD (no worker)
  async startRecording({
    screenStream,
    micStream,
    viewerAudios = new Map(),
    options = {}
  }) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🎬 Starting recording in MAIN THREAD...');
      
      // Step 1: Mix all audio in main thread
      const mixedAudioTrack = this.mixAudioInMainThread({
        screenStream,
        micStream,
        viewerAudios
      });

      // Step 2: Create recording stream
      this.recordingStream = new MediaStream();
      
      // Add screen video
      const videoTrack = screenStream?.getVideoTracks()[0];
      if (videoTrack) {
        this.recordingStream.addTrack(videoTrack);
        console.log('📹 Video track added:', videoTrack.id);
      }

      // Add mixed audio (if available)
      if (mixedAudioTrack) {
        this.recordingStream.addTrack(mixedAudioTrack);
        console.log('🎵 Audio track added:', mixedAudioTrack.id);
      }

      // Step 3: Start recording in MAIN THREAD
      await this.startRecordingInMainThread(options);
      
      this.recordingStartTime = Date.now();
      console.log('✅ Recording started in main thread');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async startRecordingInMainThread(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎬 Initializing MediaRecorder in main thread...');
        
        // Check if we have tracks
        if (!this.recordingStream || this.recordingStream.getTracks().length === 0) {
          throw new Error('No tracks available for recording');
        }
        
        console.log(`📊 Tracks in recording stream: ${this.recordingStream.getTracks().length}`);
        this.recordingStream.getTracks().forEach((track, i) => {
          console.log(`Track ${i}: ${track.kind} - ${track.id} - ${track.readyState}`);
        });

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

        console.log(`🎯 Using mime type: ${selectedType || 'video/webm'}`);

        // Create MediaRecorder
        this.mediaRecorder = new MediaRecorder(this.recordingStream, {
          mimeType: selectedType || 'video/webm',
          videoBitsPerSecond: 2500000,
          audioBitsPerSecond: 128000,
        });

        this.chunks = [];
        
        // Setup event handlers
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.chunks.push(event.data);
            
            // Call progress callback
            if (this.onProgressCallback) {
              this.onProgressCallback({
                chunksCount: this.chunks.length,
                totalSize: this.chunks.reduce((sum, chunk) => sum + chunk.size, 0),
                time: Date.now()
              });
            }
          }
        };

        this.mediaRecorder.onstop = () => {
          console.log('⏹️ Recording stopped');
          const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType || 'video/webm' });
          
          // Auto-process and resolve
          this.processRecording(blob, Date.now() - this.recordingStartTime)
            .then(processedBlob => {
              if (this.onRecordingComplete) {
                this.onRecordingComplete({
                  blob: processedBlob,
                  duration: Date.now() - this.recordingStartTime,
                  chunksCount: this.chunks.length,
                  mimeType: this.mediaRecorder.mimeType
                });
              }
            })
            .catch(error => {
              console.warn('Processing failed:', error);
            });
        };

        this.mediaRecorder.onerror = (error) => {
          console.error('❌ MediaRecorder error:', error);
          reject(error);
        };

        this.mediaRecorder.onstart = () => {
          console.log('✅ Recording started successfully');
          resolve(true);
        };

        // Start recording
        console.log('▶️ Starting MediaRecorder...');
        this.mediaRecorder.start(options.timeSlice || 2000);
        
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        reject(error);
      }
    });
  }

  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  setRecordingCompleteCallback(callback) {
    this.onRecordingComplete = callback;
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recording is not active'));
        return;
      }

      console.log('⏹️ Stopping recording...');
      
      // Set completion handler
      this.onRecordingComplete = (result) => {
        console.log('✅ Recording completed');
        resolve(result);
        this.onRecordingComplete = null;
      };

      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        } else {
          // If already stopped, process existing chunks
          const blob = new Blob(this.chunks, { 
            type: this.mediaRecorder.mimeType || 'video/webm' 
          });
          
          this.processRecording(blob, Date.now() - this.recordingStartTime)
            .then(processedBlob => {
              resolve({
                blob: processedBlob,
                duration: Date.now() - this.recordingStartTime,
                chunksCount: this.chunks.length,
                mimeType: this.mediaRecorder.mimeType
              });
            });
        }
      } catch (error) {
        console.error('❌ Error stopping recording:', error);
        reject(error);
      }
    });
  }

  async processRecording(blob, duration) {
    if (!this.processingWorker) {
      console.log('⚠️ No processing worker, returning original blob');
      return blob;
    }

    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const { type, payload } = e.data;
        
        if (type === 'RECORDING_READY') {
          this.processingWorker.removeEventListener('message', handler);
          console.log('✅ Recording processed successfully');
          resolve(payload.blob);
        } else if (type === 'ERROR') {
          this.processingWorker.removeEventListener('message', handler);
          console.warn('❌ Processing failed, using original blob');
          resolve(blob); // Return original blob if processing fails
        }
      };

      this.processingWorker.addEventListener('message', handler);

      // Convert blob to array buffer
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        
        // Create array buffer view for transfer
        const buffer = arrayBuffer.slice(0);
        
        this.processingWorker.postMessage({
          type: 'COMBINE_AND_PREPARE',
          payload: {
            mimeType: blob.type,
            duration: duration,
            buffer: buffer
          }
        }, [buffer]);  // Transfer buffer
      };
      
      reader.onerror = () => {
        console.warn('❌ Failed to read blob for processing');
        resolve(blob);
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  async getRecordingStats() {
    return {
      state: this.mediaRecorder?.state || 'inactive',
      mimeType: this.mediaRecorder?.mimeType,
      chunksCount: this.chunks.length,
      totalSize: this.chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      tracksCount: this.recordingStream?.getTracks().length || 0,
      duration: this.recordingStartTime ? Date.now() - this.recordingStartTime : 0
    };
  }

  cleanup() {
    console.log('🧹 Cleaning up RecordingManager...');
    
    // Stop recording if active
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping media recorder:', error);
      }
    }
    
    // Cleanup audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioDestination = null;
    this.audioSources.clear();
    
    // Stop all recording tracks
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping track:', error);
        }
      });
      this.recordingStream = null;
    }
    
    // Terminate processing worker
    if (this.processingWorker) {
      this.processingWorker.postMessage({ type: 'CLEANUP' });
      setTimeout(() => {
        this.processingWorker.terminate();
      }, 100);
    }
    
    // Reset all properties
    this.mediaRecorder = null;
    this.chunks = [];
    this.processingWorker = null;
    this.isInitialized = false;
    this.recordingStartTime = null;
    this.onProgressCallback = null;
    this.onRecordingComplete = null;
    
    console.log('✅ RecordingManager cleaned up');
  }
}