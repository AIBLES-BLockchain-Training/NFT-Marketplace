'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { HeroCarousel } from '../../components/common/HeroCarousel';
import { TrendingSection } from '../../components/common/TrendingSection';
import { graphqlClient } from '../../lib/graphql/client';
import {
  GET_TRENDING_COLLECTIONS_QUERY,
  GET_TRENDING_NFTS_QUERY,
} from '../../lib/graphql/queries';
import { NFT, Collection } from '../../types';
import toast from 'react-hot-toast';

export default function ExplorePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [heroCollections, setHeroCollections] = useState<Collection[]>([]);
  const [trendingNFTs, setTrendingNFTs] = useState<NFT[]>([]);
  const [trendingCollections, setTrendingCollections] = useState<Collection[]>([]);

  const loadTrendingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [collectionsResult, nftsResult] = await Promise.all([
        graphqlClient.query(GET_TRENDING_COLLECTIONS_QUERY, { limit: 15 }),
        graphqlClient.query(GET_TRENDING_NFTS_QUERY, { limit: 15 }),
      ]);

      if (collectionsResult.collections) {
        const collections = collectionsResult.collections;

        // Calculate transaction count for each collection
        const collectionsWithTxCount = collections.map((collection: any) => {
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

        // Sort by transaction count
        const sortedCollections = collectionsWithTxCount.sort(
          (a: any, b: any) => b.txCount - a.txCount
        );

        // Top 5 for hero carousel
        setHeroCollections(sortedCollections.slice(0, 5));
        // Top 10 for trending section
        setTrendingCollections(sortedCollections.slice(0, 10));
      }

      if (nftsResult.nfts) {
        const nfts = nftsResult.nfts;

        // Calculate transaction count for each NFT
        const nftsWithTxCount = nfts.map((nft: any) => {
          const txCount = nft.purchaseHistory ? nft.purchaseHistory.length : 0;
          return { ...nft, txCount };
        });

        // Sort by transaction count
        const sortedNFTs = nftsWithTxCount.sort((a: any, b: any) => b.txCount - a.txCount);

        // Top 10 trending NFTs
        setTrendingNFTs(sortedNFTs.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load trending data:', error);
      toast.error('Failed to load trending data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrendingData();
  }, [loadTrendingData]);

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        {isLoading ? (
          <div className="space-y-8">
            <div className="h-96 bg-dark-card border border-dark-border rounded-2xl animate-pulse" />
            <div className="h-64 bg-dark-card border border-dark-border rounded-2xl animate-pulse" />
            <div className="h-64 bg-dark-card border border-dark-border rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="mb-12">
              <HeroCarousel collections={heroCollections} />
            </div>

            <TrendingSection title="Trending Tokens" items={trendingNFTs} type="nfts" />

            <TrendingSection
              title="Trending Collections"
              items={trendingCollections}
              type="collections"
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
