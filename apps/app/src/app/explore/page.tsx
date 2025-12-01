'use client';

import { MainLayout } from '../../components/layout/MainLayout';
import { HeroCarousel } from '../../components/common/HeroCarousel';
import { TrendingSection } from '../../components/common/TrendingSection';
import { useTrendingData } from '../../hooks/useTrendingData';

export default function ExplorePage() {
  const { collections, nfts, isLoading } = useTrendingData(15);

  const heroCollections = collections.slice(0, 5);
  const trendingCollections = collections.slice(0, 10);
  const trendingNFTs = nfts.slice(0, 10);

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
