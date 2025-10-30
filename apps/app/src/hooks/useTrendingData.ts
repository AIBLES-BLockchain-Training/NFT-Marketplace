import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '../lib/graphql/client';
import {
  GET_TRENDING_COLLECTIONS_QUERY,
  GET_TRENDING_NFTS_QUERY,
} from '../lib/graphql/queries';
import { NFT, Collection } from '../types';

export function useTrendingCollections(limit = 15) {
  return useQuery({
    queryKey: ['trendingCollections', limit],
    queryFn: async () => {
      const result = await graphqlClient.query(GET_TRENDING_COLLECTIONS_QUERY, { limit });

      if (!result.collections) return [];

      const collections = result.collections.map((collection: any) => {
        let txCount = 0;
        if (collection.nfts && collection.nfts.length > 0) {
          collection.nfts.forEach((nft: any) => {
            if (nft.purchaseHistory) {
              txCount += nft.purchaseHistory.length;
            }
          });
        }
        return { ...collection, txCount };
      });

      return collections.sort((a: any, b: any) => b.txCount - a.txCount);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useTrendingNFTs(limit = 15) {
  return useQuery({
    queryKey: ['trendingNFTs', limit],
    queryFn: async () => {
      const result = await graphqlClient.query(GET_TRENDING_NFTS_QUERY, { limit });

      if (!result.nfts) return [];

      const nfts = result.nfts.map((nft: any) => {
        const txCount = nft.purchaseHistory ? nft.purchaseHistory.length : 0;
        return { ...nft, txCount };
      });

      return nfts.sort((a: any, b: any) => b.txCount - a.txCount);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useTrendingData(limit = 15) {
  const collectionsQuery = useTrendingCollections(limit);
  const nftsQuery = useTrendingNFTs(limit);

  return {
    collections: collectionsQuery.data || [],
    nfts: nftsQuery.data || [],
    isLoading: collectionsQuery.isLoading || nftsQuery.isLoading,
    error: collectionsQuery.error || nftsQuery.error,
  };
}
