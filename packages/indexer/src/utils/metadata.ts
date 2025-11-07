import { ethers } from 'ethers';

const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256) view returns (string)',
  'function contractURI() view returns (string)',
  'function supportsInterface(bytes4) view returns (bool)',
];

const ERC1155_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function uri(uint256) view returns (string)',
  'function supportsInterface(bytes4) view returns (bool)',
];

export interface CollectionMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  banner_image?: string;
  contractURI?: string;
}

export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

// ========== API CONFIGURATION ==========
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

const RARIBLE_API_KEY = process.env.RARIBLE_API_KEY;
const RARIBLE_BASE_URL = 'https://testnet-api.rarible.org/v0.1';
const RARIBLE_CHAIN_ID = 'ETHEREUM';

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// LRU cache for Moralis responses with size limit
const moralisCache = new LRUCache<string, any>(5000, 60 * 60 * 1000); // Max 5000 items, 1 hour TTL

// Quota tracking
let dailyRequestCount = 0;
let monthlyRequestCount = 0;
let quotaResetDate = new Date();
quotaResetDate.setHours(0, 0, 0, 0);

const DAILY_LIMIT = 1300; // ~40,000/month
const MONTHLY_LIMIT = 40000;

function checkMoralisQuota(): boolean {
  const now = new Date();

  // Reset daily counter
  if (now.getTime() > quotaResetDate.getTime() + 86400000) {
    dailyRequestCount = 0;
    quotaResetDate = new Date();
    quotaResetDate.setHours(0, 0, 0, 0);
  }

  // Reset monthly counter on 1st of month
  if (now.getDate() === 1 && now.getHours() === 0) {
    monthlyRequestCount = 0;
  }

  // Check limits
  if (dailyRequestCount >= DAILY_LIMIT) {
    console.warn(`Moralis daily quota reached: ${dailyRequestCount}/${DAILY_LIMIT}`);
    return false;
  }

  if (monthlyRequestCount >= MONTHLY_LIMIT) {
    console.warn(`Moralis monthly quota reached: ${monthlyRequestCount}/${MONTHLY_LIMIT}`);
    return false;
  }

  dailyRequestCount++;
  monthlyRequestCount++;
  return true;
}

// ========== MORALIS API FUNCTIONS ==========

/**
 * Fetch collection metadata from Moralis API
 * Fast, reliable, includes logo/banner/description
 */
export async function fetchCollectionMetadataFromMoralis(
  contractAddress: string
): Promise<CollectionMetadata | null> {
  if (!MORALIS_API_KEY) {
    return null;
  }

  const cacheKey = `collection:${contractAddress.toLowerCase()}`;

  // Check cache first
  const cached = moralisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check quota before making request
  if (!checkMoralisQuota()) {
    return null;
  }

  try {
    const response = await fetch(
      `${MORALIS_BASE_URL}/nft/${contractAddress}/metadata`,
      {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Collection not found on Moralis: ${contractAddress}`);
      } else if (response.status === 429) {
        console.warn(`Moralis rate limit exceeded (429)`);
      } else {
        console.warn(`Moralis API error: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    const metadata: CollectionMetadata = {
      name: data.name || 'Unknown Collection',
      symbol: data.symbol || 'NFT',
      description: data.collection_description || undefined,
      image: data.collection_logo || undefined,
      banner_image: data.collection_banner_image || undefined,
      contractURI: undefined,
    };

    console.log(`[Moralis] Collection ${contractAddress}:`, {
      name: metadata.name,
      hasLogo: !!metadata.image,
      hasBanner: !!metadata.banner_image,
      hasDescription: !!metadata.description,
      logo: metadata.image?.substring(0, 50),
      banner: metadata.banner_image?.substring(0, 50)
    });

    // Cache the result
    moralisCache.set(cacheKey, metadata);

    return metadata;
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      console.error(`Moralis API timeout for ${contractAddress}`);
    } else {
      console.error(`Moralis API error for ${contractAddress}:`, error.message);
    }
    return null;
  }
}

export async function fetchNFTMetadataFromMoralis(
  contractAddress: string,
  tokenId: string
): Promise<NFTMetadata | null> {
  if (!MORALIS_API_KEY) {
    return null;
  }

  const cacheKey = `nft:${contractAddress.toLowerCase()}:${tokenId}`;

  // Check cache first
  const cached = moralisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check quota before making request
  if (!checkMoralisQuota()) {
    return null;
  }

  try {

    const response = await fetch(
      `${MORALIS_BASE_URL}/nft/${contractAddress}/${tokenId}?format=decimal&normalizeMetadata=true`,
      {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const normalized = data.normalized_metadata || {};

    const metadata: NFTMetadata = {
      name: normalized.name,
      description: normalized.description,
      image: normalized.image,
      attributes: normalized.attributes?.map((attr: any) => ({
        trait_type: attr.trait_type,
        value: attr.value,
        display_type: attr.display_type
      }))
    };

    // Cache the result
    moralisCache.set(cacheKey, metadata);

    return metadata;
  } catch (error) {
    return null;
  }
}

// ========== RARIBLE API FUNCTIONS ==========

/**
 * Fetch collection metadata from Rarible API
 * Works for any collection, better coverage than Moralis
 */
export async function fetchCollectionMetadataFromRarible(
  contractAddress: string,
  retries = 3
): Promise<CollectionMetadata | null> {
  const cacheKey = `rarible:collection:${contractAddress.toLowerCase()}`;

  const cached = moralisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const collectionId = `${RARIBLE_CHAIN_ID}:${contractAddress}`;
      const url = `${RARIBLE_BASE_URL}/collections/${collectionId}`;
      const headers: Record<string, string> = {
        'accept': 'application/json',
      };

      if (RARIBLE_API_KEY) {
        headers['X-API-KEY'] = RARIBLE_API_KEY;
      }

      console.log(`[Rarible] Fetching collection: ${url}`);
      console.log(`[Rarible] API Key present: ${!!RARIBLE_API_KEY}, Chain: ${RARIBLE_CHAIN_ID}`);

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(20000)
      });

      console.log(`[Rarible] Response status: ${response.status} for ${contractAddress}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[Rarible] Collection not found: ${contractAddress}`);
          return null;
        }
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        console.error(`[Rarible] HTTP ${response.status} for ${contractAddress}: ${errorBody}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log(`[Rarible] RAW Response for ${contractAddress}:`, JSON.stringify(data, null, 2));

      let logoUrl: string | undefined;
      let bannerUrl: string | undefined;

      if (data.meta?.content && Array.isArray(data.meta.content)) {
        console.log(`[Rarible] Found meta.content with ${data.meta.content.length} items`);
        for (const item of data.meta.content) {
          console.log(`[Rarible] Content item:`, JSON.stringify(item, null, 2));
          if (item.representation === 'ORIGINAL' || item.representation === 'PREVIEW') {
            logoUrl = item.url;
          }
          if (item.representation === 'BIG') {
            bannerUrl = item.url;
          }
        }
      } else {
        console.log(`[Rarible] No meta.content found. data.meta:`, JSON.stringify(data.meta, null, 2));
      }

      if (!bannerUrl && data.meta?.cover?.url) {
        bannerUrl = data.meta.cover.url;
        console.log(`[Rarible] Using cover.url for banner: ${bannerUrl}`);
      }

      const metadata: CollectionMetadata = {
        name: data.meta?.name || data.name || 'Unknown Collection',
        symbol: data.symbol || 'NFT',
        description: data.meta?.description || undefined,
        image: logoUrl || undefined,
        banner_image: bannerUrl || undefined,
        contractURI: undefined,
      };

      console.log(`[Rarible] Final metadata:`, {
        name: metadata.name,
        logo: metadata.image,
        banner: metadata.banner_image,
        description: metadata.description,
      });

      moralisCache.set(cacheKey, metadata);
      return metadata;
    } catch (error: any) {
      const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error(`[Rarible] Failed after ${retries} attempts for ${contractAddress}:`, error.message);
        return null;
      }

      const backoffMs = attempt * 1000;
      console.warn(`[Rarible] Attempt ${attempt}/${retries} failed for ${contractAddress}, retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  return null;
}

/**
 * Fetch NFT metadata from Rarible API
 */
export async function fetchNFTMetadataFromRarible(
  contractAddress: string,
  tokenId: string,
  retries = 3
): Promise<NFTMetadata | null> {
  const cacheKey = `rarible:nft:${contractAddress.toLowerCase()}:${tokenId}`;

  const cached = moralisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const itemId = `${RARIBLE_CHAIN_ID}:${contractAddress}:${tokenId}`;
      const url = `${RARIBLE_BASE_URL}/items/${itemId}`;
      const headers: Record<string, string> = {
        'accept': 'application/json',
      };

      if (RARIBLE_API_KEY) {
        headers['X-API-KEY'] = RARIBLE_API_KEY;
      }

      console.log(`[Rarible] Fetching NFT: ${url}`);

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(20000)
      });

      console.log(`[Rarible] NFT Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[Rarible] NFT not found: ${contractAddress}:${tokenId}`);
          return null;
        }
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        console.error(`[Rarible] NFT HTTP ${response.status}: ${errorBody}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const meta = data.meta || {};

      let imageUrl: string | undefined;
      if (meta.content && Array.isArray(meta.content) && meta.content.length > 0) {
        imageUrl = meta.content[0].url;
      }

      const metadata: NFTMetadata = {
        name: meta.name,
        description: meta.description,
        image: imageUrl,
        attributes: meta.attributes?.map((attr: any) => ({
          trait_type: attr.key,
          value: attr.value,
          display_type: attr.type
        }))
      };

      moralisCache.set(cacheKey, metadata);
      return metadata;
    } catch (error: any) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        return null;
      }

      const backoffMs = attempt * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  return null;
}

// ========== EXISTING FUNCTIONS WITH BLOCKCHAIN + IPFS ==========

/**
 * Fetch NFT metadata from tokenURI
 */
export async function fetchNFTMetadata(
  contractAddress: string,
  tokenId: string,
  provider: ethers.Provider
): Promise<NFTMetadata | null> {
  try {
    // Try ERC721 first
    let contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    let tokenURI: string | undefined;

    try {
      // Try ERC721 tokenURI method
      tokenURI = await contract.tokenURI?.(tokenId);
    } catch {
      // If ERC721 fails, try ERC1155 uri method
      contract = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
      try {
        tokenURI = await contract.uri?.(tokenId);
      } catch (e) {
        console.error(`Failed to get tokenURI for ${contractAddress}:${tokenId}:`, e);
        return null;
      }
    }

    if (!tokenURI) {
      return null;
    }

    // Fetch metadata from URI
    return await fetchMetadataURI(tokenURI) as NFTMetadata | null;
  } catch (error) {
    console.error(`Failed to fetch NFT metadata for ${contractAddress}:${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetch collection metadata from blockchain
 */
export async function fetchCollectionMetadata(
  contractAddress: string,
  provider: ethers.Provider
): Promise<CollectionMetadata> {
  try {
    // Try ERC721 first
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

    const [name, symbol] = await Promise.all([
      contract.name().catch(() => 'Unknown Collection'),
      contract.symbol().catch(() => 'NFT'),
    ]);

    // Try to get contractURI for additional metadata
    let metadata: Partial<CollectionMetadata> = {};
    try {
      const contractURI = await contract.contractURI();
      if (contractURI) {
        // Fetch metadata from IPFS/HTTP
        const metadataResponse = await fetchMetadataURI(contractURI);
        if (metadataResponse) {
          metadata = metadataResponse;
        }
      }
    } catch (e) {
      // contractURI not supported, skip
    }

    return {
      name: metadata.name || name,
      symbol: metadata.symbol || symbol,
      description: metadata.description,
      image: metadata.image,
      banner_image: metadata.banner_image,
      contractURI: metadata.contractURI,
    };
  } catch (error) {
    console.error(`Failed to fetch collection metadata for ${contractAddress}:`, error);
    return {
      name: `Collection ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
      symbol: 'NFT',
    };
  }
}

/**
 * Fetch metadata from URI (IPFS or HTTP) with multiple gateway fallbacks
 */
async function fetchMetadataURI(uri: string): Promise<Partial<CollectionMetadata> | null> {
  try {
    // Get IPFS hash from URI
    let hash = '';

    if (uri.startsWith('ipfs://')) {
      hash = uri.replace('ipfs://', '');
      // Handle Rarible's format: ipfs://ipfs/hash
      if (hash.startsWith('ipfs/')) {
        hash = hash.replace('ipfs/', '');
      }
    } else if (uri.startsWith('http')) {
      // Extract IPFS hash from HTTP gateway URLs
      // Format: https://gateway.com/ipfs/HASH or https://gateway.com/ipfs/HASH/1
      const ipfsMatch = uri.match(/\/ipfs\/([^/?#]+(?:\/[^/?#]+)?)/);
      if (ipfsMatch && ipfsMatch[1]) {
        hash = ipfsMatch[1];
      } else {
        // Not an IPFS gateway URL, use as-is (non-IPFS HTTP)
        try {
          return await fetchWithTimeout(uri, 15000);
        } catch (error: any) {
          console.error(`Failed to fetch from ${uri}: ${error.message || error}`);
          return null;
        }
      }
    } else {
      return null;
    }

    if (!hash) {
      return null;
    }

    // Try multiple IPFS gateways in parallel (race condition)
    const gateways = [
      `https://dweb.link/ipfs/${hash}`,
      `https://ipfs.io/ipfs/${hash}`,
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://4everland.io/ipfs/${hash}`,
    ];

    // Create promises for all gateways and race them
    const fetchPromises = gateways.map((gateway) =>
      fetchWithTimeout(gateway, 8000)
        .then(result => {
          if (result) {
            return result;
          }
          throw new Error('Empty result');
        })
    );

    try {
      // Promise.any returns the first successful promise
      // If all fail, it throws AggregateError
      const result = await Promise.any(fetchPromises);
      return result;
    } catch (error: any) {
      // All gateways failed
      console.error(`All gateways failed for ${hash.substring(0, 10)}...`);
      return null;
    }
  } catch (error: any) {
    console.error(`Failed to fetch metadata from ${uri}: ${error.message || error}`);
    return null;
  }
}

/**
 * Helper function to fetch with timeout
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Partial<CollectionMetadata> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Fail fast for 404 - metadata doesn't exist
    if (response.status === 404) {
      throw new Error('Not Found (404)');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as Partial<CollectionMetadata>;
  } catch (error: any) {
    // Provide better error messages
    if (error.name === 'AbortError') {
      throw new Error(`Timeout (${timeout}ms)`);
    }
    if (error.message) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/**
 * Detect if contract is ERC721 or ERC1155
 */
export async function detectContractType(
  contractAddress: string,
  provider: ethers.Provider
): Promise<'ERC721' | 'ERC1155' | 'UNKNOWN'> {
  try {
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

    // ERC721 interface ID: 0x80ac58cd
    const isERC721 = await contract.supportsInterface('0x80ac58cd').catch(() => false);
    if (isERC721) return 'ERC721';

    // ERC1155 interface ID: 0xd9b67a26
    const isERC1155 = await contract.supportsInterface('0xd9b67a26').catch(() => false);
    if (isERC1155) return 'ERC1155';

    return 'UNKNOWN';
  } catch (error) {
    console.error(`Failed to detect contract type for ${contractAddress}:`, error);
    return 'UNKNOWN';
  }
}

// ========== IMAGE URL NORMALIZATION ==========

function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // If already HTTP/HTTPS, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Convert IPFS protocol to gateway URL
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '').replace('ipfs/', '');
    // Use dweb.link gateway (most reliable currently)
    return `https://dweb.link/ipfs/${hash}`;
  }

  return url;
}

export async function fetchCollectionMetadataUnified(
  contractAddress: string,
  provider: ethers.Provider
): Promise<CollectionMetadata> {
  console.log(`\n===== Fetching collection metadata for ${contractAddress} =====`);

  // Strategy 1: Try Rarible API first
  console.log(`[Strategy 1] Trying Rarible API...`);
  const raribleMetadata = await fetchCollectionMetadataFromRarible(contractAddress);
  if (raribleMetadata && (raribleMetadata.image || raribleMetadata.description)) {
    const normalizedLogo = normalizeImageUrl(raribleMetadata.image);
    const normalizedBanner = normalizeImageUrl(raribleMetadata.banner_image);

    console.log(`[SUCCESS] Using Rarible data - Logo: ${!!normalizedLogo}, Banner: ${!!normalizedBanner}`);

    return {
      ...raribleMetadata,
      image: normalizedLogo,
      banner_image: normalizedBanner,
    };
  }
  console.log(`[Strategy 1] Rarible API failed or no image/description`);

  // Strategy 2: Fallback to Blockchain + IPFS
  console.log(`[Strategy 2] Trying Blockchain + IPFS...`);
  try {
    const blockchainMetadata = await fetchCollectionMetadata(contractAddress, provider);

    const mergedMetadata: CollectionMetadata = {
      name: blockchainMetadata.name || raribleMetadata?.name || 'Unknown Collection',
      symbol: blockchainMetadata.symbol || raribleMetadata?.symbol || 'NFT',
      description: raribleMetadata?.description || blockchainMetadata.description,
      image: normalizeImageUrl(blockchainMetadata.image || raribleMetadata?.image),
      banner_image: normalizeImageUrl(raribleMetadata?.banner_image || blockchainMetadata.banner_image),
      contractURI: blockchainMetadata.contractURI,
    };

    console.log(`[SUCCESS] Using Blockchain data - Logo: ${!!mergedMetadata.image}, Banner: ${!!mergedMetadata.banner_image}`);
    return mergedMetadata;
  } catch (error) {
    console.error(`[Strategy 2] Blockchain fetch failed:`, error);
  }

  // Strategy 3: Minimal fallback
  console.log(`[Strategy 3] Using minimal fallback`);
  return {
    name: raribleMetadata?.name || `Collection ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
    symbol: raribleMetadata?.symbol || 'NFT',
    description: raribleMetadata?.description,
    image: normalizeImageUrl(raribleMetadata?.image),
    banner_image: normalizeImageUrl(raribleMetadata?.banner_image),
  };
}

export async function fetchNFTMetadataUnified(
  contractAddress: string,
  tokenId: string,
  provider: ethers.Provider
): Promise<NFTMetadata | null> {
  // Strategy 1: Try Rarible API first
  const raribleMetadata = await fetchNFTMetadataFromRarible(contractAddress, tokenId);
  if (raribleMetadata && raribleMetadata.image) {
    return {
      ...raribleMetadata,
      image: normalizeImageUrl(raribleMetadata.image),
    };
  }

  // Strategy 2: Try tokenURI → IPFS
  const ipfsMetadata = await fetchNFTMetadata(contractAddress, tokenId, provider);
  if (ipfsMetadata && ipfsMetadata.image) {
    return {
      ...ipfsMetadata,
      image: normalizeImageUrl(ipfsMetadata.image),
    };
  }

  // Strategy 3: Merge all sources
  if (raribleMetadata || ipfsMetadata) {
    return {
      name: raribleMetadata?.name || ipfsMetadata?.name,
      description: raribleMetadata?.description || ipfsMetadata?.description,
      image: normalizeImageUrl(raribleMetadata?.image || ipfsMetadata?.image),
      attributes: raribleMetadata?.attributes || ipfsMetadata?.attributes,
    };
  }
  return null;
}