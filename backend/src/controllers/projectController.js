const Project = require("../models/Project");
const Membership = require("../models/Membership");
const Channel = require("../models/Channel");
const User = require("../models/User");

async function createProject(req, res) {
  const { name, slug, description, visibility, novaForgeRepoId } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });

  const project = await Project.create({
    name,
    slug,
    description,
    visibility: visibility || "public",
    owner: req.user._id,
    novaForgeRepoId: novaForgeRepoId || null,
  });

  await Membership.create({ user: req.user._id, project: project._id, role: "OWNER" });

  // Seed the three default channels described in the spec
  await Channel.insertMany([
    { project: project._id, name: "general", kind: "PUBLIC", minRoleToRead: "GUEST", minRoleToWrite: "MEMBER" },
    { project: project._id, name: "dev", kind: "DEV", minRoleToRead: "CONTRIBUTOR", minRoleToWrite: "CONTRIBUTOR" },
    { project: project._id, name: "maker", kind: "MAKER", minRoleToRead: "MAINTAINER", minRoleToWrite: "MAINTAINER" },
  ]);

  res.status(201).json({ project });
}

async function listProjects(req, res) {
  const projects = await Project.find({
    $or: [{ visibility: "public" }, { owner: req.user._id }],
  }).sort({ createdAt: -1 });
  res.json({ projects });
}

async function getProject(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
}

// MAINTAINER+ only — enforced by requireProjectRole in the route.
// Looks the user up by username so the UI can add someone by name — the
// owner is never expected to know a raw Mongo _id.
async function setMemberRole(req, res) {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: "username and role are required" });

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: `No user found with username "${username}"` });

  const membership = await Membership.findOneAndUpdate(
    { user: user._id, project: req.params.projectId },
    { role },
    { upsert: true, new: true }
  ).populate("user", "username avatarUrl");

  res.json({ membership });
}

// Visible to any authenticated user — knowing who's on a project isn't
// sensitive, only changing roles is (that stays MAINTAINER+ above).
async function listMembers(req, res) {
  const members = await Membership.find({ project: req.params.projectId })
    .populate("user", "username avatarUrl")
    .sort({ role: -1 });
  res.json({ members });
}

module.exports = { createProject, listProjects, getProject, setMemberRole, listMembers };
