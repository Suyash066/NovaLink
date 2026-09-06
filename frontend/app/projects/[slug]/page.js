"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import { useSocket } from "../../../lib/socket";
import { api } from "../../../lib/api";
import AppShell from "../../../components/AppShell";
import ChannelList from "../../../components/ChannelList";
import MessageList from "../../../components/MessageList";
import MessageInput from "../../../components/MessageInput";
import CallPanel from "../../../components/CallPanel";
import CodeEditorPanel from "../../../components/CodeEditorPanel";
import CodeBrowserPanel from "../../../components/CodeBrowserPanel";
import MembersPanel from "../../../components/MembersPanel";

export default function ProjectPage() {
  const { slug } = useParams();
  const { user, ready } = useAuth();
  const router = useRouter();
  const socket = useSocket();

  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [channels, setChannels] = useState([]);
  const [yourRole, setYourRole] = useState("GUEST");
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [callBanner, setCallBanner] = useState(null);
  const [activeCallRoomId, setActiveCallRoomId] = useState(null);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [codeBrowserOpen, setCodeBrowserOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // resolve slug -> project, then load its channels
  useEffect(() => {
    if (!user) return;
    api.listProjects().then((d) => {
      setProjects(d.projects);
      const found = d.projects.find((p) => p.slug === slug);
      setProject(found || null);
    });
  }, [user, slug]);

  useEffect(() => {
    if (!project) return;
    api.listChannels(project._id).then((d) => {
      setChannels(d.channels);
      setYourRole(d.yourRole);
      if (d.channels[0]) selectChannel(d.channels[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const selectChannel = useCallback(
    (channel) => {
      setActiveChannel(channel);
      setMessages([]);
      api.getChannelHistory(channel._id).then((d) => setMessages(d.messages));
      socket?.emit("join_channel", { channelId: channel._id });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;
    function onMessage({ channelId, message }) {
      if (activeChannel && channelId === activeChannel._id) {
        setMessages((prev) => [...prev, message]);
      }
    }
    function onSystemEvent({ channelId, message }) {
      if (activeChannel && channelId === activeChannel._id) {
        setMessages((prev) => [...prev, message]);
      }
    }
    function onCallStarted({ channelId, roomId }) {
      if (activeChannel && channelId === activeChannel._id) {
        setCallBanner({ roomId });
      }
    }
    socket.on("message_new", onMessage);
    socket.on("system_event", onSystemEvent);
    socket.on("call_started", onCallStarted);
    return () => {
      socket.off("message_new", onMessage);
      socket.off("system_event", onSystemEvent);
      socket.off("call_started", onCallStarted);
    };
  }, [socket, activeChannel]);

  function sendMessage(body) {
    if (!activeChannel) return;
    socket?.emit("send_message", { channelId: activeChannel._id, body });
  }

  function startCall() {
    if (!activeChannel) return;
    socket?.emit("start_call", { channelId: activeChannel._id }, (res) => {
      if (res?.ok) setActiveCallRoomId(res.roomId);
    });
  }

  function joinCall() {
    if (callBanner?.roomId) setActiveCallRoomId(callBanner.roomId);
  }

  function leaveCall() {
    setActiveCallRoomId(null);
  }

  async function createChannel(payload) {
    const { channel } = await api.createChannel(project._id, payload);
    setChannels((prev) => [...prev, channel]);
  }

  if (!user || !project) return null;

  return (
    <AppShell projects={projects}>
      <div className="flex flex-1 overflow-hidden">
        <ChannelList
          channels={channels}
          activeChannelId={activeChannel?._id}
          onSelect={selectChannel}
          yourRole={yourRole}
          onCreateChannel={createChannel}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <div className="font-mono text-sm text-ink">#{activeChannel?.name}</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMembersOpen(true)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-gold hover:text-gold-deep"
              >
                Members
              </button>
              <button
                onClick={() => setCodeBrowserOpen(true)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-gold hover:text-gold-deep"
              >
                Code
              </button>
              <button
                onClick={() => setCodeEditorOpen(true)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-gold hover:text-gold-deep"
              >
                AI Editor
              </button>
              <div className="text-xs text-ink-faint">{project.name}</div>
            </div>
          </div>

          {callBanner && !activeCallRoomId && (
            <div className="flex items-center justify-between border-b border-gold/40 bg-gold-bg px-6 py-2 text-sm text-gold-deep">
              <span>Call in progress in this channel</span>
              <button
                onClick={joinCall}
                className="rounded-md border border-gold px-2 py-1 text-xs hover:bg-gold hover:text-white"
              >
                Join
              </button>
            </div>
          )}

          <MessageList messages={messages} />
          <MessageInput onSend={sendMessage} onStartCall={startCall} channelName={activeChannel?.name} />
        </div>
      </div>

      {activeCallRoomId && (
        <CallPanel
          socket={socket}
          roomId={activeCallRoomId}
          channelName={activeChannel?.name}
          onLeave={leaveCall}
        />
      )}

      {codeEditorOpen && activeChannel && (
        <CodeEditorPanel
          socket={socket}
          channelId={activeChannel._id}
          channelName={activeChannel.name}
          onClose={() => setCodeEditorOpen(false)}
        />
      )}

      {membersOpen && (
        <MembersPanel projectId={project._id} yourRole={yourRole} onClose={() => setMembersOpen(false)} />
      )}

      {codeBrowserOpen && (
        <CodeBrowserPanel
          projectId={project._id}
          projectName={project.name}
          yourRole={yourRole}
          onClose={() => setCodeBrowserOpen(false)}
        />
      )}
    </AppShell>
  );
}
