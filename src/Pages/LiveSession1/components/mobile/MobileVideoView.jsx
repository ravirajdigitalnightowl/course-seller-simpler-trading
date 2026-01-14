import React, { useRef, useEffect, useState } from 'react';
import { FiPlay, FiX, FiVideoOff, FiLoader } from 'react-icons/fi';
import ThumbnailVideo from '../ThumbnailVideo';

const MobileVideoView = ({
  zoomed,
  setZoomed,
  mediaStream,
  participants,
  activeScreenShare,
  setIsPlaying,
  setShowPlayButton,
  showPlayButton,
  setMediaError,
  mediaError,
  isLoading,
  isInitializing,
  roomState,
  localPausedState,
  user,
  videoEnabled,
  viewerCameras,
  showMobileControls,
  setShowMobileControls,
  handlePlayClick,
  isPlaying
}) => {
  const videoElementRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Video element ko single time setup karo
  useEffect(() => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !mediaStream || zoomed) return;

    // Ek hi baar setup karo
    if (videoEl.srcObject !== mediaStream) {
      console.log('📱 Setting up mobile video element');
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('webkit-playsinline', '');
      videoEl.srcObject = mediaStream;
    }

    // Auto-play try karo with better handling
    const attemptPlay = async () => {
      try {
        await videoEl.play();
        console.log('✅ Mobile video autoplay successful');
        setIsPlaying(true);
        setShowPlayButton(false);
        setVideoLoaded(true);
      } catch (error) {
        console.log('📱 Mobile autoplay blocked, showing play button');
        setShowPlayButton(true);
        setIsPlaying(false);
      }
    };

    // Small delay ke baad try karo
    const timer = setTimeout(attemptPlay, 300);
    return () => clearTimeout(timer);
  }, [mediaStream, zoomed, setIsPlaying, setShowPlayButton]);

  // Video events handle karo
  useEffect(() => {
    const videoEl = videoElementRef.current;
    if (!videoEl) return;

    const handleCanPlay = () => {
      console.log('📱 Video can play');
      setVideoLoaded(true);
    };

    const handlePlay = () => {
      console.log('📱 Video started playing');
      setIsPlaying(true);
      setShowPlayButton(false);
    };

    const handlePause = () => {
      console.log('📱 Video paused');
      setIsPlaying(false);
      // Only show play button if not intentionally paused
      if (!roomState.isPaused && !localPausedState) {
        setShowPlayButton(true);
      }
    };

    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);

    return () => {
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
    };
  }, [roomState.isPaused, localPausedState, setIsPlaying, setShowPlayButton]);

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Main Video Area - 85% height */}
      <div 
        className="h-[85%] relative bg-black"
        onClick={() => setShowMobileControls(!showMobileControls)}
      >
        {/* Zoomed Video */}
        {zoomed ? (
          <div className="relative w-full h-full">
            <video
              key={`zoomed-${zoomed.userId}`}
              autoPlay
              playsInline
              muted={zoomed.type !== "viewer"}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              ref={(el) => {
                if (el && zoomed.stream) {
                  el.srcObject = zoomed.stream;
                  el.muted = zoomed.type !== "viewer";
                  el.playsInline = true;
                  el.setAttribute('playsinline', '');
                  el.setAttribute('webkit-playsinline', '');
                  el.play().catch(() => {});
                }
              }}
            />
            
            <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {zoomed.type === "streamer" ? "Your Camera" : 
               zoomed.type === "viewer" ? `${participants.find(p => p.userId === zoomed.userId)?.name || 'User'}'s Camera` : 
               `${activeScreenShare?.userName}'s Screen`}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomed(null);
              }}
              className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Default streamer video - Optimized
          <video
            key="main-streamer-video"
            ref={videoElementRef}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-black"
            onError={(e) => {
              console.error('📱 Mobile video error:', e);
              setMediaError(true);
              setShowPlayButton(true);
            }}
          />
        )}

        {/* Status overlay */}
        <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            {isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
          {showPlayButton && !videoLoaded && (
            <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
              Loading...
            </span>
          )}
        </div>

        {/* Play button - Better handling */}
        {showPlayButton && !mediaError && !zoomed && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayClick(e);
            }}
          >
            <div className="text-center">
              <div className="bg-blue-600/90 text-white p-5 rounded-full shadow-lg mb-3">
                <FiPlay className="h-10 w-10" />
              </div>
              <p className="text-white text-sm">Tap to start video</p>
              {!videoLoaded && (
                <p className="text-yellow-300 text-xs mt-1">Video loading...</p>
              )}
            </div>
          </div>
        )}

        {/* Loading state - Only show initially */}
        {(isLoading || isInitializing) && !videoLoaded && !showPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
            <div className="text-center">
              <FiLoader className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Setting up camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Permanent Thumbnails Area - 15% height */}
      <div className="h-[15%] bg-gray-800 border-t border-gray-600 overflow-x-auto">
        <div className="flex p-1 space-x-2 h-full items-center justify-center">
          {/* Streamer thumbnail */}
          {mediaStream && (
            <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
              <ThumbnailVideo
                uid="streamer"
                stream={mediaStream}
                userName="You"
                onClick={() => {
                  setZoomed({ type: "streamer", stream: mediaStream, userId: user?.id });
                  setShowPlayButton(false);
                }}
                isZoomed={zoomed?.type === "streamer"}
                videoEnabled={videoEnabled}
                isMobile={true}
              />
            </div>
          )}
          
          {/* Viewer cameras */}
          {[...viewerCameras.entries()].map(([uid, stream]) => (
            <div key={uid} className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
              <ThumbnailVideo
                uid={uid}
                stream={stream}
                userName={participants.find(p => p.userId === uid)?.name || `User ${uid}`}
                onClick={() => {
                  setZoomed({ type: "viewer", stream, userId: uid });
                  setShowPlayButton(false);
                }}
                isZoomed={zoomed?.type === "viewer" && zoomed.userId === uid}
                videoEnabled={true}
                isMobile={true}
              />
            </div>
          ))}
          
          {/* Screen share */}
          {activeScreenShare && (
            <div className="flex-shrink-0 w-20 h-16 flex items-center justify-center">
              <ThumbnailVideo
                uid={activeScreenShare.userId}
                stream={activeScreenShare.stream}
                userName={`${activeScreenShare.userName}'s Screen`}
                onClick={() => {
                  setZoomed({ type: "screen", stream: activeScreenShare.stream, userId: activeScreenShare.userId });
                  setShowPlayButton(false);
                }}
                isZoomed={zoomed?.type === "screen"}
                videoEnabled={true}
                isScreenShare={true}
                isMobile={true}
              />
            </div>
          )}

          {/* Empty state */}
          {viewerCameras.size === 0 && !activeScreenShare && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
              <div className="text-center">
                <FiVideoOff className="h-4 w-4 mx-auto mb-1 opacity-50" />
                <p>No other cameras</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileVideoView;