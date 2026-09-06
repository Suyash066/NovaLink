"use client";

import * as Y from "yjs";

// A from-scratch alternative to y-websocket: we already have a Socket.IO
// server, so this just relays Yjs binary updates through the existing
// join_code_session / code_edit events instead of standing up a second
// real-time server just for the editor.
export class SocketYjsProvider {
  constructor(socket, sessionId, doc) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.doc = doc;

    this.onDocUpdate = (update, origin) => {
      if (origin === this) return; // don't echo back updates we just applied
      socket.emit("code_edit", { sessionId, yjsUpdate: update });
    };
    doc.on("update", this.onDocUpdate);

    this.onRemoteUpdate = ({ sessionId: incomingId, yjsUpdate }) => {
      if (incomingId !== sessionId) return;
      const update = yjsUpdate instanceof Uint8Array ? yjsUpdate : new Uint8Array(yjsUpdate);
      Y.applyUpdate(doc, update, this);
    };
    socket.on("code_edit", this.onRemoteUpdate);

    socket.emit("join_code_session", { sessionId });
  }

  destroy() {
    this.doc.off("update", this.onDocUpdate);
    this.socket.off("code_edit", this.onRemoteUpdate);
  }
}
