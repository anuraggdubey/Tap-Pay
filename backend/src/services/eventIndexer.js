const { ethers } = require("ethers");
const config = require("../config");
const db = require("../db");

// Minimal ABIs — events only
const REGISTRY_ABI = [
  "event UsernameRegistered(string username, address indexed owner)",
  "event UsernameReleased(string username, address indexed owner)",
];

const LEDGER_ABI = [
  "event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp)",
];

let provider = null;
let registryContract = null;
let ledgerContract = null;

/**
 * Create a provider with failover across multiple RPCs
 */
function getProvider() {
  if (provider) return provider;
  for (const url of config.rpcUrls) {
    try {
      provider = new ethers.JsonRpcProvider(url, {
        chainId: config.chainId,
        name: "monad-testnet",
      });
      return provider;
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints failed");
}

/**
 * Start listening for on-chain UsernameRegistered / UsernameReleased events
 * and auto-populate the local cache DB.
 *
 * Also listens for PaymentLogged events to auto-confirm sessions.
 */
function startEventIndexer() {
  if (!config.usernameRegistryAddress || !config.tapPayLedgerAddress) {
    console.warn(
      "[eventIndexer] Contract addresses not set — skipping event indexing. " +
      "Set USERNAME_REGISTRY_ADDRESS and TAP_PAY_LEDGER_ADDRESS in .env"
    );
    return;
  }

  const p = getProvider();

  // ── Username Registry Events ──
  registryContract = new ethers.Contract(
    config.usernameRegistryAddress,
    REGISTRY_ABI,
    p
  );

  registryContract.on("UsernameRegistered", (username, owner) => {
    console.log(`[eventIndexer] UsernameRegistered: ${username} → ${owner}`);
    try {
      db.prepare(
        `INSERT OR REPLACE INTO usernames (username, wallet_address, tx_hash)
         VALUES (?, ?, 'indexed')`
      ).run(username, owner.toLowerCase());
    } catch (err) {
      console.error("[eventIndexer] Failed to cache username:", err.message);
    }
  });

  registryContract.on("UsernameReleased", (username, owner) => {
    console.log(`[eventIndexer] UsernameReleased: ${username} by ${owner}`);
    try {
      db.prepare("DELETE FROM usernames WHERE username = ?").run(username);
    } catch (err) {
      console.error("[eventIndexer] Failed to remove username:", err.message);
    }
  });

  // ── TapPay Ledger Events ──
  ledgerContract = new ethers.Contract(
    config.tapPayLedgerAddress,
    LEDGER_ABI,
    p
  );

  ledgerContract.on("PaymentLogged", (from, to, amount, sessionId, timestamp) => {
    console.log(
      `[eventIndexer] PaymentLogged: ${from} → ${to}, ${ethers.formatEther(amount)} MON, session=${sessionId}`
    );

    // Try to match and confirm any broadcasting sessions with this tx
    try {
      const sessions = db
        .prepare(
          "SELECT id FROM sessions WHERE status = 'broadcasting' AND sender_address = ?"
        )
        .all(from.toLowerCase());

      for (const session of sessions) {
        db.prepare(
          "UPDATE sessions SET status = 'confirmed', receiver_address = ? WHERE id = ?"
        ).run(to.toLowerCase(), session.id);
        console.log(`[eventIndexer] Auto-confirmed session ${session.id}`);
      }
    } catch (err) {
      console.error("[eventIndexer] Failed to auto-confirm session:", err.message);
    }
  });

  console.log("[eventIndexer] Listening for on-chain events...");
  console.log(`  UsernameRegistry: ${config.usernameRegistryAddress}`);
  console.log(`  TapPayLedger:     ${config.tapPayLedgerAddress}`);
}

/**
 * Stop event listeners (for graceful shutdown)
 */
function stopEventIndexer() {
  if (registryContract) {
    registryContract.removeAllListeners();
  }
  if (ledgerContract) {
    ledgerContract.removeAllListeners();
  }
  console.log("[eventIndexer] Stopped.");
}

module.exports = { startEventIndexer, stopEventIndexer };
