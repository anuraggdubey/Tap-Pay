const hre = require("hardhat");

async function main() {
    const targetAddress = "0x21dd90cA69020f8A300A228781AF2d3396cA8c01";
    const AUSD_ADDRESS = "0xf66E722898Ca0B1060C90C248D17A13Aad833827";

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const ausd = MockERC20.attach(AUSD_ADDRESS);

    const decimals = await ausd.decimals();
    const balance = await ausd.balanceOf(targetAddress);
    console.log(`Balance of ${targetAddress}: ${balance.toString()} (raw)`);
    console.log(`Formatted with 18 decimals: ${hre.ethers.formatUnits(balance, 18)}`);
    console.log(`Formatted with 6 decimals: ${hre.ethers.formatUnits(balance, 6)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
