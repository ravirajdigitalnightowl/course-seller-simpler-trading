/**
 * Check if a stream is currently zoomed in main view
 * @param {Object} zoomed - Current zoomed state from useState
 * @param {string} type - Stream type ('streamer', 'viewer', 'screen', 'viewer-screen', 'whiteboard')
 * @param {string} userId - User ID (optional for whiteboard)
 * @returns {boolean} - True if stream is zoomed
 */
export const isStreamZoomed = (zoomed, type, userId) => {
  if (!zoomed) return false;
  
  switch (type) {
    case 'streamer':
      return zoomed.type === 'streamer' && zoomed.userId === userId;
    
    case 'viewer':
      return zoomed.type === 'viewer' && zoomed.userId === userId;
    
    case 'screen':
      return zoomed.type === 'screen' && zoomed.userId === userId;
    
    case 'viewer-screen':
      return zoomed.type === 'viewer-screen' && zoomed.userId === userId;
    
    case 'whiteboard':
      return zoomed.type === 'whiteboard';
    
    default:
      return false;
  }
};