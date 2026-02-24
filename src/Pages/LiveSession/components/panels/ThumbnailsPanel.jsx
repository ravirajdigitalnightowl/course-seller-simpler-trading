import React, { useMemo, useCallback } from "react";
import { FiEdit3, FiMonitor } from "react-icons/fi";
import ThumbnailVideo from "../ThumbnailVideo";

const ThumbnailsPanel = ({
  variant = "column", // "overlay" | "column"
  thumbnailsCount = 0,
  setThumbnailsExpanded,

  showWhiteboard,
  handleCloseWhiteboard,

  setShowPlayButton,
  setZoomed,

  mediaStream,
  videoEnabled,
  userId,

  viewerCameras, // Map(uid => stream)
  participantNameById, // Map(uid => name)

  activeScreenShare, // { stream, userId, userName } | null
  viewerScreenShare, // { stream, userId, userName } | null

  zoomed,
}) => {
  const isOverlay = variant === "overlay";

  // ✅ screen stream wrapper: new MediaStream(...) render ke andar mat banao
  const activeScreenVideoStream = useMemo(() => {
    const s = activeScreenShare?.stream;
    if (!s) return null;
    const vt = s.getVideoTracks?.()[0];
    return vt ? new MediaStream([vt]) : s;
  }, [activeScreenShare?.stream]);

  const handleThumbClick = useCallback(
    (payload) => {
      setZoomed(payload);
      setShowPlayButton(false);
      if (isOverlay) setThumbnailsExpanded(false);
    },
    [setZoomed, setShowPlayButton, isOverlay, setThumbnailsExpanded]
  );

  const viewerCameraEntries = useMemo(() => {
    return viewerCameras ? Array.from(viewerCameras.entries()) : [];
  }, [viewerCameras]);

  // ------------------ Thumbs ------------------
  const whiteboardThumb = showWhiteboard ? (
    <div className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid="whiteboard"
        stream={null}
        userName="Whiteboard"
        onClick={() =>
          handleThumbClick({ type: "whiteboard", stream: null, userId: "whiteboard" })
        }
        isZoomed={zoomed?.type === "whiteboard"}
        videoEnabled={true}
        expanded={isOverlay}
        isWhiteboard={true}
        showWhiteboard={showWhiteboard}
        onCloseWhiteboard={handleCloseWhiteboard}
      />
      {isOverlay && (
        <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
          <FiEdit3 className="h-3 w-3 mr-1" />
          Whiteboard
        </div>
      )}
    </div>
  ) : null;

  const streamerThumb = mediaStream ? (
    <div className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid="streamer"
        stream={mediaStream}
        userName="You"
        onClick={() => handleThumbClick({ type: "streamer", stream: mediaStream, userId })}
        isZoomed={zoomed?.type === "streamer"}
        videoEnabled={videoEnabled}
        expanded={isOverlay}
      />
      {isOverlay && (
        <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
          Host
        </div>
      )}
    </div>
  ) : null;

  const activeScreenThumb =
    activeScreenShare?.stream && activeScreenVideoStream ? (
      <div className={isOverlay ? "relative group" : ""}>
        <ThumbnailVideo
          uid={activeScreenShare.userId || "screen"}
          stream={activeScreenVideoStream}
          userName={`${activeScreenShare.userName || "User"}'s Screen`}
          onClick={() =>
            handleThumbClick({
              type: "screen",
              stream: activeScreenShare.stream,
              userId: activeScreenShare.userId,
            })
          }
          isZoomed={zoomed?.type === "screen"}
          videoEnabled={true}
          isScreenShare={true}
          expanded={isOverlay}
        />
      </div>
    ) : null;

  const viewerScreenThumb =
    viewerScreenShare?.stream ? (
      <div className={isOverlay ? "relative group" : ""}>
        <ThumbnailVideo
          uid={viewerScreenShare.userId}
          stream={viewerScreenShare.stream}
          userName={`${viewerScreenShare.userName || "User"}'s Screen`}
          onClick={() =>
            handleThumbClick({
              type: "viewer-screen",
              stream: viewerScreenShare.stream,
              userId: viewerScreenShare.userId,
            })
          }
          isZoomed={
            zoomed?.type === "viewer-screen" && zoomed?.userId === viewerScreenShare.userId
          }
          videoEnabled={true}
          isScreenShare={true}
          expanded={isOverlay}
        />
        {isOverlay && (
          <div className="absolute top-2 left-2 bg-orange-600/80 text-white text-xs px-2 py-1 rounded flex items-center">
            <FiMonitor className="h-3 w-3 mr-1" />
            Viewer Screen
          </div>
        )}
      </div>
    ) : null;

  const viewerCameraThumbs = viewerCameraEntries.map(([uid, stream]) => (
    <div key={uid} className={isOverlay ? "relative group" : ""}>
      <ThumbnailVideo
        uid={uid}
        stream={stream}
        userName={participantNameById?.get(uid) || `User ${uid}`}
        onClick={() => handleThumbClick({ type: "viewer", stream, userId: uid })}
        isZoomed={zoomed?.type === "viewer" && zoomed?.userId === uid}
        videoEnabled={true}
        expanded={isOverlay}
      />
    </div>
  ));

  // ------------------ Layouts ------------------
  if (isOverlay) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {whiteboardThumb}
          {streamerThumb}
          {viewerCameraThumbs}
          {activeScreenThumb}
          {viewerScreenThumb}

          {thumbnailsCount === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center p-4">
              No streams available
            </div>
          )}
        </div>
      </div>
    );
  }

  // column (sidebar)
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
      {whiteboardThumb}
      {streamerThumb}
      {viewerCameraThumbs}
      {activeScreenThumb}
      {viewerScreenThumb}

      {thumbnailsCount === 0 && (
        <div className="text-gray-500 text-sm text-center p-3">No streams</div>
      )}
    </div>
  );
};

export default React.memo(ThumbnailsPanel);