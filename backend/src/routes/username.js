const express = require("express");
const db = require("../db");
const { registerLimiter } = require("../middleware/rateLimit");
const { verifyUsernameRegistration } = require("../services/chainWatcher");

const router = express.Router();

/**
 * POST /api/v1/username/register
 * Register username → address mapping (with on-chain verification)
 */
router.post("/register", registerLimiter, async (req, res) => {
  const { username, address, signature, txHash } = req.body;

  // Basic validation
  if (!username || !address || !txHash) {
    return res.status(400).json({
      error: "missing_fields",
      details: "username, address, and txHash are required",
    });
  }

  // Validate username format (same rules as contract)
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({
      error: "invalid_username",
      details: "Must be 3-20 characters, a-z 0-9 _ only",
    });
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return res.status(400).json({
      error: "invalid_username",
      details: "Must be 3-20 characters, a-z 0-9 _ only",
    });
  }

  // Check if already taken in cache
  const existing = db.prepare("SELECT username FROM usernames WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "username_taken" });
  }

  // Verify on-chain event before trusting
  const verified = await verifyUsernameRegistration(txHash, username, address);
  if (!verified) {
    return res.status(400).json({
      error: "verification_failed",
      details: "Could not verify on-chain UsernameRegistered event for this txHash",
    });
  }

  // Insert into cache
  try {
    db.prepare(
      "INSERT INTO usernames (username, wallet_address, tx_hash) VALUES (?, ?, ?)"
    ).run(username, address.toLowerCase(), txHash);

    return res.status(201).json({ username, address });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "username_taken" });
    }
    return res.status(500).json({ error: "internal_error", details: err.message });
  }
});

/**
 * GET /api/v1/username/resolve/:username
 * Resolve username → address
 */
router.get("/resolve/:username", (req, res) => {
  const { username } = req.params;
  const row = db.prepare("SELECT username, wallet_address FROM usernames WHERE username = ?").get(username);

  if (!row) {
    return res.status(404).json({ error: "not_found" });
  }

  return res.json({ username: row.username, address: row.wallet_address });
});

/**
 * GET /api/v1/username/reverse/:address
 * Reverse-resolve address → username
 */
router.get("/reverse/:address", (req, res) => {
  const { address } = req.params;
  const row = db
    .prepare("SELECT username FROM usernames WHERE wallet_address = ?")
    .get(address.toLowerCase());

  if (!row) {
    return res.status(404).json({ error: "not_found" });
  }

  return res.json({ username: row.username });
});

module.exports = router;
