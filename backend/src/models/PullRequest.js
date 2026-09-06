const mongoose = require("mongoose");

const PullRequestSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, default: "Update" },
    archiveKey: { type: String, required: true }, // S3 object key, not the file itself
    baseCommit: { type: mongoose.Schema.Types.ObjectId, ref: "Commit", default: null },
    status: { type: String, enum: ["OPEN", "MERGED", "REJECTED"], default: "OPEN" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PullRequest", PullRequestSchema);
