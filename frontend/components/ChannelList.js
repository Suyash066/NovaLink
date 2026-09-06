"use client";

import { useState } from "react";

const KIND_LABEL = { PUBLIC: "Public", DEV: "Developers", MAKER: "Makers" };
const ROLES = ["GUEST", "MEMBER", "CONTRIBUTOR", "MAINTAINER", "OWNER"];
const atLeast = (role, min) => ROLES.indexOf(role) >= ROLES.indexOf(min);

export default function ChannelList({ channels, activeChannelId, onSelect, yourRole, onCreateChannel }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("PUBLIC");
  const [error, setError] = useState("");

  const grouped = channels.reduce((acc, c) => {
    (acc[c.kind] ||= []).push(c);
    return acc;
  }, {});

  const canManage = atLeast(yourRole, "MAINTAINER");

  const KIND_DEFAULTS = {
    PUBLIC: { minRoleToRead: "GUEST", minRoleToWrite: "MEMBER" },
    DEV: { minRoleToRead: "CONTRIBUTOR", minRoleToWrite: "CONTRIBUTOR" },
    MAKER: { minRoleToRead: "MAINTAINER", minRoleToWrite: "MAINTAINER" },
  };

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await onCreateChannel({ name: name.trim(), kind, ...KIND_DEFAULTS[kind] });
      setName("");
      setCreating(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs text-ink-faint">Your role</div>
        <div className="font-mono text-sm text-gold">{yourRole}</div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(grouped).map(([kind, list]) => (
          <div key={kind} className="mb-3">
            <div className="px-4 pb-1 pt-2 text-xs font-medium text-ink-faint">
              {KIND_LABEL[kind] || kind}
            </div>
            {list.map((c) => (
              <button
                key={c._id}
                onClick={() => onSelect(c)}
                className={`flex w-full items-center gap-2 px-4 py-1.5 text-left font-mono text-sm transition-colors ${
                  c._id === activeChannelId
                    ? "bg-gold-bg text-gold"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <span className="text-ink-faint">#</span>
                {c.name}
              </button>
            ))}
          </div>
        ))}

        {canManage && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="mx-4 mt-1 flex items-center gap-1 text-xs text-ink-faint hover:text-gold-deep"
          >
            + New channel
          </button>
        )}

        {canManage && creating && (
          <form onSubmit={submit} className="mx-3 mt-1 flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="channel-name"
              autoFocus
              className="rounded border border-border-strong bg-surface px-2 py-1 font-mono text-xs outline-none focus:border-gold"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-gold"
            >
              <option value="PUBLIC">Public — anyone can read</option>
              <option value="DEV">Developers — contributor+</option>
              <option value="MAKER">Makers — maintainer+</option>
            </select>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded bg-gold-deep py-1 text-xs font-medium text-white hover:bg-gold-dim">
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded px-2 text-xs text-ink-faint hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
