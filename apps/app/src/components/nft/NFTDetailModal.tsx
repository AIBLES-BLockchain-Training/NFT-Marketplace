'use client';

import { useState, useEffect } from 'react';
import { NFT, Listing } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NFTImage } from '../common/NFTImage';
import { formatEth } from '../../lib/web3/utils';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { truncateTokenId } from '../../lib/utils/format';
import { useWallet } from '../../hooks/useWallet';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  allNFTs?: NFT[]; // All NFTs in collection for navigation
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  isOwner?: boolean;
  activeListings?: Listing[];
  onBuy?: (listing: Listing) => void;
  onCreateListing?: () => void;
  onCreateAuction?: () => void;
  onCancelListing?: (listing: Listing) => void;
  onUpdateListing?: (listing: Listing) => void;
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
  onBuy,
  onCreateListing,
  onCreateAuction,
  onCancelListing,
  onUpdateListing,
}: NFTDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'activity'>('details');
  const [listingQuantities, setListingQuantities] = useState<{[listingId: string]: number}>({});
  const { address } = useWallet();

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
                  onClick={() => currentIndex! > 0 && onNavigate!(currentIndex! - 1)}
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
                        onClick={() => onNavigate!(actualIndex)}
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
                  onClick={() => currentIndex! < allNFTs!.length - 1 && onNavigate!(currentIndex! + 1)}
                  disabled={currentIndex === allNFTs!.length - 1}
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

                {/* Owner Actions - No Listing */}
                {isOwner && activeListings.length === 0 && (
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
                                  <div className="pt-2 border-t border-dark-border">
                                    <div className="flex gap-2">
                                      {!isExpired && onCancelListing && (
                                        <Button
                                          variant="secondary"
                                          onClick={() => onCancelListing(listing)}
                                          className="flex-1"
                                        >
                                          Cancel Listing
                                        </Button>
                                      )}
                                      {!isExpired && onUpdateListing && (
                                        <Button
                                          variant="primary"
                                          onClick={() => onUpdateListing(listing)}
                                          className="flex-1"
                                        >
                                          Update Listing
                                        </Button>
                                      )}
                                      {isExpired && (
                                        <div className="text-center py-2">
                                          <span className="text-sm text-red-400 font-semibold">Listing Expired</span>
                                        </div>
                                      )}
                                    </div>
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
                                      <Button
                                        variant="secondary"
                                        className="flex-1"
                                      >
                                        Make Offer
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-center py-2 border-t border-dark-border">
                                      <span className="text-sm text-red-400 font-semibold">Listing Expired</span>
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
                        <div className="flex justify-between">
                          <span className="text-gray-400">Token ID</span>
                          <span className="font-mono text-white">{truncateTokenId(nft.tokenId)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Contract</span>
                          <span className="font-mono text-sm text-primary-400">
                            {nft.collection.id.slice(0, 6)}...{nft.collection.id.slice(-4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Token Standard</span>
                          <span className="text-white">{nft.collection.collectionType}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="text-center py-12 text-gray-400">
                    No active orders
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="text-center py-12 text-gray-400">
                    No activity yet
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
