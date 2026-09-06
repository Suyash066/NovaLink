const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getChannelHistory } = require("../controllers/messageController");
const { requestSuggestion } = require("../controllers/aiController");

const router = express.Router();

router.use(requireAuth);

router.get("/channels/:channelId/messages", getChannelHistory);
router.post("/ai/suggest", requestSuggestion);

module.exports = router;
