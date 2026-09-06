const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    githubId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    // set the first time `nova login` is used from this account, so the CLI
    // and web client are provably the same identity
    cliLinkedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
