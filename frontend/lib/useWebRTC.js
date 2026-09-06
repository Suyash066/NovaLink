"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useWebRTC(socket, roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: MediaStream }
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState("");

  const peersRef = useRef({}); // { userId: RTCPeerConnection }
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);

  const createPeerConnection = useCallback(
    (remoteUserId, initiator) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc_signal", {
            roomId,
            toUserId: remoteUserId,
            signal: { type: "candidate", candidate: e.candidate },
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: e.streams[0] }));
      };

      pc.onconnectionstatechange = () => {
        if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
          removePeer(remoteUserId);
        }
      };

      peersRef.current[remoteUserId] = pc;

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            socket.emit("webrtc_signal", {
              roomId,
              toUserId: remoteUserId,
              signal: { type: "offer", sdp: offer },
            });
          });
      }

      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket, roomId]
  );

  function removePeer(remoteUserId) {
    peersRef.current[remoteUserId]?.close();
    delete peersRef.current[remoteUserId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
  }

  const handleSignal = useCallback(
    async ({ fromUserId, signal }) => {
      let pc = peersRef.current[fromUserId];
      if (!pc) pc = createPeerConnection(fromUserId, false);

      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_signal", { roomId, toUserId: fromUserId, signal: { type: "answer", sdp: answer } });
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === "candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          // benign — can happen if candidates arrive before the remote description
        }
      }
    },
    [createPeerConnection, socket, roomId]
  );

  // acquire camera/mic, join the room, wire up socket listeners
  useEffect(() => {
    if (!socket || !roomId) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);

        socket.emit("join_call", { roomId }, (res) => {
          if (!res?.ok) {
            setError(res?.error || "Could not join the call");
            return;
          }
          res.existingParticipants.forEach((remoteUserId) => createPeerConnection(remoteUserId, true));
        });
      } catch (err) {
        setError("Camera/microphone access was denied or unavailable.");
      }
    }
    start();

    function onSignal(payload) {
      // ignore signals addressed to someone else — the server relays to the whole room
      handleSignal(payload);
    }
    function onPeerLeft({ userId: leftUserId }) {
      removePeer(leftUserId);
    }

    socket.on("webrtc_signal", onSignal);
    socket.on("call_peer_left", onPeerLeft);

    return () => {
      cancelled = true;
      socket.off("webrtc_signal", onSignal);
      socket.off("call_peer_left", onPeerLeft);
      socket.emit("leave_call", { roomId });
      Object.keys(peersRef.current).forEach(removePeer);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      const camTrack = cameraTrackRef.current;
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && camTrack) sender.replaceTrack(camTrack);
      });
      setScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      setScreenSharing(true);
      screenTrack.onended = () => {
        const camTrack = cameraTrackRef.current;
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && camTrack) sender.replaceTrack(camTrack);
        });
        setScreenSharing(false);
      };
    } catch (err) {
      // user cancelled the share picker — nothing to do
    }
  }

  return {
    localStream,
    remoteStreams,
    micOn,
    cameraOn,
    screenSharing,
    error,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  };
}
