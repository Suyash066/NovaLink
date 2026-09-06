"use client";

import { useWebRTC } from "../lib/useWebRTC";
import VideoTile from "./VideoTile";

export default function CallPanel({ socket, roomId, channelName, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    screenSharing,
    error,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTC(socket, roomId);

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink/95">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-sm text-white/70">
          Call in <span className="font-mono text-white">#{channelName}</span>
        </div>
        <div className="text-xs text-white/40">{remoteEntries.length + 1} in call</div>
      </div>

      {error && (
        <div className="mx-6 mb-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto px-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
        <VideoTile stream={localStream} label="You" muted mirrored />
        {remoteEntries.map(([userId, stream]) => (
          <VideoTile key={userId} stream={stream} label={userId.slice(-6)} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 pb-8">
        <button
          onClick={toggleMic}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/90 text-white"
          }`}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            cameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500/90 text-white"
          }`}
        >
          {cameraOn ? "Stop video" : "Start video"}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            screenSharing ? "bg-gold text-white" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {screenSharing ? "Stop sharing" : "Share screen"}
        </button>
        <button
          onClick={onLeave}
          className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
