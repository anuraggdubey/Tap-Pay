const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const config = require("../config");
const { sessionLimiter } = require("../middleware/rateLimit");
const { verifyPayment } = require("../services/chainWatcher");
const { emitSessionUpdate } = require("../socket");

const router = express.Router();

/**
 * POST /api/v1/session/create
 * Create a new tap-pay session (pre-tap, called by sender)
 */
router.post("/create", sessionLimiter, (req, res) => {
  const { senderAddress, amountWei } = req.body;

  if (!senderAddress || !amountWei) {
    return res.status(400).json({
      error: "missing_fields",
      details: "senderAddress and amountWei are required",
    });
  }

  if (BigInt(amountWei) <= 0n) {
    return res.status(400).json({
      error: "invalid_amount",
      details: "Amount must be > 0",
    });
  }

  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionExpirySeconds * 1000);

  db.prepare(
    `INSERT INTO sessions (id, sender_address, amount_wei, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    senderAddress.toLowerCase(),
    amountWei.toString(),
    now.toISOString(),
    expiresAt.toISOString()
  );

  return res.status(201).json({
    sessionId,
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * GET /api/v1/session/:id
 * Get session status (polled by receiver after NFC tap)
 */
router.get("/:id", (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "session_not_found" });
  }

  // Check if expired
  if (session.status === "pending" && new Date(session.expires_at) < new Date()) {
    db.prepare("UPDATE sessions SET status = 'expired' WHERE id = ?").run(session.id);
    return res.status(410).json({ error: "session_expired" });
  }

  return res.json({
    sessionId: session.id,
    status: session.status,
    txHash: session.tx_hash || null,
    amountWei: session.amount_wei,
    senderAddress: session.sender_address,
    receiverAddress: session.receiver_address || null,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  });
});

/**
 * POST /api/v1/session/:id/accept
 * Register receiver acceptance (called by receiver after NFC tap + biometric)
 */
router.post("/:id/accept", (req, res) => {
  const { receiverAddress } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "session_not_found" });
  }

  if (session.status === "expired" || new Date(session.expires_at) < new Date()) {
    db.prepare("UPDATE sessions SET status = 'expired' WHERE id = ?").run(session.id);
    return res.status(410).json({ error: "session_expired" });
  }

  if (!receiverAddress) {
    return res.status(400).json({
      error: "missing_fields",
      details: "receiverAddress is required",
    });
  }

  if (receiverAddress.toLowerCase() === session.sender_address.toLowerCase()) {
    return res.status(400).json({
      error: "invalid_receiver",
      details: "Sender and receiver cannot be the same address",
    });
  }

  db.prepare(
    "UPDATE sessions SET receiver_address = ?, status = 'accepted' WHERE id = ?"
  ).run(receiverAddress.toLowerCase(), session.id);

  const updated = db.prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
  emitSessionUpdate(updated);

  return res.json({
    sessionId: updated.id,
    status: updated.status,
    receiverAddress: updated.receiver_address,
  });
});

/**
 * POST /api/v1/session/:id/complete
 * Mark session as broadcasting (called by sender after tx broadcast)
 */
router.post("/:id/complete", async (req, res) => {
  const { txHash } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "session_not_found" });
  }

  if (session.status === "expired" || new Date(session.expires_at) < new Date()) {
    db.prepare("UPDATE sessions SET status = 'expired' WHERE id = ?").run(session.id);
    return res.status(410).json({ error: "session_expired" });
  }

  if (session.status === "confirmed" || session.status === "broadcasting") {
    return res.status(409).json({ error: "session_already_completed" });
  }

  if (!txHash) {
    return res.status(400).json({ error: "missing_fields", details: "txHash is required" });
  }

  // Update to broadcasting
  db.prepare("UPDATE sessions SET status = 'broadcasting', tx_hash = ? WHERE id = ?").run(
    txHash,
    session.id
  );

  const updated = db.prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
  emitSessionUpdate(updated);

  // Async: verify on-chain and update status
  verifyPayment(txHash).then((result) => {
    if (result.confirmed) {
      db.prepare(
        "UPDATE sessions SET status = 'confirmed', receiver_address = ? WHERE id = ?"
      ).run(result.to ? result.to.toLowerCase() : null, session.id);
    } else if (result.failed) {
      db.prepare(
        "UPDATE sessions SET status = 'failed', error_reason = 'tx_reverted' WHERE id = ?"
      ).run(session.id);
    }
    const final = db.prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
    emitSessionUpdate(final);
  });

  return res.json({ status: "broadcasting" });
});

/**
 * GET /api/v1/session/history/:address
 * Transaction history for a wallet (with pagination)
 */
router.get("/history/:address", (req, res) => {
  const { address } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
  const offset = parseInt(req.query.offset || "0", 10);
  const addr = address.toLowerCase();

  const rows = db
    .prepare(
      `SELECT s.*,
        CASE
          WHEN s.sender_address = ? THEN 'sent'
          ELSE 'received'
        END as direction,
        CASE
          WHEN s.sender_address = ? THEN s.receiver_address
          ELSE s.sender_address
        END as counterparty
      FROM sessions s
      WHERE (s.sender_address = ? OR s.receiver_address = ?)
        AND s.status IN ('confirmed', 'broadcasting', 'failed')
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`
    )
    .all(addr, addr, addr, addr, limit, offset);

  const total = db
    .prepare(
      `SELECT COUNT(*) as count FROM sessions
       WHERE (sender_address = ? OR receiver_address = ?)
         AND status IN ('confirmed', 'broadcasting', 'failed')`
    )
    .get(addr, addr);

  // Resolve counterparty usernames
  const transactions = rows.map((row) => {
    let counterpartyUsername = null;
    if (row.counterparty) {
      const u = db
        .prepare("SELECT username FROM usernames WHERE wallet_address = ?")
        .get(row.counterparty);
      if (u) counterpartyUsername = u.username;
    }

    return {
      sessionId: row.id,
      direction: row.direction,
      counterparty: row.counterparty,
      counterpartyUsername,
      amountWei: row.amount_wei,
      status: row.status,
      txHash: row.tx_hash,
      timestamp: row.created_at,
    };
  });

  return res.json({ transactions, total: total.count });
});

module.exports = router;
