const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    // optional link back to a NovaForge repository, so system events
    // (commit/push/revert) can be attributed to this project
    novaForgeRepoId: { type: String, default: null },
    // nova-link's own lightweight code history — see models/Commit.js.
    // Separate from novaForgeRepoId above; this project can have its own
    // pushed snapshots independent of any NovaForge repo.
    headCommit: { type: mongoose.Schema.Types.ObjectId, ref: "Commit", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
