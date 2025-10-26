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

/**
 * Get all NFTs owned by an address
 * Calls the API route instead of Moralis SDK directly (SDK is server-side only)
 */

export async function getNFTsByAddress(
  address: string,
  chain = 'sepolia'
): Promise<MoralisNFT[]> {
  try {
    const response = await fetch(`/api/nfts/${address}?chain=${chain}`);

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

    return data.data as MoralisNFT[];
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    throw error;
  }
}
