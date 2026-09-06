"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const ROLES = ["GUEST", "MEMBER", "CONTRIBUTOR", "MAINTAINER", "OWNER"];
const atLeast = (role, min) => ROLES.indexOf(role) >= ROLES.indexOf(min);

export default function MembersPanel({ projectId, yourRole, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("CONTRIBUTOR");
  const [error, setError] = useState("");

  const canManage = atLeast(yourRole, "MAINTAINER");

  function refresh() {
    setLoading(true);
    api
      .listMembers(projectId)
      .then((d) => setMembers(d.members))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [projectId]);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setError("");
    try {
      await api.setMemberRole(projectId, { username: username.trim(), role });
      setUsername("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(memberUsername, newRole) {
    try {
      await api.setMemberRole(projectId, { username: memberUsername, role: newRole });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-ink/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-80 flex-col bg-surface shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-ink">Members</span>
          <button onClick={onClose} className="text-xs text-ink-faint hover:text-ink">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="text-sm text-ink-faint">Loading...</p>}
          {!loading && members.length === 0 && (
            <p className="text-sm text-ink-faint">No members yet.</p>
          )}
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m._id} className="flex items-center justify-between">
                <span className="text-sm text-ink">{m.user?.username}</span>
                {canManage ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.user.username, e.target.value)}
                    className="rounded border border-border-strong bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-ink-muted outline-none focus:border-gold"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-xs text-gold">{m.role}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {canManage && (
          <form onSubmit={submit} className="border-t border-border p-3">
            <div className="mb-2 text-xs text-ink-muted">Add a member by username</div>
            <div className="flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="flex-1 rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-gold"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded border border-border-strong bg-surface-raised px-1.5 py-1.5 text-xs outline-none focus:border-gold"
              >
                {ROLES.filter((r) => r !== "OWNER").map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-gold-deep py-1.5 text-xs font-medium text-white hover:bg-gold-dim"
            >
              Add / update
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
