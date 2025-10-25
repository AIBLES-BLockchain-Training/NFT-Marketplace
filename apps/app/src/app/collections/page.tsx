'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_COLLECTIONS_QUERY } from '../../lib/graphql/queries';
import { Collection } from '../../types';
import toast from 'react-hot-toast';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_COLLECTIONS_QUERY, {
        limit: 100,
        offset: 0,
      });

      if (result.data?.collections) {
        setCollections(result.data.collections);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Collections</h1>
          <p className="text-gray-400">Browse all NFT collections</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-dark-card border border-dark-border rounded-2xl p-6 animate-pulse"
              >
                <div className="h-6 bg-dark-border rounded w-3/4 mb-4" />
                <div className="h-4 bg-dark-border rounded w-1/2 mb-2" />
                <div className="h-4 bg-dark-border rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">No collections found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link key={collection.id} href={`/collection/${collection.id}`}>
                <Card hover>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-white truncate">
                        {collection.name}
                      </h3>
                      <Badge variant="primary">{collection.collectionType}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {collection.id}
                    </p>
                  </div>

                  {collection.symbol && (
                    <p className="text-sm text-gray-400 mb-4">
                      Symbol: {collection.symbol}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-border">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total Supply</p>
                      <p className="text-lg font-semibold text-white">
                        {collection.totalSupply || '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Royalty</p>
                      <p className="text-lg font-semibold text-white">
                        {collection.royaltyBps ? `${Number(collection.royaltyBps) / 100}%` : 'N/A'}
                      </p>
                    </div>
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
