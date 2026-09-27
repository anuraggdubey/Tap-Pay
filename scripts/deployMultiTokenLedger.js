const hre = require("hardhat");

async function main() {
  console.log("Deploying MultiTokenLedger to Monad...");

  const MultiTokenLedger = await hre.ethers.getContractFactory("MultiTokenLedger");
  const ledger = await MultiTokenLedger.deploy();
  await ledger.waitForDeployment();

  const ledgerAddress = await ledger.getAddress();
  console.log("MultiTokenLedger deployed to:", ledgerAddress);

  // AUSD Mainnet Address
  const AUSD_ADDRESS = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a";
  // USDC Mainnet Address
  const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
  
  // Testnet Mock Addresses (if deploying to testnet for testing)
  let ausdAddr = AUSD_ADDRESS;
  let usdcAddr = USDC_ADDRESS;

  if (hre.network.name === "monad_testnet") {
      console.log("Deploying mock tokens for testnet...");
      const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
      const mockAusd = await MockERC20.deploy("Agora Dollar Mock", "AUSD");
      await mockAusd.waitForDeployment();
      ausdAddr = await mockAusd.getAddress();
      console.log("Mock AUSD deployed to:", ausdAddr);

      const mockUsdc = await MockERC20.deploy("USD Coin Mock", "USDC");
      await mockUsdc.waitForDeployment();
      usdcAddr = await mockUsdc.getAddress();
      console.log("Mock USDC deployed to:", usdcAddr);
  }

  console.log("Whitelisting tokens...");
  
  // Whitelist AUSD
  let tx = await ledger.setSupportedToken(ausdAddr, true);
  await tx.wait();
  console.log("✅ Whitelisted AUSD:", ausdAddr);

  // Whitelist USDC
  tx = await ledger.setSupportedToken(usdcAddr, true);
  await tx.wait();
  console.log("✅ Whitelisted USDC:", usdcAddr);

  console.log("Deployment complete.");
  console.log("Update src/config/monad.ts with:");
  console.log(`multiTokenLedger: '${ledgerAddress}' as \`0x\${string}\``);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
