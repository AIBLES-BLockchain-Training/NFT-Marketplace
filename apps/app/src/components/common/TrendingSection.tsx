import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NFT, Collection } from '../../types';
import { Card } from './Card';
import { Badge } from './Badge';

interface TrendingSectionProps {
  title: string;
  items: NFT[] | Collection[];
  type: 'nfts' | 'collections';
}

export function TrendingSection({ title, items, type }: TrendingSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 400;
    const container = scrollContainerRef.current;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        <div className="flex gap-2">
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 bg-dark-card border border-dark-border hover:border-primary-500 rounded-lg flex items-center justify-center text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 bg-dark-card border border-dark-border hover:border-primary-500 rounded-lg flex items-center justify-center text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {type === 'nfts'
          ? (items as NFT[]).map((nft) => (
              <Link key={nft.id} href={`/asset/${nft.id}`} className="snap-start shrink-0">
                <Card hover className="w-64">
                  <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4 relative">
                    {nft.imageUrl ? (
                      <Image src={nft.imageUrl} alt={nft.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">{nft.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{nft.collection.name}</span>
                    <Badge variant="primary">{nft.collection.collectionType}</Badge>
                  </div>
                </Card>
              </Link>
            ))
          : (items as Collection[]).map((collection) => (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="snap-start shrink-0"
              >
                <Card hover className="w-64">
                  <div className="aspect-video bg-dark-bg rounded-lg overflow-hidden mb-4 relative">
                    {collection.bannerUrl ? (
                      <Image
                        src={collection.bannerUrl}
                        alt={collection.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-purple-500/20" />
                    )}
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    {collection.logoUrl && (
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative">
                        <Image
                          src={collection.logoUrl}
                          alt={collection.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {collection.name}
                      </h3>
                      <p className="text-sm text-gray-400">{collection.symbol}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-dark-border">
                    <div>
                      <p className="text-gray-400 mb-1">Total Supply</p>
                      <p className="text-white font-semibold">{collection.totalSupply?.toString() || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 mb-1">Type</p>
                      <Badge variant="primary">{collection.collectionType}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
