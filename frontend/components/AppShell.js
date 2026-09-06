"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import CommandPalette from "./CommandPalette";

export default function AppShell({ projects = [], children }) {
  const { user, logout } = useAuth();
  const [showHint, setShowHint] = useState(true);

  return (
    <div className="flex h-screen bg-bg text-ink">
      {/* project rail */}
      <div className="flex w-16 flex-col items-center gap-3 bg-surface py-4 shadow-card">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-bg font-serif text-sm text-gold-deep">
          NL
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {projects.map((p) => (
            <Link
              key={p._id}
              href={`/projects/${p.slug}`}
              title={p.name}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-xs font-medium text-ink-muted transition-colors hover:border-gold hover:text-ink"
            >
              {p.name.slice(0, 2).toUpperCase()}
            </Link>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={logout}
            title="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <span className="text-xs">{user?.username?.slice(0, 2).toUpperCase() || "?"}</span>
          </button>
        </div>
      </div>

      {/* main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {showHint && (
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 text-xs text-ink-muted">
            <span>
              Press <kbd className="rounded border border-border-strong bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd> to jump anywhere
            </span>
            <button onClick={() => setShowHint(false)} className="text-ink-faint hover:text-ink">
              dismiss
            </button>
          </div>
        )}
        {children}
      </div>

      <CommandPalette projects={projects} />
    </div>
  );
}
