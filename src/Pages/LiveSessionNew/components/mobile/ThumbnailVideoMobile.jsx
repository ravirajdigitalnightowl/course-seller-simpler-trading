// import React, { useRef, useEffect, useState } from 'react';
// import { FiVideoOff } from 'react-icons/fi';

// const ThumbnailVideoMobile = ({ uid, stream, userName, onClick, isZoomed, videoEnabled, isScreenShare = false }) => {
//   const videoRef = useRef(null);
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [attempts, setAttempts] = useState(0);
  
//   // Mobile-optimized stream attachment
//   useEffect(() => {
//     const el = videoRef.current;
//     if (!el || !stream) return;

//     // Mobile के लिए simplified setup
//     if (el.srcObject === stream && attempts === 0) return;
    
//     el.srcObject = stream;
//     el.muted = true;
//     el.playsInline = true;
//     el.setAttribute('playsinline', '');
//     el.setAttribute('webkit-playsinline', '');
    
//     const handleCanPlay = () => {
//       setIsLoaded(true);
      
//       // Mobile के लिए silent play attempt
//       const playPromise = el.play();
//       if (playPromise !== undefined) {
//         playPromise.catch(err => {
//           console.log('Mobile thumbnail play blocked:', err.name);
//           // Retry mechanism for mobile
//           if (attempts < 3) {
//             setTimeout(() => {
//               setAttempts(prev => prev + 1);
//             }, 500);
//           }
//         });
//       }
//     };
    
//     el.addEventListener('canplay', handleCanPlay);
//     el.addEventListener('loadeddata', handleCanPlay);
    
//     // Initial attempt
//     setTimeout(() => {
//       el.play().catch(() => {});
//     }, 100);
    
//     return () => {
//       el.removeEventListener('canplay', handleCanPlay);
//       el.removeEventListener('loadeddata', handleCanPlay);
//     };
//   }, [stream, attempts]);

//   // Mobile के लिए compact styling
//   const getBorderStyle = () => {
//     if (isZoomed) {
//       if (isScreenShare) return 'border-2 border-purple-400';
//       if (uid === 'streamer') return 'border-2 border-blue-400';
//       return 'border-2 border-green-400';
//     }
//     return 'border border-gray-600';
//   };

//   const getIndicatorColor = () => {
//     if (isScreenShare) return 'bg-purple-500';
//     if (uid === 'streamer') return 'bg-blue-500';
//     return 'bg-green-500';
//   };

//   return (
//     <div 
//       className={`relative w-20 h-16 bg-gray-900 rounded-lg overflow-hidden cursor-pointer transition-all active:scale-95 ${
//         getBorderStyle()
//       }`}
//       onClick={onClick}
//       style={{
//         WebkitTapHighlightColor: 'transparent',
//         touchAction: 'manipulation',
//       }}
//     >
//       {/* Video Container */}
//       <div className="relative w-full h-full">
//         <video
//           ref={videoRef}
//           muted
//           autoPlay
//           playsInline
//           className={`w-full h-full object-cover transition-opacity duration-200 ${
//             isLoaded ? 'opacity-100' : 'opacity-0'
//           }`}
//           style={{
//             transform: 'translateZ(0)',
//             WebkitTransform: 'translateZ(0)',
//           }}
//           preload="metadata"
//           disablePictureInPicture
//           controls={false}
//         />
        
//         {/* Mobile-optimized loading skeleton */}
//         {!isLoaded && (
//           <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
//             <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
//           </div>
//         )}
//       </div>
      
//       {/* Mobile-friendly name badge */}
//       <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1">
//         <div className="text-[10px] text-white truncate px-1 text-center font-medium">
//           {userName.length > 10 ? `${userName.substring(0, 8)}...` : userName}
//         </div>
//       </div>
      
//       {/* Status indicator - simplified for mobile */}
//       <div className={`absolute top-1 right-1 rounded-full w-2 h-2 ${getIndicatorColor()} ${
//         isLoaded && stream?.active ? 'animate-pulse' : 'opacity-50'
//       }`} />
      
//       {/* Video off indicator for mobile */}
//       {uid === 'streamer' && !videoEnabled && (
//         <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
//           <FiVideoOff className="h-4 w-4 text-gray-400" />
//         </div>
//       )}
      
//       {/* Active zoom indicator */}
//       {isZoomed && (
//         <div className="absolute top-1 left-1">
//           <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ThumbnailVideoMobile;













import React, { useRef, useEffect, useState } from 'react';
import { FiVideoOff } from 'react-icons/fi';

const ThumbnailVideoMobile = ({ uid, stream, userName, onClick, isZoomed, videoEnabled, isScreenShare = false }) => {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  // Mobile के लिए simplified setup
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;

    if (el.srcObject === stream && attempts === 0) return;
    
    el.srcObject = stream;
    el.muted = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    
    const handleCanPlay = () => {
      setIsLoaded(true);
      
      // Mobile के लिए silent play attempt
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('Mobile thumbnail play blocked:', err.name);
          if (attempts < 3) {
            setTimeout(() => {
              setAttempts(prev => prev + 1);
            }, 500);
          }
        });
      }
    };
    
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('loadeddata', handleCanPlay);
    
    // Initial attempt
    setTimeout(() => {
      el.play().catch(() => {});
    }, 100);
    
    return () => {
      el.removeEventListener('canplay', handleCanPlay);
      el.removeEventListener('loadeddata', handleCanPlay);
    };
  }, [stream, attempts]);

  // थंबनेल स्टाइलिंग
  const getBorderStyle = () => {
    if (isZoomed) {
      if (isScreenShare) return 'border-2 border-purple-400';
      if (uid === 'streamer') return 'border-2 border-blue-400';
      return 'border-2 border-green-400';
    }
    return 'border border-gray-600';
  };

  const getIndicatorColor = () => {
    if (isScreenShare) return 'bg-purple-500';
    if (uid === 'streamer') return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div 
      className={`relative flex-shrink-0 w-20 h-16 bg-gray-900 rounded-lg overflow-hidden cursor-pointer transition-all active:scale-95 ${
        getBorderStyle()
      }`}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Video Container with proper aspect ratio handling */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gray-800">
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
          preload="metadata"
          disablePictureInPicture
          controls={false}
        />
        
        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {/* Name badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1">
        <div className="text-[10px] text-white truncate px-1 text-center font-medium">
          {userName.length > 10 ? `${userName.substring(0, 8)}...` : userName}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className={`absolute top-1 right-1 rounded-full w-2 h-2 ${getIndicatorColor()} ${
        isLoaded && stream?.active ? 'animate-pulse' : 'opacity-50'
      }`} />
      
      {/* Video off indicator */}
      {uid === 'streamer' && !videoEnabled && (
        <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
          <FiVideoOff className="h-4 w-4 text-gray-400" />
        </div>
      )}
      
      {/* Active zoom indicator */}
      {isZoomed && (
        <div className="absolute top-1 left-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
};

export default ThumbnailVideoMobile;