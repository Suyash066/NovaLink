"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { SocketYjsProvider } from "../lib/socketYjsProvider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = ["javascript", "typescript", "python", "json", "markdown", "html", "css"];
const QUICK_ACTIONS = [
  { label: "Explain", prompt: "Explain what this code does." },
  { label: "Refactor", prompt: "Suggest a cleaner refactor of this code." },
  { label: "Fix", prompt: "Find and fix any bugs in this code." },
];

export default function CodeEditorPanel({ socket, channelId, channelName, onClose }) {
  const [filename, setFilename] = useState("scratch.js");
  const [language, setLanguage] = useState("javascript");
  const [prompt, setPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState([]); // [{ prompt, response, requestedBy, createdAt }]
  const [streamingResponse, setStreamingResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const editorRef = useRef(null);
  const docRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const lastPromptRef = useRef("");
  const streamingResponseRef = useRef("");
  const historyEndRef = useRef(null);

  // One shared Y.Doc per channel — everyone who opens the editor in this
  // channel is editing the same buffer. sessionId doubles as the Yjs room key.
  const sessionId = `code:${channelId}`;

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
    };
  }, []);

  // restores saved AI conversation for this channel when the panel opens
  useEffect(() => {
    if (!socket || !channelId) return;
    socket.emit("get_ai_history", { channelId }, (res) => {
      if (res?.ok) setAiHistory(res.history);
      setHistoryLoaded(true);
    });
  }, [socket, channelId]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: "end" });
  }, [aiHistory.length, streamingResponse]);

  useEffect(() => {
    if (!socket) return;
    function onChunk({ sessionId: sid, delta }) {
      if (sid !== sessionId) return;
      setStreamingResponse((prev) => prev + delta);
    }
    function onDone({ sessionId: sid }) {
      if (sid !== sessionId) return;
      setAiLoading(false);
      setAiHistory((prev) => [
        ...prev,
        { prompt: lastPromptRef.current, response: streamingResponseRef.current, createdAt: new Date().toISOString() },
      ]);
      setStreamingResponse("");
    }
    function onError({ sessionId: sid, error }) {
      if (sid !== sessionId) return;
      setAiError(error);
      setAiLoading(false);
      setStreamingResponse("");
    }
    socket.on("ai_response_chunk", onChunk);
    socket.on("ai_response_done", onDone);
    socket.on("ai_response_error", onError);
    return () => {
      socket.off("ai_response_chunk", onChunk);
      socket.off("ai_response_done", onDone);
      socket.off("ai_response_error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, sessionId]);

  // onDone fires after the chunk-driven state update; keep a ref in sync
  // with streamingResponse so onDone can read its latest value without a
  // stale closure over the state variable.
  useEffect(() => {
    streamingResponseRef.current = streamingResponse;
  }, [streamingResponse]);

  function handleEditorMount(editor) {
    editorRef.current = editor;

    const doc = new Y.Doc();
    docRef.current = doc;
    const ytext = doc.getText("monaco");

    const provider = new SocketYjsProvider(socket, sessionId, doc);
    providerRef.current = provider;

    const model = editor.getModel();
    bindingRef.current = new MonacoBinding(ytext, model, new Set([editor]));
  }

  function runPrompt(text) {
    if (!text.trim() || aiLoading) return;
    const code = editorRef.current?.getValue() || "";
    lastPromptRef.current = text.trim();
    setStreamingResponse("");
    setAiError("");
    setAiLoading(true);
    socket.emit("ai_request", { sessionId, channelId, prompt: text.trim(), code, language });
  }

  function submitPrompt(e) {
    e.preventDefault();
    runPrompt(prompt);
    setPrompt("");
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-ink/95">
      <div className="flex flex-1 flex-col" style={{ background: "#1B1710" }}>
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#332C1E" }}>
          <div className="flex items-center gap-3">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-transparent font-mono text-xs outline-none"
              style={{ color: "#D8CFB8" }}
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded border bg-transparent px-1.5 py-0.5 text-xs"
              style={{ borderColor: "#332C1E", color: "#8A7F68" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l} style={{ background: "#1B1710" }}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs" style={{ color: "#5C5346" }}>
            syncing live in #{channelName}
          </span>
        </div>
        <div className="flex-1">
          <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
            defaultValue=""
            onMount={handleEditorMount}
            options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
          />
        </div>
      </div>

      <div className="flex w-96 flex-none flex-col bg-bg">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium text-ink">AI assist</span>
          <button onClick={onClose} className="text-xs text-ink-faint hover:text-ink">
            Close
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => runPrompt(action.prompt)}
              disabled={aiLoading}
              className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-ink">
          {historyLoaded && aiHistory.length === 0 && !aiLoading && !streamingResponse && !aiError && (
            <p className="text-sm text-ink-faint">
              Ask a question about the code, or use a quick action above.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {aiHistory.map((turn, i) => (
              <div key={i}>
                <div className="mb-1 font-mono text-xs text-gold-deep">{turn.prompt}</div>
                <p className="whitespace-pre-wrap leading-relaxed text-ink-muted">{turn.response}</p>
              </div>
            ))}

            {aiLoading && (
              <div>
                <div className="mb-1 font-mono text-xs text-gold-deep">{lastPromptRef.current}</div>
                <p className="whitespace-pre-wrap leading-relaxed text-ink-muted">
                  {streamingResponse}
                  <span className="text-ink-faint">...</span>
                </p>
              </div>
            )}
          </div>

          {aiError && <p className="mt-2 text-red-500">{aiError}</p>}
          <div ref={historyEndRef} />
        </div>

        <form onSubmit={submitPrompt} className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 focus-within:border-gold">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about this code"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="rounded-md bg-gold-deep px-3 py-1 text-xs font-medium text-white hover:bg-gold-dim disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
