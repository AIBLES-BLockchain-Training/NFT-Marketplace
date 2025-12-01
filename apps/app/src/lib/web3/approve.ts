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

function getCacheKey(nftContract: Address, ownerAddress: Address, tokenId?: string): string {
  const base = `${nftContract.toLowerCase()}_${ownerAddress.toLowerCase()}`;
  return tokenId ? `${base}_${tokenId}` : base;
}

/**
 * Check if NFT collection is whitelisted by querying DB (indexer)
 * Uses cache to avoid redundant API calls
 */
export async function isNFTCollectionWhitelisted(nftContract: Address): Promise<boolean> {
  try {
    const normalizedAddress = nftContract.toLowerCase();

    const cachedValue = whitelistCache.get(normalizedAddress);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const response = await fetch('/api/nft/check-whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionAddress: normalizedAddress }),
    });

    const data = await response.json();

    if (data.success) {
      const isWhitelisted = data.data.isWhitelisted;
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

    // Check cache first (for ERC721, include tokenId in cache key)
    const cacheKey = isERC1155 ? getCacheKey(nftContract, ownerAddress) : getCacheKey(nftContract, ownerAddress, tokenId);
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

      // Cache the result with tokenId-specific key
      const tokenCacheKey = getCacheKey(nftContract, ownerAddress, tokenId);
      approvalCache.set(tokenCacheKey, isApproved);

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
        const cacheKey = getCacheKey(nftContract as `0x${string}`, ownerAddress as `0x${string}`);
        approvalCache.set(cacheKey, true);
      }

      return success;
    } else {
      // ERC721: Approve specific token
      const contract = new ethers.Contract(nftContract, ERC721_ABI, signer);
      const tx = await contract.approve(ROUTER_ADDRESS, tokenId);
      const receipt = await tx.wait();

      const success = receipt.status === 1;

      // Cache the approval status if successful (with tokenId-specific key)
      if (success) {
        const cacheKey = getCacheKey(nftContract as `0x${string}`, ownerAddress as `0x${string}`, tokenId);
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

// ============================================================================
// ERC20 Token Approval Functions
// ============================================================================

const ERC20_ABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
];

// Cache for ERC20 allowances
const erc20AllowanceCache = new Map<string, bigint>();

function getERC20CacheKey(tokenAddress: Address, ownerAddress: Address, spenderAddress: Address): string {
  return `${tokenAddress.toLowerCase()}_${ownerAddress.toLowerCase()}_${spenderAddress.toLowerCase()}`;
}

/**
 * Check ERC20 token allowance for a spender
 */
export async function checkERC20Allowance(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint
): Promise<{ hasAllowance: boolean; currentAllowance: bigint }> {
  try {
    const provider = getBrowserProvider();
    if (!provider) throw new Error('Provider not found');

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance = await contract.allowance(ownerAddress, spenderAddress);

    const hasAllowance = BigInt(allowance) >= requiredAmount;

    // Cache the allowance
    const cacheKey = getERC20CacheKey(tokenAddress, ownerAddress, spenderAddress);
    erc20AllowanceCache.set(cacheKey, BigInt(allowance));

    return {
      hasAllowance,
      currentAllowance: BigInt(allowance),
    };
  } catch (error) {
    console.error('Error checking ERC20 allowance:', error);
    return {
      hasAllowance: false,
      currentAllowance: 0n,
    };
  }
}

/**
 * Approve ERC20 token for a spender
 * Uses max uint256 approval for convenience (common pattern)
 */
export async function approveERC20(
  tokenAddress: Address,
  spenderAddress: Address,
  amount?: bigint
): Promise<boolean> {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Signer not found');

    const ownerAddress = await signer.getAddress();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    // Use max uint256 if no amount specified (infinite approval - common practice)
    const approvalAmount = amount || ethers.MaxUint256;

    const tx = await contract.approve(spenderAddress, approvalAmount);
    const receipt = await tx.wait();

    const success = receipt.status === 1;

    // Update cache if successful
    if (success) {
      const cacheKey = getERC20CacheKey(tokenAddress as `0x${string}`, ownerAddress as `0x${string}`, spenderAddress as `0x${string}`);
      erc20AllowanceCache.set(cacheKey, approvalAmount);
    }

    return success;
  } catch (error: unknown) {
    console.error('Error approving ERC20:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
      throw new Error('User rejected approval');
    }
    throw error;
  }
}

/**
 * Clear ERC20 allowance cache
 */
export function clearERC20AllowanceCache(tokenAddress?: Address, ownerAddress?: Address, spenderAddress?: Address) {
  if (tokenAddress && ownerAddress && spenderAddress) {
    const cacheKey = getERC20CacheKey(tokenAddress, ownerAddress, spenderAddress);
    erc20AllowanceCache.delete(cacheKey);
  } else {
    erc20AllowanceCache.clear();
  }
}

// ============================================================================
// Currency Approval Helpers (for Auction/Listing Bids)
// ============================================================================

/**
 * Check if currency (ERC20) is approved for Router contract
 * Wrapper function for bid/listing flows
 */
export async function checkCurrencyApproval(
  currencyAddress: Address,
  ownerAddress: Address,
  requiredAmount: bigint
): Promise<ApprovalStatus> {
  try {
    // Native currency (ETH) doesn't need approval
    if (currencyAddress === '0x0000000000000000000000000000000000000000') {
      return {
        isApproved: true,
        needsApproval: false,
      };
    }

    const { hasAllowance } = await checkERC20Allowance(
      currencyAddress,
      ownerAddress,
      ROUTER_ADDRESS,
      requiredAmount
    );

    return {
      isApproved: hasAllowance,
      needsApproval: !hasAllowance,
    };
  } catch (error) {
    console.error('Error checking currency approval:', error);
    return {
      isApproved: false,
      needsApproval: true,
    };
  }
}

/**
 * Approve currency (ERC20) for Router contract
 * Wrapper function for bid/listing flows
 */
export async function approveCurrency(
  currencyAddress: Address,
  amount?: bigint
): Promise<boolean> {
  try {
    // Native currency (ETH) doesn't need approval
    if (currencyAddress === '0x0000000000000000000000000000000000000000') {
      return true;
    }

    return await approveERC20(currencyAddress, ROUTER_ADDRESS, amount);
  } catch (error) {
    console.error('Error approving currency:', error);
    throw error;
  }
}
