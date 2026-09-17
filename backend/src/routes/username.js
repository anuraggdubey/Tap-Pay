const express = require("express");
const db = require("../db");
const { registerLimiter } = require("../middleware/rateLimit");

const router = express.Router();

function normalizeUsername(username) {
  return username.replace(/0/g, 'o').replace(/1/g, 'l');
}

/**
 * POST /api/v1/username/register
 * Register username → address mapping
 */
router.post("/register", registerLimiter, async (req, res) => {
  const { username, address } = req.body;

  // Basic validation
  if (!username || !address) {
    return res.status(400).json({
      error: "missing_fields",
      details: "username and address are required",
    });
  }

  // Validate username format
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({
      error: "invalid_username",
      details: "Must be 3-20 characters, a-z 0-9 only",
    });
  }
  if (!/^[a-z0-9]+$/.test(username)) {
    return res.status(400).json({
      error: "invalid_username",
      details: "Must be 3-20 characters, a-z 0-9 only",
    });
  }

  const normalized = normalizeUsername(username);

  // Check if taken
  const existing = db.prepare("SELECT username FROM usernames WHERE normalized_username = ?").get(normalized);
  
  if (existing) {
    // Generate suggestions
    const suggestions = [];
    let counter = 1;
    while (suggestions.length < 3) {
      const suffix = Math.floor(Math.random() * 1000).toString();
      const suggestedName = `${username}${suffix}`.slice(0, 20); // ensure max length
      const suggestedNormalized = normalizeUsername(suggestedName);
      
      const exists = db.prepare("SELECT username FROM usernames WHERE normalized_username = ?").get(suggestedNormalized);
      if (!exists && !suggestions.includes(suggestedName) && suggestedName !== username) {
        suggestions.push(suggestedName);
      }
      counter++;
      if (counter > 50) break; // safeguard
    }

    return res.status(409).json({ 
      error: "username_taken",
      suggestions 
    });
  }

  // Check if wallet address already has a username
  const existingAddress = db.prepare("SELECT username FROM usernames WHERE wallet_address = ?").get(address.toLowerCase());
  if (existingAddress) {
    return res.status(409).json({ error: "address_taken", details: "This address already has a registered username" });
  }

  // Insert into DB
  try {
    db.prepare(
      "INSERT INTO usernames (username, wallet_address, normalized_username) VALUES (?, ?, ?)"
    ).run(username, address.toLowerCase(), normalized);

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
