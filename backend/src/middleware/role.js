const Membership = require("../models/Membership");
const { atLeast } = require("../utils/roles");

// requireProjectRole("MAINTAINER") — expects req.params.projectId to be set.
// GUEST-level routes (e.g. reading a public channel) should skip this
// middleware entirely and check visibility instead.
function requireProjectRole(minRole) {
  return async function (req, res, next) {
    const projectId = req.params.projectId || req.body.projectId;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const membership = await Membership.findOne({ user: req.user._id, project: projectId });
    const role = membership ? membership.role : "GUEST";

    if (!atLeast(role, minRole)) {
      return res.status(403).json({ error: `Requires ${minRole}+ role in this project` });
    }

    req.projectRole = role;
    next();
  };
}

module.exports = { requireProjectRole };
