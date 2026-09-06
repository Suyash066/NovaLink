"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function SignupPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.signup({ username, email, password });
      login(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-8 text-ink">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">This becomes your identity on the CLI too.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-gold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
