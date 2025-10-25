'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { NFTGrid } from '../../../components/nft/NFTGrid';
import { Badge } from '../../../components/common/Badge';
import { Spinner } from '../../../components/common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_COLLECTION_BY_ID_QUERY, GET_NFTS_QUERY } from '../../../lib/graphql/queries';
import { Collection, NFT } from '../../../types';
import toast from 'react-hot-toast';

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true);

  const loadCollection = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_COLLECTION_BY_ID_QUERY, { id });

      if (result.data?.collection) {
        setCollection(result.data.collection);
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
      toast.error('Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadCollectionNFTs = useCallback(async () => {
    setIsLoadingNFTs(true);
    try {
      const result = await graphqlClient.query(GET_NFTS_QUERY, {
        limit: 100,
        offset: 0,
        where: {
          collection: {
            id_eq: id,
          },
        },
      });

      if (result.data?.nfts) {
        setNfts(result.data.nfts);
      }
    } catch (error) {
      console.error('Failed to load collection NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCollection();
      loadCollectionNFTs();
    }
  }, [id, loadCollection, loadCollectionNFTs]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!collection) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Collection Not Found</h2>
          <p className="text-gray-400">The collection you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Collection Header */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-white">{collection.name}</h1>
                <Badge variant="primary">{collection.collectionType}</Badge>
              </div>

              <p className="text-sm text-gray-500 font-mono mb-4">{collection.id}</p>

              {collection.symbol && (
                <p className="text-gray-400 mb-4">Symbol: {collection.symbol}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Supply</p>
                  <p className="text-2xl font-bold text-white">
                    {collection.totalSupply || '∞'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">NFTs</p>
                  <p className="text-2xl font-bold text-white">{nfts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Royalty</p>
                  <p className="text-2xl font-bold text-white">
                    {collection.royaltyBps
                      ? `${Number(collection.royaltyBps) / 100}%`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Royalty Receiver</p>
                  <p className="text-sm font-mono text-primary-400">
                    {collection.royaltyRecipient
                      ? `${collection.royaltyRecipient.slice(0, 6)}...${collection.royaltyRecipient.slice(-4)}`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collection NFTs */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            Items in Collection ({nfts.length})
          </h2>
          <NFTGrid nfts={nfts} isLoading={isLoadingNFTs} />
        </div>
      </div>
    </MainLayout>
  );
}
