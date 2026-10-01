require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monad_testnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: DEPLOYER_PRIVATE_KEY !== "0x" + "0".repeat(64) ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    monad_mainnet: {
      url: "https://rpc.monad.xyz",
      chainId: 143,
      accounts: DEPLOYER_PRIVATE_KEY !== "0x" + "0".repeat(64) ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      monad_testnet: "empty",
      monad_mainnet: "empty",
    },
    customChains: [
      {
        network: "monad_testnet",
        chainId: 10143,
        urls: {
          apiURL: "https://api-testnet.monadscan.xyz/api",
          browserURL: "https://testnet.monadscan.com",
        },
      },
      {
        network: "monad_mainnet",
        chainId: 143,
        urls: {
          apiURL: "https://api.monadscan.com/api",
          browserURL: "https://monadscan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org",
  }
};
