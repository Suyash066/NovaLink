const mongoose = require("mongoose");
const { ROLES } = require("../utils/roles");

const MembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    role: { type: String, enum: ROLES, default: "MEMBER" },
  },
  { timestamps: true }
);

MembershipSchema.index({ user: 1, project: 1 }, { unique: true });

module.exports = mongoose.model("Membership", MembershipSchema);
