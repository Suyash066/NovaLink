const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null for SYSTEM messages
    body: { type: String, required: true },
    kind: { type: String, enum: ["USER", "SYSTEM"], default: "USER" },
    // for SYSTEM messages emitted by the nova CLI: "commit" | "push" | "revert" etc.
    systemEvent: { type: String, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
