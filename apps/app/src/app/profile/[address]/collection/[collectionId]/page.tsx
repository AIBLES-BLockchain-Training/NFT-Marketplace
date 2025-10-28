'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '../../../../../components/layout/MainLayout';
import { NFTGrid } from '../../../../../components/nft/NFTGrid';
import { Badge } from '../../../../../components/common/Badge';
import { getNFTsByAddress, MoralisNFT } from '../../../../../lib/moralis/client';
import { NFT } from '../../../../../types';
import toast from 'react-hot-toast';

export default function CollectionViewPage() {
  const params = useParams();
  const ownerAddress = params?.address as string;
  const collectionId = params?.collectionId as string;

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collectionInfo, setCollectionInfo] = useState<{
    name: string;
    symbol: string;
    collectionType: string;
  } | null>(null);

  const loadCollectionNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all NFTs from the owner
      const moralisResponse = await getNFTsByAddress(ownerAddress);

      // Filter NFTs by collection
      const filteredNFTs = moralisResponse.data.filter(
        (nft: MoralisNFT) => nft.token_address.toLowerCase() === collectionId.toLowerCase()
      );

      if (filteredNFTs.length === 0) {
        toast.error('No NFTs found in this collection');
        setNfts([]);
        setIsLoading(false);
        return;
      }

      // Set collection info from first NFT
      const firstNFT = filteredNFTs[0];
      setCollectionInfo({
        name: firstNFT.name || 'Unknown Collection',
        symbol: firstNFT.symbol || 'NFT',
        collectionType: firstNFT.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155',
      });

      // Transform to app NFT format
      const transformedNFTs: NFT[] = filteredNFTs.map((nft: MoralisNFT) => {
        const metadata = nft.normalized_metadata || {};

        return {
          id: `${nft.token_address.toLowerCase()}-${nft.token_id}`,
          tokenId: nft.token_id,
          name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
          imageUrl: metadata.image || undefined,
          description: metadata.description || undefined,
          metadataUri: nft.token_uri || undefined,
          collection: {
            id: nft.token_address.toLowerCase(),
            name: nft.name || 'Unknown Collection',
            symbol: nft.symbol || 'NFT',
            collectionType: nft.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155',
            creator: {
              id: nft.token_address.toLowerCase(),
              name: nft.name || 'Unknown',
              subjectType: 'CONTRACT' as const,
              createdAt: new Date().toISOString(),
            },
            totalSupply: '0',
            createdAt: new Date().toISOString(),
          },
          traits: metadata.attributes?.map((attr: any, idx: number) => ({
            id: `${nft.token_address}_${nft.token_id}_${idx}`,
            traitType: attr.trait_type,
            value: String(attr.value),
            displayType: undefined,
          })) || [],
        };
      });

      setNfts(transformedNFTs);
    } catch (error) {
      console.error('Failed to load collection NFTs:', error);
      toast.error('Failed to load collection NFTs');
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, collectionId]);

  useEffect(() => {
    if (ownerAddress && collectionId) {
      loadCollectionNFTs();
    }
  }, [ownerAddress, collectionId, loadCollectionNFTs]);

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/profile/${ownerAddress}`}
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>

          {collectionInfo && (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{collectionInfo.name}</h1>
                    <Badge variant="primary">{collectionInfo.collectionType}</Badge>
                  </div>
                  <p className="text-gray-400 font-mono text-sm mb-4">
                    {collectionId.slice(0, 6)}...{collectionId.slice(-4)}
                  </p>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-2xl font-bold text-white">{nfts.length}</p>
                      <p className="text-sm text-gray-400">NFTs Owned</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NFT Grid */}
        <NFTGrid nfts={nfts} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
