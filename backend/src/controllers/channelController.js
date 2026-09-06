const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const { atLeast } = require("../utils/roles");

async function listChannels(req, res) {
  const channels = await Channel.find({ project: req.params.projectId });
  const membership = await Membership.findOne({ user: req.user._id, project: req.params.projectId });
  const role = membership ? membership.role : "GUEST";

  // only return channels this user is allowed to see
  const visible = channels.filter((c) => atLeast(role, c.minRoleToRead));
  res.json({ channels: visible, yourRole: role });
}

// MAINTAINER+ only — enforced by requireProjectRole in the route
async function createChannel(req, res) {
  const { name, kind, minRoleToRead, minRoleToWrite } = req.body;
  const channel = await Channel.create({
    project: req.params.projectId,
    name,
    kind: kind || "PUBLIC",
    minRoleToRead: minRoleToRead || "GUEST",
    minRoleToWrite: minRoleToWrite || "MEMBER",
  });
  res.status(201).json({ channel });
}

module.exports = { listChannels, createChannel };
