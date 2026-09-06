const mongoose = require("mongoose");
const { ROLES } = require("../utils/roles");

const ChannelSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["PUBLIC", "DEV", "MAKER"], default: "PUBLIC" },
    minRoleToRead: { type: String, enum: ROLES, default: "GUEST" },
    minRoleToWrite: { type: String, enum: ROLES, default: "MEMBER" },
  },
  { timestamps: true }
);

ChannelSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Channel", ChannelSchema);
