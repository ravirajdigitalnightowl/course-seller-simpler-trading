import DeviceDetector from "device-detector-js";

const deviceDetector = new DeviceDetector();

// 📱 iOS Devices (iPhone, iPad) - All Browsers
const getIOSAudioConstraints = (browser) => {
  const baseConstraints = {
    channelCount: 2, // Stereo for better quality
    sampleRate: 48000, // High quality
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    latency: 0.01 // Low latency
  };

  // Browser-specific optimizations for iOS
  const browserSpecific = {
    safari: {
      ...baseConstraints,
      // Safari has excellent native audio processing
      googEchoCancellation: false,
      googNoiseSuppression: false,
      googAutoGainControl: false
    },
    chrome: {
      ...baseConstraints,
      // Chrome on iOS uses WebKit engine
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true
    },
    firefox: {
      ...baseConstraints,
      // Firefox on iOS
      mozAutoGainControl: true,
      mozNoiseSuppression: true,
      mozEchoCancellation: true
    },
    edge: {
      ...baseConstraints,
      // Edge on iOS (WebKit-based)
      googEchoCancellation: true,
      googNoiseSuppression: true
    },
    opera: {
      ...baseConstraints,
      // Opera on iOS
      googEchoCancellation: true,
      googNoiseSuppression: true
    },
    'opera mini': {
      ...baseConstraints,
      // Opera Mini on iOS
      channelCount: 1,
      sampleRate: 44100 // Lower for performance
    },
    brave: {
      ...baseConstraints,
      // Brave on iOS (Chrome-based)
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true
    },
    'uc browser': {
      ...baseConstraints,
      // UC Browser on iOS
      channelCount: 1, // UC Browser often works better with mono
      sampleRate: 44100
    },
    default: baseConstraints
  };

  return browserSpecific[browser] || browserSpecific.default;
};

// 🤖 Android Devices - All Browsers
const getAndroidAudioConstraints = (browser) => {
  const baseConstraints = {
    channelCount: 1, // Most Android devices have mono mics
    sampleRate: 44100, // Standard quality for compatibility
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    googEchoCancellation: true,
    googNoiseSuppression: true,
    googAutoGainControl: true,
    googHighpassFilter: true
  };

  // Browser-specific optimizations for Android
  const browserSpecific = {
    chrome: {
      ...baseConstraints,
      // Chrome on Android - full Google audio processing
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true,
      googNoiseReduction: true
    },
    firefox: {
      ...baseConstraints,
      // Firefox on Android
      mozAutoGainControl: true,
      mozNoiseSuppression: true,
      mozEchoCancellation: true,
      sampleSize: 16
    },
    'samsung internet': {
      ...baseConstraints,
      // Samsung Internet Browser
      googEchoCancellation: true,
      googNoiseSuppression: true,
      sampleRate: 48000 // Samsung devices support higher quality
    },
    edge: {
      ...baseConstraints,
      // Edge on Android
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true
    },
    opera: {
      ...baseConstraints,
      // Opera on Android
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      noiseSuppression: true
    },
    'opera mini': {
      ...baseConstraints,
      // Opera Mini on Android
      channelCount: 1,
      sampleRate: 22050, // Lower for better performance
      echoCancellation: false, // Disable for performance
      noiseSuppression: true
    },
    brave: {
      ...baseConstraints,
      // Brave on Android (Chrome-based)
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true
    },
    'uc browser': {
      ...baseConstraints,
      // UC Browser on Android
      channelCount: 1,
      sampleRate: 22050, // UC Browser works better with lower quality
      echoCancellation: false, // UC Browser has issues with echo cancellation
      noiseSuppression: true
    },
    default: baseConstraints
  };

  return browserSpecific[browser] || browserSpecific.default;
};

// 🖥️ Windows Devices - All Browsers
const getWindowsAudioConstraints = (browser) => {
  const baseConstraints = {
    channelCount: 2, // Most Windows devices support stereo
    sampleRate: 48000, // High quality
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    latency: 0.01
  };

  // Browser-specific optimizations for Windows
  const browserSpecific = {
    chrome: {
      ...baseConstraints,
      // Chrome on Windows
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true,
      googNoiseReduction: true
    },
    firefox: {
      ...baseConstraints,
      // Firefox on Windows
      mozAutoGainControl: true,
      mozNoiseSuppression: true,
      mozEchoCancellation: true,
      sampleSize: 16
    },
    edge: {
      ...baseConstraints,
      // Edge on Windows (Chromium-based)
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true
    },
    opera: {
      ...baseConstraints,
      // Opera on Windows
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true
    },
    brave: {
      ...baseConstraints,
      // Brave on Windows
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true
    },
    safari: {
      ...baseConstraints,
      // Safari on Windows (rare but possible)
      channelCount: 2,
      sampleRate: 44100
    },
    'uc browser': {
      ...baseConstraints,
      // UC Browser on Windows
      channelCount: 1,
      sampleRate: 44100
    },
    default: baseConstraints
  };

  return browserSpecific[browser] || browserSpecific.default;
};

// 🍎 macOS Devices - All Browsers
const getMacOSAudioConstraints = (browser) => {
  const baseConstraints = {
    channelCount: 2, // Macs typically have stereo mics
    sampleRate: 48000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  const browserSpecific = {
    safari: {
      ...baseConstraints,
      // Safari on macOS has excellent audio
      googEchoCancellation: false,
      googNoiseSuppression: false
    },
    chrome: {
      ...baseConstraints,
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true
    },
    firefox: {
      ...baseConstraints,
      mozAutoGainControl: true,
      mozNoiseSuppression: true,
      mozEchoCancellation: true
    },
    edge: {
      ...baseConstraints,
      googEchoCancellation: true,
      googNoiseSuppression: true
    },
    default: baseConstraints
  };

  return browserSpecific[browser] || browserSpecific.default;
};

// 🎧 Enhanced Earphone Detection
export const detectEarphones = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    
    const earphoneKeywords = [
      'bluetooth', 'airpods', 'earphone', 'headphone', 'headset', 
      'earbud', 'galaxy buds', 'sony', 'bose', 'jbl', 'wireless',
      'beats', 'sennheiser', 'audio-technica', 'jabra', 'plantronics',
      'logitech', 'hyperx', 'razer', 'steelseries', 'skullcandy'
    ];
    
    const hasEarphone = audioOutputs.some(device => {
      const label = device.label.toLowerCase();
      return earphoneKeywords.some(keyword => label.includes(keyword));
    });
    
    const isBluetooth = audioOutputs.some(d => 
      d.label.toLowerCase().includes('bluetooth')
    );

    const isWiredHeadphone = audioOutputs.some(d => 
      d.label.toLowerCase().includes('headphone') && 
      !d.label.toLowerCase().includes('bluetooth')
    );
    
    return {
      hasEarphone,
      isBluetooth,
      isWiredHeadphone,
      audioOutputs: audioOutputs.length,
      deviceLabels: audioOutputs.map(d => d.label)
    };
  } catch (error) {
    console.error('Earphone detection failed:', error);
    return { 
      hasEarphone: false, 
      isBluetooth: false,
      isWiredHeadphone: false,
      audioOutputs: 0, 
      deviceLabels: []
    };
  }
};

// 📊 Brand-Specific Device Optimizations
export const getBrandSpecificConstraints = (deviceInfo) => {
  const brand = deviceInfo.device?.brand?.toLowerCase();
  const model = deviceInfo.device?.model?.toLowerCase();
  
  // Known device-specific optimizations
  const deviceOptimizations = {
    // Samsung devices
    'samsung': {
      channelCount: 1, // Most Samsung phones have mono mics
      sampleRate: 44100,
      echoCancellation: true,
      googEchoCancellation: true
    },
    
    // Google Pixel devices
    'google': {
      channelCount: 2, // Pixel devices have good stereo mics
      sampleRate: 48000,
      echoCancellation: true
    },
    
    // OnePlus devices
    'oneplus': {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true
    },
    
    // Xiaomi/Redmi/Poco devices
    'xiaomi': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      autoGainControl: true
    },
    'redmi': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      autoGainControl: true
    },
    'poco': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      autoGainControl: true
    },
    
    // Apple devices
    'apple': {
      channelCount: 2,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true
    },
    
    // LG devices
    'lg': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true
    },
    
    // Motorola devices
    'motorola': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true,
      noiseSuppression: true
    },
    
    // Nokia devices
    'nokia': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true
    },
    
    // Huawei devices
    'huawei': {
      channelCount: 1,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true
    },
    
    // Sony devices
    'sony': {
      channelCount: 2, // Sony often has stereo recording
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true
    },
    
    // Oppo devices
    'oppo': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true
    },
    
    // Vivo devices
    'vivo': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true
    },
    
    // Realme devices
    'realme': {
      channelCount: 1,
      sampleRate: 44100,
      echoCancellation: true
    }
  };

  return deviceOptimizations[brand] || null;
};

// 🎯 Main Optimized Audio Constraints Function
export const getOptimizedAudioConstraints = async () => {
  const userAgent = navigator.userAgent;
  const device = deviceDetector.parse(userAgent);
  
  const os = device.os?.name?.toLowerCase();
  const browser = device.client?.name?.toLowerCase();
  const deviceType = device.device?.type;
  const deviceBrand = device.device?.brand;
  
  console.log('🎧 Audio Optimization Detection:', { 
    os,
    browser, 
    deviceType,
    deviceBrand,
    deviceModel: device.device?.model
  });

  // Get OS-specific constraints
  let constraints;
  if (os?.includes('ios')) {
    constraints = getIOSAudioConstraints(browser);
  } else if (os?.includes('android')) {
    constraints = getAndroidAudioConstraints(browser);
  } else if (os?.includes('windows')) {
    constraints = getWindowsAudioConstraints(browser);
  } else if (os?.includes('mac')) {
    constraints = getMacOSAudioConstraints(browser);
  } else {
    // Default fallback for other OS (Linux, etc.)
    constraints = {
      channelCount: 2,
      sampleRate: 48000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
  }

  // Apply brand-specific optimizations
  const brandConstraints = getBrandSpecificConstraints(device);
  if (brandConstraints) {
    console.log('🎯 Applying brand-specific optimizations for:', deviceBrand);
    constraints = { ...constraints, ...brandConstraints };
  }

  // Apply earphone-specific optimizations
  try {
    const earphoneInfo = await detectEarphones();
    if (earphoneInfo.hasEarphone) {
      console.log('🎧 Earphone detected - applying optimizations:', earphoneInfo);
      
      // Earphone specific optimizations
      constraints.channelCount = 2; // Force stereo for earphones
      constraints.sampleRate = 48000; // High quality for earphones
      
      if (earphoneInfo.isBluetooth) {
        // Bluetooth earphones need special handling
        constraints.latency = 0.02; // Slightly higher latency for BT
        constraints.echoCancellation = true; // Important for BT
      }
      
      if (earphoneInfo.isWiredHeadphone) {
        // Wired headphones can use lower latency
        constraints.latency = 0.01;
      }
    }
  } catch (error) {
    console.warn('⚠️ Earphone detection failed, using default constraints');
  }

  // Final constraints validation
  const finalConstraints = {
    ...constraints,
    // Ensure mandatory constraints
    echoCancellation: constraints.echoCancellation !== false,
    noiseSuppression: constraints.noiseSuppression !== false,
  };

  console.log('🎵 Final Audio Constraints:', finalConstraints);
  return finalConstraints;
};

// 🚀 Quick Audio Test Function
export const testAudioSettings = async () => {
  try {
    const constraints = await getOptimizedAudioConstraints();
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: constraints,
      video: false 
    });
    
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      const track = audioTracks[0];
      const settings = track.getSettings();
      
      console.log('✅ Audio Test Successful:', {
        channelCount: settings.channelCount,
        sampleRate: settings.sampleRate,
        sampleSize: settings.sampleSize,
        latency: settings.latency
      });
      
      // Clean up
      track.stop();
      return { success: true, settings };
    }
    
    return { success: false, error: 'No audio tracks' };
  } catch (error) {
    console.error('❌ Audio Test Failed:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getOptimizedAudioConstraints,
  detectEarphones,
  getBrandSpecificConstraints,
  testAudioSettings
};