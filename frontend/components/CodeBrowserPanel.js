"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "../lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const ROLES = ["GUEST", "MEMBER", "CONTRIBUTOR", "MAINTAINER", "OWNER"];
const atLeast = (role, min) => ROLES.indexOf(role) >= ROLES.indexOf(min);

const EXT_LANGUAGE = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  json: "json",
  md: "markdown",
  html: "html",
  css: "css",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rs: "rust",
  sh: "shell",
  yml: "yaml",
  yaml: "yaml",
};

function languageFor(path) {
  const ext = path.split(".").pop();
  return EXT_LANGUAGE[ext] || "plaintext";
}

// Turns a flat list of paths into a nested tree for rendering, e.g.
// "src/utils/math.js" -> { src: { utils: { "math.js": null } } }
function buildTree(files) {
  const root = {};
  files.forEach(({ path }) => {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = { __isFile: true, __path: path };
      } else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  });
  return root;
}

function TreeNode({ name, node, depth, onSelectFile, selectedPath }) {
  const [open, setOpen] = useState(depth < 1);

  if (node.__isFile) {
    return (
      <button
        onClick={() => onSelectFile(node.__path)}
        className={`flex w-full items-center gap-1.5 px-2 py-1 text-left font-mono text-xs transition-colors ${
          selectedPath === node.__path ? "bg-gold-bg text-gold-deep" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {name}
      </button>
    );
  }

  const entries = Object.entries(node);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left font-mono text-xs text-ink-muted hover:bg-surface-raised hover:text-ink"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <span className="text-ink-faint">{open ? "▾" : "▸"}</span> {name}
      </button>
      {open &&
        entries.map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            depth={depth + 1}
            onSelectFile={onSelectFile}
            selectedPath={selectedPath}
          />
        ))}
    </div>
  );
}

export default function CodeBrowserPanel({ projectId, projectName, yourRole, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commit, setCommit] = useState(null);
  const [tree, setTree] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canEdit = atLeast(yourRole, "MAINTAINER");
  const dirty = fileContent !== originalContent;

  function loadFileTree() {
    setLoading(true);
    api
      .getRepoFiles(projectId)
      .then((d) => {
        setCommit(d.commit);
        setTree(buildTree(d.files));
        if (d.files[0]) selectFile(d.files[0].path);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadFileTree, [projectId]);

  function selectFile(path) {
    if (dirty && !window.confirm("Discard unsaved changes to this file?")) return;
    setSelectedPath(path);
    setFileError("");
    setSaveError("");
    setFileLoading(true);
    api
      .getRepoFile(projectId, path)
      .then((d) => {
        setFileContent(d.content);
        setOriginalContent(d.content);
      })
      .catch((err) => setFileError(err.message))
      .finally(() => setFileLoading(false));
  }

  async function saveFile() {
    setSaving(true);
    setSaveError("");
    try {
      await api.updateRepoFile(projectId, { path: selectedPath, content: fileContent });
      setOriginalContent(fileContent);
      loadFileTree(); // refresh commit info (a save creates a new commit)
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <span className="text-sm font-medium text-ink">{projectName} — code</span>
          {commit && (
            <span className="ml-2 font-mono text-xs text-ink-faint">
              {commit.message} · {new Date(commit.createdAt).toLocaleString()}
            </span>
          )}
          {!canEdit && (
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] text-ink-faint">
              read-only — maintainer/owner can edit
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          {canEdit && (
            <button
              onClick={saveFile}
              disabled={!dirty || saving}
              className="rounded-md bg-gold-deep px-3 py-1 text-xs font-medium text-white hover:bg-gold-dim disabled:opacity-40"
            >
              {saving ? "Saving..." : dirty ? "Save changes" : "Saved"}
            </button>
          )}
          <button onClick={onClose} className="text-xs text-ink-faint hover:text-ink">
            Close
          </button>
        </div>
      </div>

      {loading && <div className="p-6 text-sm text-ink-faint">Loading...</div>}
      {error && (
        <div className="p-6 text-sm text-ink-muted">
          {/no commits/i.test(error) ? (
            <>No code has been pushed to this project yet — use the <span className="font-mono text-gold-deep">nova-link</span> CLI to push.</>
          ) : (
            error
          )}
        </div>
      )}

      {!loading && !error && tree && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-none overflow-y-auto border-r border-border bg-surface py-2">
            {Object.entries(tree).map(([name, node]) => (
              <TreeNode key={name} name={name} node={node} depth={0} onSelectFile={selectFile} selectedPath={selectedPath} />
            ))}
          </div>
          <div className="flex-1" style={{ background: "#1B1710" }}>
            {fileLoading && <div className="p-6 text-sm" style={{ color: "#8A7F68" }}>Loading file...</div>}
            {fileError && <div className="p-6 text-sm text-red-400">{fileError}</div>}
            {!fileLoading && !fileError && selectedPath && (
              <MonacoEditor
                height="100%"
                language={languageFor(selectedPath)}
                theme="vs-dark"
                value={fileContent}
                onChange={(value) => canEdit && setFileContent(value ?? "")}
                options={{ readOnly: !canEdit, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
