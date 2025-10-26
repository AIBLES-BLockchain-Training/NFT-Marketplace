export interface MoralisNFT {
  token_address: string;
  token_id: string;
  name: string;
  symbol: string;
  token_uri?: string;
  metadata?: string;
  normalized_metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  amount?: string;
  contract_type: 'ERC721' | 'ERC1155';
}

export interface MoralisNFTResponse {
  data: MoralisNFT[];
  cursor: string | null;
  hasMore: boolean;
  warning?: string;
}

/**
 * Get NFTs owned by an address with pagination support
 * Calls the API route instead of Moralis SDK directly (SDK is server-side only)
 */
export async function getNFTsByAddress(
  address: string,
  chain = 'sepolia',
  cursor?: string,
  limit = 20
): Promise<MoralisNFTResponse> {
  try {
    const params = new URLSearchParams({
      chain,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(`/api/nfts/${address}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch NFTs');
    }

    // Log warning if Moralis API had issues
    if (data.warning) {
      console.warn('Moralis API warning:', data.warning);
    }

    return {
      data: data.data as MoralisNFT[],
      cursor: data.cursor,
      hasMore: data.hasMore,
      warning: data.warning,
    };
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    throw error;
  }
}
