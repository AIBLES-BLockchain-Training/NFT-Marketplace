import { ethers } from 'ethers';

// Role hashes matching Permissions.sol
export const ROLE_HASHES = {
  LISTING_ROLE: ethers.keccak256(ethers.toUtf8Bytes('LISTING_ROLE')),
  AUCTION_ROLE: ethers.keccak256(ethers.toUtf8Bytes('AUCTION_ROLE')),
  OFFER_ROLE: ethers.keccak256(ethers.toUtf8Bytes('OFFER_ROLE')),
  NFT_ROLE: ethers.keccak256(ethers.toUtf8Bytes('NFT_ROLE')),
  MANAGEMENT_ROLE: ethers.keccak256(ethers.toUtf8Bytes('MANAGEMENT_ROLE')),
};

export const REQUESTABLE_ROLES = [
  {
    hash: ROLE_HASHES.LISTING_ROLE,
    name: 'LISTING_ROLE',
    displayName: 'Listing Creator',
    description: 'Create fixed-price listings for your NFTs',
  },
  {
    hash: ROLE_HASHES.AUCTION_ROLE,
    name: 'AUCTION_ROLE',
    displayName: 'Auction Creator',
    description: 'Create auctions for your NFTs',
  },
  {
    hash: ROLE_HASHES.OFFER_ROLE,
    name: 'OFFER_ROLE',
    displayName: 'Offer Maker',
    description: 'Make offers on NFTs',
  },
];

export function getRoleDisplayName(roleHash: string): string {
  const role = REQUESTABLE_ROLES.find(r => r.hash.toLowerCase() === roleHash.toLowerCase());
  return role?.displayName || roleHash.slice(0, 10) + '...';
}

export function getRoleName(roleHash: string): string {
  const role = REQUESTABLE_ROLES.find(r => r.hash.toLowerCase() === roleHash.toLowerCase());
  return role?.name || 'Unknown Role';
}
