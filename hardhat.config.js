require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  networks: {
    xlayer: {
      url: process.env.XLAYER_RPC_URL || process.env.NEXT_PUBLIC_XLAYER_RPC_URL || "https://testrpc.xlayer.tech",
      chainId: Number(process.env.XLAYER_CHAIN_ID || process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID || 1952),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
