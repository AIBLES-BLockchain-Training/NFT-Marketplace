'use client';

import { useState, useEffect } from 'react';
import { NFT, Listing, Auction, PurchaseHistory } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NFTImage } from '../common/NFTImage';
import { formatEth } from '../../lib/web3/utils';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { truncateTokenId } from '../../lib/utils/format';
import { useWallet } from '../../hooks/useWallet';
import { useCancelAuction } from '../../hooks/useCancelAuction';
import {
  isAuctionActive,
  getAuctionStatusText,
  getAuctionStatusVariant,
  hasAuctionEnded,
  canCollectNFT
} from '../../lib/auction/status';
import { CompactCountdownTimer } from '../auction/CountdownTimer';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_PURCHASE_HISTORY_QUERY } from '../../lib/graphql/queries';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  allNFTs?: NFT[]; // All NFTs in collection for navigation
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  isOwner?: boolean;
  activeListings?: Listing[];
  activeAuctions?: Auction[];
  activeOffers?: any[]; // Add offers support
  initialTab?: 'details' | 'orders' | 'activity' | 'approved';
  onBuy?: (listing: Listing) => void;
  onCreateListing?: () => void;
  onCreateAuction?: () => void;
  onMakeOffer?: () => void;
  onCancelListing?: (listing: Listing) => void;
  onUpdateListing?: (listing: Listing) => void;
  onAddCurrency?: (listing: Listing) => void;
  onApproveBuyer?: (listing: Listing) => void;
  onPlaceBid?: (auction: Auction) => void;
  onViewAuctionDetails?: (auction: Auction) => void;
  onAcceptOffer?: (offer: any) => void;
  onCancelOffer?: (offer: any) => void;
  onRefresh?: () => void;
  processingOfferId?: string | null;
}

export function NFTDetailModal({
  isOpen,
  onClose,
  nft,
  allNFTs,
  currentIndex,
  onNavigate,
  isOwner,
  activeListings = [],
  activeAuctions = [],
  activeOffers = [],
  initialTab = 'details',
  onBuy,
  onCreateListing,
  onCreateAuction,
  onMakeOffer,
  onCancelListing,
  onUpdateListing,
  onAddCurrency,
  onApproveBuyer,
  onPlaceBid,
  onViewAuctionDetails,
  onAcceptOffer,
  onCancelOffer,
  onRefresh,
  processingOfferId,
}: NFTDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'activity' | 'approved'>(initialTab);
  const hasReservedListing = activeListings.some(l => l.isReserved);
  const [listingQuantities, setListingQuantities] = useState<{[listingId: string]: number}>({});
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { address } = useWallet();

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch purchase history for this NFT
  useEffect(() => {
    const loadPurchaseHistory = async () => {
      if (!isOpen || !nft?.id) return;

      setIsLoadingHistory(true);
      try {
        const result = await graphqlClient.query(GET_PURCHASE_HISTORY_QUERY, {
          limit: 50,
          offset: 0,
          where: {
            nft: {
              id_eq: nft.id
            }
          }
        });

        if (result.purchaseHistories) {
          setPurchaseHistory(result.purchaseHistories);
        }
      } catch (error) {
        console.error('Failed to load purchase history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadPurchaseHistory();
  }, [isOpen, nft?.id]);

  // Initialize quantities for each listing
  useEffect(() => {
    const initialQuantities: {[listingId: string]: number} = {};
    activeListings.forEach(listing => {
      initialQuantities[listing.id] = 1;
    });
    setListingQuantities(initialQuantities);
  }, [activeListings]);

  const isERC721 = nft?.collection?.collectionType === 'ERC721';

  const handleQuantityChange = (listingId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setListingQuantities(prev => ({
        ...prev,
        [listingId]: numValue
      }));
    }
  };

  const handleIncrement = (listingId: string, maxQty: number) => {
    setListingQuantities(prev => ({
      ...prev,
      [listingId]: Math.min((prev[listingId] || 1) + 1, maxQty)
    }));
  };

  const handleDecrement = (listingId: string) => {
    setListingQuantities(prev => ({
      ...prev,
      [listingId]: Math.max((prev[listingId] || 1) - 1, 1)
    }));
  };

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !allNFTs || currentIndex === undefined || !onNavigate) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < allNFTs.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, allNFTs, onClose, onNavigate]);

  // Early return if no nft data - AFTER all hooks
  if (!nft || !nft.collection) {
    return null;
  }

  const getTimeRemaining = (endTimestamp: string) => {
    const end = new Date(endTimestamp).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isListingExpired = (endTimestamp: string) => {
    const end = new Date(endTimestamp).getTime();
    const now = Date.now();
    return now >= end;
  };

  if (!isOpen) return null;

  // Navigation only available when allNFTs and currentIndex are provided
  const showNavigation = allNFTs && allNFTs.length > 0 && currentIndex !== undefined && onNavigate;

  // Visible thumbnails range (show 7 at a time)
  const thumbnailsToShow = 7;
  const startIndex = showNavigation ? Math.max(0, Math.min(currentIndex - Math.floor(thumbnailsToShow / 2), allNFTs.length - thumbnailsToShow)) : 0;
  const visibleNFTs = showNavigation ? allNFTs.slice(startIndex, startIndex + thumbnailsToShow) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container - cách lề 2cm (~50px) */}
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="relative bg-dark-bg border border-dark-border rounded-2xl w-full h-full max-w-[1400px] max-h-[900px] overflow-hidden flex flex-col">

          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-card/50">
            {showNavigation ? (
              <div className="flex items-center gap-3 flex-1">
                {/* Previous Button */}
                <button
                  onClick={() => currentIndex !== undefined && currentIndex > 0 && onNavigate && onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-lg hover:bg-dark-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {visibleNFTs.map((item, idx) => {
                    const actualIndex = startIndex + idx;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate && onNavigate(actualIndex)}
                        className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                          actualIndex === currentIndex
                            ? 'border-primary-500 scale-110'
                            : 'border-transparent hover:border-dark-border'
                        }`}
                      >
                        <NFTImage
                          src={item.imageUrl}
                          alt={item.name}
                          width={48}
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => currentIndex !== undefined && allNFTs && currentIndex < allNFTs.length - 1 && onNavigate && onNavigate(currentIndex + 1)}
                  disabled={allNFTs && currentIndex === allNFTs.length - 1}
                  className="p-2 rounded-lg hover:bg-dark-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-bg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Content - 2 columns */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Image (Fixed) */}
            <div className="w-[45%] bg-dark-bg p-8 flex items-center justify-center">
              <div className="relative w-full aspect-square max-w-[500px] rounded-xl overflow-hidden border border-dark-border">
                <NFTImage
                  src={nft.imageUrl}
                  alt={nft.name}
                  width={500}
                  className="object-cover"
                />
              </div>
            </div>

            {/* Right: Info (Scrollable) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
              <div className="p-8 space-y-6">
                {/* Header */}
                <div>
                  <h1 className="text-4xl font-bold text-white mb-3">{nft.name}</h1>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-primary-400 text-sm font-semibold">{nft.collection.name}</span>
                    {nft.owners && nft.owners.length > 0 && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400 text-sm">
                          Owned by {nft.owners[0].ownerAddress.slice(0, 6)}...{nft.owners[0].ownerAddress.slice(-4)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="primary">{nft.collection.collectionType}</Badge>
                    {hasReservedListing && (
                      <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-orange-500/50">
                        <p className="text-xs font-bold text-orange-400">RESERVED</p>
                      </div>
                    )}
                    <span className="text-gray-400 text-sm">TOKEN #{truncateTokenId(nft.tokenId)}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                {activeListings.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 p-4 bg-dark-card rounded-xl border border-dark-border">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">TOP OFFER</p>
                      <p className="text-sm font-bold text-white">—</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">COLLECTION FLOOR</p>
                      <p className="text-sm font-bold text-white">
                        {nft.collection.floorPrice ? formatEth(nft.collection.floorPrice) : '—'} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">RARITY</p>
                      <p className="text-sm font-bold text-white">—</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">LAST SALE</p>
                      <p className="text-sm font-bold text-white">—</p>
                    </div>
                  </div>
                )}

                {/* Owner Actions - No Listing/Auction */}
                {isOwner && activeListings.length === 0 && activeAuctions.length === 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">List for Sale</h3>
                    <div className="space-y-3">
                      {onCreateListing && (
                        <Button variant="primary" onClick={onCreateListing} className="w-full">
                          Create Fixed Price Listing
                        </Button>
                      )}
                      {onCreateAuction && (
                        <Button variant="secondary" onClick={onCreateAuction} className="w-full">
                          Create Auction
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      Note: Your NFT is always open to receive offers from buyers
                    </p>
                  </Card>
                )}

                {/* Listings Section */}
                {activeListings.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">
                      Available Listings ({activeListings.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activeListings
                        .sort((a, b) => parseFloat(a.pricePerToken) - parseFloat(b.pricePerToken))
                        .map((listing) => {
                          const price = listing.currencyApprovals && listing.currencyApprovals.length > 0
                            ? listing.currencyApprovals[0].pricePerToken
                            : listing.pricePerToken;

                          const currencySymbol = (() => {
                            if (listing.currencyApprovals && listing.currencyApprovals.length > 0) {
                              const currency = listing.currencyApprovals[0].currency;
                              const currencyId = currency.id.toLowerCase();
                              const isNativeToken = currencyId === ZERO_ADDRESS.toLowerCase() ||
                                                    currencyId === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                              return (isNativeToken || currency.symbol === 'UNKNOWN') ? 'ETH' : currency.symbol;
                            }
                            return 'ETH';
                          })();

                          const isExpired = isListingExpired(listing.endTimestamp);
                          const isMyListing = address && listing.owner.id.toLowerCase() === address.toLowerCase();

                          const currentQty = listingQuantities[listing.id] || 1;
                          const maxQty = parseFloat(listing.quantity);

                          return (
                            <div
                              key={listing.id}
                              className="p-4 bg-dark-bg border border-dark-border rounded-lg space-y-3"
                            >
                              {isMyListing ? (
                                // Owner's listing layout
                                <>
                                  {/* Info Grid */}
                                  <div className={`grid ${isERC721 ? 'grid-cols-3' : 'grid-cols-4'} gap-4`}>
                                    {/* Seller */}
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Seller</p>
                                      <p className="text-sm text-white font-mono truncate">You</p>
                                    </div>

                                    {/* Price */}
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Price</p>
                                      <p className="text-base text-white font-bold">
                                        {formatEth(price)} <span className="text-sm text-gray-400">{currencySymbol}</span>
                                      </p>
                                    </div>

                                    {/* Quantity */}
                                    {!isERC721 && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                        <p className="text-sm text-white">{listing.quantity}</p>
                                      </div>
                                    )}

                                    {/* Expiry */}
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Expires</p>
                                      <p className={`text-sm font-semibold ${isExpired ? 'text-red-400' : 'text-primary-400'}`}>
                                        {getTimeRemaining(listing.endTimestamp)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="pt-2 border-t border-dark-border space-y-2">
                                    {/* Row 1: Cancel & Update */}
                                    <div className="flex gap-2">
                                      {!isExpired && onCancelListing && (
                                        <Button
                                          variant="secondary"
                                          onClick={() => onCancelListing(listing)}
                                          className="flex-1 text-xs"
                                        >
                                          Cancel
                                        </Button>
                                      )}
                                      {!isExpired && onUpdateListing && (
                                        <Button
                                          variant="primary"
                                          onClick={() => onUpdateListing(listing)}
                                          className="flex-1 text-xs"
                                        >
                                          Update
                                        </Button>
                                      )}
                                      {isExpired && (
                                        <div className="text-center py-2 w-full">
                                          <span className="text-sm text-red-400 font-semibold">Listing Expired</span>
                                        </div>
                                      )}
                                    </div>
                                    {/* Row 2: Approve Currency & Approve Buyer */}
                                    {!isExpired && (
                                      <div className="flex gap-2">
                                        {onAddCurrency && (
                                          <Button
                                            variant="primary"
                                            onClick={() => onAddCurrency(listing)}
                                            className="flex-1 text-xs"
                                          >
                                            Approve Currency
                                          </Button>
                                        )}
                                        {listing.isReserved && onApproveBuyer && (
                                          <Button
                                            variant="secondary"
                                            onClick={() => onApproveBuyer(listing)}
                                            className="flex-1 text-xs"
                                          >
                                            Approve Buyer
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                // Buyer's listing layout
                                <>
                                  {/* Seller - Row 1 */}
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Seller</p>
                                    <p className="text-sm text-white font-mono truncate">
                                      {listing.owner.id.slice(0, 6)}...{listing.owner.id.slice(-4)}
                                    </p>
                                  </div>

                                  {/* Price & Expires - Row 2 */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-gray-500">Price:</p>
                                      <p className="text-base text-white font-bold">
                                        {formatEth(price)} <span className="text-sm text-gray-400">{currencySymbol}</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-gray-500">Expires:</p>
                                      <p className={`text-sm font-semibold ${isExpired ? 'text-red-400' : 'text-primary-400'}`}>
                                        {getTimeRemaining(listing.endTimestamp)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quantity Controls & Buy/Offer Buttons - Row 3 */}
                                  {!isExpired ? (
                                    <div className="flex items-center gap-3 pt-2 border-t border-dark-border">
                                      {/* Quantity Controls */}
                                      {!isERC721 && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleDecrement(listing.id)}
                                            disabled={currentQty <= 1}
                                            className="w-8 h-8 flex items-center justify-center bg-dark-card border border-dark-border rounded hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            <span className="text-white text-lg font-bold">−</span>
                                          </button>
                                          <input
                                            type="number"
                                            value={currentQty}
                                            onChange={(e) => handleQuantityChange(listing.id, e.target.value)}
                                            min={1}
                                            max={maxQty}
                                            className="w-16 px-2 py-1 text-center bg-dark-card border border-dark-border rounded text-white focus:border-primary-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <button
                                            onClick={() => handleIncrement(listing.id, maxQty)}
                                            disabled={currentQty >= maxQty}
                                            className="w-8 h-8 flex items-center justify-center bg-dark-card border border-dark-border rounded hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            <span className="text-white text-lg font-bold">+</span>
                                          </button>
                                        </div>
                                      )}
                                      {/* Buy Button */}
                                      <Button
                                        variant="primary"
                                        onClick={() => onBuy && onBuy(listing)}
                                        className="flex-1"
                                      >
                                        Buy Now
                                      </Button>
                                      {/* Make Offer Button */}
                                      {onMakeOffer && (
                                        <Button
                                          variant="secondary"
                                          onClick={onMakeOffer}
                                          className="flex-1"
                                        >
                                          Make Offer
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="border-t border-dark-border pt-3">
                                      <div className="text-center mb-3">
                                        <span className="text-sm text-red-400 font-semibold">Listing Expired</span>
                                      </div>
                                      {/* Only show Make Offer button if user is NOT the listing owner */}
                                      {!isMyListing && onMakeOffer && (
                                        <Button
                                          variant="primary"
                                          onClick={onMakeOffer}
                                          className="w-full"
                                        >
                                          Make Offer
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </Card>
                )}

                {/* Auctions Section */}
                {activeAuctions.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">
                      Active Auctions ({activeAuctions.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activeAuctions
                        .filter(auction => isAuctionActive(auction) || !hasAuctionEnded(auction.endTime))
                        .map((auction) => {
                          const isMyAuction = address && auction.sellerAddress.toLowerCase() === address.toLowerCase();
                          const currentBid = auction.bids && auction.bids.length > 0
                            ? BigInt(auction.bids[0].bidAmount)
                            : BigInt(auction.startPrice);
                          const statusText = getAuctionStatusText(auction);
                          const statusVariant = getAuctionStatusVariant(auction);
                          const auctionActive = isAuctionActive(auction);

                          return (
                            <div
                              key={auction.id}
                              className="p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-primary-500 transition-colors"
                            >
                              {/* Auction Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-white">Auction #{auction.auctionId}</h4>
                                  <Badge variant={statusVariant} size="sm">{statusText}</Badge>
                                </div>
                                {onViewAuctionDetails && (
                                  <button
                                    onClick={() => onViewAuctionDetails(auction)}
                                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                                  >
                                    View Full Details →
                                  </button>
                                )}
                              </div>

                              {/* Current Bid Info */}
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                                  <div className="flex items-baseline gap-2">
                                    <p className="text-lg font-bold text-primary-400">
                                      {formatEth(currentBid)}
                                    </p>
                                    <p className="text-xs text-gray-400">{auction.currency.symbol}</p>
                                  </div>
                                  {auction.bids && auction.bids.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {auction.bids.length} bid{auction.bids.length !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-xs text-gray-400 mb-1">
                                    {auctionActive ? 'Ends In' : 'Ended'}
                                  </p>
                                  {auctionActive ? (
                                    <CompactCountdownTimer endTime={auction.endTime} />
                                  ) : (
                                    <p className="text-sm font-semibold text-gray-500">Auction Ended</p>
                                  )}
                                </div>
                              </div>

                              {/* Auction Details */}
                              <div className="grid grid-cols-3 gap-2 p-3 bg-dark-card rounded-lg mb-3">
                                <div>
                                  <p className="text-xs text-gray-400">Start Price</p>
                                  <p className="text-xs font-semibold text-white">
                                    {formatEth(BigInt(auction.startPrice))}
                                  </p>
                                </div>
                                {auction.ceilingPrice && (
                                  <div>
                                    <p className="text-xs text-gray-400">Buyout</p>
                                    <p className="text-xs font-semibold text-primary-400">
                                      {formatEth(BigInt(auction.ceilingPrice))}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-400">Min Step</p>
                                  <p className="text-xs font-semibold text-white">
                                    +{(Number(auction.bidBufferBps) / 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {auctionActive && (
                                <>
                                  {isMyAuction ? (
                                    <AuctionOwnerActions auction={auction} onRefresh={onRefresh} />
                                  ) : (
                                    <div className="flex gap-2">
                                      {onPlaceBid && (
                                        <Button
                                          onClick={() => onPlaceBid(auction)}
                                          variant="primary"
                                          className="flex-1"
                                          size="sm"
                                        >
                                          Place Bid
                                        </Button>
                                      )}
                                      {onViewAuctionDetails && (
                                        <Button
                                          onClick={() => onViewAuctionDetails(auction)}
                                          variant="secondary"
                                          size="sm"
                                        >
                                          Details
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}

                              {!auctionActive && (
                                <>
                                  {(() => {
                                    // Check if current user can collect NFT (is winner)
                                    const nftCheck = address ? canCollectNFT(auction, address) : { canCollect: false };
                                    const isWinner = nftCheck.canCollect;

                                    return (
                                      <div className="flex gap-2">
                                        {onViewAuctionDetails && (
                                          <Button
                                            onClick={() => onViewAuctionDetails(auction)}
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1"
                                          >
                                            View Details
                                          </Button>
                                        )}
                                        {/* Show Make Offer for everyone except winner and auction owner */}
                                        {!isWinner && !isMyAuction && onMakeOffer && (
                                          <Button
                                            onClick={onMakeOffer}
                                            variant="primary"
                                            size="sm"
                                            className="flex-1"
                                          >
                                            Make Offer
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </Card>
                )}

                {/* Tabs */}
                <div className="border-b border-dark-border">
                  <div className="flex gap-6">
                    {(['details', 'orders', 'activity'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-semibold capitalize transition-colors relative ${
                          activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
                        )}
                      </button>
                    ))}
                    {/* Approved Buyers Tab - Only show if has reserved listing */}
                    {hasReservedListing && (
                      <button
                        onClick={() => setActiveTab('approved')}
                        className={`pb-3 text-sm font-semibold capitalize transition-colors relative ${
                          activeTab === 'approved' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Approved Buyers
                        {activeTab === 'approved' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Description */}
                    {nft.description && (
                      <div>
                        <p className="text-gray-300">{nft.description}</p>
                      </div>
                    )}

                    {/* Traits */}
                    {nft.traits && nft.traits.length > 0 && (
                      <Card>
                        <h3 className="text-sm font-semibold text-gray-400 mb-4">Traits</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {nft.traits.map((trait) => (
                            <div
                              key={trait.id}
                              className="bg-dark-bg rounded-lg p-3 border border-dark-border"
                            >
                              <p className="text-xs text-gray-400 mb-1">{trait.traitType}</p>
                              <p className="font-medium text-white">{trait.value}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Contract Details */}
                    <Card>
                      <h3 className="text-sm font-semibold text-gray-400 mb-4">Details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Token ID</span>
                          <a
                            href={`https://sepolia.etherscan.io/nft/${nft.collection.id}/${nft.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-white hover:text-primary-400 transition-colors flex items-center gap-1 group"
                          >
                            {truncateTokenId(nft.tokenId)}
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Contract</span>
                          <a
                            href={`https://sepolia.etherscan.io/address/${nft.collection.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 group"
                          >
                            {nft.collection.id.slice(0, 6)}...{nft.collection.id.slice(-4)}
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Token Standard</span>
                          <span className="text-white flex items-center gap-1">
                            {nft.collection.collectionType}
                            <svg className="w-3 h-3 opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-4">
                    {activeOffers && activeOffers.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-white mb-3">Active Offers ({activeOffers.length})</h4>
                        {activeOffers.map((offer: any) => {
                          const isOfferMaker = address && offer.offeror?.id.toLowerCase() === address.toLowerCase();
                          // Check if current user is the token owner
                          // 1. From offer.tokenOwner (most accurate for specific offers)
                          // 2. Fallback to isOwner prop (from nft.owners)
                          const isTokenOwner = address ? (
                            (offer.tokenOwner?.id && offer.tokenOwner.id.toLowerCase() === address.toLowerCase()) ||
                            isOwner
                          ) : false;

                          return (
                            <div key={offer.id} className="bg-dark-card rounded-lg p-4 border border-dark-border">
                              <div className="space-y-3">
                                {/* Offer Header with Price */}
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-white">
                                    Offer #{offer.offerId}
                                  </p>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary-400">
                                      {(() => {
                                        const price = Number(offer.totalPrice) / 1e18;
                                        if (price === 0) return '0';
                                        const multiplier = Math.pow(10, 4);
                                        const rounded = Math.round(price * multiplier) / multiplier;
                                        let result = rounded.toFixed(4);
                                        result = result.replace(/\.?0+$/, '');
                                        return result;
                                      })()} {offer.currency?.symbol || 'TOKEN'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Qty: {offer.quantity}
                                    </p>
                                  </div>
                                </div>

                                {/* Offered by section */}
                                <div className="pt-2 border-t border-dark-border">
                                  <p className="text-xs text-gray-400 mb-2">Offered by</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-white truncate">
                                        {offer.offeror?.name || 'Unknown'}
                                      </p>
                                      <p className="text-xs font-mono text-gray-400 truncate">
                                        {offer.offeror?.id.slice(0, 6)}...{offer.offeror?.id.slice(-4)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-gray-400">Price per Token</p>
                                    <p className="text-white font-semibold">
                                      {(() => {
                                        const pricePerToken = Number(offer.totalPrice) / Number(offer.quantity) / 1e18;
                                        if (pricePerToken === 0) return '0';
                                        const multiplier = Math.pow(10, 4);
                                        const rounded = Math.round(pricePerToken * multiplier) / multiplier;
                                        let result = rounded.toFixed(4);
                                        result = result.replace(/\.?0+$/, '');
                                        return result;
                                      })()} {offer.currency?.symbol || 'TOKEN'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Expires</p>
                                    <p className="text-white font-semibold">
                                      {(() => {
                                        try {
                                          // expirationTimestamp might be ISO string or Unix timestamp in seconds
                                          const timestamp = offer.expirationTimestamp || offer.expirationTime;
                                          const date = new Date(timestamp);

                                          // If invalid, try parsing as Unix timestamp (seconds)
                                          if (isNaN(date.getTime())) {
                                            const unixTimestamp = Number(timestamp);
                                            return new Date(unixTimestamp * 1000).toLocaleDateString();
                                          }

                                          return date.toLocaleDateString();
                                        } catch {
                                          return 'N/A';
                                        }
                                      })()}
                                    </p>
                                  </div>
                                </div>

                                {(isTokenOwner || isOfferMaker) && (
                                  <div className="flex gap-2 pt-3 border-t border-dark-border">
                                    {isTokenOwner && onAcceptOffer && (
                                      <button
                                        onClick={() => onAcceptOffer(offer)}
                                        disabled={processingOfferId === offer.id}
                                        className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {processingOfferId === offer.id ? 'Processing...' : 'Accept Offer'}
                                      </button>
                                    )}
                                    {isOfferMaker && onCancelOffer && (
                                      <button
                                        onClick={() => onCancelOffer(offer)}
                                        className="flex-1 px-4 py-2 bg-dark-bg hover:bg-gray-700 text-white rounded-lg text-sm font-semibold border border-dark-border transition-colors"
                                      >
                                        Cancel Offer
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        No active offers
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {isLoadingHistory ? (
                      <div className="text-center py-12 text-gray-400">
                        Loading activity...
                      </div>
                    ) : purchaseHistory.length > 0 ? (
                      <>
                        <h4 className="text-sm font-semibold text-white mb-3">
                          Transaction History ({purchaseHistory.length})
                        </h4>
                        {purchaseHistory.map((history) => {
                          const isBuyer = address && history.buyer.id.toLowerCase() === address.toLowerCase();
                          const isSeller = address && history.seller.id.toLowerCase() === address.toLowerCase();

                          return (
                            <div
                              key={history.id}
                              className="bg-dark-card rounded-lg p-4 border border-dark-border hover:border-primary-500/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={
                                      history.tradeType === 'LISTING' ? 'primary' :
                                      history.tradeType === 'OFFER' ? 'secondary' :
                                      history.tradeType === 'AUCTION' ? 'success' : 'primary'
                                    }>
                                      {history.tradeType}
                                    </Badge>
                                    {isBuyer && (
                                      <span className="text-xs text-green-400 font-semibold">You bought</span>
                                    )}
                                    {isSeller && (
                                      <span className="text-xs text-blue-400 font-semibold">You sold</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {new Date(history.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary-400">
                                    {formatEth(history.totalPrice)}
                                  </p>
                                  <p className="text-xs text-gray-400">{history.currency.symbol}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 p-3 bg-dark-bg rounded-lg">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">From</p>
                                  <p className="text-xs font-mono text-white truncate">
                                    {history.seller.id.slice(0, 6)}...{history.seller.id.slice(-4)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">To</p>
                                  <p className="text-xs font-mono text-white truncate">
                                    {history.buyer.id.slice(0, 6)}...{history.buyer.id.slice(-4)}
                                  </p>
                                </div>
                                {history.quantity !== '1' && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">Quantity</p>
                                    <p className="text-xs font-semibold text-white">
                                      {history.quantity}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Transaction</p>
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${history.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-400 hover:text-primary-300 font-mono truncate block"
                                  >
                                    {history.transactionHash.slice(0, 6)}...{history.transactionHash.slice(-4)}
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        No transaction history yet
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'approved' && (
                  <div className="space-y-4">
                    {activeListings
                      .filter(listing => listing.isReserved)
                      .map(listing => {
                        const approvedBuyers = listing.buyerApprovals?.filter(b => b.isApproved) || [];
                        const isCurrentUserApproved = address
                          ? approvedBuyers.some(b => b.buyerAddress.toLowerCase() === address.toLowerCase())
                          : false;

                        return (
                          <Card key={listing.id}>
                            <h3 className="text-sm font-semibold text-white mb-4">
                              Listing #{listing.id}
                            </h3>

                            {isCurrentUserApproved && (
                              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <p className="text-sm font-semibold text-green-400">
                                  You are approved to purchase this NFT
                                </p>
                              </div>
                            )}

                            {approvedBuyers.length === 0 ? (
                              <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">No approved buyers yet</p>
                                <p className="text-xs mt-2">Owner hasn&apos;t approved any buyers for this listing</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs text-gray-400 mb-3">
                                  Approved Buyers ({approvedBuyers.length}):
                                </p>
                                <div className="space-y-2">
                                  {approvedBuyers.map((buyer) => (
                                    <div
                                      key={buyer.id}
                                      className={`flex items-center justify-between p-3 rounded-lg border ${
                                        buyer.buyerAddress.toLowerCase() === address?.toLowerCase()
                                          ? 'bg-green-500/10 border-green-500/30'
                                          : 'bg-dark-bg border-dark-border'
                                      }`}
                                    >
                                      <div>
                                        <p className={`text-sm font-mono ${
                                          buyer.buyerAddress.toLowerCase() === address?.toLowerCase()
                                            ? 'text-green-400'
                                            : 'text-white'
                                        }`}>
                                          {buyer.buyerAddress}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Approved {new Date(buyer.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      {buyer.buyerAddress.toLowerCase() === address?.toLowerCase() && (
                                        <div className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                                          You
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}

                    {activeListings.filter(l => l.isReserved).length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        No reserved listings
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Auction Owner Actions Component
 * Shows cancel button for auction owners
 */
function AuctionOwnerActions({ auction, onRefresh }: { auction: Auction; onRefresh?: () => void }) {
  const { cancelAuction, isCancelling, canCancel, cancelReason } = useCancelAuction(auction, onRefresh);

  if (canCancel) {
    return (
      <Button
        onClick={() => cancelAuction(auction)}
        variant="secondary"
        size="sm"
        fullWidth
        isLoading={isCancelling}
      >
        Cancel Auction
      </Button>
    );
  }

  if (cancelReason) {
    return (
      <div className="p-2 bg-dark-card border border-dark-border rounded-lg">
        <p className="text-xs text-gray-400 text-center">
          {cancelReason}
        </p>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      fullWidth
      disabled
    >
      Manage Auction
    </Button>
  );
}
