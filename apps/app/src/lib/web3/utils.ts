import { ethers } from 'ethers';
import { Address } from '../../types';

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatTokenAmount(amount: string | bigint, decimals: number): string {
  return ethers.formatUnits(amount, decimals);
}

export function formatEth(amount: string | bigint | null | undefined, maxDecimals = 4): string {
  if (amount === null || amount === undefined) return '0';
  try {
    const formatted = ethers.formatEther(amount);
    const num = parseFloat(formatted);

    if (num === 0) return '0';

    // Round to maxDecimals places
    const multiplier = Math.pow(10, maxDecimals);
    const rounded = Math.round(num * multiplier) / multiplier;

    // If rounded to 0 but original is not 0, keep exact value
    if (rounded === 0 && num !== 0) {
      // Return exact value, removing trailing zeros
      return formatted.replace(/\.?0+$/, '');
    }

    // Convert to string and remove unnecessary trailing zeros
    let result = rounded.toFixed(maxDecimals);
    result = result.replace(/\.?0+$/, '');

    return result;
  } catch {
    return '0';
  }
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  return ethers.parseUnits(amount, decimals);
}

export function parseEth(amount: string): bigint {
  return ethers.parseEther(amount);
}

export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

export function normalizeAddress(address: string): Address {
  return ethers.getAddress(address) as Address;
}

export function computeRoleHash(roleName: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(roleName));
}

export const KNOWN_ROLES = {
  MANAGEMENT_ROLE: computeRoleHash('MANAGEMENT_ROLE'),
  LISTING_ROLE: computeRoleHash('LISTING_ROLE'),
  AUCTION_ROLE: computeRoleHash('AUCTION_ROLE'),
  OFFER_ROLE: computeRoleHash('OFFER_ROLE'),
  NFT_ROLE: computeRoleHash('NFT_ROLE'),
};

// Export individual role hashes for convenience
export const MANAGEMENT_ROLE_HASH = KNOWN_ROLES.MANAGEMENT_ROLE;
export const LISTING_ROLE_HASH = KNOWN_ROLES.LISTING_ROLE;
export const AUCTION_ROLE_HASH = KNOWN_ROLES.AUCTION_ROLE;
export const OFFER_ROLE_HASH = KNOWN_ROLES.OFFER_ROLE;
export const NFT_ROLE_HASH = KNOWN_ROLES.NFT_ROLE;

// Legacy aliases for backwards compatibility
export const LISTING_MANAGEMENT_ROLE_HASH = KNOWN_ROLES.LISTING_ROLE;

export function shortenHash(hash: string, chars = 6): string {
  return `${hash.substring(0, chars + 2)}...${hash.substring(hash.length - chars)}`;
}

export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000);
  return date.toLocaleString();
}

export function isExpired(endTimestamp: string | number): boolean {
  const end = typeof endTimestamp === 'string' ? parseInt(endTimestamp) : endTimestamp;
  return Date.now() / 1000 > end;
}
