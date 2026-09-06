const { v4: uuidv4 } = require("uuid");
const Project = require("../models/Project");
const Membership = require("../models/Membership");
const Commit = require("../models/Commit");
const PullRequest = require("../models/PullRequest");
const { atLeast } = require("../utils/roles");
const { getUploadUrl, getDownloadUrl, getObjectBuffer, putObjectBuffer } = require("../config/s3");
const { listArchiveFiles, readArchiveFile, repackArchiveWithFile } = require("../utils/archive");

async function roleFor(userId, projectId) {
  const membership = await Membership.findOne({ user: userId, project: projectId });
  return membership ? membership.role : "GUEST";
}

async function canRead(userId, project) {
  if (project.visibility === "public") return true;
  const role = await roleFor(userId, project._id);
  return role !== "GUEST";
}

// Step 1 of a push: check permission, hand back a presigned S3 PUT URL.
// The actual file goes straight from the CLI to S3 — never through this
// server, so there's no body-size limit to worry about here.
async function pushInit(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (role === "CONTRIBUTOR") {
    return res.status(403).json({
      error: "Contributors can't push directly — open a pull request instead: `nova-link pr create`.",
    });
  }
  if (!atLeast(role, "MAINTAINER")) {
    return res.status(403).json({ error: "You don't have permission to push to this project." });
  }

  const archiveKey = `projects/${project._id}/commits/${uuidv4()}.tar.gz`;
  const uploadUrl = await getUploadUrl(archiveKey);
  res.json({ uploadUrl, archiveKey });
}

// Step 2 of a push: the CLI has already PUT the archive to S3 using the
// key from pushInit — this just records the commit. Role is re-checked
// here too (defense in depth — pushInit's check alone isn't enough to
// trust, since nothing stops a client from calling finalize directly).
async function pushFinalize(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "MAINTAINER")) {
    return res.status(403).json({ error: "You don't have permission to push to this project." });
  }

  const { message, archiveKey } = req.body;
  if (!archiveKey) return res.status(400).json({ error: "archiveKey is required" });

  const commit = await Commit.create({
    project: project._id,
    message: message || "Update",
    author: req.user._id,
    archiveKey,
    parent: project.headCommit,
  });

  project.headCommit = commit._id;
  await project.save();

  res.status(201).json({ commit: { _id: commit._id, message: commit.message, createdAt: commit.createdAt } });
}

// Used by both `nova-link clone` (empty destination) and `nova-link pull`
// (existing cloned directory) — hands back a short-lived presigned GET URL
// rather than streaming the archive through this server.
async function getLatestCommit(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (!(await canRead(req.user._id, project))) {
    return res.status(403).json({ error: "You don't have access to this project's code." });
  }
  if (!project.headCommit) {
    return res.status(404).json({ error: "No commits yet on this project." });
  }

  const commit = await Commit.findById(project.headCommit);
  const downloadUrl = await getDownloadUrl(commit.archiveKey);

  res.json({
    commit: { _id: commit._id, message: commit.message, createdAt: commit.createdAt, downloadUrl },
  });
}

async function pullRequestInit(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "CONTRIBUTOR")) {
    return res.status(403).json({ error: "You need at least CONTRIBUTOR access to open a pull request." });
  }

  const archiveKey = `projects/${project._id}/pull-requests/${uuidv4()}.tar.gz`;
  const uploadUrl = await getUploadUrl(archiveKey);
  res.json({ uploadUrl, archiveKey });
}

async function pullRequestFinalize(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "CONTRIBUTOR")) {
    return res.status(403).json({ error: "You need at least CONTRIBUTOR access to open a pull request." });
  }

  const { message, archiveKey } = req.body;
  if (!archiveKey) return res.status(400).json({ error: "archiveKey is required" });

  const pr = await PullRequest.create({
    project: project._id,
    author: req.user._id,
    message: message || "Update",
    archiveKey,
    baseCommit: project.headCommit,
  });

  res.status(201).json({ pullRequest: { _id: pr._id, message: pr.message, status: pr.status, createdAt: pr.createdAt } });
}

async function listPullRequests(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (!(await canRead(req.user._id, project))) {
    return res.status(403).json({ error: "You don't have access to this project." });
  }

  const pullRequests = await PullRequest.find({ project: project._id })
    .select("-archiveKey")
    .populate("author", "username")
    .sort({ createdAt: -1 });

  res.json({ pullRequests });
}

// No merge/conflict handling, deliberately — the PR's snapshot simply
// becomes the new HEAD commit. Reuses the same S3 object (no re-upload
// needed) since the archive doesn't change on accept.
async function acceptPullRequest(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "MAINTAINER")) {
    return res.status(403).json({ error: "Only maintainers or the owner can accept pull requests." });
  }

  const pr = await PullRequest.findById(req.params.prId);
  if (!pr || pr.status !== "OPEN") {
    return res.status(404).json({ error: "Pull request not found or already resolved" });
  }

  const commit = await Commit.create({
    project: project._id,
    message: `Merged PR: ${pr.message}`,
    author: req.user._id,
    archiveKey: pr.archiveKey,
    parent: project.headCommit,
  });

  project.headCommit = commit._id;
  await project.save();

  pr.status = "MERGED";
  pr.resolvedBy = req.user._id;
  pr.resolvedAt = new Date();
  await pr.save();

  res.json({ commit: { _id: commit._id, message: commit.message, createdAt: commit.createdAt } });
}

async function rejectPullRequest(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "MAINTAINER")) {
    return res.status(403).json({ error: "Only maintainers or the owner can reject pull requests." });
  }

  const pr = await PullRequest.findById(req.params.prId);
  if (!pr || pr.status !== "OPEN") {
    return res.status(404).json({ error: "Pull request not found or already resolved" });
  }

  pr.status = "REJECTED";
  pr.resolvedBy = req.user._id;
  pr.resolvedAt = new Date();
  await pr.save();

  res.json({ ok: true });
}

// --- Web code viewer/editor (separate from the CLI's push/pull) ---
// Extracts the latest pushed archive in-memory to list files or read one
// file's contents. Everyone with read access can view; MAINTAINER+ can also
// save an edit, which repacks the archive and creates a new commit —
// nothing here touches the CLI's flow, it's just another way to push a
// one-file change.

function isLikelyBinary(buffer) {
  const sample = buffer.subarray(0, 1000);
  return sample.includes(0);
}

async function getLatestCommitFileTree(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (!(await canRead(req.user._id, project))) {
    return res.status(403).json({ error: "You don't have access to this project's code." });
  }
  if (!project.headCommit) {
    return res.status(404).json({ error: "No commits yet on this project." });
  }

  const commit = await Commit.findById(project.headCommit);
  const buffer = await getObjectBuffer(commit.archiveKey);
  const { files, truncated } = await listArchiveFiles(buffer);

  res.json({
    commit: { _id: commit._id, message: commit.message, createdAt: commit.createdAt },
    files,
    truncated,
  });
}

async function getLatestCommitFile(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (!(await canRead(req.user._id, project))) {
    return res.status(403).json({ error: "You don't have access to this project's code." });
  }
  if (!project.headCommit) {
    return res.status(404).json({ error: "No commits yet on this project." });
  }

  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "path query parameter is required" });

  const commit = await Commit.findById(project.headCommit);
  const buffer = await getObjectBuffer(commit.archiveKey);
  const result = await readArchiveFile(buffer, filePath);

  if (!result) return res.status(404).json({ error: "File not found in the latest commit" });
  if (result.tooLarge) {
    return res.status(413).json({ error: `File is too large to view here (${(result.size / 1024).toFixed(0)}KB).` });
  }
  if (isLikelyBinary(result.buffer)) {
    return res.status(415).json({ error: "This looks like a binary file — can't display it as text." });
  }

  res.json({ path: filePath, content: result.buffer.toString("utf8") });
}

// MAINTAINER+ only. Downloads the current archive, rewrites one file inside
// it, re-uploads under a new S3 key, and records it as a new commit — same
// commit history the CLI's `push` writes to, just a different entry point.
async function updateLatestCommitFile(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const role = await roleFor(req.user._id, project._id);
  if (!atLeast(role, "MAINTAINER")) {
    return res.status(403).json({ error: "Only maintainers or the owner can edit code on the website." });
  }
  if (!project.headCommit) {
    return res.status(404).json({ error: "No commits yet — push from the CLI first." });
  }

  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: "path and content are required" });
  }

  const commit = await Commit.findById(project.headCommit);
  const currentArchive = await getObjectBuffer(commit.archiveKey);
  const newArchive = await repackArchiveWithFile(currentArchive, filePath, content);

  const archiveKey = `projects/${project._id}/commits/${uuidv4()}.tar.gz`;
  await putObjectBuffer(archiveKey, newArchive);

  const newCommit = await Commit.create({
    project: project._id,
    message: `Edited ${filePath} via web`,
    author: req.user._id,
    archiveKey,
    parent: project.headCommit,
  });

  project.headCommit = newCommit._id;
  await project.save();

  res.json({ commit: { _id: newCommit._id, message: newCommit.message, createdAt: newCommit.createdAt } });
}

module.exports = {
  pushInit,
  pushFinalize,
  getLatestCommit,
  pullRequestInit,
  pullRequestFinalize,
  listPullRequests,
  acceptPullRequest,
  rejectPullRequest,
  getLatestCommitFileTree,
  getLatestCommitFile,
  updateLatestCommitFile,
};
