"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {messages.map((m) => {
        if (m.kind === "SYSTEM") {
          return (
            <div key={m._id} className="my-2 flex items-center gap-2 text-xs text-emerald">
              <span className="font-mono">*</span>
              <span>{m.body}</span>
              <span className="text-ink-faint">{format(new Date(m.createdAt), "HH:mm")}</span>
            </div>
          );
        }
        return (
          <div key={m._id} className="mb-3 flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-md bg-surface-raised text-[11px] font-medium text-ink-muted">
              {(m.author?.username || "??").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink">{m.author?.username || "unknown"}</span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {format(new Date(m.createdAt), "HH:mm")}
                </span>
              </div>
              <div className="text-sm text-ink-muted">{m.body}</div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
