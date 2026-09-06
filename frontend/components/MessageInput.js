"use client";

import { useState } from "react";

export default function MessageInput({ onSend, onStartCall, channelName }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <form onSubmit={submit} className="border-t border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 focus-within:border-gold">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Message #${channelName || ""}`}
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
        <button
          type="button"
          onClick={onStartCall}
          title="Start a video call in this channel"
          className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-gold hover:text-gold"
        >
          Call
        </button>
        <button
          type="submit"
          className="rounded-md bg-gold-deep px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gold-dim"
        >
          Send
        </button>
      </div>
    </form>
  );
}
