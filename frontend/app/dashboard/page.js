"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import CommandPalette from "../../components/CommandPalette";

export default function DashboardPage() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    api.listProjects().then((d) => setProjects(d.projects)).catch(() => {});
  }, [user]);

  async function submitCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const { project } = await api.createProject({ name, slug });
      setProjects((prev) => [project, ...prev]);
      setCreating(false);
      setName("");
      setSlug("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-ink">Your projects</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Logged in as <span className="font-mono text-ink">{user.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreating((v) => !v)}
              className="rounded-md bg-gold-deep px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-dim"
            >
              New project
            </button>
            <button onClick={logout} className="text-sm text-ink-faint hover:text-ink">
              Log out
            </button>
          </div>
        </div>

        {creating && (
          <form
            onSubmit={submitCreate}
            className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="flex-1 rounded-md border border-border-strong bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
                required
              />
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="slug"
                className="w-40 rounded-md border border-border-strong bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-gold"
                required
              />
              <button type="submit" className="rounded-md bg-gold-deep px-4 py-2 text-sm font-medium text-white hover:bg-gold-dim">
                Create
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p._id}
              href={`/projects/${p.slug}`}
              className="rounded-lg border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-soft"
            >
              <div className="text-sm font-medium text-ink">{p.name}</div>
              <div className="mt-1 font-mono text-xs text-ink-faint">{p.slug}</div>
              {p.description && <div className="mt-2 text-sm text-ink-muted">{p.description}</div>}
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="col-span-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-ink-muted">
              No projects yet. Create one to get a public, dev, and maker channel automatically.
            </div>
          )}
        </div>
      </div>
      <CommandPalette projects={projects} />
    </div>
  );
}
