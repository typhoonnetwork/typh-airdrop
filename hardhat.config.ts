import fs from "fs";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ganache";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-web3";

import { HardhatUserConfig } from "hardhat/config";

let mnemonic = "";
try {
  mnemonic = fs.readFileSync(".secret").toString().trim();
} catch {
  console.error(".secret not set");
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "testnet",
  networks: {
    mainnet: {
      url: "https://bsc-dataseed1.ninicoin.io/",
      chainId: 56,
      accounts: { mnemonic },
    },
    testnet: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      accounts: { mnemonic },
      // gas: 0,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      blockGasLimit: 0x1fffffffffffff,
      timeout: 1800000,
    },
  },
};

export default config;
