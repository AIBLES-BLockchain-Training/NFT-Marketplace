'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '../../../../../components/layout/MainLayout';
import { Badge } from '../../../../../components/common/Badge';
import { NFTImage } from '../../../../../components/common/NFTImage';
import { getNFTsByAddress, MoralisNFT } from '../../../../../lib/moralis/client';
import { useWallet } from '../../../../../hooks/useWallet';
import { NFT } from '../../../../../types';
import { NFTDetailModal } from '../../../../../components/nft/NFTDetailModal';
import { CreateListingModal } from '../../../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../../../components/marketplace/CreateAuctionModal';
import { EditCollectionBanner } from '../../../../../components/collection/EditCollectionBanner';
import { truncateTokenId } from '../../../../../lib/utils/format';
import toast from 'react-hot-toast';

export default function UserCollectionPage() {
  const params = useParams();
  const profileAddress = params?.address as string;
  const collectionId = params?.collectionId as string;
  const { address: connectedAddress } = useWallet();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collectionName, setCollectionName] = useState('');
  const [collectionType, setCollectionType] = useState<'ERC721' | 'ERC1155'>('ERC721');

  // Banner states
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showEditBanner, setShowEditBanner] = useState(false);

  // Collection metadata from Rarible
  const [collectionDescription, setCollectionDescription] = useState<string | null>(null);
  const [collectionLogo, setCollectionLogo] = useState<string | null>(null);

  // NFT Detail Modal states
  const [showNFTDetail, setShowNFTDetail] = useState(false);
  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress?.toLowerCase();

  // Load collection banner from Firebase
  const loadBanner = useCallback(async () => {
    try {
      const response = await fetch(`/api/collection/metadata?address=${collectionId}`);
      const data = await response.json();
      if (data.exists && data.data?.bannerURI) {
        setBannerUrl(data.data.bannerURI);
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  }, [collectionId]);

  // Load collection metadata from Rarible (description + logo)
  const loadRaribleMetadata = useCallback(async () => {
    try {
      const response = await fetch(`/api/collection/rarible?address=${collectionId}`);
      const data = await response.json();

      if (data.exists && data.data) {
        setCollectionDescription(data.data.description || null);
        setCollectionLogo(data.data.image || null);
      }
    } catch (error) {
      console.error('Error loading Rarible metadata:', error);
    }
  }, [collectionId]);

  // Check if user is collection owner
  const checkOwnership = useCallback(async () => {
    if (!connectedAddress || !collectionId) {
      setIsOwner(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/collection/owner?address=${collectionId}&user=${connectedAddress}`
      );
      const data = await response.json();
      setIsOwner(data.isOwner || false);
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsOwner(false);
    }
  }, [connectedAddress, collectionId]);

  // Load user's NFTs from this collection
  const loadCollectionNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getNFTsByAddress(profileAddress, 'sepolia', undefined, 100);

      const collectionNFTs: NFT[] = response.data
        .filter((nft: MoralisNFT) => nft.token_address.toLowerCase() === collectionId.toLowerCase())
        .map((nft: MoralisNFT) => {
          const metadata = nft.normalized_metadata || {};

          if (!collectionName && nft.name) {
            setCollectionName(nft.name);
          }
          if (nft.contract_type) {
            setCollectionType(nft.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155');
          }

          return {
            id: `${nft.token_address.toLowerCase()}-${nft.token_id}`,
            tokenId: nft.token_id,
            name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
            imageUrl: metadata.image || undefined,
            description: metadata.description || undefined,
            metadataUri: nft.token_uri || undefined,
            amount: nft.amount || '1',
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

      setNfts(collectionNFTs);
    } catch (error) {
      console.error('Failed to load collection NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [profileAddress, collectionId, collectionName]);

  useEffect(() => {
    if (profileAddress && collectionId) {
      loadCollectionNFTs();
      loadBanner();
      loadRaribleMetadata();
      checkOwnership();
    }
  }, [profileAddress, collectionId, loadCollectionNFTs, loadBanner, loadRaribleMetadata, checkOwnership]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsMenu) {
        setShowOptionsMenu(false);
      }
    };

    if (showOptionsMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showOptionsMenu]);

  const handleNFTClick = (index: number) => {
    setSelectedNFTIndex(index);
    setShowNFTDetail(true);
  };

  const handleNavigateNFT = (index: number) => {
    setSelectedNFTIndex(index);
  };

  const handleCloseNFTDetail = () => {
    setShowNFTDetail(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="w-full px-4 py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        {/* Collection Header Card with Banner */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-8 relative">
          {/* Banner Background */}
          <div className="w-full h-[28rem] bg-gradient-to-br from-primary-500/20 to-accent-500/20 relative">
            {bannerUrl ? (
              <>
                <img
                  src={bannerUrl}
                  alt={`${collectionName} banner`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Collection Info Overlay - Bottom with blur background */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-transparent backdrop-blur-[2px]"></div>
              <div className="relative z-10">
              <div className="flex items-end justify-between gap-6">
                {/* Left Side - Collection Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/profile/${profileAddress}?tab=collections`} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl [text-shadow:_2px_2px_8px_rgb(0_0_0_/_80%)]">{collectionName || 'Collection'}</h1>
                    <Badge variant="primary">{collectionType}</Badge>
                  </div>

                  {/* Description - 2-3 lines max */}
                  {collectionDescription && (
                    <p className="text-sm md:text-base text-gray-100 font-medium mb-3 drop-shadow-lg [text-shadow:_1px_1px_6px_rgb(0_0_0_/_70%)] line-clamp-3 max-w-3xl">
                      {collectionDescription}
                    </p>
                  )}

                  {/* Owner Address & Stats */}
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-medium">Owner:</span>
                      <span className="font-mono font-semibold text-white drop-shadow [text-shadow:_1px_1px_4px_rgb(0_0_0_/_60%)]">
                        {isOwnProfile ? 'You' : `${profileAddress.slice(0, 6)}...${profileAddress.slice(-4)}`}
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-medium">Contract:</span>
                      <span className="font-mono font-semibold text-gray-200 text-xs">{collectionId.slice(0, 6)}...{collectionId.slice(-4)}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-medium">NFTs Owned:</span>
                      <span className="font-bold text-white [text-shadow:_1px_1px_4px_rgb(0_0_0_/_60%)]">{nfts.length}</span>
                    </div>

                    {/* Options Menu - Only for Owner */}
                    {isOwner && connectedAddress && (
                      <div className="relative ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptionsMenu(!showOptionsMenu);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {showOptionsMenu && (
                          <div className="absolute right-0 bottom-full mb-2 bg-dark-card border border-dark-border rounded-lg shadow-2xl overflow-hidden z-50 min-w-[200px]">
                            <button
                              onClick={() => {
                                setShowEditBanner(true);
                                setShowOptionsMenu(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-primary-500/10 transition-colors flex items-center gap-3 text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span className="text-sm">Edit Cover Image</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Logo */}
                <div className="flex items-end">
                  {/* Collection Logo - Larger */}
                  <div className="w-38 h-38 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0 relative overflow-hidden border-4 border-white/20 shadow-2xl">
                    {collectionLogo ? (
                      <img
                        src={collectionLogo}
                        alt={collectionName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                        {collectionName.charAt(0) || 'C'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8">

          {nfts.length === 0 ? (
            <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
              <p className="text-gray-400">No NFTs found in this collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {nfts.map((nft, index) => (
                <div
                  key={nft.id}
                  onClick={() => handleNFTClick(index)}
                  className="group rounded-lg overflow-hidden border border-dark-border hover:border-primary-500 transition-all bg-dark-card cursor-pointer"
                >
                  <div className="aspect-square bg-dark-bg relative overflow-hidden">
                    <NFTImage src={nft.imageUrl} alt={nft.name} className="object-cover group-hover:scale-105 transition-transform" width={300} />
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-gray-500/50">
                      <p className="text-[10px] font-bold text-gray-300">
                        {nft.collection.collectionType === 'ERC721' ? 'ERC-721' : 'ERC-1155'}
                      </p>
                    </div>
                    {nft.collection.collectionType === 'ERC1155' && nft.amount && nft.amount !== '1' && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50">
                        <p className="text-xs font-bold text-green-400">x{nft.amount}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-semibold text-white truncate">{nft.name}</p>
                    <p className="text-xs text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNFTDetail && nfts.length > 0 && (
        <NFTDetailModal
          isOpen={showNFTDetail}
          onClose={handleCloseNFTDetail}
          nft={nfts[selectedNFTIndex]}
          allNFTs={nfts}
          currentIndex={selectedNFTIndex}
          onNavigate={handleNavigateNFT}
          isOwner={isOwnProfile}
          activeListings={[]}
          onCreateListing={() => setShowCreateListing(true)}
          onCreateAuction={() => setShowCreateAuction(true)}
        />
      )}

      {showCreateListing && nfts.length > 0 && (
        <CreateListingModal
          isOpen={showCreateListing}
          onClose={() => setShowCreateListing(false)}
          onSuccess={() => {
            setShowCreateListing(false);
            loadCollectionNFTs();
          }}
          nft={nfts[selectedNFTIndex]}
        />
      )}

      {showCreateAuction && nfts.length > 0 && (
        <CreateAuctionModal
          isOpen={showCreateAuction}
          onClose={() => setShowCreateAuction(false)}
          onSuccess={() => {
            setShowCreateAuction(false);
            loadCollectionNFTs();
          }}
          nft={nfts[selectedNFTIndex]}
        />
      )}

      <EditCollectionBanner
        isOpen={showEditBanner}
        onClose={() => setShowEditBanner(false)}
        collectionAddress={collectionId}
        currentBannerUrl={bannerUrl || undefined}
        onSuccess={() => {
          loadBanner();
          setShowEditBanner(false);
        }}
      />
    </MainLayout>
  );
}
