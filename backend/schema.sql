-- TapPay Backend — Reference Schema (SQLite)
-- This file is for documentation only. The actual tables are created
-- automatically by src/db.js on first run.

CREATE TABLE IF NOT EXISTS usernames (
  username       TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  registered_at  TEXT NOT NULL DEFAULT (datetime('now')),
  tx_hash        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  sender_address   TEXT NOT NULL,
  receiver_address TEXT,
  amount_wei       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | receiver_confirmed | broadcasting | confirmed | failed | expired
  tx_hash          TEXT,
  error_reason     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT NOT NULL
);

-- Indexes for efficient history queries
CREATE INDEX IF NOT EXISTS idx_sessions_sender
  ON sessions(sender_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_receiver
  ON sessions(receiver_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON sessions(status)
  WHERE status IN ('pending', 'broadcasting');
