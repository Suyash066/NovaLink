const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireProjectRole } = require("../middleware/role");
const {
  createProject,
  listProjects,
  getProject,
  setMemberRole,
  listMembers,
} = require("../controllers/projectController");
const { listChannels, createChannel } = require("../controllers/channelController");
const {
  pushInit,
  pushFinalize,
  getLatestCommit,
  pullRequestInit,
  pullRequestFinalize,
  listPullRequests,
  acceptPullRequest,
  rejectPullRequest,
  getLatestCommitFileTree,
  getLatestCommitFile,
  updateLatestCommitFile,
} = require("../controllers/repoController");

const router = express.Router();

router.use(requireAuth);

router.post("/", createProject);
router.get("/", listProjects);
router.get("/:projectId", getProject);
router.get("/:projectId/members", listMembers);
router.patch("/:projectId/members", requireProjectRole("MAINTAINER"), setMemberRole);

router.get("/:projectId/channels", listChannels);
router.post("/:projectId/channels", requireProjectRole("MAINTAINER"), createChannel);

// Role checks live inside repoController itself, not middleware — push and
// pull-request creation need different error messages depending on whether
// the caller is CONTRIBUTOR (told to open a PR) or below (flatly denied).
// Each write is a two-step init/finalize around a direct-to-S3 upload.
router.post("/:projectId/commits/init", pushInit);
router.post("/:projectId/commits/finalize", pushFinalize);
router.get("/:projectId/commits/latest", getLatestCommit);
router.post("/:projectId/pull-requests/init", pullRequestInit);
router.post("/:projectId/pull-requests/finalize", pullRequestFinalize);
router.get("/:projectId/pull-requests", listPullRequests);
router.post("/:projectId/pull-requests/:prId/accept", acceptPullRequest);
router.post("/:projectId/pull-requests/:prId/reject", rejectPullRequest);

// Web code viewer — extracts the archive server-side rather than handing it
// to the browser, so the frontend never needs to understand tar/gzip.
// Viewing is open to anyone with read access; editing (PUT) is MAINTAINER+,
// checked inside the controller itself.
router.get("/:projectId/commits/latest/files", getLatestCommitFileTree);
router.get("/:projectId/commits/latest/file", getLatestCommitFile);
router.put("/:projectId/commits/latest/file", updateLatestCommitFile);

module.exports = router;
