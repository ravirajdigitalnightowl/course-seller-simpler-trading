// Screen share start करने से पहले ये modal show करें
import React from "react";
const ScreenShareAudioModal = ({ 
  isOpen, 
  onProceed, 
  onCancel 
}) => {
  const [userAcknowledged, setUserAcknowledged] = useState(false);
  
  const handleProceed = () => {
    // 🔴 CRITICAL: User interaction record करें
    localStorage.setItem('screen_share_audio_muted', 'true');
    localStorage.setItem('last_user_interaction', Date.now().toString());
    
    // Custom event dispatch करें
    const audioMuteEvent = new Event('user-audio-mute-consent', {
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(audioMuteEvent);
    
    onProceed();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999]">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl mx-4 border-2 border-yellow-500/30 shadow-2xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-yellow-500/20 rounded-full">
            <FiVolumeX className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">⚠️ Important Audio Settings</h2>
            <p className="text-gray-300">Before starting screen share</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-gray-700/50 rounded-xl">
            <div className="flex items-start space-x-3">
              <FiAlertCircle className="h-6 w-6 text-red-400 mt-1" />
              <div>
                <h3 className="font-semibold text-lg text-white">Browser Audio Behavior</h3>
                <p className="text-gray-300 mt-2">
                  When you share your screen, <strong className="text-yellow-300">browser automatically captures system audio</strong>. 
                  This includes sounds from other tabs, videos, notifications, etc.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
            <div className="flex items-start space-x-3">
              <FiInfo className="h-6 w-6 text-blue-400 mt-1" />
              <div>
                <h3 className="font-semibold text-lg text-white">Required Action</h3>
                <p className="text-gray-300 mt-2">
                  You <strong className="text-green-300">MUST manually mute the system audio</strong> in the browser's screen share dialog.
                  We'll guide you through the process.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-purple-500/10 rounded-xl">
            <div className="flex items-start space-x-3">
              <FiBell className="h-6 w-6 text-purple-400 mt-1" />
              <div>
                <h3 className="font-semibold text-lg text-white">Why This Matters?</h3>
                <ul className="text-gray-300 mt-2 space-y-2 list-disc pl-5">
                  <li>Prevents echo from other tab videos</li>
                  <li>Eliminates notification sounds in recording</li>
                  <li>Clean audio for your audience</li>
                  <li>Better recording quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Browser-specific instructions */}
        <div className="mb-8 p-4 bg-gray-800/80 rounded-xl">
          <h4 className="font-semibold text-white mb-3 flex items-center">
            <FiSettings className="h-5 w-5 mr-2" />
            How to Mute in {getBrowserName()}
          </h4>
          <div className="text-gray-300 space-y-2 text-sm">
            {getBrowserInstructions()}
          </div>
        </div>
        
        {/* Checkbox for acknowledgment */}
        <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-700/30 rounded-lg">
          <input
            type="checkbox"
            id="acknowledge"
            checked={userAcknowledged}
            onChange={(e) => setUserAcknowledged(e.target.checked)}
            className="h-5 w-5 accent-blue-500"
          />
          <label htmlFor="acknowledge" className="text-gray-300">
            I understand that I must manually mute system audio in the browser dialog
          </label>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <FiX className="h-5 w-5" />
            <span>Cancel Screen Share</span>
          </button>
          <button
            onClick={handleProceed}
            disabled={!userAcknowledged}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
              userAcknowledged 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            <FiCheck className="h-5 w-5" />
            <span>Continue to Screen Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getBrowserName = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'Chrome';
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('safari')) return 'Safari';
  if (userAgent.includes('edge')) return 'Edge';
  return 'Your Browser';
};

const getBrowserInstructions = () => {
  const browser = getBrowserName();
  
  switch(browser) {
    case 'Chrome':
    case 'Edge':
      return (
        <>
          <p>1. Click "Share" button below</p>
          <p>2. In the popup, select <strong>"Share tab"</strong> or <strong>"Share screen"</strong></p>
          <p>3. <strong className="text-yellow-300">UNCHECK "Share audio"</strong> checkbox</p>
          <p>4. Click "Share"</p>
        </>
      );
    case 'Firefox':
      return (
        <>
          <p>1. Click "Share" button below</p>
          <p>2. Select window/screen to share</p>
          <p>3. <strong className="text-yellow-300">UNCHECK "Share audio"</strong> option</p>
          <p>4. Click "Allow"</p>
        </>
      );
    case 'Safari':
      return (
        <>
          <p>1. Click "Share" button below</p>
          <p>2. Select screen/window</p>
          <p>3. Click <strong>"Share"</strong> button</p>
          <p>4. Audio is automatically managed by Safari</p>
        </>
      );
    default:
      return (
        <>
          <p>1. When browser asks for screen share permission</p>
          <p>2. Look for <strong>"Share audio"</strong> or similar option</p>
          <p>3. Make sure it is <strong>UNCHECKED/DISABLED</strong></p>
        </>
      );
  }
};

export default ScreenShareAudioModal;