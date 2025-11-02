'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const profileAddress = params?.address as string;
  const { address: connectedAddress } = useWallet();

  // Read tab from URL search params
  const urlTab = searchParams.get('tab') as 'nfts' | 'collections' | 'roles' | null;
  const initialTab = urlTab && ['nfts', 'collections', 'roles'].includes(urlTab) ? urlTab : 'nfts';

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listedQuantities, setListedQuantities] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'nfts' | 'collections' | 'roles'>(initialTab);
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

  // Group NFTs by collection (calculate available amounts) - for My NFTs tab
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

  // Group ALL NFTs by collection (for My Collections tab) - filter out fully listed collections
  const allCollections = useMemo(() => {
    const groups: Record<string, NFT[]> = {};

    nfts.forEach(nft => {
      const listedQty = listedQuantities.get(nft.id) || '0';
      const totalAmount = BigInt(nft.amount || '1');
      const listedAmount = BigInt(listedQty);
      const availableAmount = totalAmount - listedAmount;

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
    });

    // Filter out collections where ALL NFTs have availableAmount = 0
    const filteredGroups: Record<string, NFT[]> = {};
    Object.entries(groups).forEach(([collectionId, nfts]) => {
      const hasAvailableNFT = nfts.some(nft => BigInt(nft.availableAmount || '0') > 0);
      if (hasAvailableNFT) {
        filteredGroups[collectionId] = nfts;
      }
    });

    return filteredGroups;
  }, [nfts, listedQuantities]);

  // Flatten NFTs for modal navigation
  const flatNFTs = useMemo(() => {
    return Object.values(groupedNFTs).flat();
  }, [groupedNFTs]);

  const collectionsCount = Object.keys(allCollections).length;

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

  // Sync tab state with URL search params
  useEffect(() => {
    if (urlTab && ['nfts', 'collections', 'roles'].includes(urlTab)) {
      setActiveTab(urlTab as 'nfts' | 'collections' | 'roles');
    }
  }, [urlTab]);

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

  // Infinite scroll observer (works on both NFTs and Collections tabs)
  useEffect(() => {
    if (activeTab === 'roles') return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        console.log('[Infinite Scroll] Intersection:', {
          isIntersecting: entry.isIntersecting,
          hasMore,
          isLoading,
          cursor,
          activeTab
        });

        // Check conditions inside callback to allow observer to stay active
        if (entry.isIntersecting && hasMore && !isLoading && cursor) {
          console.log('[Infinite Scroll] Loading more NFTs...');
          loadUserNFTs(cursor, true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Load earlier for better UX
      }
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
            onClick={() => setActiveTab('nfts')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'nfts'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My NFTs
            {activeTab === 'nfts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'collections'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Collections
            {activeTab === 'collections' && (
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
        {activeTab === 'nfts' && (
          <NFTsGrid
            nfts={flatNFTs}
            isLoading={isLoading}
            observerTarget={observerTarget}
            hasMore={hasMore}
            onNFTClick={handleNFTClick}
          />
        )}

        {activeTab === 'collections' && (
          <CollectionsGrid
            groupedNFTs={allCollections}
            isLoading={isLoading}
            profileAddress={profileAddress}
            observerTarget={observerTarget}
            hasMore={hasMore}
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

// My NFTs Tab - Flat grid showing all NFTs
function NFTsGrid({
  nfts,
  isLoading,
  observerTarget,
  hasMore,
  onNFTClick,
}: {
  nfts: NFT[];
  isLoading: boolean;
  observerTarget: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  onNFTClick: (nftId: string) => void;
}) {
  if (isLoading && nfts.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
        <p className="text-gray-400">No NFTs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NFT Grid - 5 per row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {nfts.map((nft) => (
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
                width={300}
              />

              {/* ERC-721 / ERC-1155 Badge */}
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-gray-500/50">
                <p className="text-[10px] font-bold text-gray-300">
                  {nft.collection.collectionType === 'ERC721' ? 'ERC-721' : 'ERC-1155'}
                </p>
              </div>

              {/* Quantity Badge for ERC1155 */}
              {nft.collection.collectionType === 'ERC1155' && nft.availableAmount && nft.availableAmount !== '1' && (
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50">
                  <p className="text-xs font-bold text-green-400">x{nft.availableAmount}</p>
                </div>
              )}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-sm font-semibold text-white truncate">{nft.name}</p>
              <p className="text-xs text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>
              <p className="text-[10px] text-gray-600 truncate">{nft.collection.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      )}
    </div>
  );
}

// My Collections Tab - Grid showing collections with banner
function CollectionsGrid({
  groupedNFTs,
  isLoading,
  profileAddress,
  observerTarget,
  hasMore,
}: {
  groupedNFTs: Record<string, NFT[]>;
  isLoading: boolean;
  profileAddress: string;
  observerTarget: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
}) {
  const [collectionsMetadata, setCollectionsMetadata] = useState<Record<string, { bannerURI?: string }>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  useEffect(() => {
    const loadAllCollectionMetadata = async () => {
      setLoadingMetadata(true);
      const metadata: Record<string, { bannerURI?: string }> = {};

      const collectionIds = Object.keys(groupedNFTs);
      await Promise.all(
        collectionIds.map(async (collectionId) => {
          try {
            const response = await fetch(`/api/collection/metadata?address=${collectionId}`);
            const data = await response.json();
            if (data.exists && data.data) {
              metadata[collectionId] = data.data;
            }
          } catch (error) {
            console.error(`Error loading metadata for ${collectionId}:`, error);
          }
        })
      );

      setCollectionsMetadata(metadata);
      setLoadingMetadata(false);
    };

    if (Object.keys(groupedNFTs).length > 0) {
      loadAllCollectionMetadata();
    } else {
      setLoadingMetadata(false);
    }
  }, [groupedNFTs]);

  if (isLoading || loadingMetadata) {
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
        <p className="text-gray-400">No Collections found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map(([collectionId, nfts]) => {
          const collection = nfts[0].collection;
          const metadata = collectionsMetadata[collectionId];
          const bannerUrl = metadata?.bannerURI;

          return (
            <Link
              key={collectionId}
              href={`/profile/${profileAddress}/collection/${collectionId}`}
              className="group bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-primary-500 transition-all"
            >
              {/* Collection Banner */}
              <div className="h-32 bg-gradient-to-br from-primary-500/20 to-accent-500/20 relative overflow-hidden">
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt={collection.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Collection Info */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white truncate">{collection.name}</h3>
                    <Badge variant="secondary">{collection.collectionType}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{collectionId}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-400">Your NFTs</p>
                    <p className="text-white font-bold">{nfts.length}</p>
                  </div>
                  <div className="text-primary-400 group-hover:text-primary-300 transition-colors">
                    View →
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      )}
    </div>
  );
}
