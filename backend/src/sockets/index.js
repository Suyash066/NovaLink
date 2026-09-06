const { verifyAccessToken } = require("../utils/tokens");
const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const Message = require("../models/Message");
const CallRoom = require("../models/CallRoom");
const { CodeSession, AiSuggestion } = require("../models/CodeSession");
const { atLeast } = require("../utils/roles");
const { ai, MODEL, buildPrompt, SYSTEM_PROMPT } = require("../controllers/aiController");

// One CodeSession per channel for now — the model supports multiple named
// sessions per channel, but the editor currently only opens one shared
// buffer per channel, so we reuse (or lazily create) that single session.
async function findOrCreateCodeSession(channelId, userId) {
  let session = await CodeSession.findOne({ channel: channelId });
  if (!session) {
    session = await CodeSession.create({
      channel: channelId,
      filename: "scratch",
      yjsDocId: `code:${channelId}`,
      createdBy: userId,
      participants: [userId],
    });
  }
  return session;
}

// One connection can come from the web client OR the nova CLI — both send
// the same access token, so both are treated identically here.
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Missing access token"));
  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
}

async function roleForChannel(userId, channel) {
  const membership = await Membership.findOne({ user: userId, project: channel.project });
  return membership ? membership.role : "GUEST";
}

function registerSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.user.sub;

    socket.on("join_channel", async ({ channelId }, ack) => {
      const channel = await Channel.findById(channelId);
      if (!channel) return ack?.({ ok: false, error: "Channel not found" });

      const role = await roleForChannel(userId, channel);
      if (!atLeast(role, channel.minRoleToRead)) {
        return ack?.({ ok: false, error: "Access denied" });
      }

      socket.join(`channel:${channelId}`);
      io.to(`channel:${channelId}`).emit("presence_update", { channelId, userId, status: "online" });
      ack?.({ ok: true, role });
    });

    socket.on("send_message", async ({ channelId, body }, ack) => {
      const channel = await Channel.findById(channelId);
      if (!channel) return ack?.({ ok: false, error: "Channel not found" });

      const role = await roleForChannel(userId, channel);
      if (!atLeast(role, channel.minRoleToWrite)) {
        return ack?.({ ok: false, error: "You can't post in this channel" });
      }

      const message = await Message.create({ channel: channelId, author: userId, body, kind: "USER" });
      io.to(`channel:${channelId}`).emit("message_new", { channelId, message });
      ack?.({ ok: true, message });
    });

    // Called internally by the nova CLI bridge (see cli/bridge.js) after a
    // successful commit/push/revert — posts an automatic activity message.
    socket.on("system_event", async ({ channelId, kind, payload }, ack) => {
      const message = await Message.create({
        channel: channelId,
        author: null,
        body: payload.text,
        kind: "SYSTEM",
        systemEvent: kind,
      });
      io.to(`channel:${channelId}`).emit("system_event", { channelId, kind, payload, message });
      ack?.({ ok: true });
    });

    // --- WebRTC signaling (mesh, MVP) ---
    // One RTCPeerConnection per pair of participants. A newcomer is told who's
    // already in the room and initiates a connection to each of them; existing
    // participants stay passive and respond when a signal actually arrives for
    // them. This avoids ever needing to reuse one SDP offer for multiple peers.
    socket.on("start_call", async ({ channelId }, ack) => {
      const room = await CallRoom.create({ channel: channelId, startedBy: userId, participants: [] });
      io.to(`channel:${channelId}`).emit("call_started", { channelId, roomId: room._id });
      ack?.({ ok: true, roomId: room._id });
    });

    socket.on("join_call", async ({ roomId }, ack) => {
      const room = await CallRoom.findById(roomId);
      if (!room || !room.active) return ack?.({ ok: false, error: "Call not found or has ended" });

      const existingParticipants = room.participants.map((p) => p.toString()).filter((id) => id !== userId);

      socket.join(`call:${roomId}`);
      await CallRoom.findByIdAndUpdate(roomId, { $addToSet: { participants: userId } });
      socket.to(`call:${roomId}`).emit("call_peer_joined", { roomId, userId });

      ack?.({ ok: true, existingParticipants });
    });

    // Generic relay: carries an SDP offer, SDP answer, or ICE candidate,
    // always addressed to one specific peer by userId.
    socket.on("webrtc_signal", ({ roomId, toUserId, signal }) => {
      socket.to(`call:${roomId}`).emit("webrtc_signal", { roomId, fromUserId: userId, toUserId, signal });
    });

    socket.on("screen_share_toggle", async ({ roomId, active }) => {
      await CallRoom.findByIdAndUpdate(roomId, { screenShareActive: active });
      io.to(`call:${roomId}`).emit("screen_share_toggle", { roomId, userId, active });
    });

    socket.on("leave_call", async ({ roomId }) => {
      socket.leave(`call:${roomId}`);
      await CallRoom.findByIdAndUpdate(roomId, { $pull: { participants: userId } });
      io.to(`call:${roomId}`).emit("call_peer_left", { roomId, userId });
    });

    // --- Collaborative code editor (Yjs update relay) ---
    socket.on("join_code_session", ({ sessionId }) => {
      socket.join(`code:${sessionId}`);
    });

    socket.on("code_edit", ({ sessionId, yjsUpdate }) => {
      // Server relays binary CRDT updates only — it never has to
      // understand document content, so this scales cheaply.
      socket.to(`code:${sessionId}`).emit("code_edit", { sessionId, yjsUpdate, fromUserId: userId });
    });

    // --- AI streaming, invoked from the editor panel ---
    socket.on("ai_request", async ({ sessionId, channelId, prompt, code, language }) => {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: MODEL,
          contents: buildPrompt({ language, code, prompt }),
          config: { systemInstruction: SYSTEM_PROMPT },
        });

        let fullResponse = "";
        for await (const chunk of responseStream) {
          const delta = chunk.text;
          if (delta) {
            fullResponse += delta;
            socket.emit("ai_response_chunk", { sessionId, delta });
          }
        }

        let suggestionId = null;
        if (channelId) {
          const session = await findOrCreateCodeSession(channelId, userId);
          const suggestion = await AiSuggestion.create({
            codeSession: session._id,
            requestedBy: userId,
            prompt,
            response: fullResponse,
          });
          suggestionId = suggestion._id;
        }

        socket.emit("ai_response_done", { sessionId, suggestionId });
      } catch (err) {
        socket.emit("ai_response_error", { sessionId, error: err.message });
      }
    });

    // Returns this channel's saved AI conversation, oldest first, so the
    // editor panel can restore history when it's reopened.
    socket.on("get_ai_history", async ({ channelId }, ack) => {
      const session = await CodeSession.findOne({ channel: channelId });
      if (!session) return ack?.({ ok: true, history: [] });

      const history = await AiSuggestion.find({ codeSession: session._id })
        .sort({ createdAt: 1 })
        .populate("requestedBy", "username");

      ack?.({ ok: true, history });
    });

    socket.on("disconnect", () => {
      // presence cleanup — in a multi-instance deployment this should go
      // through the Redis adapter's presence set instead of per-socket state
    });
  });
}

module.exports = { registerSocketHandlers };
