const hre = require("hardhat");

async function main() {
    console.log("Minting AUSD to the specified address...");
    const targetAddress = "0x21dd90cA69020f8A300A228781AF2d3396cA8c01";
    const AUSD_ADDRESS = "0xf66E722898Ca0B1060C90C248D17A13Aad833827";

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const ausd = MockERC20.attach(AUSD_ADDRESS);

    // Let's check decimals first
    const decimals = await ausd.decimals();
    console.log("AUSD Decimals:", decimals);

    // Amount to mint: let's say 10000 AUSD
    const amountStr = "10000";
    const amount = hre.ethers.parseUnits(amountStr, decimals);

    console.log(`Minting ${amountStr} AUSD to ${targetAddress}...`);
    const tx = await ausd.mint(targetAddress, amount);
    await tx.wait();

    console.log("Minting complete!");
    const balance = await ausd.balanceOf(targetAddress);
    console.log(`New balance: ${hre.ethers.formatUnits(balance, decimals)} AUSD`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
