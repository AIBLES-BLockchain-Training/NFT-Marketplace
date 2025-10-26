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
  }>;
}

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
 * Fetch metadata from URI (IPFS or HTTP)
 */
async function fetchMetadataURI(uri: string): Promise<Partial<CollectionMetadata> | null> {
  try {
    // Convert IPFS URIs to HTTP gateway
    let fetchUrl = uri;
    if (uri.startsWith('ipfs://')) {
      fetchUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json() as Partial<CollectionMetadata>;
  } catch (error) {
    console.error(`Failed to fetch metadata from ${uri}:`, error);
    return null;
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
