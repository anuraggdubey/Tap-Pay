const express = require("express");
const http = require("http");
const cors = require("cors");
const config = require("./config");
const db = require("./db");
const { initSocket } = require("./socket");
const usernameRoutes = require("./routes/username");
const sessionRoutes = require("./routes/session");

const app = express();
const server = http.createServer(app);

// ── Middleware ──
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

// ── Health check ──
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use("/api/v1/username", usernameRoutes);
app.use("/api/v1/session", sessionRoutes);

// ── 404 handler ──
app.use((_req, res) => {
  res.status(404).json({ error: "not_found", details: "Endpoint does not exist" });
});

// ── Error handler ──
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_error", details: "An unexpected error occurred" });
});

// ── Socket.io ──
initSocket(server, config.corsOrigins);

// ── Session expiry sweep (every 30 seconds) ──
setInterval(() => {
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE sessions SET status = 'expired' WHERE status = 'pending' AND expires_at < ?")
    .run(now);
  if (result.changes > 0) {
    console.log(`[sweep] Expired ${result.changes} stale sessions`);
  }
}, config.sessionSweepIntervalMs);

// ── Start ──
server.listen(config.port, () => {
  console.log(`TapPay backend running on port ${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/v1/health`);
});

module.exports = app;
