require("dotenv").config();

module.exports = {
  port: parseInt(process.env.PORT || "3001", 10),

  // Monad Testnet RPCs (failover order)
  rpcUrls: [
    process.env.RPC_PRIMARY || "https://testnet-rpc.monad.xyz",
    process.env.RPC_FALLBACK1 || "https://rpc.ankr.com/monad_testnet",
    process.env.RPC_FALLBACK2 || "https://rpc-testnet.monadinfra.com",
  ],
  chainId: 10143,

  // Deployed contract addresses — fill after deployment
  usernameRegistryAddress: process.env.USERNAME_REGISTRY_ADDRESS || "",
  tapPayLedgerAddress: process.env.TAP_PAY_LEDGER_ADDRESS || "",

  // Session settings
  sessionExpirySeconds: parseInt(process.env.SESSION_EXPIRY_SECONDS || "120", 10),
  sessionSweepIntervalMs: parseInt(process.env.SESSION_SWEEP_INTERVAL_MS || "30000", 10),

  // Database path
  dbPath: process.env.DB_PATH || "./data/tappay.db",

  // CORS
  corsOrigins: process.env.CORS_ORIGINS || "*",
};
