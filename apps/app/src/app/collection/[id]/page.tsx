'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Badge } from '../../../components/common/Badge';
import { Spinner } from '../../../components/common/Spinner';
import { NFTImage } from '../../../components/common/NFTImage';
import { BuyModal } from '../../../components/marketplace/BuyModal';
import { UpdateListingModal } from '../../../components/marketplace/UpdateListingModal';
import { NFTDetailModal } from '../../../components/nft/NFTDetailModal';
import { CreateListingModal } from '../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../components/marketplace/CreateAuctionModal';
import { graphqlClient } from '../../../lib/graphql/client';
import {
  GET_COLLECTION_BY_ID_QUERY,
  GET_COLLECTION_LISTED_NFTS_QUERY,
  GET_COLLECTION_AUCTIONED_NFTS_QUERY,
  GET_COLLECTION_OFFERED_NFTS_QUERY,
  GET_COLLECTION_USER_LISTINGS_QUERY,
  GET_COLLECTION_USER_AUCTIONS_QUERY,
  GET_COLLECTION_USER_OFFERS_QUERY,
} from '../../../lib/graphql/queries';
import { useWallet } from '../../../hooks/useWallet';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { Collection, NFT, Listing } from '../../../types';
import { formatEth } from '../../../lib/web3/utils';
import { encodeCancelListing } from '../../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../../lib/contracts/addresses';
import { TransactionResultModal } from '../../../components/common/TransactionResultModal';
import { truncateTokenId } from '../../../lib/utils/format';
import toast from 'react-hot-toast';

type TabType = 'listed' | 'auctioned' | 'offered' | 'yours';
type YoursSubTab = 'your-listed' | 'your-auctioned' | 'your-offered';

interface NFTWithListing extends NFT {
  listing?: Listing;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { address } = useWallet();
  const { sendTransaction, showResultModal, result, closeModal } = useTransactionModal();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [nfts, setNfts] = useState<NFTWithListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('listed');
  const [yoursSubTab, setYoursSubTab] = useState<YoursSubTab>('your-listed');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // NFT Detail Modal
  const [showNFTDetail, setShowNFTDetail] = useState(false);
  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);

  const loadCollection = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_COLLECTION_BY_ID_QUERY, { id });

      if (result.collection) {
        setCollection(result.collection);
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
      toast.error('Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadNFTs = useCallback(async (tab: TabType, subTab?: YoursSubTab) => {
    setIsLoadingNFTs(true);
    try {
      let result: any;

      switch (tab) {
        case 'listed':
          result = await graphqlClient.query(GET_COLLECTION_LISTED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.listings) {
            // Check collection type from first listing
            const isERC1155 = result.listings.length > 0 &&
                             result.listings[0].nft?.collection?.collectionType === 'ERC1155';

            if (isERC1155) {
              // For ERC-1155: Each listing is a separate card
              const nftsArray = result.listings.map((listing: any) => ({
                ...listing.nft,
                // Create unique ID by combining nft.id and listing.id
                id: `${listing.nft.id}-listing-${listing.id}`,
                originalNftId: listing.nft.id,
                listings: [listing], // Only this one listing
                totalListedQuantity: listing.quantity,
              }));
              setNfts(nftsArray);
            } else {
              // For ERC-721: Group all listings by NFT (original behavior)
              const nftMap = new Map<string, any>();
              const nftListingsMap = new Map<string, any[]>();
              const totalListedQty = new Map<string, bigint>();

              result.listings.forEach((listing: any) => {
                const nftId = listing.nft.id;
                const currentQty = totalListedQty.get(nftId) || BigInt(0);
                const listingQty = BigInt(listing.quantity || '1');
                totalListedQty.set(nftId, currentQty + listingQty);

                // Store NFT data (first occurrence)
                if (!nftMap.has(nftId)) {
                  nftMap.set(nftId, listing.nft);
                }

                // Collect all listings for this NFT
                if (!nftListingsMap.has(nftId)) {
                  nftListingsMap.set(nftId, []);
                }
                nftListingsMap.get(nftId).push(listing);
              });

              // Build final NFT array with all listings
              const nftsArray = Array.from(nftMap.values()).map(nft => ({
                ...nft,
                listings: nftListingsMap.get(nft.id) || [],
                totalListedQuantity: totalListedQty.get(nft.id)?.toString() || '1',
              }));

              setNfts(nftsArray);
            }
          }
          break;

        case 'auctioned':
          result = await graphqlClient.query(GET_COLLECTION_AUCTIONED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.auctions) {
            setNfts(result.auctions.map((auction: any) => ({
              ...auction.nftId,
              auctionQuantity: auction.quantity,
            })));
          }
          break;

        case 'offered':
          result = await graphqlClient.query(GET_COLLECTION_OFFERED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.offers) {
            const uniqueNFTs = new Map();
            result.offers.forEach((offer: any) => {
              if (!uniqueNFTs.has(offer.nftId.id)) {
                uniqueNFTs.set(offer.nftId.id, {
                  ...offer.nftId,
                  offerQuantity: offer.quantity,
                });
              }
            });
            setNfts(Array.from(uniqueNFTs.values()));
          }
          break;

        case 'yours': {
          if (!address) {
            setNfts([]);
            break;
          }

          const currentSubTab = subTab || yoursSubTab;

          switch (currentSubTab) {
            case 'your-listed':
              result = await graphqlClient.query(GET_COLLECTION_USER_LISTINGS_QUERY, {
                collectionId: id,
                ownerAddress: address.toLowerCase(),
              });
              if (result.listings) {
                // Group all listings by NFT
                const nftMap = new Map<string, any>();
                const nftListingsMap = new Map<string, any[]>();
                const totalListedQty = new Map<string, bigint>();

                result.listings.forEach((listing: any) => {
                  const nftId = listing.nft.id;
                  const currentQty = totalListedQty.get(nftId) || BigInt(0);
                  const listingQty = BigInt(listing.quantity || '1');
                  totalListedQty.set(nftId, currentQty + listingQty);

                  // Store NFT data (first occurrence)
                  if (!nftMap.has(nftId)) {
                    nftMap.set(nftId, listing.nft);
                  }

                  // Collect all listings for this NFT
                  if (!nftListingsMap.has(nftId)) {
                    nftListingsMap.set(nftId, []);
                  }
                  nftListingsMap.get(nftId).push(listing);
                });

                // Build final NFT array with all listings
                const nftsArray = Array.from(nftMap.values()).map(nft => ({
                  ...nft,
                  listings: nftListingsMap.get(nft.id) || [],
                  totalListedQuantity: totalListedQty.get(nft.id)?.toString() || '1',
                }));

                setNfts(nftsArray);
              }
              break;

            case 'your-auctioned':
              result = await graphqlClient.query(GET_COLLECTION_USER_AUCTIONS_QUERY, {
                collectionId: id,
                ownerAddress: address.toLowerCase(),
              });
              if (result.auctions) {
                setNfts(result.auctions.map((auction: any) => ({
                  ...auction.nftId,
                  auctionQuantity: auction.quantity,
                })));
              }
              break;

            case 'your-offered':
              result = await graphqlClient.query(GET_COLLECTION_USER_OFFERS_QUERY, {
                collectionId: id,
                buyerAddress: address.toLowerCase(),
              });
              if (result.offers) {
                const uniqueNFTs = new Map();
                result.offers.forEach((offer: any) => {
                  if (!uniqueNFTs.has(offer.nftId.id)) {
                    uniqueNFTs.set(offer.nftId.id, {
                      ...offer.nftId,
                      offerQuantity: offer.quantity,
                    });
                  }
                });
                setNfts(Array.from(uniqueNFTs.values()));
              }
              break;
          }
          break;
        }
      }
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [id, address, yoursSubTab]);

  useEffect(() => {
    if (id) {
      loadCollection();
    }
  }, [id, loadCollection]);

  useEffect(() => {
    if (id) {
      loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
    }
  }, [id, activeTab, yoursSubTab, loadNFTs]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'yours') {
      setYoursSubTab('your-listed');
    }
  };

  const handleYoursSubTabChange = (subTab: YoursSubTab) => {
    setYoursSubTab(subTab);
  };

  const handleCancelListing = async (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      // listing.id is the listingId from contract (stored as string)
      const tx = encodeCancelListing(BigInt(listing.id));
      const receipt = await sendTransaction(tx, 'Listing cancelled successfully!');

      if (receipt?.status === 1) {
        loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
      }
    } catch (error: unknown) {
      console.error('Cancel listing error:', error);
    }
  };

  const handleBuyClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const isListingExpired = (endTimestamp: string) => {
    const end = new Date(endTimestamp).getTime();
    const now = Date.now();
    return now >= end;
  };

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
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!collection) {
    return (
      <MainLayout>
        <div className="w-full px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Collection Not Found</h2>
          <p className="text-gray-400">The collection you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        {/* Collection Header */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0 relative overflow-hidden">
              {collection.logoUrl && (
                <NFTImage src={collection.logoUrl} alt={collection.name} className="object-cover" width={96} />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-white">{collection.name}</h1>
                <Badge variant="primary">{collection.collectionType}</Badge>
              </div>

              <p className="text-sm text-gray-500 font-mono mb-4">{collection.id}</p>

              {collection.description && (
                <p className="text-gray-400 mb-4">{collection.description}</p>
              )}

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
                  <p className="text-sm text-gray-400 mb-1">Floor Price</p>
                  <p className="text-2xl font-bold text-white">
                    {collection.floorPrice ? formatEth(collection.floorPrice) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-dark-border overflow-x-auto">
          <button
            onClick={() => handleTabChange('listed')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'listed' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Listed
            {activeTab === 'listed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('auctioned')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'auctioned' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Auctioned
            {activeTab === 'auctioned' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('offered')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'offered' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Offered
            {activeTab === 'offered' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>

          {address && (
            <button
              onClick={() => handleTabChange('yours')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'yours' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Yours
              {activeTab === 'yours' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
          )}
        </div>

        {/* Sub-tabs for "Yours" */}
        {activeTab === 'yours' && address && (
          <div className="flex gap-3 mb-6 px-4">
            <button
              onClick={() => handleYoursSubTabChange('your-listed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                yoursSubTab === 'your-listed'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Listed
            </button>
            <button
              onClick={() => handleYoursSubTabChange('your-auctioned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                yoursSubTab === 'your-auctioned'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Auctioned
            </button>
            <button
              onClick={() => handleYoursSubTabChange('your-offered')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                yoursSubTab === 'your-offered'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Offered
            </button>
          </div>
        )}

        {/* NFTs Grid */}
        {isLoadingNFTs ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">
              {activeTab === 'yours' && !address
                ? 'Connect your wallet to see your activities'
                : 'No NFTs found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {nfts.map((nft, index) => {
              // Get first listing (for cards that represent individual listings)
              const listing = nft.listings && nft.listings.length > 0 ? nft.listings[0] : null;
              const isOwner = listing && address && listing.owner.id.toLowerCase() === address.toLowerCase();
              const price = listing?.currencyApprovals?.[0];

              // Currency is now auto-approved on listing creation
              const displayPrice = price?.pricePerToken || listing?.pricePerToken;

              // Normalize display symbol: Show 'ETH' for native tokens or UNKNOWN symbols
              let displayCurrency = 'ETH';
              if (price?.currency) {
                const currencyId = price.currency.id.toLowerCase();
                const isNativeToken = currencyId === ZERO_ADDRESS.toLowerCase() ||
                                      currencyId === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                displayCurrency = (isNativeToken || price.currency.symbol === 'UNKNOWN')
                  ? 'ETH'
                  : price.currency.symbol;
              }

              return (
                <div key={nft.id} className="group relative rounded-lg overflow-hidden border border-dark-border hover:border-primary-500 transition-all bg-dark-card cursor-pointer">
                  <div onClick={() => handleNFTClick(index)} className="block">
                    <div className="aspect-square bg-dark-bg relative overflow-hidden">
                      <NFTImage
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        width={300}
                      />

                      {/* Quantity Badge for ERC1155 */}
                      {nft.collection.collectionType === 'ERC1155' && (
                        <>
                          {/* Listed quantity */}
                          {nft.totalListedQuantity && nft.totalListedQuantity !== '1' && (
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-yellow-500/50">
                              <p className="text-xs font-bold text-yellow-400">x{nft.totalListedQuantity}</p>
                            </div>
                          )}
                          {/* Auction quantity */}
                          {nft.auctionQuantity && nft.auctionQuantity !== '1' && (
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-purple-500/50">
                              <p className="text-xs font-bold text-purple-400">x{nft.auctionQuantity}</p>
                            </div>
                          )}
                          {/* Offer quantity */}
                          {nft.offerQuantity && nft.offerQuantity !== '1' && (
                            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-blue-500/50">
                              <p className="text-xs font-bold text-blue-400">x{nft.offerQuantity}</p>
                            </div>
                          )}
                        </>
                      )}


                      {/* Hover Overlay - Only show if listing is not expired */}
                      {(activeTab === 'listed' || (activeTab === 'yours' && yoursSubTab === 'your-listed')) &&
                       listing &&
                       !isListingExpired(listing.endTimestamp) && (
                        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            {isOwner ? (
                              // Owner controls: Cancel and Update
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCancelListing(listing);
                                  }}
                                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedListing(listing);
                                    setShowUpdateModal(true);
                                  }}
                                  className="flex-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Update
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleBuyClick(listing);
                                }}
                                className="w-full text-center hover:bg-black/50 rounded-lg py-2 transition-colors"
                              >
                                <p className="text-white font-bold text-lg mb-1">Buy Now</p>
                                {displayPrice && (
                                  <p className="text-primary-400 font-semibold">
                                    {formatEth(displayPrice)} {displayCurrency}
                                  </p>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expired Badge */}
                      {(activeTab === 'listed' || (activeTab === 'yours' && yoursSubTab === 'your-listed')) &&
                       listing &&
                       isListingExpired(listing.endTimestamp) && (
                        <div className="absolute inset-x-0 bottom-0">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            <div className="text-center">
                              <p className="text-red-400 font-bold text-sm">Listing Expired</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-white truncate">{nft.name}</p>
                      <p className="text-xs text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>

                      {/* Show listing owner for individual listing cards */}
                      {listing && (
                        <div className="pt-1 border-t border-dark-border">
                          <p className="text-[10px] text-gray-400">Listed by</p>
                          <p className="text-xs font-mono text-gray-300 truncate">
                            {listing.owner.id.slice(0, 6)}...{listing.owner.id.slice(-4)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      {selectedListing && (
        <BuyModal
          isOpen={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onSuccess={() => {
            loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
          }}
        />
      )}

      {/* Update Listing Modal */}
      {selectedListing && (
        <UpdateListingModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onSuccess={() => {
            loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
          }}
        />
      )}

      {/* NFT Detail Modal */}
      {nfts.length > 0 && nfts[selectedNFTIndex] && (() => {
        const selectedNFT = nfts[selectedNFTIndex];

        // Check if user is owner via NFT.owners OR any listing.owner
        const isOwnerByNFT = address && selectedNFT.owners?.some(
          (o) => o.ownerAddress.toLowerCase() === address.toLowerCase()
        );
        const isOwnerByListing = address && selectedNFT.listings?.some(
          (listing) => listing.owner.id.toLowerCase() === address.toLowerCase()
        );

        const isActualOwner = isOwnerByNFT || isOwnerByListing;

        return (
          <NFTDetailModal
            isOpen={showNFTDetail}
            onClose={handleCloseNFTDetail}
            nft={selectedNFT}
            allNFTs={nfts}
            currentIndex={selectedNFTIndex}
            onNavigate={handleNavigateNFT}
            isOwner={isActualOwner}
            activeListings={selectedNFT.listings?.filter(l => l.status === 'CREATED') || []}
            onBuy={handleBuyClick}
            onCreateListing={() => setShowCreateListing(true)}
            onCreateAuction={() => setShowCreateAuction(true)}
            onCancelListing={(listing) => {
              handleCancelListing(listing);
              setShowNFTDetail(false);
            }}
            onUpdateListing={(listing) => {
              setSelectedListing(listing);
              setShowUpdateModal(true);
              // Keep detail modal open in background
            }}
          />
        );
      })()}

      {/* Create Listing Modal */}
      {nfts[selectedNFTIndex] && (
        <CreateListingModal
          isOpen={showCreateListing}
          onClose={() => setShowCreateListing(false)}
          nft={nfts[selectedNFTIndex]}
          onSuccess={() => {
            setShowCreateListing(false);
            loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
          }}
        />
      )}

      {/* Create Auction Modal */}
      {nfts[selectedNFTIndex] && (
        <CreateAuctionModal
          isOpen={showCreateAuction}
          onClose={() => setShowCreateAuction(false)}
          nft={nfts[selectedNFTIndex]}
          onSuccess={() => {
            setShowCreateAuction(false);
            loadNFTs(activeTab, activeTab === 'yours' ? yoursSubTab : undefined);
          }}
        />
      )}

      {/* Transaction Result Modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={closeModal}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </MainLayout>
  );
}
