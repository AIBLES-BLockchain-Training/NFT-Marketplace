'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { NFTGrid } from '../../components/nft/NFTGrid';
import { Button } from '../../components/common/Button';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_NFTS_QUERY, GET_COLLECTIONS_QUERY } from '../../lib/graphql/queries';
import { NFT, Collection } from '../../types';
import toast from 'react-hot-toast';

export default function ExplorePage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  const loadCollections = useCallback(async () => {
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
    }
  }, []);

  const loadNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const where: Record<string, unknown> = {};

      if (selectedCollection) {
        where.collection = { id_eq: selectedCollection };
      }

      if (selectedType) {
        where.collection = {
          ...where.collection,
          collectionType_eq: selectedType,
        };
      }

      const orderBy = sortBy === 'recent' ? 'createdAt_DESC' : 'id_ASC';

      const result = await graphqlClient.query(GET_NFTS_QUERY, {
        limit: 50,
        offset: 0,
        where,
        orderBy,
      });

      if (result.data?.nfts) {
        setNfts(result.data.nfts);
      }
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, selectedType, sortBy]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Explore NFTs</h1>
          <p className="text-gray-400">Discover unique digital collectibles</p>
        </div>

        {/* Filters */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Collection
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Collections</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Token Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Types</option>
                <option value="ERC721">ERC-721</option>
                <option value="ERC1155">ERC-1155</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="recent">Recently Listed</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedCollection('');
                  setSelectedType('');
                  setSortBy('recent');
                }}
                variant="secondary"
                fullWidth
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        <NFTGrid nfts={nfts} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
