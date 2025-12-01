import { useQuery } from '@tanstack/react-query';
import { getNFTsByAddress, MoralisNFT } from '../lib/moralis/client';
import { NFT } from '../types';

interface UseUserNFTsOptions {
  address: string;
  enabled?: boolean;
}

export function useUserNFTs({ address, enabled = true }: UseUserNFTsOptions) {
  return useQuery({
    queryKey: ['userNFTs', address],
    queryFn: async () => {
      const response = await getNFTsByAddress(address, 'sepolia', undefined, 100);

      const nfts: NFT[] = response.data.map((nft: MoralisNFT) => {
        const metadata = nft.normalized_metadata || {};

        return {
          id: `${nft.token_address.toLowerCase()}-${nft.token_id}`,
          tokenId: nft.token_id,
          name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
          imageUrl: metadata.image || undefined,
          description: metadata.description || undefined,
          metadataUri: nft.token_uri || undefined,
          amount: nft.amount || '1', // For ERC1155, Moralis provides amount; default to 1 for ERC721
          collection: {
            id: nft.token_address.toLowerCase() as `0x${string}`,
            name: nft.name || 'Unknown Collection',
            symbol: nft.symbol || 'NFT',
            collectionType: (nft.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155') as any,
            creator: {
              id: nft.token_address.toLowerCase() as `0x${string}`,
              name: nft.name || 'Unknown',
              subjectType: 'CONTRACT' as any,
              createdAt: new Date().toISOString(),
            },
            totalSupply: '0',
            createdAt: new Date().toISOString(),
          },
          traits: metadata.attributes?.map((attr, idx) => ({
            id: `${nft.token_address}_${nft.token_id}_${idx}`,
            traitType: attr.trait_type,
            value: String(attr.value),
            displayType: undefined,
          })) || [],
        };
      });

      return {
        nfts,
        hasMore: response.hasMore,
        cursor: response.cursor,
        total: response.total || nfts.length,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
