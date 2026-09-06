require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { registerSocketHandlers } = require("./sockets");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
// Archives go straight to S3 via presigned URLs (see repoController), so
// request bodies here are just JSON metadata — no need for a large limit.
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/", messageRoutes);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || "*", credentials: true },
});
registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
