import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Collection } from '../../types';
import { Card } from './Card';

interface HeroCarouselProps {
  collections: Collection[];
  autoPlayInterval?: number;
}

export function HeroCarousel({ collections, autoPlayInterval = 5000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % collections.length);
  }, [collections.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + collections.length) % collections.length);
  }, [collections.length]);

  useEffect(() => {
    if (isHovered || collections.length === 0) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isHovered, collections.length, autoPlayInterval, goToNext]);

  if (collections.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
        <p className="text-gray-400">No trending collections available</p>
      </div>
    );
  }

  const current = collections[currentIndex];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/collection/${current.id}`}>
        <div className="relative h-96 bg-gradient-to-br from-primary-500/20 to-purple-500/20">
          {current.bannerUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${current.bannerUrl})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 to-purple-500/30" />
          )}

          <div className="relative h-full flex flex-col justify-end p-8">
            <div className="mb-4">
              <span className="px-3 py-1 bg-primary-500 text-white text-sm font-medium rounded-full">
                Trending Collection
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">{current.name}</h2>
            <p className="text-gray-300 text-lg mb-4 line-clamp-2">
              {current.description || `Explore the ${current.name} collection`}
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Total Supply</p>
                <p className="text-white font-semibold">{current.totalSupply?.toString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Type</p>
                <p className="text-white font-semibold">{current.collectionType}</p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {collections.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              goToPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {collections.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
