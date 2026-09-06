"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ emailOrUsername, password });
      login(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg text-ink md:grid-cols-2">
      <div className="hidden flex-col justify-center bg-surface-raised px-12 md:flex">
        <div
          className="max-w-sm rounded-xl p-5 font-mono text-[13px] leading-relaxed shadow-soft"
          style={{ background: "#1B1710", border: "1px solid #332C1E" }}
        >
          <div className="mb-3 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#5C5346" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#5C5346" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#5C5346" }} />
          </div>
          <div className="mb-3" style={{ color: "#8A7F68" }}># in your project directory</div>
          <div style={{ color: "#D8CFB8" }}>
            <span style={{ color: "#D4B36A" }}>$</span> nova connect dev
          </div>
          <div style={{ color: "#8A7F68" }}>Connected to #dev as CONTRIBUTOR</div>
          <div className="mt-2" style={{ color: "#D8CFB8" }}>
            <span style={{ color: "#7FA88E" }}>*</span> priya pushed 2 commits to main
          </div>
          <div className="mt-1" style={{ color: "#D8CFB8" }}>[suyash] anyone free to look at the revert bug?</div>
          <div className="mt-1" style={{ color: "#D8CFB8" }}>
            <span style={{ color: "#D4B36A" }}>$</span> nova share
          </div>
          <div style={{ color: "#8A7F68" }}>Call room ready — link posted to #dev</div>
        </div>
        <p className="mt-6 max-w-sm text-sm text-ink-muted">
          Discussion, calls, and AI pairing that live next to the terminal you already have open.
        </p>
      </div>

      <div className="flex flex-col justify-center px-8 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-serif text-2xl text-ink">Log in</h1>
          <p className="mt-1 text-sm text-ink-muted">Use your nova-link account.</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">Email or username</label>
              <input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-md bg-gold-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold-dim disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            No account?{" "}
            <Link href="/signup" className="text-gold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
