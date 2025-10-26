'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_AUCTIONS_QUERY } from '../../lib/graphql/queries';
import { Auction } from '../../types';
import { formatEth } from '../../lib/web3/utils';
import toast from 'react-hot-toast';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'cancelled'>('active');

  useEffect(() => {
    loadAuctions();
  }, [filter]);

  const loadAuctions = async () => {
    setIsLoading(true);
    try {
      const where: any = {};

      if (filter === 'active') {
        where.status_in = ['CREATED', 'ACTIVE'];
      } else if (filter === 'ended') {
        where.status_eq = 'ENDED';
      } else if (filter === 'cancelled') {
        where.status_eq = 'CANCELLED';
      }

      const result = await graphqlClient.query(GET_AUCTIONS_QUERY, {
        limit: 50,
        offset: 0,
        where,
      });

      if (result.auctions) {
        setAuctions(result.auctions);
      }
    } catch (error) {
      console.error('Failed to load auctions:', error);
      toast.error('Failed to load auctions');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED':
      case 'ACTIVE':
        return 'primary';
      case 'ENDED':
        return 'success';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const isAuctionActive = (auction: Auction) => {
    const now = Date.now();
    const endTime = new Date(auction.endTime).getTime();
    return now < endTime && (auction.status === 'CREATED' || auction.status === 'ACTIVE');
  };

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Auctions</h1>
          <p className="text-gray-400">Browse all NFT auctions on the marketplace</p>
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
            Live
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'ended'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Ended
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

        {/* Auctions Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">No auctions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {auctions.map((auction) => (
              <Link key={auction.id} href={`/asset/${auction.nft.id}`}>
                <Card hover>
                  {/* Auction Badge */}
                  {isAuctionActive(auction) && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant="primary">Live</Badge>
                    </div>
                  )}

                  {/* NFT Image */}
                  <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4">
                    {auction.nft.imageUrl ? (
                      <img
                        src={auction.nft.imageUrl}
                        alt={auction.nft.name}
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
                      {auction.nft.collection.name}
                    </p>
                    <h3 className="text-lg font-semibold text-white truncate">
                      {auction.nft.name}
                    </h3>
                  </div>

                  {/* Price Info */}
                  <div className="mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                        {auction.winningBid ? (
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold text-white">
                              {formatEth(auction.winningBid.bidAmount)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {auction.currency.symbol}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-semibold text-gray-400">
                              {formatEth(auction.startPrice)}
                            </p>
                            <p className="text-xs text-gray-500">Start</p>
                          </div>
                        )}
                      </div>
                      {auction.bids && auction.bids.length > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Bids</p>
                          <p className="text-sm font-semibold text-white">
                            {auction.bids.length}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Time Remaining */}
                    {isAuctionActive(auction) && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Ends in</p>
                        <p className="text-sm font-semibold text-primary-400">
                          {getTimeRemaining(auction.endTime)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status & Creator */}
                  <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                      <p className="text-xs text-gray-400 truncate max-w-[100px]">
                        {auction.auctionCreator?.name || auction.sellerAddress.slice(0, 6)}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(auction.status) as any}>
                      {auction.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
