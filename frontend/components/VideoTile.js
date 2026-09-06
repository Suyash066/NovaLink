"use client";

import { useEffect, useRef } from "react";

export default function VideoTile({ stream, label, muted = false, mirrored = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-ink shadow-card">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
      />
      <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white">
        {label}
      </div>
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
          Connecting...
        </div>
      )}
    </div>
  );
}
