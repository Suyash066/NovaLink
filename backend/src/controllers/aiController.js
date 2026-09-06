const { GoogleGenAI } = require("@google/genai");
const { AiSuggestion } = require("../models/CodeSession");

// Current stable Flash-tier model as of this writing (Sept 2026). Google's
// Flash line moves fast — if this 404s again later, check
// https://ai.google.dev/gemini-api/docs/models for the current name.
const MODEL = "gemini-3.8-flash";

const SYSTEM_PROMPT = `You are a pair-programming assistant embedded in a
developer chat platform. You are shown a code snippet and a request
(explain / refactor / fix / general question). Answer concisely and
concretely. When you suggest a code change, return the full corrected
snippet in a fenced code block.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt({ language, code, prompt }) {
  return `Language: ${language || "unknown"}\n\nCode:\n\`\`\`\n${code || ""}\n\`\`\`\n\nRequest: ${prompt}`;
}

// Non-streaming REST endpoint. The web editor panel prefers the streaming
// socket event ai_request / ai_response_chunk instead (see sockets/index.js).
async function requestSuggestion(req, res) {
  const { codeSessionId, prompt, code, language } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt({ language, code, prompt }),
    config: { systemInstruction: SYSTEM_PROMPT },
  });
  const response = result.text;

  let suggestion = null;
  if (codeSessionId) {
    suggestion = await AiSuggestion.create({
      codeSession: codeSessionId,
      requestedBy: req.user._id,
      prompt,
      response,
    });
  }

  res.json({ response, suggestion });
}

module.exports = { requestSuggestion, ai, MODEL, buildPrompt, SYSTEM_PROMPT };