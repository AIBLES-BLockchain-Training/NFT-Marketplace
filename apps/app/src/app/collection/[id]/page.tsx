'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Badge } from '../../../components/common/Badge';
import { Spinner } from '../../../components/common/Spinner';
import { NFTImage } from '../../../components/common/NFTImage';
import { BuyModal } from '../../../components/marketplace/BuyModal';
import { UpdateListingModal } from '../../../components/marketplace/UpdateListingModal';
import { AddCurrencyModal } from '../../../components/marketplace/AddCurrencyModal';
import { ApproveBuyerModal } from '../../../components/marketplace/ApproveBuyerModal';
import { MakeOfferModal } from '../../../components/marketplace/MakeOfferModal';
import { NFTDetailModal } from '../../../components/nft/NFTDetailModal';
import { CreateListingModal } from '../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../components/marketplace/CreateAuctionModal';
import { BidModal } from '../../../components/auction/BidModal';
import { AuctionDetailModal } from '../../../components/auction/AuctionDetailModal';
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
import { useCancelAuction } from '../../../hooks/useCancelAuction';
import { Collection, NFT, Listing, Auction, Offer } from '../../../types';
import { formatEth } from '../../../lib/web3/utils';
import { encodeCancelListing, encodeApproveBuyerForListing } from '../../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../../lib/contracts/addresses';
import { TransactionResultModal } from '../../../components/common/TransactionResultModal';
import { truncateTokenId } from '../../../lib/utils/format';
import { EditCollectionBanner } from '../../../components/collection/EditCollectionBanner';
import { isAuctionActive, hasAuctionEnded, canCollectPayout, canCollectNFT } from '../../../lib/auction/status';
import toast from 'react-hot-toast';

type TabType = 'listed' | 'auctioned' | 'offered' | 'yours';
type YoursSubTab = 'your-listed' | 'your-auctioned' | 'your-offered';
type AuctionedSubTab = 'active' | 'expired' | 'claimable';
type ListedSubTab = 'active' | 'expired';
type OfferedSubTab = 'active' | 'expired';

interface NFTWithListing extends NFT {
  listing?: Listing;
  totalListedQuantity?: string;
  auctionQuantity?: string;
  offerQuantity?: string;
  _displayOwner?: string;
}

interface ListingQueryResult {
  nft: NFT;
  id: string;
  listingId: string;
  quantity: string;
  pricePerToken: string;
  currency: string;
  startTimestamp: string;
  endTimestamp: string;
  endTime?: string;
  isReserved: boolean;
  status: string;
  owner: any;
  listingCreator: any;
  currencyApprovals?: any[];
  buyerApprovals?: any[];
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
}

interface AuctionQueryResult {
  nft: NFT;
  id: string;
  auctionId: string;
  quantity: string;
  sellerAddress: string;
  seller: any;
  minimumBidAmount: string;
  startPrice: string;
  stepAmount: string;
  ceilingPrice?: string;
  bidBufferBps: string;
  startTime: string;
  endTime: string;
  timeBufferInSeconds: number;
  tokenType: string;
  status: string;
  bids?: any[];
  winningBidder?: any;
  winningBid?: any;
  currency: any;
  isPayoutCollected?: boolean;
  isTokenCollected?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface OfferQueryResult {
  nft: NFT;
  id: string;
  offerId: string;
  quantity: string;
  totalPrice: string;
  expirationTime: string;
  expirationTimestamp: string;
  status: string;
  offeror: any;
  tokenOwner?: any;
  currency: any;
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
  blockNumber?: number;
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
  const [auctionedSubTab, setAuctionedSubTab] = useState<AuctionedSubTab>('active');
  const [listedSubTab, setListedSubTab] = useState<ListedSubTab>('active');
  const [offeredSubTab, setOfferedSubTab] = useState<OfferedSubTab>('active');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [showApproveBuyer, setShowApproveBuyer] = useState(false);

  // NFT Detail Modal
  const [showNFTDetail, setShowNFTDetail] = useState(false);
  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [nftDetailInitialTab, setNftDetailInitialTab] = useState<'details' | 'orders' | 'activity' | 'approved'>('details');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showMakeOffer, setShowMakeOffer] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  // Auction Modals
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showAuctionDetail, setShowAuctionDetail] = useState(false);

  // Collection Banner
  const [showEditBanner, setShowEditBanner] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Collection metadata from Rarible
  const [collectionDescription, setCollectionDescription] = useState<string | null>(null);
  const [collectionLogo, setCollectionLogo] = useState<string | null>(null);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'price' | 'name' | 'tokenId' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Floor Price (calculated from active listings)
  const [calculatedFloorPrice, setCalculatedFloorPrice] = useState<string>('0');
  const [calculatedFloorCurrency, setCalculatedFloorCurrency] = useState<string>('ETH');

  // Calculate floor price from current NFTs - LOWEST price (floor)
  // When comparing across currencies, prefer the one with higher numeric value for display
  useEffect(() => {
    let floorPrice = '0';
    let floorCurrency = 'ETH';
    let hasFoundListing = false;

    nfts.forEach((nft) => {
      if (nft.listing) {
        const price = BigInt(nft.listing.pricePerToken || '0');
        if (price > BigInt(0)) {
          if (!hasFoundListing) {
            floorPrice = nft.listing.pricePerToken;
            floorCurrency = nft.listing.currency || 'ETH';
            hasFoundListing = true;
          } else {
            const currentFloor = BigInt(floorPrice);
            const currentCurrency = floorCurrency;
            const newCurrency = nft.listing.currency || 'ETH';

            if (currentCurrency === newCurrency) {
              // Same currency - take the lower price (floor)
              if (price < currentFloor) {
                floorPrice = nft.listing.pricePerToken;
              }
            } else {
              // Different currencies - take the one with higher numeric value for better display
              if (price > currentFloor) {
                floorPrice = nft.listing.pricePerToken;
                floorCurrency = newCurrency;
              }
            }
          }
        }
      }
    });

    setCalculatedFloorPrice(floorPrice);
    setCalculatedFloorCurrency(floorCurrency);
  }, [nfts]);

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

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const loadNFTs = useCallback(async (
    tab: TabType,
    subTab?: YoursSubTab,
    auctionSubTab?: AuctionedSubTab,
    listedTab?: ListedSubTab,
    offeredTab?: OfferedSubTab
  ) => {
    setIsLoadingNFTs(true);
    try {
      let result: { listings?: ListingQueryResult[]; auctions?: AuctionQueryResult[]; offers?: OfferQueryResult[] };
      const now = Date.now();

      switch (tab) {
        case 'listed': {
          const currentListedTab = listedTab || listedSubTab;
          result = await graphqlClient.query(GET_COLLECTION_LISTED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.listings) {
            // Filter based on sub-tab and 7-day rule
            result.listings = result.listings.filter((listing: ListingQueryResult) => {
              const endTime = new Date(listing.endTimestamp || listing.endTime || listing.startTimestamp).getTime();
              const isExpired = endTime < now;
              const daysSinceExpired = (now - endTime) / SEVEN_DAYS_MS;

              // Remove listings expired for more than 7 days
              if (isExpired && daysSinceExpired > 7) {
                return false;
              }

              if (currentListedTab === 'active') {
                return !isExpired && listing.status === 'CREATED';
              } else if (currentListedTab === 'expired') {
                return isExpired;
              }

              return false;
            });
          }
          if (result.listings) {
            // Check collection type from first listing
            const isERC1155 = result.listings.length > 0 &&
                             result.listings[0].nft?.collection?.collectionType === 'ERC1155';

            if (isERC1155) {
              // For ERC-1155: Each listing is a separate card
              const nftsArray = result.listings.map((listing: ListingQueryResult) => ({
                ...listing.nft,
                // Create unique ID by combining nft.id and listing.id
                id: `${listing.nft.id}-listing-${listing.id}`,
                originalNftId: listing.nft.id,
                listings: [listing as any], // Only this one listing
                totalListedQuantity: listing.quantity,
              }));
              setNfts(nftsArray as any);
            } else {
              // For ERC-721: Group all listings by NFT (original behavior)
              const nftMap = new Map<string, NFT>();
              const nftListingsMap = new Map<string, ListingQueryResult[]>();
              const totalListedQty = new Map<string, bigint>();

              result.listings.forEach((listing: ListingQueryResult) => {
                const nftId = listing.nft.id;
                const currentQty = totalListedQty.get(nftId) || BigInt(0);
                const listingQty = BigInt(String(listing.quantity || '1'));
                totalListedQty.set(nftId, currentQty + listingQty);

                // Store NFT data (first occurrence)
                if (!nftMap.has(nftId)) {
                  nftMap.set(nftId, listing.nft);
                }

                // Collect all listings for this NFT
                if (!nftListingsMap.has(nftId)) {
                  nftListingsMap.set(nftId, []);
                }
                nftListingsMap.get(nftId)?.push(listing);
              });

              // Build final NFT array with all listings
              const nftsArray = Array.from(nftMap.values()).map(nft => ({
                ...nft,
                listings: (nftListingsMap.get(nft.id) || []) as any,
                totalListedQuantity: totalListedQty.get(nft.id)?.toString() || '1',
              }));

              setNfts(nftsArray as any);
            }
          }
          break;
        }

        case 'auctioned': {
          const currentAuctionSubTab = auctionSubTab || auctionedSubTab;
          result = await graphqlClient.query(GET_COLLECTION_AUCTIONED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.auctions) {
            // Transform auctions: compute winningBid from bids array (same as auctions page)
            let transformedAuctions = result.auctions.map((auction: any) => {
              const sortedBids = auction.bids
                ? [...auction.bids].sort((a: any, b: any) => {
                    const amountDiff = BigInt(b.bidAmount) - BigInt(a.bidAmount);
                    if (amountDiff !== 0n) return Number(amountDiff);
                    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                  })
                : [];

              return {
                ...auction,
                bids: sortedBids,
                winningBid: sortedBids.length > 0 ? sortedBids[0] : undefined,
              };
            });

            // Filter by sub-tab
            if (currentAuctionSubTab === 'active') {
              transformedAuctions = transformedAuctions.filter((auction: any) =>
                !hasAuctionEnded(auction.endTime) && auction.status !== 'CANCELLED'
              );
            } else if (currentAuctionSubTab === 'expired') {
              transformedAuctions = transformedAuctions.filter((auction: any) => {
                if (auction.status === 'CANCELLED') return false;
                if (!hasAuctionEnded(auction.endTime)) return false;

                // Filter out auctions expired for more than 7 days
                const endTime = new Date(auction.endTime).getTime();
                const daysSinceExpired = (now - endTime) / SEVEN_DAYS_MS;

                return daysSinceExpired <= 7;
              });
            } else if (currentAuctionSubTab === 'claimable') {
              transformedAuctions = transformedAuctions.filter((auction: any) => {
                if (!hasAuctionEnded(auction.endTime)) return false;
                if (!address) return false;
                if (auction.status === 'CANCELLED') return false;

                const payoutCheck = canCollectPayout(auction, address);
                const nftCheck = canCollectNFT(auction, address);

                return payoutCheck.canCollect || nftCheck.canCollect;
              });
            }

            const nftsWithAuctions = transformedAuctions.map((auction: AuctionQueryResult) => ({
              ...auction.nft,
              auctionQuantity: auction.quantity,
              auctions: [auction as any], // Attach the transformed auction object
            }));

            setNfts(nftsWithAuctions as any);
          }
          break;
        }

        case 'offered': {
          const currentOfferedTab = offeredTab || offeredSubTab;
          result = await graphqlClient.query(GET_COLLECTION_OFFERED_NFTS_QUERY, {
            collectionId: id,
          });
          if (result.offers) {
            // Filter based on sub-tab and 7-day rule
            const filteredOffers = result.offers.filter((offer: OfferQueryResult) => {
              const expirationTime = new Date(offer.expirationTimestamp || offer.expirationTime || offer.createdAt).getTime();
              const isExpired = expirationTime < now;
              const daysSinceExpired = (now - expirationTime) / SEVEN_DAYS_MS;

              // Remove offers expired for more than 7 days
              if (isExpired && daysSinceExpired > 7) {
                return false;
              }

              if (currentOfferedTab === 'active') {
                return !isExpired && offer.status === 'ACTIVE';
              } else if (currentOfferedTab === 'expired') {
                return isExpired;
              }

              return false;
            });

            // For ERC1155, split NFTs by owner. For ERC721, keep as is.
            const uniqueNFTs = new Map<string, NFTWithListing>();
            const nftOffers = new Map<string, OfferQueryResult[]>();

            filteredOffers.forEach((offer: OfferQueryResult) => {
              const nftId = offer.nft.id;
              const isERC1155 = offer.nft.collection.collectionType === 'ERC1155';
              const listings = offer.nft.listings?.filter((l: any) => l.owner) || [];

              if (isERC1155 && listings.length > 1) {
                // Multiple listings - create one card per listing owner
                // All offers will be shown on all cards, filtering happens in modal
                listings.forEach((listing: any) => {
                  const listingOwner = listing.owner.id;
                  const uniqueKey = `${nftId}-${listingOwner}`;

                  if (!uniqueNFTs.has(uniqueKey)) {
                    uniqueNFTs.set(uniqueKey, {
                      ...offer.nft,
                      offerQuantity: offer.quantity,
                      offers: [],
                      _displayOwner: listingOwner,
                    });
                  }

                  if (!nftOffers.has(uniqueKey)) {
                    nftOffers.set(uniqueKey, []);
                  }
                });
              } else {
                // Single listing or no listings
                const targetOwner = listings.length === 1
                  ? listings[0].owner.id
                  : offer.tokenOwner?.id || offer.nft.owners?.[0]?.ownerAddress || '';

                const uniqueKey = isERC1155 && targetOwner ? `${nftId}-${targetOwner}` : nftId;

                if (!uniqueNFTs.has(uniqueKey)) {
                  uniqueNFTs.set(uniqueKey, {
                    ...offer.nft,
                    offerQuantity: offer.quantity,
                    offers: [],
                    _displayOwner: targetOwner,
                  });
                }

                if (!nftOffers.has(uniqueKey)) {
                  nftOffers.set(uniqueKey, []);
                }
              }

              // Add offer to nftOffers map for later processing
              if (!nftOffers.has(nftId)) {
                nftOffers.set(nftId, []);
              }
              nftOffers.get(nftId)!.push(offer);
            });

            // Add offers array to each NFT and sort by price (highest first)
            const nftsArray = Array.from(uniqueNFTs.values()).map(nft => {
              // Get offers using nft.id (not uniqueKey) since that's how we stored them
              const offers = nftOffers.get(nft.id) || [];

              // Sort offers by totalPrice descending (highest first)
              const sortedOffers = offers.sort((a, b) => {
                const priceA = BigInt(String(a.totalPrice));
                const priceB = BigInt(String(b.totalPrice));
                return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
              });

              return {
                ...nft,
                offers: sortedOffers as any,
              };
            });

            setNfts(nftsArray);
          }
          break;
        }

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
                const nftMap = new Map<string, NFT>();
                const nftListingsMap = new Map<string, ListingQueryResult[]>();
                const totalListedQty = new Map<string, bigint>();

                result.listings.forEach((listing: ListingQueryResult) => {
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
                  nftListingsMap.get(nftId)?.push(listing);
                });

                // Build final NFT array with all listings
                const nftsArray = Array.from(nftMap.values()).map(nft => ({
                  ...nft,
                  listings: nftListingsMap.get(nft.id) || [],
                  totalListedQuantity: totalListedQty.get(nft.id)?.toString() || '1',
                }));

                setNfts(nftsArray as any);
              }
              break;

            case 'your-auctioned':
              result = await graphqlClient.query(GET_COLLECTION_USER_AUCTIONS_QUERY, {
                collectionId: id,
                ownerAddress: address.toLowerCase(),
              });
              if (result.auctions) {
                setNfts(result.auctions.map((auction: AuctionQueryResult) => ({
                  ...auction.nft,
                  auctionQuantity: auction.quantity,
                  auctions: [auction as any], // Attach the full auction object
                })) as any);
              }
              break;

            case 'your-offered':
              result = await graphqlClient.query(GET_COLLECTION_USER_OFFERS_QUERY, {
                collectionId: id,
                buyerAddress: address.toLowerCase(),
              });
              if (result.offers) {
                // For ERC1155, split NFTs by owner. For ERC721, keep as is.
                const uniqueNFTs = new Map<string, any>();
                const nftOffers = new Map<string, OfferQueryResult[]>();

                result.offers.forEach((offer: OfferQueryResult) => {
                  const nftId = offer.nft.id;
                  const isERC1155 = offer.nft.collection.collectionType === 'ERC1155';
                  const listings = offer.nft.listings?.filter((l: any) => l.owner) || [];

                  if (isERC1155 && listings.length > 1) {
                    // Multiple listings - create one card per listing owner
                    // All offers will be shown on all cards, filtering happens in modal
                    listings.forEach((listing: any) => {
                      const listingOwner = listing.owner.id;
                      const uniqueKey = `${nftId}-${listingOwner}`;

                      if (!uniqueNFTs.has(uniqueKey)) {
                        uniqueNFTs.set(uniqueKey, {
                          ...offer.nft,
                          offerQuantity: offer.quantity,
                          _displayOwner: listingOwner,
                        });
                      }
                    });
                  } else {
                    // Single listing or no listings
                    const targetOwner = listings.length === 1
                      ? listings[0].owner.id
                      : offer.tokenOwner?.id || offer.nft.owners?.[0]?.ownerAddress || '';

                    const uniqueKey = isERC1155 && targetOwner ? `${nftId}-${targetOwner}` : nftId;

                    if (!uniqueNFTs.has(uniqueKey)) {
                      uniqueNFTs.set(uniqueKey, {
                        ...offer.nft,
                        offerQuantity: offer.quantity,
                        _displayOwner: targetOwner,
                      });
                    }
                  }

                  // Add offer to nftOffers map for later processing
                  if (!nftOffers.has(nftId)) {
                    nftOffers.set(nftId, []);
                  }
                  nftOffers.get(nftId)!.push(offer);
                });

                // Add offers array to each NFT and sort by price (highest first)
                const nftsArray = Array.from(uniqueNFTs.values()).map(nft => {
                  // Get offers using nft.id (not uniqueKey) since that's how we stored them
                  const offers = nftOffers.get(nft.id) || [];

                  // Sort offers by totalPrice descending (highest first)
                  const sortedOffers = offers.sort((a, b) => {
                    const priceA = BigInt(a.totalPrice);
                    const priceB = BigInt(b.totalPrice);
                    return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
                  });

                  return {
                    ...nft,
                    offers: sortedOffers,
                  };
                });

                setNfts(nftsArray as any);
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
  }, [id, address, yoursSubTab, auctionedSubTab, listedSubTab, offeredSubTab, SEVEN_DAYS_MS]);

  // Check if user is collection owner
  const checkOwnership = useCallback(async () => {
    if (!address || !id) {
      setIsOwner(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/collection/owner?address=${id}&user=${address}`
      );
      const data = await response.json();
      setIsOwner(data.isOwner || false);
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsOwner(false);
    }
  }, [address, id]);

  // Load collection banner from Firestore
  const loadBanner = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/collection/metadata?address=${id}`);
      const data = await response.json();

      if (data.exists && data.data?.bannerURI) {
        setBannerUrl(data.data.bannerURI);
      } else {
        setBannerUrl(null);
      }
    } catch (error) {
      console.error('Error loading banner:', error);
      setBannerUrl(null);
    }
  }, [id]);

  // Load collection metadata from Rarible (description + logo)
  const loadRaribleMetadata = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/collection/rarible?address=${id}`);
      const data = await response.json();

      if (data.exists && data.data) {
        setCollectionDescription(data.data.description || null);
        setCollectionLogo(data.data.image || null);
      }
    } catch (error) {
      console.error('Error loading Rarible metadata:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCollection();
      loadBanner();
      loadRaribleMetadata();
    }
  }, [id, loadCollection, loadBanner, loadRaribleMetadata]);

  useEffect(() => {
    checkOwnership();
  }, [checkOwnership]);

  useEffect(() => {
    if (id) {
      loadNFTs(
        activeTab,
        activeTab === 'yours' ? yoursSubTab : undefined,
        activeTab === 'auctioned' ? auctionedSubTab : undefined,
        activeTab === 'listed' ? listedSubTab : undefined,
        activeTab === 'offered' ? offeredSubTab : undefined
      );
    }
  }, [id, activeTab, yoursSubTab, auctionedSubTab, listedSubTab, offeredSubTab, loadNFTs]);

  // Update selectedAuction when nfts data changes (after refresh)
  useEffect(() => {
    if (!selectedAuction || !nfts || nfts.length === 0) return;

    // Only update if we're in auctioned tab
    if (activeTab === 'auctioned' || (activeTab === 'yours' && yoursSubTab === 'your-auctioned')) {
      // Find updated auction data
      const updatedNFT = nfts.find(nft =>
        nft.auctions && nft.auctions.length > 0 &&
        nft.auctions[0].id === selectedAuction.id
      );
      if (updatedNFT && updatedNFT.auctions && updatedNFT.auctions[0]) {
        const updatedAuction = updatedNFT.auctions[0];
        // Only update if data actually changed (prevent infinite loop)
        if (JSON.stringify(updatedAuction) !== JSON.stringify(selectedAuction)) {
          setSelectedAuction(updatedAuction);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfts, activeTab, yoursSubTab]); // Intentionally exclude selectedAuction to prevent loop

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'yours') {
      setYoursSubTab('your-listed');
    }
    if (tab === 'auctioned') {
      setAuctionedSubTab('active');
    }
    if (tab === 'listed') {
      setListedSubTab('active');
    }
    if (tab === 'offered') {
      setOfferedSubTab('active');
    }
  };

  const handleYoursSubTabChange = (subTab: YoursSubTab) => {
    setYoursSubTab(subTab);
  };

  const handleAuctionedSubTabChange = (subTab: AuctionedSubTab) => {
    setAuctionedSubTab(subTab);
  };

  // Memoized refresh handler for auction detail modal
  const handleAuctionRefresh = useCallback(() => {
    loadNFTs(
      activeTab,
      activeTab === 'yours' ? yoursSubTab : undefined,
      activeTab === 'auctioned' ? auctionedSubTab : undefined
    );
  }, [loadNFTs, activeTab, yoursSubTab, auctionedSubTab]);

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
        loadNFTs(
          activeTab,
          activeTab === 'yours' ? yoursSubTab : undefined,
          activeTab === 'auctioned' ? auctionedSubTab : undefined
        );
      }
    } catch (error: unknown) {
      console.error('Cancel listing error:', error);
    }
  };

  const handleCancelAuction = async (auction: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Import encodeCancelAuction when needed
    const { encodeCancelAuction } = await import('../../../lib/web3/encoding');

    try {
      const tx = encodeCancelAuction({ auctionId: BigInt(auction.auctionId) });
      const receipt = await sendTransaction(tx, 'Auction cancelled successfully!');

      if (receipt?.status === 1) {
        // Wait a bit for indexer to process the transaction
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Reload NFTs to remove cancelled auction
        await loadNFTs(
          activeTab,
          activeTab === 'yours' ? yoursSubTab : undefined,
          activeTab === 'auctioned' ? auctionedSubTab : undefined
        );

        // Close auction detail modal if open
        setShowAuctionDetail(false);
        setSelectedAuction(null);
      }
    } catch (error: unknown) {
      console.error('Cancel auction error:', error);
      toast.error('Failed to cancel auction');
    }
  };

  const handleAcceptOffer = async (offer: Offer, fromHover = false) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    setProcessingOfferId(offer.id);
    try {
      const { encodeAcceptOffer } = await import('../../../lib/web3/encoding');
      const tx = encodeAcceptOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx, 'Offer accepted successfully!');

      if (receipt?.status === 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadNFTs(
          activeTab,
          activeTab === 'yours' ? yoursSubTab : undefined,
          activeTab === 'auctioned' ? auctionedSubTab : undefined
        );
      }
    } catch (error: unknown) {
      console.error('Accept offer error:', error);
      toast.error('Failed to accept offer');
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleCancelOffer = async (offer: Offer, fromHover = false) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // If from hover, open modal to Orders tab first
    if (fromHover) {
      // Find the NFT index
      const nftIndex = nfts.findIndex(nft => nft.offers?.some(o => o.id === offer.id));
      if (nftIndex !== -1) {
        setSelectedNFTIndex(nftIndex);
        setNftDetailInitialTab('orders');
        setShowNFTDetail(true);
      }
      return;
    }

    try {
      const { encodeCancelOffer } = await import('../../../lib/web3/encoding');
      const tx = encodeCancelOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx, 'Offer cancelled successfully!');

      if (receipt?.status === 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadNFTs(
          activeTab,
          activeTab === 'yours' ? yoursSubTab : undefined,
          activeTab === 'auctioned' ? auctionedSubTab : undefined
        );
      }
    } catch (error: unknown) {
      console.error('Cancel offer error:', error);
      toast.error('Failed to cancel offer');
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

  const handleNFTClick = (index: number, initialTab: 'details' | 'orders' | 'activity' | 'approved' = 'details') => {
    // For Auctioned tab, open AuctionDetailModal instead of NFTDetailModal
    if (activeTab === 'auctioned' || (activeTab === 'yours' && yoursSubTab === 'your-auctioned')) {
      const nft = nfts[index];
      const auction = nft.auctions && nft.auctions.length > 0 ? nft.auctions[0] : null;
      if (auction) {
        setSelectedAuction(auction);
        setShowAuctionDetail(true);
        return;
      }
    }

    // Otherwise, open NFTDetailModal
    setSelectedNFTIndex(index);
    setNftDetailInitialTab(initialTab);
    setShowNFTDetail(true);
  };

  const handleNavigateNFT = (index: number) => {
    setSelectedNFTIndex(index);
  };

  const handleCloseNFTDetail = () => {
    setShowNFTDetail(false);
    setNftDetailInitialTab('details'); // Reset to default
  };

  const handleApproveBuyerSubmit = async (buyerAddress: string, approve: boolean) => {
    if (!address || !selectedListing) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeApproveBuyerForListing(
        BigInt(selectedListing.id),
        buyerAddress as `0x${string}`,
        approve
      );
      const receipt = await sendTransaction(
        tx,
        approve ? 'Buyer approved successfully!' : 'Buyer approval revoked!'
      );

      if (receipt?.status === 1) {
        // Reload NFTs to get updated buyer approvals
        loadNFTs(
          activeTab,
          activeTab === 'yours' ? yoursSubTab : undefined,
          activeTab === 'auctioned' ? auctionedSubTab : undefined
        );
      }
    } catch (error: unknown) {
      console.error('Approve buyer error:', error);
      throw error;
    }
  };

  // Helper function to filter and sort NFTs
  const getFilteredAndSortedNFTs = () => {
    let filtered = [...nfts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(nft => {
        const nameMatch = nft.name?.toLowerCase().includes(query);
        const tokenIdMatch = nft.tokenId?.toLowerCase().includes(query);
        return nameMatch || tokenIdMatch;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number = 0;
        let bValue: string | number = 0;

        switch (sortField) {
          case 'price':
            // Get price from listing, auction, or offer depending on active tab
            if (activeTab === 'listed' || (activeTab === 'yours' && yoursSubTab === 'your-listed')) {
              const aListing = a.listings?.[0];
              const bListing = b.listings?.[0];
              aValue = aListing?.currencyApprovals?.[0]?.pricePerToken ? Number(aListing.currencyApprovals[0].pricePerToken) : 0;
              bValue = bListing?.currencyApprovals?.[0]?.pricePerToken ? Number(bListing.currencyApprovals[0].pricePerToken) : 0;
            } else if (activeTab === 'auctioned' || (activeTab === 'yours' && yoursSubTab === 'your-auctioned')) {
              const aAuction = a.auctions?.[0];
              const bAuction = b.auctions?.[0];
              aValue = aAuction?.winningBid ? Number(aAuction.winningBid.bidAmount) : aAuction?.startPrice ? Number(aAuction.startPrice) : 0;
              bValue = bAuction?.winningBid ? Number(bAuction.winningBid.bidAmount) : bAuction?.startPrice ? Number(bAuction.startPrice) : 0;
            } else if (activeTab === 'offered' || (activeTab === 'yours' && yoursSubTab === 'your-offered')) {
              const aOffer = a.offers?.[0];
              const bOffer = b.offers?.[0];
              aValue = aOffer?.totalPrice ? Number(aOffer.totalPrice) : 0;
              bValue = bOffer?.totalPrice ? Number(bOffer.totalPrice) : 0;
            }
            break;
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'tokenId':
            aValue = Number(a.tokenId || 0);
            bValue = Number(b.tokenId || 0);
            break;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortOrder === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
      });
    }

    return filtered;
  };

  const handleSort = (field: 'price' | 'name' | 'tokenId') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedNFTs = getFilteredAndSortedNFTs();

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
        {/* Collection Header Card with Banner */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-8 relative">
          {/* Banner Background */}
          <div className="w-full h-[28rem] bg-gradient-to-br from-primary-500/20 to-accent-500/20 relative">
            {bannerUrl ? (
              <>
                <Image
                  src={bannerUrl}
                  alt={`${collection.name} banner`}
                  fill
                  className="object-cover"
                  unoptimized
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
                      <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl [text-shadow:_2px_2px_8px_rgb(0_0_0_/_80%)]">{collection.name}</h1>
                      <Badge variant="primary">{collection.collectionType}</Badge>
                    </div>

                    {/* Description - 2-3 lines max */}
                    {collectionDescription && (
                      <p className="text-sm md:text-base text-gray-100 font-medium mb-3 drop-shadow-lg [text-shadow:_1px_1px_6px_rgb(0_0_0_/_70%)] line-clamp-3 max-w-3xl">
                        {collectionDescription}
                      </p>
                    )}

                    {/* Contract & Stats */}
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-medium">Contract:</span>
                        <span className="font-mono font-semibold text-gray-200 text-xs">{collection.id.slice(0, 6)}...{collection.id.slice(-4)}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-medium">Total Supply:</span>
                        <span className="font-bold text-white [text-shadow:_1px_1px_4px_rgb(0_0_0_/_60%)]">{collection.totalSupply || '∞'}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-medium">Floor Price:</span>
                        {calculatedFloorPrice !== '0' ? (
                          <span className="font-bold text-white [text-shadow:_1px_1px_4px_rgb(0_0_0_/_60%)]">
                            {formatEth(calculatedFloorPrice)} {calculatedFloorCurrency}
                          </span>
                        ) : (
                          <span className="font-bold text-white [text-shadow:_1px_1px_4px_rgb(0_0_0_/_60%)]">N/A</span>
                        )}
                      </div>

                      {/* Options Menu - Only for Owner */}
                      {isOwner && address && (
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
                        <Image
                          src={collectionLogo}
                          alt={collection.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                          {collection.name.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                  </div>
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

        {/* Sub-tabs for "Listed" */}
        {activeTab === 'listed' && (
          <div className="flex gap-3 mb-6 px-4">
            <button
              onClick={() => setListedSubTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                listedSubTab === 'active'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setListedSubTab('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                listedSubTab === 'expired'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Expired
            </button>
          </div>
        )}

        {/* Sub-tabs for "Auctioned" */}
        {activeTab === 'auctioned' && (
          <div className="flex gap-3 mb-6 px-4">
            <button
              onClick={() => handleAuctionedSubTabChange('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                auctionedSubTab === 'active'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleAuctionedSubTabChange('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                auctionedSubTab === 'expired'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Expired
            </button>
            <button
              onClick={() => handleAuctionedSubTabChange('claimable')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                auctionedSubTab === 'claimable'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Claimable
            </button>
          </div>
        )}

        {/* Sub-tabs for "Offered" */}
        {activeTab === 'offered' && (
          <div className="flex gap-3 mb-6 px-4">
            <button
              onClick={() => setOfferedSubTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                offeredSubTab === 'active'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setOfferedSubTab('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                offeredSubTab === 'expired'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Expired
            </button>
          </div>
        )}

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

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or token ID..."
              className="w-full px-4 py-3 pl-12 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('price')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortField === 'price'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Price
              <span className="inline-block ml-1">
                {sortField === 'price' ? (sortOrder === 'desc' ? '↓' : '↑') : <span className="text-gray-600">⇅</span>}
              </span>
            </button>
            <button
              onClick={() => handleSort('name')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortField === 'name'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Name
              <span className="inline-block ml-1">
                {sortField === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : <span className="text-gray-600">⇅</span>}
              </span>
            </button>
            <button
              onClick={() => handleSort('tokenId')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortField === 'tokenId'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
              }`}
            >
              Token ID
              <span className="inline-block ml-1">
                {sortField === 'tokenId' ? (sortOrder === 'desc' ? '↓' : '↑') : <span className="text-gray-600">⇅</span>}
              </span>
            </button>
          </div>
        </div>

        {/* Results Counter */}
        {!isLoadingNFTs && nfts.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400">
              {searchQuery ? (
                <>Found {filteredAndSortedNFTs.length} of {nfts.length} NFTs</>
              ) : (
                <>Showing {nfts.length} NFTs</>
              )}
            </p>
          </div>
        )}

        {/* NFTs Grid */}
        {activeTab === 'auctioned' && auctionedSubTab === 'claimable' && !address ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400 mb-4">Please connect your wallet to view claimable auctions</p>
          </div>
        ) : isLoadingNFTs ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredAndSortedNFTs.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            {searchQuery ? (
              <div>
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-400 mb-2">No NFTs found for &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary-400 hover:text-primary-300 text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <p className="text-gray-400">
                {activeTab === 'yours' && !address
                  ? 'Connect your wallet to see your activities'
                  : activeTab === 'auctioned' && auctionedSubTab === 'active'
                  ? 'No active auctions found'
                  : activeTab === 'auctioned' && auctionedSubTab === 'expired'
                  ? 'No expired auctions found'
                  : activeTab === 'auctioned' && auctionedSubTab === 'claimable'
                  ? 'No claimable auctions found'
                  : 'No NFTs found'}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedNFTs.map((nft, index) => {
              // Get first listing (for cards that represent individual listings)
              const listing = nft.listings && nft.listings.length > 0 ? nft.listings[0] : null;
              const isListingOwner = listing && address && listing.owner.id.toLowerCase() === address.toLowerCase();
              const price = listing?.currencyApprovals?.[0];

              // Get first auction (for auction cards)
              const auction = nft.auctions && nft.auctions.length > 0 ? nft.auctions[0] : null;
              const isAuctionOwner = auction && address && auction.sellerAddress.toLowerCase() === address.toLowerCase();
              const auctionIsActive = auction ? isAuctionActive(auction) : false;
              const auctionHasEnded = auction ? hasAuctionEnded(auction.endTime) : false;

              // Get first offer (highest price, already sorted)
              const offer = nft.offers && nft.offers.length > 0 ? nft.offers[0] : null;
              const isOfferMaker = offer && address && offer.offeror?.id.toLowerCase() === address.toLowerCase();

              // For offered tab, check if current user is the owner displayed on this card
              // Use _displayOwner (set when splitting ERC1155 by owner) for accurate ownership check
              const displayOwner = (nft as any)._displayOwner;
              const isOfferTokenOwner = address && displayOwner
                ? displayOwner.toLowerCase() === address.toLowerCase()
                : false;

              const isOfferExpired = offer ? new Date(offer.expirationTimestamp).getTime() < Date.now() : false;

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

              // Create unique key for each card (especially for ERC1155 with multiple owners)
              const cardKey = (nft as any)._displayOwner
                ? `${nft.id}-${(nft as any)._displayOwner}`
                : nft.id;

              return (
                <div key={cardKey} className="group relative rounded-lg overflow-hidden border border-dark-border hover:border-primary-500 transition-all bg-dark-card cursor-pointer">
                  <div onClick={() => handleNFTClick(index, activeTab === 'offered' ? 'orders' : 'details')} className="block">
                    <div className="aspect-square bg-dark-bg relative overflow-hidden">
                      <NFTImage
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        width={300}
                      />

                      {/* Reserved Listing Badge - Top Right */}
                      {listing?.isReserved && (
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-orange-500/50">
                          <p className="text-xs font-bold text-orange-400">RESERVED</p>
                        </div>
                      )}

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


                      {/* Hover Overlay - Show for both active and expired listings */}
                      {(activeTab === 'listed' || (activeTab === 'yours' && yoursSubTab === 'your-listed')) &&
                       listing && (
                        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            {!isListingExpired(listing.endTimestamp) ? (
                              // Active listing
                              isListingOwner ? (
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
                                // Buyer view - check if reserved and if approved
                                (() => {
                                  const isReservedListing = listing.isReserved;
                                  const approvedBuyers = listing.buyerApprovals?.filter(b => b.isApproved) || [];
                                  const isUserApproved = address
                                    ? approvedBuyers.some(b => b.buyerAddress.toLowerCase() === address.toLowerCase())
                                    : false;

                                  // Only show "Buy Now" if not reserved OR user is approved
                                  if (!isReservedListing || isUserApproved) {
                                    return (
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
                                    );
                                  } else {
                                    return (
                                      <div className="w-full text-center py-2">
                                        <p className="text-gray-400 font-semibold text-sm mb-1">Reserved Listing</p>
                                        <p className="text-xs text-gray-500">Only approved buyers can purchase</p>
                                      </div>
                                    );
                                  }
                                })()
                              )
                            ) : (
                              // Expired listing - show Make Offer button only if user is NOT the owner
                              listedSubTab === 'expired' && !isListingOwner && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedNFTIndex(index);
                                    setShowMakeOffer(true);
                                  }}
                                  className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Make Offer
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expired Badge */}
                      {(activeTab === 'listed' || (activeTab === 'yours' && yoursSubTab === 'your-listed')) &&
                       listing &&
                       isListingExpired(listing.endTimestamp) && (
                        <div className="absolute inset-x-0 bottom-0 group-hover:opacity-0 transition-opacity duration-300">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            <div className="text-center">
                              <p className="text-red-400 font-bold text-sm">Listing Expired</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Auction Hover Overlay - Show for both active and expired auctions */}
                      {(activeTab === 'auctioned' || (activeTab === 'yours' && yoursSubTab === 'your-auctioned')) &&
                       auction && (
                        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            {!auctionHasEnded ? (
                              // Active auction
                              isAuctionOwner ? (
                                <AuctionOwnerHoverButtons
                                  auction={auction}
                                  onCancel={() => {
                                    setSelectedAuction(auction);
                                    handleCancelAuction(auction);
                                  }}
                                  onViewDetails={() => {
                                    setSelectedAuction(auction);
                                    setShowAuctionDetail(true);
                                  }}
                                />
                              ) : (
                                // Bidder view
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedAuction(auction);
                                      setShowBidModal(true);
                                    }}
                                    className="flex-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Place Bid
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedAuction(auction);
                                      setShowAuctionDetail(true);
                                    }}
                                    className="px-3 py-2 bg-dark-card hover:bg-dark-border text-white text-xs font-semibold rounded-lg transition-colors border border-dark-border"
                                  >
                                    Details
                                  </button>
                                </div>
                              )
                            ) : (
                              // Expired auction - show Make Offer button (except for winner and auction owner)
                              auctionedSubTab === 'expired' && (() => {
                                // Check if current user can collect NFT (is winner)
                                const nftCheck = address ? canCollectNFT(auction, address) : { canCollect: false };
                                const isWinner = nftCheck.canCollect;

                                // Don't show Make Offer button for winner or auction owner
                                if (isWinner || isAuctionOwner) {
                                  return null;
                                }

                                // Show Make Offer for everyone else (not seller, not winner)
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedNFTIndex(index);
                                      setShowMakeOffer(true);
                                    }}
                                    className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Make Offer
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      )}

                      {/* Auction Ended Badge */}
                      {(activeTab === 'auctioned' || (activeTab === 'yours' && yoursSubTab === 'your-auctioned')) &&
                       auction &&
                       auctionHasEnded && (
                        <div className="absolute inset-x-0 bottom-0 group-hover:opacity-0 transition-opacity duration-300">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            <div className="text-center">
                              <p className="text-gray-400 font-bold text-sm">Auction Ended</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Offer Hover Overlay - Show for both active and expired offers */}
                      {(activeTab === 'offered' || (activeTab === 'yours' && yoursSubTab === 'your-offered')) &&
                       offer && (
                        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            {!isOfferExpired ? (
                              // Active offer
                              isOfferTokenOwner ? (
                                // Token owner: Accept Offer
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleAcceptOffer(offer, true);
                                  }}
                                  disabled={processingOfferId === offer.id}
                                  className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingOfferId === offer.id ? 'Processing...' : 'Accept Offer'}
                                </button>
                              ) : isOfferMaker ? (
                                // Offer maker: Cancel Offer
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCancelOffer(offer, true);
                                  }}
                                  className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Cancel Offer
                                </button>
                              ) : (
                                // Other users: Make Offer
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleNFTClick(index);
                                    setShowMakeOffer(true);
                                  }}
                                  className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Make Offer
                                </button>
                              )
                            ) : (
                              // Expired offer - show Make New Offer button
                              offeredSubTab === 'expired' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedNFTIndex(index);
                                    setShowMakeOffer(true);
                                  }}
                                  className="w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Make New Offer
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Offer Expired Badge */}
                      {(activeTab === 'offered' || (activeTab === 'yours' && yoursSubTab === 'your-offered')) &&
                       offer &&
                       isOfferExpired && (
                        <div className="absolute inset-x-0 bottom-0 group-hover:opacity-0 transition-opacity duration-300">
                          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-8">
                            <div className="text-center">
                              <p className="text-red-400 font-bold text-sm">Offer Expired</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-white truncate">{nft.name}</p>
                      <p className="text-xs text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>

                      {/* Show listing owner for all listings except in Offered tab */}
                      {listing && activeTab !== 'offered' && (activeTab !== 'yours' || yoursSubTab !== 'your-offered') && (
                        <div className="pt-1 border-t border-dark-border">
                          <p className="text-[10px] text-gray-400">Listed by</p>
                          <p className="text-xs font-mono text-gray-300 truncate">
                            {listing.owner.id.slice(0, 6)}...{listing.owner.id.slice(-4)}
                          </p>
                        </div>
                      )}

                      {/* Show auction seller for all auctions */}
                      {auction && (
                        <div className="pt-1 border-t border-dark-border">
                          <p className="text-[10px] text-gray-400">Auctioned by</p>
                          <p className="text-xs font-mono text-gray-300 truncate">
                            {auction.sellerAddress.slice(0, 6)}...{auction.sellerAddress.slice(-4)}
                          </p>
                        </div>
                      )}

                      {/* Show owner for offered tab (especially for ERC1155) */}
                      {offer && (activeTab === 'offered' || (activeTab === 'yours' && yoursSubTab === 'your-offered')) && (nft as any)._displayOwner && (
                        <div className="pt-1 border-t border-dark-border">
                          <p className="text-[10px] text-gray-400">Owner by</p>
                          <p className="text-xs font-mono text-gray-300 truncate">
                            {(nft as any)._displayOwner.slice(0, 6)}...{(nft as any)._displayOwner.slice(-4)}
                          </p>
                        </div>
                      )}

                      {/* Show offer maker ONLY for offered tab */}
                      {offer && (activeTab === 'offered' || (activeTab === 'yours' && yoursSubTab === 'your-offered')) && (
                        <div className="pt-1 border-t border-dark-border">
                          <p className="text-[10px] text-gray-400">Offered by</p>
                          <p className="text-xs font-mono text-gray-300 truncate">
                            {offer.offeror?.id.slice(0, 6)}...{offer.offeror?.id.slice(-4)}
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
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
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
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
          }}
        />
      )}

      {/* Add Currency Modal */}
      {selectedListing && (
        <AddCurrencyModal
          listingId={selectedListing.id}
          isOpen={showAddCurrency}
          onClose={() => {
            setShowAddCurrency(false);
            setSelectedListing(null);
          }}
          onSuccess={() => {
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
          }}
        />
      )}

      {/* Approve Buyer Modal */}
      {selectedListing && (
        <ApproveBuyerModal
          isOpen={showApproveBuyer}
          onClose={() => {
            setShowApproveBuyer(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onApprove={handleApproveBuyerSubmit}
        />
      )}

      {/* NFT Detail Modal */}
      {nfts.length > 0 && nfts[selectedNFTIndex] && (() => {
        const selectedNFT = nfts[selectedNFTIndex];
        const displayOwner = (selectedNFT as any)._displayOwner;

        // For cards with _displayOwner (ERC1155 split by owner), check against that specific owner
        // Otherwise, check via NFT.owners OR any listing.owner
        const isActualOwner = displayOwner
          ? address && displayOwner.toLowerCase() === address.toLowerCase()
          : address && (
              selectedNFT.owners?.some((o) => o.ownerAddress.toLowerCase() === address.toLowerCase()) ||
              selectedNFT.listings?.some((listing) => listing.owner.id.toLowerCase() === address.toLowerCase())
            );

        // Filter and sort offers by price (highest first)
        // For cards with displayOwner (ERC1155 split by owner), only show offers for that specific owner
        let activeOffers = selectedNFT.offers?.filter(o => o.status === 'ACTIVE') || [];

        // If this card represents a specific owner (ERC1155 with multiple listings)
        // We need to determine which offers belong to this owner
        if (displayOwner && selectedNFT.collection.collectionType === 'ERC1155' && selectedNFT.listings) {
          const activeListings = selectedNFT.listings.filter(l => l.owner);

          if (activeListings.length > 1) {
            // Multiple listings - need to distribute offers
            // Find the index of this owner's listing
            const ownerListingIndex = activeListings.findIndex(
              l => l.owner.id.toLowerCase() === displayOwner.toLowerCase()
            );

            if (ownerListingIndex !== -1) {
              // Filter offers: assign offers round-robin style
              // Offer 0 → Owner 0, Offer 1 → Owner 1, Offer 2 → Owner 0, etc.
              activeOffers = activeOffers.filter((_, offerIndex) =>
                offerIndex % activeListings.length === ownerListingIndex
              );
            }
          }
        }

        activeOffers = activeOffers.sort((a, b) => {
          const priceA = BigInt(a.totalPrice);
          const priceB = BigInt(b.totalPrice);
          return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
        });

        return (
          <NFTDetailModal
            isOpen={showNFTDetail}
            onClose={handleCloseNFTDetail}
            nft={selectedNFT}
            allNFTs={nfts}
            currentIndex={selectedNFTIndex}
            onNavigate={handleNavigateNFT}
            isOwner={isActualOwner || false}
            displayOwner={displayOwner}
            activeListings={selectedNFT.listings?.filter(l => l.status === 'CREATED') || []}
            activeAuctions={selectedNFT.auctions?.filter(a => a.status === 'CREATED' || a.status === 'ACTIVE') || []}
            activeOffers={activeOffers}
            initialTab={nftDetailInitialTab}
            onBuy={handleBuyClick}
            onCreateListing={activeTab === 'yours' ? () => setShowCreateListing(true) : undefined}
            onCreateAuction={activeTab === 'yours' ? () => setShowCreateAuction(true) : undefined}
            onMakeOffer={() => setShowMakeOffer(true)}
            onCancelListing={(listing) => {
              handleCancelListing(listing);
              setShowNFTDetail(false);
            }}
            onUpdateListing={(listing) => {
              setSelectedListing(listing);
              setShowUpdateModal(true);
              // Keep detail modal open in background
            }}
            onAddCurrency={(listing) => {
              setSelectedListing(listing);
              setShowAddCurrency(true);
              // Keep detail modal open in background
            }}
            onApproveBuyer={(listing) => {
              setSelectedListing(listing);
              setShowApproveBuyer(true);
              // Keep detail modal open in background
            }}
            onPlaceBid={(auction) => {
              setSelectedAuction(auction);
              setShowBidModal(true);
            }}
            onViewAuctionDetails={(auction) => {
              setSelectedAuction(auction);
              setShowAuctionDetail(true);
            }}
            onAcceptOffer={handleAcceptOffer}
            onCancelOffer={handleCancelOffer}
            processingOfferId={processingOfferId}
            onRefresh={() => {
              loadNFTs(
                activeTab,
                activeTab === 'yours' ? yoursSubTab : undefined,
                activeTab === 'auctioned' ? auctionedSubTab : undefined
              );
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
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
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
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
          }}
        />
      )}

      {/* Make Offer Modal */}
      {nfts[selectedNFTIndex] && (
        <MakeOfferModal
          isOpen={showMakeOffer}
          onClose={() => setShowMakeOffer(false)}
          nft={nfts[selectedNFTIndex]}
          onSuccess={() => {
            setShowMakeOffer(false);
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
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

      {/* Edit Collection Banner Modal */}
      {collection && (
        <EditCollectionBanner
          isOpen={showEditBanner}
          onClose={() => setShowEditBanner(false)}
          collectionAddress={collection.id}
          currentBannerUrl={bannerUrl || undefined}
          onSuccess={() => {
            loadBanner();
            setShowEditBanner(false);
          }}
        />
      )}

      {/* Bid Modal */}
      {selectedAuction && (
        <BidModal
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onSuccess={() => {
            setShowBidModal(false);
            setSelectedAuction(null);
            loadNFTs(
              activeTab,
              activeTab === 'yours' ? yoursSubTab : undefined,
              activeTab === 'auctioned' ? auctionedSubTab : undefined
            );
          }}
        />
      )}

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          isOpen={showAuctionDetail}
          onClose={() => {
            setShowAuctionDetail(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onRefresh={handleAuctionRefresh}
        />
      )}
    </MainLayout>
  );
}

/**
 * Auction Owner Hover Buttons Component
 * Shows cancel button or disabled message based on auction state
 */
function AuctionOwnerHoverButtons({
  auction,
  onCancel,
  onViewDetails,
}: {
  auction: Auction;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  // Check if auction has bids
  const hasBids = auction.bids && auction.bids.length > 0;

  if (hasBids) {
    // Cannot cancel if there are bids
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-2">Cannot cancel auction with active bids</p>
        <button
          onClick={(e) => {
            e.preventDefault();
            onViewDetails();
          }}
          className="w-full px-3 py-2 bg-dark-card hover:bg-dark-border text-white text-xs font-semibold rounded-lg transition-colors border border-dark-border"
        >
          View Details
        </button>
      </div>
    );
  }

  // Can cancel - no bids yet
  return (
    <div className="flex gap-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          onCancel();
        }}
        className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          onViewDetails();
        }}
        className="px-3 py-2 bg-dark-card hover:bg-dark-border text-white text-xs font-semibold rounded-lg transition-colors border border-dark-border"
      >
        Details
      </button>
    </div>
  );
}
