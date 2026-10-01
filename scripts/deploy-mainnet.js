const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const EXPLORER_BASE = "https://monadscan.com";

// Real mainnet token addresses
const MAINNET_TOKENS = {
  AUSD: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
  USDC: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  USDT: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  // ── Strict chain ID check — MAINNET ONLY ──
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", Number(network.chainId));

  if (Number(network.chainId) !== 143) {
    console.error("❌ ERROR: This script is for MAINNET (chain 143) ONLY!");
    console.error("   Got chain ID:", Number(network.chainId));
    console.error("   Run with: npx hardhat run scripts/deploy-mainnet.js --network monad_mainnet");
    process.exit(1);
  }

  // ── Check minimum balance ──
  if (balance < ethers.parseEther("0.05")) {
    console.error("❌ ERROR: Need at least 0.05 MON for deployment. Current:", ethers.formatEther(balance));
    process.exit(1);
  }

  // ── Deploy UsernameRegistry ──
  console.log("\n--- Deploying UsernameRegistry ---");
  const UsernameRegistry = await ethers.getContractFactory("UsernameRegistry");
  const registry = await UsernameRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ UsernameRegistry deployed to:", registryAddress);

  // ── Deploy TapPayLedger ──
  console.log("\n--- Deploying TapPayLedger ---");
  const TapPayLedger = await ethers.getContractFactory("TapPayLedger");
  const ledger = await TapPayLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log("✅ TapPayLedger deployed to:", ledgerAddress);

  // ── Deploy MultiTokenLedger ──
  console.log("\n--- Deploying MultiTokenLedger ---");
  const MultiTokenLedger = await ethers.getContractFactory("MultiTokenLedger");
  const multiLedger = await MultiTokenLedger.deploy();
  await multiLedger.waitForDeployment();
  const multiLedgerAddress = await multiLedger.getAddress();
  console.log("✅ MultiTokenLedger deployed to:", multiLedgerAddress);

  // ── Whitelist AUSD, USDC, USDT on MultiTokenLedger ──
  console.log("\n--- Whitelisting tokens on MultiTokenLedger ---");
  for (const [symbol, address] of Object.entries(MAINNET_TOKENS)) {
    const tx = await multiLedger.setSupportedToken(address, true);
    await tx.wait();
    console.log(`✅ ${symbol} whitelisted: ${address}`);
  }

  // ── Verify default settings ──
  console.log("\n--- Verifying Contract Settings ---");
  const minPayment = await ledger.minPayment();
  const maxPayment = await ledger.maxPayment();
  const registryOwner = await registry.owner();
  const ledgerOwner = await ledger.owner();
  const multiLedgerOwner = await multiLedger.owner();
  console.log("TapPayLedger minPayment:", ethers.formatEther(minPayment), "MON");
  console.log("TapPayLedger maxPayment:", ethers.formatEther(maxPayment), "MON");
  console.log("UsernameRegistry owner:", registryOwner);
  console.log("TapPayLedger owner:", ledgerOwner);
  console.log("MultiTokenLedger owner:", multiLedgerOwner);

  // ── Summary ──
  console.log("\n════════════════════════════════════════");
  console.log("  🚀 MAINNET DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════");
  console.log("UsernameRegistry:   ", registryAddress);
  console.log("TapPayLedger:       ", ledgerAddress);
  console.log("MultiTokenLedger:   ", multiLedgerAddress);
  console.log("════════════════════════════════════════");
  console.log("\n📋 Explorer Links:");
  console.log(`  UsernameRegistry:  ${EXPLORER_BASE}/address/${registryAddress}`);
  console.log(`  TapPayLedger:      ${EXPLORER_BASE}/address/${ledgerAddress}`);
  console.log(`  MultiTokenLedger:  ${EXPLORER_BASE}/address/${multiLedgerAddress}`);
  console.log("════════════════════════════════════════");
  console.log("\n📝 NEXT: Update these files with the new addresses:");
  console.log("  1. src/config/monad.ts");
  console.log("  2. src/config/tokens.ts");
  console.log(`\n  usernameRegistry: '${registryAddress}',`);
  console.log(`  tapPayLedger: '${ledgerAddress}',`);
  console.log(`  multiTokenLedger: '${multiLedgerAddress}',`);

  // ── Write addresses to JSON ──
  const deployData = {
    network: "monad_mainnet",
    chainId: 143,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      UsernameRegistry: {
        address: registryAddress,
        explorer: `${EXPLORER_BASE}/address/${registryAddress}`,
      },
      TapPayLedger: {
        address: ledgerAddress,
        explorer: `${EXPLORER_BASE}/address/${ledgerAddress}`,
      },
      MultiTokenLedger: {
        address: multiLedgerAddress,
        explorer: `${EXPLORER_BASE}/address/${multiLedgerAddress}`,
      },
    },
    whitelistedTokens: MAINNET_TOKENS,
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses-mainnet.json");
  fs.writeFileSync(outPath, JSON.stringify(deployData, null, 2));
  console.log("\n📄 Addresses written to:", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
