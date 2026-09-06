const mongoose = require("mongoose");

const CommitSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    message: { type: String, default: "Update" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Full gzipped-tarball snapshot of the pushed directory — not diffs.
    // Stored in S3 (same pattern NovaForge uses); this field is just the
    // object key, not the file itself.
    archiveKey: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Commit", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commit", CommitSchema);
