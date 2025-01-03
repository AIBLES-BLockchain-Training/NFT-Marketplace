import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 20,
          },
        },
      },
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 20,
          },
        },
      },
    ],
  },

  paths: {
    sources: './src',
    tests: './test',
    cache: '../../dist/packages/contracts/cache',
    artifacts: '../../dist/packages/contracts/artifacts',
  },
  typechain: {
    outDir: './typechain-types',
  },
  defaultNetwork: 'hardhat',
  sourcify: {
    enabled: true,
    // Optional: specify a different Sourcify server
    apiUrl: 'https://sourcify.dev/server',
    // Optional: specify a different Sourcify repository
    browserUrl: 'https://repo.sourcify.dev',
  },
  networks: {
    hardhat: {},
    bscMainnet: {
      url: 'https://bsc-rpc.publicnode.com',
      accounts: [process.env['BSC_ACCOUNT_PRIVATE'] || ''],
    },
    bscTestnet: {
      url: 'https://bsc-testnet-rpc.publicnode.com',
      accounts: [process.env['BSC_ACCOUNT_PRIVATE'] || ''],
    },
    ethSepolia: {
      url: 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: [process.env['ETH_ACCOUNT_PRIVATE'] || ''],
    },
  },
  etherscan: {
    apiKey: {
      bsc: process.env['BSCSCAN_API_KEY'] || '',
      bscTestnet: process.env['BSCSCAN_API_KEY'] || '',
      sepolia: process.env['ETHERSCAN_API_KEY'] || '',
    },
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
