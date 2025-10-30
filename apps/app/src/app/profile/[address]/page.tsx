'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Badge } from '../../../components/common/Badge';
import { NFTImage } from '../../../components/common/NFTImage';
import { getNFTsByAddress, MoralisNFT } from '../../../lib/moralis/client';
import { useWallet } from '../../../hooks/useWallet';
import { NFT } from '../../../types';
import { RequestRoles } from '../../../components/profile/RequestRoles';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_USER_ACTIVE_LISTINGS_QUERY } from '../../../lib/graphql/queries';
import { truncateTokenId } from '../../../lib/utils/format';
import { NFTDetailModal } from '../../../components/nft/NFTDetailModal';
import { CreateListingModal } from '../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../components/marketplace/CreateAuctionModal';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const params = useParams();
  const profileAddress = params?.address as string;
  const { address: connectedAddress } = useWallet();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listedQuantities, setListedQuantities] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'roles'>('owned');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalNFTCount, setTotalNFTCount] = useState<number>(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  // NFT Detail Modal states
  const [showNFTDetail, setShowNFTDetail] = useState(false);
  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress?.toLowerCase();

  // Group NFTs by collection (calculate available amounts)
  const groupedNFTs = useMemo(() => {
    const groups: Record<string, NFT[]> = {};

    nfts.forEach(nft => {
      const listedQty = listedQuantities.get(nft.id) || '0';
      const totalAmount = BigInt(nft.amount || '1');
      const listedAmount = BigInt(listedQty);
      const availableAmount = totalAmount - listedAmount;

      // Only show NFTs with available amount > 0
      if (availableAmount > 0) {
        const nftWithAmounts = {
          ...nft,
          availableAmount: availableAmount.toString(),
          listedAmount: listedAmount.toString(),
        };

        const collectionId = nft.collection.id;
        if (!groups[collectionId]) {
          groups[collectionId] = [];
        }
        groups[collectionId].push(nftWithAmounts);
      }
    });
    return groups;
  }, [nfts, listedQuantities]);

  // Flatten NFTs for modal navigation
  const flatNFTs = useMemo(() => {
    return Object.values(groupedNFTs).flat();
  }, [groupedNFTs]);

  const collectionsCount = Object.keys(groupedNFTs).length;

  const handleNFTClick = (nftId: string) => {
    const index = flatNFTs.findIndex(n => n.id === nftId);
    if (index !== -1) {
      setSelectedNFTIndex(index);
      setShowNFTDetail(true);
    }
  };

  const handleNavigateNFT = (index: number) => {
    setSelectedNFTIndex(index);
  };

  const handleCloseNFTDetail = () => {
    setShowNFTDetail(false);
  };

  const handleCreateListingClick = () => {
    setShowCreateListing(true);
    // Keep detail modal open in background
  };

  const handleCreateAuctionClick = () => {
    setShowCreateAuction(true);
    // Keep detail modal open in background
  };

  const handleCloseCreateListing = () => {
    setShowCreateListing(false);
  };

  const handleListingSuccess = () => {
    setNfts([]);
    setCursor(null);
    setHasMore(true);
    loadUserNFTs(null, false);
  };

  const handleAuctionSuccess = () => {
    setNfts([]);
    setCursor(null);
    setHasMore(true);
    loadUserNFTs(null, false);
  };

  const handleCloseCreateAuction = () => {
    setShowCreateAuction(false);
  };

  const loadUserNFTs = useCallback(async (loadCursor?: string | null, append = false) => {
    if (!append) {
      setIsLoading(true);
    }

    try {
      // Load active listings to calculate listed quantities (only on first load)
      if (!append) {
        const listingsResult = await graphqlClient.query(GET_USER_ACTIVE_LISTINGS_QUERY, {
          address: profileAddress.toLowerCase(),
        });

        const listedQtyMap = new Map<string, string>();
        if (listingsResult.listings) {
          listingsResult.listings.forEach((listing: any) => {
            const nftId = listing.nft.id;
            const currentQty = BigInt(listedQtyMap.get(nftId) || '0');
            const listingQty = BigInt(listing.quantity || '1');
            listedQtyMap.set(nftId, (currentQty + listingQty).toString());
          });
        }
        setListedQuantities(listedQtyMap);
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

        return {
          id: `${nft.token_address.toLowerCase()}-${nft.token_id}`,
          tokenId: nft.token_id,
          name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
          imageUrl: metadata.image || undefined,
          description: metadata.description || undefined,
          metadataUri: nft.token_uri || undefined,
          amount: nft.amount || '1', // For ERC1155, Moralis provides amount; default to 1 for ERC721
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

      // Set total count if available (from first load only)
      if (!append && response.total) {
        setTotalNFTCount(response.total);
      }
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
      <div className="w-full px-4 py-8">
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
                  <p className="text-2xl font-bold text-white">
                    {totalNFTCount > 0 ? totalNFTCount : nfts.length}
                    {hasMore && totalNFTCount === 0 && '+'}
                  </p>
                  <p className="text-sm text-gray-400">NFTs Owned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {collectionsCount}
                    {hasMore && '+'}
                  </p>
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
            onNFTClick={handleNFTClick}
          />
        )}

        {activeTab === 'roles' && isOwnProfile && (
          <RequestRoles />
        )}
      </div>

      {/* NFT Detail Modal */}
      {showNFTDetail && flatNFTs.length > 0 && (
        <NFTDetailModal
          isOpen={showNFTDetail}
          onClose={handleCloseNFTDetail}
          nft={flatNFTs[selectedNFTIndex]}
          allNFTs={flatNFTs}
          currentIndex={selectedNFTIndex}
          onNavigate={handleNavigateNFT}
          isOwner={isOwnProfile}
          activeListings={flatNFTs[selectedNFTIndex]?.listings?.filter(l => l.status === 'CREATED') || []}
          onCreateListing={handleCreateListingClick}
          onCreateAuction={handleCreateAuctionClick}
        />
      )}

      {/* Create Listing Modal */}
      {showCreateListing && flatNFTs.length > 0 && (
        <CreateListingModal
          isOpen={showCreateListing}
          onClose={handleCloseCreateListing}
          onSuccess={handleListingSuccess}
          nft={flatNFTs[selectedNFTIndex]}
        />
      )}

      {/* Create Auction Modal */}
      {showCreateAuction && flatNFTs.length > 0 && (
        <CreateAuctionModal
          isOpen={showCreateAuction}
          onClose={handleCloseCreateAuction}
          onSuccess={handleAuctionSuccess}
          nft={flatNFTs[selectedNFTIndex]}
        />
      )}
    </MainLayout>
  );
}

function CollectionGroups({
  groupedNFTs,
  isLoading,
  ownerAddress,
  observerTarget,
  hasMore: hasMoreNFTs,
  onNFTClick,
}: {
  groupedNFTs: Record<string, NFT[]>;
  isLoading: boolean;
  ownerAddress: string;
  observerTarget: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  onNFTClick: (nftId: string) => void;
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white">{collection.name}</h3>
                  <span className="text-xs px-2 py-1 bg-dark-bg border border-dark-border rounded text-gray-400">
                    {collection.collectionType}
                  </span>
                </div>
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
                <div
                  key={nft.id}
                  onClick={() => onNFTClick(nft.id)}
                  className="group rounded-lg overflow-hidden border border-dark-border hover:border-primary-500 transition-all bg-dark-card cursor-pointer"
                >
                  <div className="aspect-square bg-dark-bg relative overflow-hidden">
                    <NFTImage
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      priority={false}
                      width={250}
                    />
                    {nft.collection.collectionType === 'ERC1155' && (
                      <>
                        {nft.availableAmount && nft.availableAmount !== '1' && (
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50">
                            <p className="text-xs font-bold text-green-400">x{nft.availableAmount}</p>
                          </div>
                        )}
                        {nft.listedAmount && nft.listedAmount !== '0' && (
                          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-yellow-500/50">
                            <p className="text-xs font-bold text-yellow-400">Listed: {nft.listedAmount}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-white truncate">{nft.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>
                  </div>
                </div>
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
