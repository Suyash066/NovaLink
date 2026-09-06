const express = require("express");
const { signup, login, cliLogin, refresh } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/cli-login", cliLogin); // used by `nova login`
router.post("/refresh", refresh);

module.exports = router;
