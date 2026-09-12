const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  // ── Deploy UsernameRegistry ──
  console.log("\n--- Deploying UsernameRegistry ---");
  const UsernameRegistry = await ethers.getContractFactory("UsernameRegistry");
  const registry = await UsernameRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("UsernameRegistry deployed to:", registryAddress);

  // ── Deploy TapPayLedger ──
  console.log("\n--- Deploying TapPayLedger ---");
  const TapPayLedger = await ethers.getContractFactory("TapPayLedger");
  const ledger = await TapPayLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log("TapPayLedger deployed to:", ledgerAddress);

  // ── Summary ──
  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("UsernameRegistry:", registryAddress);
  console.log("TapPayLedger:    ", ledgerAddress);
  console.log("========================================");
  console.log("\nUpdate src/config/monad.ts with these addresses:");
  console.log(`  usernameRegistry: '${registryAddress}',`);
  console.log(`  tapPayLedger: '${ledgerAddress}',`);

  // ── Write addresses to JSON for easy consumption ──
  const deployData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      UsernameRegistry: registryAddress,
      TapPayLedger: ledgerAddress,
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
