const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokens");

async function signup(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) return res.status(409).json({ error: "Username or email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.status(201).json({
    user: { id: user._id, username: user.username, email: user.email },
    accessToken,
    refreshToken,
  });
}

async function login(req, res) {
  const { emailOrUsername, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.json({
    user: { id: user._id, username: user.username, email: user.email },
    accessToken,
    refreshToken,
  });
}

// Same login flow, but marks the account as CLI-linked. The `nova login`
// command hits this endpoint so the terminal and web client share one identity.
async function cliLogin(req, res) {
  const { emailOrUsername, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  user.cliLinkedAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.json({ username: user.username, accessToken, refreshToken });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ accessToken: signAccessToken(user) });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

module.exports = { signup, login, cliLogin, refresh };
