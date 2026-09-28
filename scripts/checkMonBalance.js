const hre = require("hardhat");

async function main() {
    const targetAddress = "0x21dd90cA69020f8A300A228781AF2d3396cA8c01";
    const balance = await hre.ethers.provider.getBalance(targetAddress);
    console.log(`MON Balance of ${targetAddress}: ${hre.ethers.formatEther(balance)} MON`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
