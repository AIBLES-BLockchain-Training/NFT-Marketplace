'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { Listing } from '../../types';
import { formatEth } from '../../lib/web3/utils';
import toast from 'react-hot-toast';

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const LIMIT = 20;

  const loadListings = useCallback(async (loadOffset: number, append = false) => {
    if (!append) {
      setIsLoading(true);
    }

    try {
      const where: any = {};

      if (filter === 'active') {
        where.status_eq = 'CREATED';
      } else if (filter === 'completed') {
        where.status_eq = 'COMPLETED';
      } else if (filter === 'cancelled') {
        where.status_eq = 'CANCELED';
      }

      const result = await graphqlClient.query(GET_LISTINGS_QUERY, {
        limit: LIMIT,
        offset: loadOffset,
        where,
      });

      if (result.listings) {
        if (append) {
          setListings(prev => [...prev, ...result.listings]);
        } else {
          setListings(result.listings);
        }

        setHasMore(result.listings.length === LIMIT);
        setOffset(loadOffset + result.listings.length);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, [filter, LIMIT]);

  // Initial load when filter changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    loadListings(0, false);
  }, [filter, loadListings]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadListings(offset, true);
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
  }, [hasMore, isLoading, offset, loadListings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'CANCELED':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Listings</h1>
          <p className="text-gray-400">Browse all NFT listings on the marketplace</p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'active'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Sold
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'cancelled'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Cancelled
          </button>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">No listings found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/asset/${listing.nft.id}`}>
                  <Card hover>
                    {/* NFT Image */}
                    <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4">
                      {listing.nft.imageUrl ? (
                        <img
                          src={listing.nft.imageUrl}
                          alt={listing.nft.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* NFT Info */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">
                        {listing.nft.collection.name}
                      </p>
                      <h3 className="text-lg font-semibold text-white truncate">
                        {listing.nft.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Price</p>
                      {listing.currencyApprovals && listing.currencyApprovals.length > 0 ? (
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-bold text-white">
                            {formatEth(listing.currencyApprovals[0].pricePerToken)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {listing.currencyApprovals[0].currency.symbol}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Not priced</p>
                      )}
                    </div>

                    {/* Status & Seller */}
                    <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                        <p className="text-xs text-gray-400 truncate max-w-[100px]">
                          {listing.owner.name}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(listing.status) as any}>
                        {listing.status}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Infinite scroll trigger */}
            {hasMore && !isLoading && (
              <div ref={observerTarget} className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
