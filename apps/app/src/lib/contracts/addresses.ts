import { Address } from '../../types';

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_PERMISSIONS_CONTRACT: process.env.NEXT_PUBLIC_PERMISSIONS_CONTRACT,
  NEXT_PUBLIC_ROUTER_CONTRACT: process.env.NEXT_PUBLIC_ROUTER_CONTRACT,
  NEXT_PUBLIC_LISTING_CONTRACT: process.env.NEXT_PUBLIC_LISTING_CONTRACT,
  NEXT_PUBLIC_AUCTION_CONTRACT: process.env.NEXT_PUBLIC_AUCTION_CONTRACT,
  NEXT_PUBLIC_OFFER_CONTRACT: process.env.NEXT_PUBLIC_OFFER_CONTRACT,
  NEXT_PUBLIC_EXTENSION_MANAGER_CONTRACT: process.env.NEXT_PUBLIC_EXTENSION_MANAGER_CONTRACT,
  NEXT_PUBLIC_MULTISIG_CONTRACT: process.env.NEXT_PUBLIC_MULTISIG_CONTRACT,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value || value === '') {
    console.warn(`⚠️  Missing environment variable: ${key}`);
  }
});

export const CONTRACT_ADDRESSES = {
  PERMISSIONS: (process.env.NEXT_PUBLIC_PERMISSIONS_CONTRACT || '') as Address,
  EXTENSION_MANAGER: (process.env.NEXT_PUBLIC_EXTENSION_MANAGER_CONTRACT || '') as Address,
  LISTING: (process.env.NEXT_PUBLIC_LISTING_CONTRACT || '') as Address,
  ROUTER: (process.env.NEXT_PUBLIC_ROUTER_CONTRACT || '') as Address,
  OFFER: (process.env.NEXT_PUBLIC_OFFER_CONTRACT || '') as Address,
  AUCTION: (process.env.NEXT_PUBLIC_AUCTION_CONTRACT || '') as Address,
  MULTISIG: (process.env.NEXT_PUBLIC_MULTISIG_CONTRACT || '') as Address,
};

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111', 10),
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || 'Sepolia',
  rpcEndpoint: process.env.NEXT_PUBLIC_RPC_ENDPOINT || '',
};

export const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4001/graphql';

// Native ETH is represented as address(0) in our contracts
// This is the Solidity/EVM standard for native tokens
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

// DEPRECATED: Do not use! Contract expects address(0) for native ETH.
// 0xEeee...EEeE is a convention used by some protocols but NOT our contract standard.
// export const NATIVE_TOKEN_ADDRESS: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Shorthand exports for convenience
export const ROUTER_ADDRESS = CONTRACT_ADDRESSES.ROUTER;
export const PERMISSIONS_ADDRESS = CONTRACT_ADDRESSES.PERMISSIONS;
