// import React, { useRef, useEffect } from 'react';
// import { FiVideoOff } from 'react-icons/fi';

// const ThumbnailVideo = ({ uid, stream, userName, onClick, isZoomed, videoEnabled, isScreenShare = false, isMobile = false }) => {
//   const videoRef = useRef(null);
//   useEffect(() => {
//     const el = videoRef.current;
//     if (!el || !stream) return;

//     el.srcObject = stream;
//     el.play().catch(() => {});

//     return () => {
//       if (el) {
//         el.srcObject = null;
//       }
//     };
//   }, [stream]);

//   const getBorderColor = () => {
//     if (isScreenShare) return 'purple';
//     if (uid === 'streamer') return 'blue';
//     return 'green';
//   };

//   const getBgColor = () => {
//     if (isScreenShare) return 'bg-purple-500/20 border-purple-400';
//     if (uid === 'streamer') return 'bg-blue-500/20 border-blue-400';
//     return 'bg-green-500/20 border-green-400';
//   };

//   return (
//     <div 
//       className={`relative aspect-video bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 transition-all group ${
//         isZoomed ? `${getBgColor()} border-2` : 'hover:ring-blue-400'
//       } ${isMobile ? 'w-full' : ''}`}
//       onClick={onClick}
//     >
//       <video
//         ref={videoRef}
//         muted={uid === 'streamer'}
//         autoPlay
//         playsInline
//         className="w-full h-full object-cover"
//       />
      
//       <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded truncate max-w-[80%]">
//         {userName} {uid === 'streamer' && !videoEnabled && "(Off)"}
//       </div>
      
//       <div className={`absolute top-1 right-1 rounded-full w-2 h-2 animate-pulse ${
//         isScreenShare ? 'bg-purple-500' : 
//         uid === 'streamer' ? 'bg-blue-500' : 'bg-green-500'
//       }`} />
      
//       {uid === 'streamer' && !videoEnabled && (
//         <div className="absolute inset-0 bg-gray-800/70 flex items-center justify-center">
//           <FiVideoOff className="h-4 w-4 text-gray-400" />
//         </div>
//       )}
//     </div>
//   );
// };

// export default ThumbnailVideo;



import React, { useRef, useEffect, useState } from 'react';
import { FiVideoOff } from 'react-icons/fi';

const ThumbnailVideo = ({ uid, stream, userName, onClick, isZoomed, videoEnabled, isScreenShare = false, isMobile = false }) => {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    // Agar already same stream hai, to re-attach न करें
    if (el.srcObject === stream) return;
    
    el.srcObject = stream;
    
    const handleCanPlay = () => {
      setIsLoaded(true);
      el.play().catch(e => {
        // Autoplay error ignore करें
        console.log('Thumbnail autoplay blocked:', e);
      });
    };
    
    el.addEventListener('canplay', handleCanPlay);
    
    // Initial play attempt
    el.play().catch(() => {});
    
    return () => {
      el.removeEventListener('canplay', handleCanPlay);
      // Cleanup में srcObject null न करें, React ko handle करने दें
    };
  }, [stream]);

  const getBorderColor = () => {
    if (isScreenShare) return 'purple';
    if (uid === 'streamer') return 'blue';
    return 'green';
  };

  const getBgColor = () => {
    if (isScreenShare) return 'bg-purple-500/20 border-purple-400';
    if (uid === 'streamer') return 'bg-blue-500/20 border-blue-400';
    return 'bg-green-500/20 border-green-400';
  };

  return (
    <div 
      className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer transition-all group ${
        isZoomed 
          ? `${getBgColor()} border-2` 
          : 'hover:ring-2 hover:ring-blue-400 border border-gray-600'
      } ${isMobile ? 'w-full' : ''}`}
      onClick={onClick}
      style={{
        // Hardware acceleration enable करें
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      }}
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          muted={uid === 'streamer'}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            // Smooth rendering के लिए
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          preload="auto"
        />
        
        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded truncate max-w-[80%]">
        {userName} {uid === 'streamer' && !videoEnabled && "(Off)"}
      </div>
      
      <div className={`absolute top-1 right-1 rounded-full w-2.5 h-2.5 ${
        isScreenShare ? 'bg-purple-500' : 
        uid === 'streamer' ? 'bg-blue-500' : 'bg-green-500'
      } ${isLoaded ? 'animate-pulse' : ''}`} />
      
      {uid === 'streamer' && !videoEnabled && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
          <FiVideoOff className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default ThumbnailVideo;