const Message = require("../models/Message");
const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const { atLeast } = require("../utils/roles");

async function getChannelHistory(req, res) {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const membership = await Membership.findOne({ user: req.user._id, project: channel.project });
  const role = membership ? membership.role : "GUEST";
  if (!atLeast(role, channel.minRoleToRead)) {
    return res.status(403).json({ error: "You don't have access to this channel" });
  }

  const before = req.query.before ? new Date(req.query.before) : new Date();
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const messages = await Message.find({ channel: channel._id, createdAt: { $lt: before } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("author", "username avatarUrl");

  res.json({ messages: messages.reverse() });
}

module.exports = { getChannelHistory };
