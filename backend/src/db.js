const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const config = require("./config");

// Ensure data directory exists
const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(config.dbPath));

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS usernames (
    username      TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    tx_hash       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id               TEXT PRIMARY KEY,
    sender_address   TEXT NOT NULL,
    receiver_address TEXT,
    amount_wei       TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    tx_hash          TEXT,
    error_reason     TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_sender
    ON sessions(sender_address, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_sessions_receiver
    ON sessions(receiver_address, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_sessions_status
    ON sessions(status)
    WHERE status IN ('pending', 'broadcasting');
`);

module.exports = db;
