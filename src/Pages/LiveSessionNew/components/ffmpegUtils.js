// utils/ffmpegUtils.js
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// FFmpeg instance
let ffmpeg = null;
let isFFmpegLoaded = false;

// ✅ CORRECTED FFmpeg URLs
export const loadFFmpeg = async () => {
  if (!isFFmpegLoaded) {
    console.log('🔄 FFmpeg loading...');
    try {
      ffmpeg = new FFmpeg();
      
      // ✅ UPDATED URLs - नए version के लिए
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      
      isFFmpegLoaded = true;
      console.log('✅ FFmpeg loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ FFmpeg load failed:', error);
      
      // Fallback: Try alternative URLs
      try {
        console.log('🔄 Trying alternative URLs...');
        ffmpeg = new FFmpeg();
        
        await ffmpeg.load({
          coreURL: await toBlobURL(
            '/ffmpeg/ffmpeg-core.js',
            'text/javascript'
          ),
          wasmURL: await toBlobURL(
            '/ffmpeg/ffmpeg-core.wasm',
            'application/wasm'
          ),
        });
        
        isFFmpegLoaded = true;
        console.log('✅ FFmpeg loaded via alternative URLs');
        return true;
      } catch (fallbackError) {
        console.error('❌ All FFmpeg loading attempts failed');
        throw fallbackError;
      }
    }
  }
  return true;
};

// ✅ IMPROVED WebM to MP4 conversion
export const convertWebmToMp4 = async (webmBlob, onProgress = null) => {
  try {
    console.log('🔄 Converting WebM to MP4...');
    console.log(`📊 Input size: ${(webmBlob.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // Ensure FFmpeg is loaded
    if (!isFFmpegLoaded) {
      await loadFFmpeg();
    }
    
    const inputFileName = 'input.webm';
    const outputFileName = 'output.mp4';
    
    // Setup progress monitoring
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        console.log(`📈 Conversion progress: ${percent}%`);
        onProgress(percent);
      });
    }
    
    // Setup logging
    ffmpeg.on('log', ({ type, message }) => {
      if (type === 'fferr') {
        console.warn('FFmpeg error:', message);
      } else {
        console.log('FFmpeg log:', message);
      }
    });
    
    // Write input file
    console.log('📝 Writing input file...');
    await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));
    
    // ✅ SIMPLIFIED CONVERSION COMMAND - More reliable
    console.log('⚙️ Starting conversion...');
    await ffmpeg.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',        // Video codec
      '-preset', 'veryfast',    // Faster encoding
      '-crf', '28',             // Good quality
      '-c:a', 'aac',            // Audio codec
      '-b:a', '128k',           // Audio bitrate
      '-f', 'mp4',              // Force MP4 format
      '-y',                     // Overwrite output
      outputFileName
    ]);
    
    // Read output file
    console.log('📖 Reading output file...');
    const data = await ffmpeg.readFile(outputFileName);
    
    // Create MP4 blob
    const mp4Blob = new Blob([data.buffer], { 
      type: 'video/mp4' 
    });
    
    console.log(`✅ Conversion successful: ${(mp4Blob.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }
    
    return mp4Blob;
    
  } catch (error) {
    console.error('❌ Conversion error:', error);
    
    // Provide detailed error message
    let errorMessage = 'Conversion failed';
    if (error.message.includes('not loaded')) {
      errorMessage = 'FFmpeg not loaded properly';
    } else if (error.message.includes('command failed')) {
      errorMessage = 'FFmpeg command failed';
    } else if (error.message.includes('writeFile')) {
      errorMessage = 'Failed to write input file';
    }
    
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

// ✅ ALTERNATIVE: Browser-based conversion (no FFmpeg)
export const browserConvertWebmToMp4 = async (webmBlob) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔄 Using browser conversion...');
      
      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      // Create canvas for re-encoding
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create media source
      const videoURL = URL.createObjectURL(webmBlob);
      video.src = videoURL;
      
      video.onloadedmetadata = () => {
        try {
          // Set canvas dimensions
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Create MediaRecorder with MP4 support
          const stream = canvas.captureStream(30);
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/mp4;codecs=avc1,mp4a',
            videoBitsPerSecond: 2500000
          });
          
          const chunks = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const mp4Blob = new Blob(chunks, { type: 'video/mp4' });
            URL.revokeObjectURL(videoURL);
            console.log(`✅ Browser conversion: ${(mp4Blob.size / (1024 * 1024)).toFixed(2)}MB`);
            resolve(mp4Blob);
          };
          
          // Draw frames
          let frameCount = 0;
          const drawFrame = () => {
            if (frameCount >= 300) { // 10 seconds at 30fps
              mediaRecorder.stop();
              return;
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frameCount++;
            
            // Continue drawing
            if (video.currentTime < video.duration) {
              video.currentTime += 0.033; // ~30fps
              setTimeout(drawFrame, 33);
            } else {
              mediaRecorder.stop();
            }
          };
          
          // Start recording
          mediaRecorder.start(1000);
          video.currentTime = 0;
          drawFrame();
          
        } catch (error) {
          URL.revokeObjectURL(videoURL);
          reject(error);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(videoURL);
        reject(new Error('Video load error'));
      };
      
    } catch (error) {
      reject(error);
    }
  });
};

// ✅ FALLBACK conversion (just change extension)
export const simpleConversion = async (webmBlob) => {
  console.log('⚠️ Using simple conversion (extension change only)');
  
  // Create a copy with MP4 extension
  const mp4Blob = new Blob([webmBlob], { 
    type: 'video/mp4' 
  });
  
  console.log(`📊 Output size: ${(mp4Blob.size / (1024 * 1024)).toFixed(2)}MB`);
  return mp4Blob;
};

// ✅ Format detection
export const getSupportedFormat = () => {
  // Test for MP4 support
  const mp4Support = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a');
  const webmSupport = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus');
  
  console.log(`🎬 Format support - MP4: ${mp4Support}, WebM: ${webmSupport}`);
  
  if (mp4Support) {
    return 'mp4';
  } else if (webmSupport) {
    return 'webm';
  } else {
    // Default to WebM (most browsers support it)
    return 'webm';
  }
};

// ✅ Check if browser supports recording
export const checkRecordingSupport = () => {
  const supports = {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    getDisplayMedia: 'getDisplayMedia' in navigator.mediaDevices || 
                    'getDisplayMedia' in navigator,
    mp4: MediaRecorder.isTypeSupported?.('video/mp4;codecs=avc1,mp4a') || false,
    webm: MediaRecorder.isTypeSupported?.('video/webm;codecs=vp9,opus') || false
  };
  
  console.log('🔍 Recording support:', supports);
  return supports;
};

// ✅ Preload FFmpeg
export const preloadFFmpeg = async () => {
  try {
    if (!isFFmpegLoaded) {
      await loadFFmpeg();
      console.log('✅ FFmpeg preloaded successfully');
      return true;
    }
    return true;
  } catch (error) {
    console.warn('⚠️ FFmpeg preload failed:', error);
    return false;
  }
};

// ✅ Get conversion method based on support
export const getConversionMethod = () => {
  const supports = checkRecordingSupport();
  
  if (supports.mediaRecorder && supports.mp4) {
    return 'direct'; // Browser supports MP4 directly
  } else if (isFFmpegLoaded) {
    return 'ffmpeg'; // Use FFmpeg conversion
  } else {
    return 'simple'; // Simple fallback
  }
};