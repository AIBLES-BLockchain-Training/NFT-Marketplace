'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Badge } from '../../../components/common/Badge';
import { getNFTsByAddress, MoralisNFT } from '../../../lib/moralis/client';
import { useWallet } from '../../../hooks/useWallet';
import { NFT } from '../../../types';
import { RequestRoles } from '../../../components/profile/RequestRoles';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_USER_ACTIVE_LISTINGS_QUERY } from '../../../lib/graphql/queries';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const params = useParams();
  const profileAddress = params?.address as string;
  const { address: connectedAddress } = useWallet();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listedNFTIds, setListedNFTIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'roles'>('owned');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress?.toLowerCase();

  // Group NFTs by collection (filter out listed NFTs for owned tab)
  const groupedNFTs = useMemo(() => {
    const groups: Record<string, NFT[]> = {};
    const filteredNFTs = nfts.filter(nft => !listedNFTIds.has(nft.id));
    filteredNFTs.forEach(nft => {
      const collectionId = nft.collection.id;
      if (!groups[collectionId]) {
        groups[collectionId] = [];
      }
      groups[collectionId].push(nft);
    });
    return groups;
  }, [nfts, listedNFTIds]);

  const collectionsCount = Object.keys(groupedNFTs).length;

  const loadUserNFTs = useCallback(async (loadCursor?: string | null, append = false) => {
    if (!append) {
      setIsLoading(true);
    }

    try {
      // Load active listings to filter out (only on first load)
      if (!append) {
        const listingsResult = await graphqlClient.query(GET_USER_ACTIVE_LISTINGS_QUERY, {
          address: profileAddress.toLowerCase(),
        });

        const listedIds = new Set<string>();
        if (listingsResult.listings) {
          listingsResult.listings.forEach((listing: any) => {
            listedIds.add(listing.nft.id);
          });
        }
        setListedNFTIds(listedIds);
      }

      // Fetch NFTs from Moralis API with pagination
      const response = await getNFTsByAddress(
        profileAddress,
        'sepolia',
        loadCursor || undefined,
        20
      );

      // Transform Moralis NFTs to app NFT format
      const transformedNFTs: NFT[] = response.data.map((nft: MoralisNFT) => {
        const metadata = nft.normalized_metadata || {};

        // Convert IPFS URLs to HTTP gateway URLs
        const convertIpfsUrl = (url: string | undefined): string | undefined => {
          if (!url) return undefined;
          if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }
          return url;
        };

        return {
          id: `${nft.token_address.toLowerCase()}-${nft.token_id}`,
          tokenId: nft.token_id,
          name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
          imageUrl: convertIpfsUrl(metadata.image) || undefined,
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
          traits: metadata.attributes?.map((attr, idx) => ({
            id: `${nft.token_address}_${nft.token_id}_${idx}`,
            traitType: attr.trait_type,
            value: String(attr.value),
            displayType: undefined,
          })) || [],
        };
      });

      if (append) {
        setNfts(prev => [...prev, ...transformedNFTs]);
      } else {
        setNfts(transformedNFTs);
      }

      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [profileAddress]);

  // Redirect to new profile when user switches account
  useEffect(() => {
    if (connectedAddress && profileAddress) {
      const wasViewingOwnProfile = isOwnProfile;
      const newAddress = connectedAddress.toLowerCase();
      const currentAddress = profileAddress.toLowerCase();

      // If user switched account while viewing their own profile, redirect to new profile
      if (wasViewingOwnProfile && newAddress !== currentAddress) {
        window.location.href = `/profile/${newAddress}`;
      }
    }
  }, [connectedAddress, profileAddress, isOwnProfile]);

  // Initial load
  useEffect(() => {
    if (profileAddress) {
      setNfts([]);
      setCursor(null);
      setHasMore(true);
      loadUserNFTs(null, false);
    }
  }, [profileAddress, loadUserNFTs]);

  // Infinite scroll observer
  useEffect(() => {
    if (activeTab !== 'owned') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && cursor) {
          loadUserNFTs(cursor, true);
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
  }, [hasMore, isLoading, cursor, activeTab, loadUserNFTs]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Viewing Other Profile Banner */}
        {!isOwnProfile && connectedAddress && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-400 font-semibold text-sm">Viewing Another User&apos;s Profile</p>
                <p className="text-gray-400 text-xs">You can view their NFTs and activity, but cannot perform actions on their behalf</p>
              </div>
            </div>
            <Link
              href={`/profile/${connectedAddress}`}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              View My Profile
            </Link>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {isOwnProfile ? 'My Profile' : 'User Profile'}
                </h1>
                {isOwnProfile && <Badge variant="primary">You</Badge>}
              </div>

              <p className="text-gray-400 font-mono text-sm mb-4">
                {profileAddress}
              </p>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-white">{nfts.length}</p>
                  <p className="text-sm text-gray-400">NFTs Owned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{collectionsCount}</p>
                  <p className="text-sm text-gray-400">Collections</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-dark-border overflow-x-auto">
          <button
            onClick={() => setActiveTab('owned')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'owned'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Owned
            {activeTab === 'owned' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'roles'
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Request Roles
              {activeTab === 'roles' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'owned' && (
          <CollectionGroups
            groupedNFTs={groupedNFTs}
            isLoading={isLoading}
            ownerAddress={profileAddress}
            observerTarget={observerTarget}
            hasMore={hasMore}
          />
        )}

        {activeTab === 'roles' && isOwnProfile && (
          <RequestRoles />
        )}
      </div>
    </MainLayout>
  );
}

function CollectionGroups({
  groupedNFTs,
  isLoading,
  ownerAddress,
  observerTarget,
  hasMore: hasMoreNFTs,
}: {
  groupedNFTs: Record<string, NFT[]>;
  isLoading: boolean;
  ownerAddress: string;
  observerTarget: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const collections = Object.entries(groupedNFTs);

  if (collections.length === 0) {
    return (
      <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
        <p className="text-gray-400">No NFTs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {collections.map(([collectionId, nfts]) => {
        const collection = nfts[0].collection;
        const displayNFTs = nfts.slice(0, 4);
        const hasMore = nfts.length > 4;

        return (
          <div key={collectionId} className="space-y-4">
            {/* Collection Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{collection.name}</h3>
                <p className="text-sm text-gray-400">
                  {nfts.length} {nfts.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              {hasMore && (
                <Link
                  href={`/profile/${ownerAddress}/collection/${collectionId}`}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                >
                  View All →
                </Link>
              )}
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {displayNFTs.map((nft) => (
                <Link
                  key={nft.id}
                  href={`/asset/${nft.id}`}
                  className="group rounded-lg overflow-hidden border border-dark-border hover:border-primary-500 transition-all bg-dark-card"
                >
                  <div className="aspect-square bg-dark-bg relative overflow-hidden">
                    {nft.imageUrl ? (
                      <Image
                        src={nft.imageUrl}
                        alt={nft.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform"
                        priority={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-white truncate">{nft.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">#{nft.tokenId}</p>
                  </div>
                </Link>
              ))}

              {/* View All Card */}
              {hasMore && (
                <Link
                  href={`/profile/${ownerAddress}/collection/${collectionId}`}
                  className="rounded-lg overflow-hidden border-2 border-dashed border-dark-border hover:border-primary-500 transition-all bg-dark-card flex items-center justify-center aspect-square"
                >
                  <div className="text-center p-4">
                    <div className="text-3xl font-bold text-primary-400 mb-1">+{nfts.length - 4}</div>
                    <p className="text-xs text-gray-400">View All</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {/* Infinite scroll trigger */}
      {hasMoreNFTs && (
        <div ref={observerTarget} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      )}
    </div>
  );
}
