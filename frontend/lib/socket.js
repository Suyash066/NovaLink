"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getToken, API_URL } from "./api";

// One shared socket per browser tab, created lazily on first use and
// reused across every component that calls useSocket().
let sharedSocket = null;

export function useSocket() {
  const ref = useRef(null);

  useEffect(() => {
    if (!sharedSocket) {
      const token = getToken();
      sharedSocket = io(API_URL, { auth: { token }, autoConnect: !!token });
    }
    ref.current = sharedSocket;
    if (!sharedSocket.connected && getToken()) sharedSocket.connect();
  }, []);

  return ref.current || sharedSocket;
}
