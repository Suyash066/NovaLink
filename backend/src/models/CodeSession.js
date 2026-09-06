const mongoose = require("mongoose");

const CodeSessionSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    filename: { type: String, required: true },
    yjsDocId: { type: String, required: true }, // room id for the y-websocket / Socket.IO CRDT binding
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const AiSuggestionSchema = new mongoose.Schema(
  {
    codeSession: { type: mongoose.Schema.Types.ObjectId, ref: "CodeSession", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    prompt: { type: String, required: true },
    response: { type: String, default: "" },
    applied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = {
  CodeSession: mongoose.model("CodeSession", CodeSessionSchema),
  AiSuggestion: mongoose.model("AiSuggestion", AiSuggestionSchema),
};
