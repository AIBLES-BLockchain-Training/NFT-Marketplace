'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_OFFERS_QUERY } from '../../lib/graphql/queries';
import { Offer } from '../../types';
import { formatEther } from '../../lib/web3/utils';
import toast from 'react-hot-toast';

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');

  useEffect(() => {
    loadOffers();
  }, [filter]);

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const where: any = {};

      if (filter === 'active') {
        where.status_eq = 'ACTIVE';
      } else if (filter === 'completed') {
        where.status_eq = 'COMPLETED';
      } else if (filter === 'cancelled') {
        where.status_eq = 'CANCELLED';
      }

      const result = await graphqlClient.query(GET_OFFERS_QUERY, {
        limit: 50,
        offset: 0,
        where,
      });

      if (result.data?.offers) {
        setOffers(result.data.offers);
      }
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const isOfferExpired = (expirationTime: string) => {
    return new Date(expirationTime).getTime() < Date.now();
  };

  const getTimeRemaining = (expirationTime: string) => {
    const end = new Date(expirationTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

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
          <h1 className="text-4xl font-bold text-white mb-2">Offers</h1>
          <p className="text-gray-400">Browse all NFT offers on the marketplace</p>
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
            Accepted
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

        {/* Offers Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">No offers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {offers.map((offer) => (
              <Link key={offer.id} href={`/asset/${offer.nft.id}`}>
                <Card hover>
                  {/* Expired Badge */}
                  {offer.status === 'ACTIVE' && isOfferExpired(offer.expirationTime) && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant="secondary">Expired</Badge>
                    </div>
                  )}

                  {/* NFT Image */}
                  <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4">
                    {offer.nft.imageUrl ? (
                      <img
                        src={offer.nft.imageUrl}
                        alt={offer.nft.name}
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
                      {offer.nft.collection.name}
                    </p>
                    <h3 className="text-lg font-semibold text-white truncate">
                      {offer.nft.name}
                    </h3>
                  </div>

                  {/* Offer Price */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Offer Price</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-white">
                        {formatEther(offer.totalPrice)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {offer.currency.symbol}
                      </p>
                    </div>
                    {offer.quantity !== '1' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Quantity: {offer.quantity}
                      </p>
                    )}
                  </div>

                  {/* Expiration */}
                  {offer.status === 'ACTIVE' && !isOfferExpired(offer.expirationTime) && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Expires in</p>
                      <p className="text-sm font-semibold text-primary-400">
                        {getTimeRemaining(offer.expirationTime)}
                      </p>
                    </div>
                  )}

                  {/* Offeror & Status */}
                  <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                      <div>
                        <p className="text-xs text-gray-500">From</p>
                        <p className="text-xs text-gray-400 truncate max-w-[100px]">
                          {offer.offeror?.name || offer.buyerAddress.slice(0, 6)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(offer.status) as any}>
                      {offer.status}
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
