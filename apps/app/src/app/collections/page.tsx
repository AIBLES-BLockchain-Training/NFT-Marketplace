'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { NFTImage } from '../../components/common/NFTImage';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_COLLECTIONS_TABLE_QUERY } from '../../lib/graphql/queries';
import { formatEth } from '../../lib/web3/utils';
import toast from 'react-hot-toast';

interface CollectionTableData {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  collectionType: string;
  floorPrice: string;
  floorPriceCurrency: string;
  oneDayVolume: string;
  oneDayChange: number;
  oneDaySales: number;
  owners: number;
}

type SortField = '1d_change' | 'floor_price' | '24h_volume' | '1d_sales';
type SortOrder = 'asc' | 'desc';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionTableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);

  const LIMIT = 20;

  const calculateMetrics = (rawCollection: any): CollectionTableData => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    // Get all unique owners
    const ownerSet = new Set<string>();
    rawCollection.nfts?.forEach((nft: any) => {
      nft.owners?.forEach((owner: any) => {
        if (owner.ownerAddress) {
          ownerSet.add(owner.ownerAddress.toLowerCase());
        }
      });
    });

    // Calculate floor price (LOWEST active listing price)
    // When comparing across currencies, take the one with highest numeric value for display
    let floorPriceValue = '0';
    let floorPriceCurrency = 'ETH';
    let hasFoundListing = false;

    rawCollection.nfts?.forEach((nft: any) => {
      nft.listings?.forEach((listing: any) => {
        if (listing.status === 'CREATED' || listing.status === 'ACTIVE') {
          const listingPrice = BigInt(listing.pricePerToken || '0');
          if (listingPrice > BigInt(0)) {
            if (!hasFoundListing) {
              // First listing found
              floorPriceValue = listing.pricePerToken;
              floorPriceCurrency = listing.currency || 'ETH';
              hasFoundListing = true;
            } else {
              const currentFloor = BigInt(floorPriceValue);
              // Take LOWEST price (floor)
              // If comparing different currencies, prefer the one with higher numeric value
              const currentCurrency = floorPriceCurrency;
              const newCurrency = listing.currency || 'ETH';

              if (currentCurrency === newCurrency) {
                // Same currency - take the lower price
                if (listingPrice < currentFloor) {
                  floorPriceValue = listing.pricePerToken;
                }
              } else {
                // Different currencies - take the one with higher numeric value for better display
                if (listingPrice > currentFloor) {
                  floorPriceValue = listing.pricePerToken;
                  floorPriceCurrency = newCurrency;
                }
              }
            }
          }
        }
      });
    });

    // Calculate 1D sales and volume
    let oneDaySales = 0;
    let todayVolume = BigInt(0);  // Last 24 hours
    let yesterdayVolume = BigInt(0);  // 24-48 hours ago

    rawCollection.nfts?.forEach((nft: any) => {
      nft.purchaseHistory?.forEach((purchase: any) => {
        const purchaseTime = new Date(purchase.timestamp).getTime();
        if (purchaseTime >= oneDayAgo) {
          // Last 24 hours
          oneDaySales++;
          todayVolume += BigInt(purchase.totalPrice || '0');
        } else if (purchaseTime >= twoDaysAgo) {
          // 24-48 hours ago
          yesterdayVolume += BigInt(purchase.totalPrice || '0');
        }
      });
    });

    // Calculate 1D change: compare last 24h volume with previous 24h volume
    // Only show meaningful % when there's enough data
    let oneDayChange = 0;
    const MIN_SALES_FOR_CHANGE = 2; // Need at least 2 sales in each period for meaningful %

    // Count sales in each period
    let todaySalesCount = 0;
    let yesterdaySalesCount = 0;
    rawCollection.nfts?.forEach((nft: any) => {
      nft.purchaseHistory?.forEach((purchase: any) => {
        const purchaseTime = new Date(purchase.timestamp).getTime();
        if (purchaseTime >= oneDayAgo) {
          todaySalesCount++;
        } else if (purchaseTime >= twoDaysAgo) {
          yesterdaySalesCount++;
        }
      });
    });

    // Only calculate % if both periods have enough sales
    if (todaySalesCount >= MIN_SALES_FOR_CHANGE && yesterdaySalesCount >= MIN_SALES_FOR_CHANGE && yesterdayVolume > BigInt(0)) {
      const change = Number(todayVolume - yesterdayVolume) / Number(yesterdayVolume);
      // Cap the change at reasonable limits (-99% to +500%)
      const cappedChange = Math.max(-99, Math.min(500, change * 100));
      oneDayChange = cappedChange;
    }
    // If not enough data, leave as 0 (will show as "--" in UI)

    return {
      id: rawCollection.id,
      name: rawCollection.name,
      logoUrl: rawCollection.logoUrl,
      collectionType: rawCollection.collectionType || 'ERC721',
      floorPrice: floorPriceValue,
      floorPriceCurrency: floorPriceCurrency,
      oneDayVolume: todayVolume.toString(),
      oneDayChange: Number(oneDayChange.toFixed(2)),
      oneDaySales,
      owners: ownerSet.size,
    };
  };

  const loadCollections = useCallback(async (loadOffset: number, append = false) => {
    try {
      const result = await graphqlClient.query(GET_COLLECTIONS_TABLE_QUERY, {
        limit: LIMIT,
        offset: loadOffset,
      });

      if (result.collections) {
        const processedCollections = result.collections.map(calculateMetrics);

        // Enrich with Rarible metadata (logo + description)
        const enrichedCollections = await Promise.all(
          processedCollections.map(async (collection) => {
            try {
              const response = await fetch(`/api/collection/rarible?address=${collection.id}`);
              const data = await response.json();

              if (data.exists && data.data) {
                return {
                  ...collection,
                  logoUrl: data.data.image || collection.logoUrl,
                  description: data.data.description || undefined,
                };
              }
            } catch (error) {
              console.error(`Failed to load Rarible metadata for ${collection.id}:`, error);
            }
            return collection;
          })
        );

        if (append) {
          setCollections(prev => [...prev, ...enrichedCollections]);
        } else {
          setCollections(enrichedCollections);
        }

        setHasMore(result.collections.length === LIMIT);
        setOffset(loadOffset + result.collections.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadCollections(0, false);
  }, [loadCollections]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadCollections(offset, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, offset, loadCollections]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Apply search filter
  const filteredCollections = collections.filter((collection) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = collection.name.toLowerCase().includes(query);
    const addressMatch = collection.id.toLowerCase().includes(query);

    return nameMatch || addressMatch;
  });

  // Apply sorting
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case '1d_change':
        aValue = a.oneDayChange;
        bValue = b.oneDayChange;
        break;
      case 'floor_price':
        aValue = Number(a.floorPrice);
        bValue = Number(b.floorPrice);
        break;
      case '24h_volume':
        aValue = Number(a.oneDayVolume);
        bValue = Number(b.oneDayVolume);
        break;
      case '1d_sales':
        aValue = a.oneDaySales;
        bValue = b.oneDaySales;
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field, active }: { field: SortField; active: boolean }) => (
    <span className="inline-block ml-1">
      {active && sortField === field ? (
        sortOrder === 'desc' ? '↓' : '↑'
      ) : (
        <span className="text-gray-600">⇅</span>
      )}
    </span>
  );

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Collections</h1>
          <p className="text-gray-400">Browse all NFT collections</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by collection name or address..."
              className="w-full px-4 py-3 pl-12 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        {!isLoading && collections.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400">
              {searchQuery ? (
                <>Found {filteredCollections.length} of {collections.length} collections</>
              ) : (
                <>Showing {collections.length} collections{hasMore ? ' (scroll for more)' : ''}</>
              )}
            </p>
          </div>
        )}

        {isLoading && collections.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[50px_minmax(400px,1fr)_200px_200px_200px_160px_160px] gap-12 px-6 py-4 bg-dark-bg border-b border-dark-border text-sm font-semibold text-gray-400">
              <div className="text-center">#</div>
              <div>COLLECTION</div>
              <div
                className="cursor-pointer hover:text-white transition-colors text-center"
                onClick={() => handleSort('1d_change')}
              >
                1D CHANGE
                <SortIcon field="1d_change" active={sortField === '1d_change'} />
              </div>
              <div
                className="cursor-pointer hover:text-white transition-colors text-center"
                onClick={() => handleSort('floor_price')}
              >
                FLOOR PRICE
                <SortIcon field="floor_price" active={sortField === 'floor_price'} />
              </div>
              <div
                className="cursor-pointer hover:text-white transition-colors text-center"
                onClick={() => handleSort('24h_volume')}
              >
                24H VOLUME
                <SortIcon field="24h_volume" active={sortField === '24h_volume'} />
              </div>
              <div
                className="cursor-pointer hover:text-white transition-colors text-center"
                onClick={() => handleSort('1d_sales')}
              >
                1D SALES
                <SortIcon field="1d_sales" active={sortField === '1d_sales'} />
              </div>
              <div className="text-center">OWNERS</div>
            </div>

            {/* Table Body */}
            {sortedCollections.length === 0 ? (
              <div className="text-center py-16">
                {searchQuery ? (
                  <div>
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-400 mb-2">No collections found for &quot;{searchQuery}&quot;</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-primary-400 hover:text-primary-300 text-sm"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-400">No collections found</p>
                )}
              </div>
            ) : (
              <div>
                {sortedCollections.map((collection, index) => (
                  <Link
                    key={collection.id}
                    href={`/collection/${collection.id}`}
                    className="grid grid-cols-[50px_minmax(400px,1fr)_200px_200px_200px_160px_160px] gap-12 px-6 py-4 border-b border-dark-border hover:bg-dark-bg transition-colors group"
                  >
                    {/* Index */}
                    <div className="flex items-center justify-center">
                      <span className="text-gray-500 text-sm">{index + 1}</span>
                    </div>

                    {/* Collection */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-bg flex-shrink-0 relative">
                        <NFTImage
                          src={collection.logoUrl}
                          alt={collection.name}
                          className="object-cover"
                          width={64}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold truncate group-hover:text-primary-400 transition-colors">
                            {collection.name}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded text-gray-400 whitespace-nowrap">
                            {collection.collectionType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 1D Change */}
                    <div className="flex items-center justify-center">
                      {collection.oneDayChange === 0 ? (
                        <span className="text-gray-500">—</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            collection.oneDayChange > 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {collection.oneDayChange > 0 ? '+' : ''}
                          {collection.oneDayChange.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    {/* Floor Price */}
                    <div className="flex items-center justify-center">
                      {collection.floorPrice !== '0' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-white font-semibold">
                            {formatEth(collection.floorPrice)}
                          </span>
                          <span className="text-gray-500 text-sm">{collection.floorPriceCurrency}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>

                    {/* 24H Volume */}
                    <div className="flex items-center justify-center">
                      {collection.oneDayVolume !== '0' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-white font-semibold">
                            {formatEth(collection.oneDayVolume)}
                          </span>
                          <span className="text-gray-500 text-sm">ETH</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>

                    {/* 1D Sales */}
                    <div className="flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {collection.oneDaySales}
                      </span>
                    </div>

                    {/* Owners */}
                    <div className="flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {collection.owners.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}

                {/* Loading indicator for infinite scroll */}
                {hasMore && (
                  <div ref={observerTarget} className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
