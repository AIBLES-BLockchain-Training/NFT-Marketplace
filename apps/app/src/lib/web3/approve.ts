import { ethers } from 'ethers';
import { getBrowserProvider, getSigner } from './provider';
import { ROUTER_ADDRESS } from '../contracts/addresses';
import { Address } from '../../types';

const ERC721_ABI = [
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
];

const ERC1155_ABI = [
  'function isApprovedForAll(address account, address operator) external view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external',
];

export interface ApprovalStatus {
  isApproved: boolean;
  needsApproval: boolean;
}

// Cache approval status in memory (per session)
const approvalCache = new Map<string, boolean>();

// Cache whitelist status in memory (per session)
const whitelistCache = new Map<string, boolean>();

function getCacheKey(nftContract: Address, ownerAddress: Address): string {
  return `${nftContract.toLowerCase()}_${ownerAddress.toLowerCase()}`;
}

/**
 * Check if NFT collection is whitelisted by querying DB (indexer)
 * Uses cache to avoid redundant API calls
 */
export async function isNFTCollectionWhitelisted(nftContract: Address): Promise<boolean> {
  try {
    const normalizedAddress = nftContract.toLowerCase();

    // Check cache first
    const cachedValue = whitelistCache.get(normalizedAddress);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Query API to check DB
    const response = await fetch('/api/nft/check-whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionAddress: normalizedAddress }),
    });

    const data = await response.json();

    if (data.success) {
      const isWhitelisted = data.data.isWhitelisted;
      // Cache the result
      whitelistCache.set(normalizedAddress, isWhitelisted);
      return isWhitelisted;
    }

    return false;
  } catch (error) {
    console.error('Error checking NFT whitelist:', error);
    return false;
  }
}

/**
 * Clear whitelist cache for a specific collection or all
 */
export function clearWhitelistCache(nftContract?: Address) {
  if (nftContract) {
    whitelistCache.delete(nftContract.toLowerCase());
  } else {
    whitelistCache.clear();
  }
}

/**
 * Check if NFT is approved for Router contract
 * Uses cache to avoid redundant on-chain calls
 */
export async function checkNFTApproval(
  nftContract: Address,
  tokenId: string,
  ownerAddress: Address,
  isERC1155: boolean
): Promise<ApprovalStatus> {
  try {
    const provider = getBrowserProvider();
    if (!provider) throw new Error('Provider not found');

    // Check cache first
    const cacheKey = getCacheKey(nftContract, ownerAddress);
    const cachedApproval = approvalCache.get(cacheKey);
    if (cachedApproval !== undefined) {
      return {
        isApproved: cachedApproval,
        needsApproval: !cachedApproval,
      };
    }

    if (isERC1155) {
      // ERC1155: Check if operator is approved for all
      const contract = new ethers.Contract(nftContract, ERC1155_ABI, provider);
      const isApprovedForAll = await contract.isApprovedForAll(ownerAddress, ROUTER_ADDRESS);

      // Cache the result
      approvalCache.set(cacheKey, isApprovedForAll);

      return {
        isApproved: isApprovedForAll,
        needsApproval: !isApprovedForAll,
      };
    } else {
      // ERC721: Check specific token approval
      const contract = new ethers.Contract(nftContract, ERC721_ABI, provider);

      // First check if approved for all
      const isApprovedForAll = await contract.isApprovedForAll(ownerAddress, ROUTER_ADDRESS);
      if (isApprovedForAll) {
        // Cache the result
        approvalCache.set(cacheKey, true);
        return {
          isApproved: true,
          needsApproval: false,
        };
      }

      // Check specific token approval
      const approvedAddress = await contract.getApproved(tokenId);
      const isApproved = approvedAddress.toLowerCase() === ROUTER_ADDRESS.toLowerCase();

      // Cache the result
      approvalCache.set(cacheKey, isApproved);

      return {
        isApproved,
        needsApproval: !isApproved,
      };
    }
  } catch (error) {
    console.error('Error checking NFT approval:', error);
    return {
      isApproved: false,
      needsApproval: true,
    };
  }
}

/**
 * Approve NFT for Router contract
 * Caches the approval status after successful approval
 */
export async function approveNFT(
  nftContract: Address,
  tokenId: string,
  isERC1155: boolean
): Promise<boolean> {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Signer not found');

    const ownerAddress = await signer.getAddress();

    if (isERC1155) {
      // ERC1155: Set approval for all
      const contract = new ethers.Contract(nftContract, ERC1155_ABI, signer);
      const tx = await contract.setApprovalForAll(ROUTER_ADDRESS, true);
      const receipt = await tx.wait();

      const success = receipt.status === 1;

      // Cache the approval status if successful
      if (success) {
        const cacheKey = getCacheKey(nftContract, ownerAddress);
        approvalCache.set(cacheKey, true);
      }

      return success;
    } else {
      // ERC721: Approve specific token
      const contract = new ethers.Contract(nftContract, ERC721_ABI, signer);
      const tx = await contract.approve(ROUTER_ADDRESS, tokenId);
      const receipt = await tx.wait();

      const success = receipt.status === 1;

      // Cache the approval status if successful
      if (success) {
        const cacheKey = getCacheKey(nftContract, ownerAddress);
        approvalCache.set(cacheKey, true);
      }

      return success;
    }
  } catch (error: unknown) {
    console.error('Error approving NFT:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
      throw new Error('User rejected approval');
    }
    throw error;
  }
}

/**
 * Clear approval cache for a specific NFT contract and owner
 * Useful when approval status might have changed
 */
export function clearApprovalCache(nftContract?: Address, ownerAddress?: Address) {
  if (nftContract && ownerAddress) {
    const cacheKey = getCacheKey(nftContract, ownerAddress);
    approvalCache.delete(cacheKey);
  } else {
    // Clear entire cache
    approvalCache.clear();
  }
}
