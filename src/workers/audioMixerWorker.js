class AudioMixer {
  constructor() {
    this.audioContext = null;
    this.sources = new Map();
    this.destination = null;
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.destination = this.audioContext.createMediaStreamDestination();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addTrack(streamId, track, options = {}) {
    if (!this.audioContext) await this.init();

    try {
      // Create MediaStream from single track
      const stream = new MediaStream([track]);
      const source = this.audioContext.createMediaStreamSource(stream);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = options.volume || 1.0;
      
      source.connect(gainNode);
      gainNode.connect(this.destination);
      
      this.sources.set(streamId, { source, gainNode, track });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  removeStream(streamId) {
    const source = this.sources.get(streamId);
    if (source) {
      source.source.disconnect();
      source.gainNode.disconnect();
      this.sources.delete(streamId);
    }
  }

  setVolume(streamId, volume) {
    const source = this.sources.get(streamId);
    if (source && source.gainNode) {
      source.gainNode.gain.value = volume;
    }
  }

  getMixedStream() {
    return this.destination ? this.destination.stream : null;
  }

  cleanup() {
    this.sources.forEach(source => {
      source.source.disconnect();
      source.gainNode.disconnect();
    });
    this.sources.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.destination = null;
  }
}

const mixer = new AudioMixer();

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'INIT_MIXER':
        const result = await mixer.init();
        self.postMessage({ type: 'MIXER_INITIALIZED', payload: result });
        break;

      case 'ADD_TRACK':
        const addResult = await mixer.addTrack(payload.streamId, payload.track, payload.options);
        self.postMessage({ type: 'TRACK_ADDED', payload: addResult });
        break;

      case 'REMOVE_STREAM':
        mixer.removeStream(payload.streamId);
        self.postMessage({ type: 'STREAM_REMOVED', payload: { streamId: payload.streamId } });
        break;

      case 'SET_VOLUME':
        mixer.setVolume(payload.streamId, payload.volume);
        self.postMessage({ type: 'VOLUME_SET', payload: { streamId: payload.streamId } });
        break;

      case 'GET_MIXED_STREAM':
        const stream = mixer.getMixedStream();
        if (stream && stream.getAudioTracks().length > 0) {
          const audioTrack = stream.getAudioTracks()[0];
          // Clone the track to avoid transfer issues
          const trackClone = audioTrack.clone();
          self.postMessage({ 
            type: 'MIXED_STREAM', 
            payload: { audioTrack: trackClone } 
          }, [trackClone]);
        } else {
          self.postMessage({ 
            type: 'ERROR', 
            payload: { error: 'No mixed audio available' } 
          });
        }
        break;

      case 'CLEANUP_MIXER':
        mixer.cleanup();
        self.postMessage({ type: 'MIXER_CLEANED' });
        break;

      default:
        self.postMessage({ 
          type: 'ERROR', 
          payload: { error: `Unknown message type: ${type}` } 
        });
    }
  } catch (error) {
    console.error('AudioMixer Worker Error:', error);
    self.postMessage({ 
      type: 'ERROR', 
      payload: { 
        error: error.message, 
        type: 'AUDIO_MIXER_ERROR'
      } 
    });
  }
};