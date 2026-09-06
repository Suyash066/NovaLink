"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

export default function CommandPalette({ projects = [] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 backdrop-blur-sm pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="text-ink">
          <Command.Input
            autoFocus
            placeholder="Jump to a project, channel, or action..."
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">
              No results.
            </Command.Empty>

            <Command.Group heading="Projects" className="px-2 pb-1 pt-2 text-xs font-medium text-ink-faint [&_[cmdk-group-heading]]:px-1">
              {projects.map((p) => (
                <Command.Item
                  key={p._id}
                  onSelect={() => {
                    router.push(`/projects/${p.slug}`);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-ink data-[selected=true]:bg-gold-bg data-[selected=true]:text-gold"
                >
                  {p.name}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="px-2 pb-1 pt-2 text-xs font-medium text-ink-faint [&_[cmdk-group-heading]]:px-1">
              <Command.Item
                onSelect={() => {
                  router.push("/dashboard?new=project");
                  setOpen(false);
                }}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-ink data-[selected=true]:bg-gold-bg data-[selected=true]:text-gold"
              >
                Create new project
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
