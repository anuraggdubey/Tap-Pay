const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const EXPLORER_BASE = "https://testnet.monadscan.com";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  // ── Verify chain ID ──
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "| Chain ID:", Number(network.chainId));

  if (Number(network.chainId) !== 10143 && Number(network.chainId) !== 31337) {
    console.error("ERROR: Expected Monad Testnet (10143) or Hardhat (31337), got:", Number(network.chainId));
    process.exit(1);
  }

  // ── Deploy UsernameRegistry ──
  console.log("\n--- Deploying UsernameRegistry ---");
  const UsernameRegistry = await ethers.getContractFactory("UsernameRegistry");
  const registry = await UsernameRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("UsernameRegistry deployed to:", registryAddress);
  console.log("Explorer:", `${EXPLORER_BASE}/address/${registryAddress}`);

  // ── Deploy TapPayLedger ──
  console.log("\n--- Deploying TapPayLedger ---");
  const TapPayLedger = await ethers.getContractFactory("TapPayLedger");
  const ledger = await TapPayLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log("TapPayLedger deployed to:", ledgerAddress);
  console.log("Explorer:", `${EXPLORER_BASE}/address/${ledgerAddress}`);

  // ── Verify default settings ──
  console.log("\n--- Verifying Contract Settings ---");
  const minPayment = await ledger.minPayment();
  const maxPayment = await ledger.maxPayment();
  const registryOwner = await registry.owner();
  const ledgerOwner = await ledger.owner();
  console.log("TapPayLedger minPayment:", ethers.formatEther(minPayment), "MON");
  console.log("TapPayLedger maxPayment:", ethers.formatEther(maxPayment), "MON");
  console.log("UsernameRegistry owner:", registryOwner);
  console.log("TapPayLedger owner:", ledgerOwner);

  // ── Summary ──
  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("UsernameRegistry:", registryAddress);
  console.log("TapPayLedger:    ", ledgerAddress);
  console.log("========================================");
  console.log("\n📋 Explorer Links:");
  console.log(`  UsernameRegistry: ${EXPLORER_BASE}/address/${registryAddress}`);
  console.log(`  TapPayLedger:     ${EXPLORER_BASE}/address/${ledgerAddress}`);
  console.log("========================================");
  console.log("\nUpdate src/config/monad.ts with these addresses:");
  console.log(`  usernameRegistry: '${registryAddress}',`);
  console.log(`  tapPayLedger: '${ledgerAddress}',`);

  // ── Write addresses to JSON for easy consumption ──
  const deployData = {
    network: network.name,
    chainId: Number(network.chainId),
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
    },
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(deployData, null, 2));
  console.log("\nAddresses written to:", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
