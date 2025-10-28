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

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  allNFTs: NFT[]; // All NFTs in collection for navigation
  currentIndex: number;
  onNavigate: (index: number) => void;
  isOwner?: boolean;
  activeListing?: Listing | null;
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
  activeListing,
  onBuy,
  onCreateListing,
  onCreateAuction,
  onCancelListing,
  onUpdateListing,
}: NFTDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'activity'>('details');
  const [quantity, setQuantity] = useState(1);

  const isERC721 = nft.collection.collectionType === 'ERC721';
  const maxQuantity = activeListing ? parseFloat(activeListing.quantity) : 1;

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
      if (!isOpen) return;

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
  }, [isOpen, currentIndex, allNFTs.length, onClose, onNavigate]);

  const handleIncrement = () => {
    if (!isERC721 && quantity < maxQuantity) {
      setQuantity(Math.min(quantity + 0.1, maxQuantity));
    }
  };

  const handleDecrement = () => {
    if (!isERC721 && quantity > 0.1) {
      setQuantity(Math.max(quantity - 0.1, 0.1));
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isERC721) return;
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0.01) {
      setQuantity(0.01);
    } else if (value > maxQuantity) {
      setQuantity(maxQuantity);
    } else {
      setQuantity(value);
    }
  };

  const handleBuyNow = () => {
    if (activeListing && onBuy) {
      onBuy(activeListing);
    }
  };

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

  // Visible thumbnails range (show 5 at a time)
  const thumbnailsToShow = 7;
  const startIndex = Math.max(0, Math.min(currentIndex - Math.floor(thumbnailsToShow / 2), allNFTs.length - thumbnailsToShow));
  const visibleNFTs = allNFTs.slice(startIndex, startIndex + thumbnailsToShow);

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
            <div className="flex items-center gap-3 flex-1">
              {/* Previous Button */}
              <button
                onClick={() => currentIndex > 0 && onNavigate(currentIndex - 1)}
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
                      onClick={() => onNavigate(actualIndex)}
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
                onClick={() => currentIndex < allNFTs.length - 1 && onNavigate(currentIndex + 1)}
                disabled={currentIndex === allNFTs.length - 1}
                className="p-2 rounded-lg hover:bg-dark-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

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
                {activeListing && (
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
                {isOwner && !activeListing && (
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

                {/* Owner Actions - Has Listing */}
                {isOwner && activeListing && !isListingExpired(activeListing.endTimestamp) && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">Your Listing</h3>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-white">
                          {activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0
                            ? formatEth(activeListing.currencyApprovals[0].pricePerToken)
                            : formatEth(activeListing.pricePerToken)}
                        </span>
                        <span className="text-lg text-gray-400">
                          {(() => {
                            if (activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0) {
                              const currency = activeListing.currencyApprovals[0].currency;
                              const currencyId = currency.id.toLowerCase();
                              const isNativeToken = currencyId === ZERO_ADDRESS.toLowerCase();
                              return (isNativeToken || currency.symbol === 'UNKNOWN') ? 'ETH' : currency.symbol;
                            }
                            return 'ETH';
                          })()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Ending in {getTimeRemaining(activeListing.endTimestamp)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {onUpdateListing && (
                        <Button
                          variant="secondary"
                          onClick={() => onUpdateListing(activeListing)}
                          className="w-full"
                        >
                          Update Listing
                        </Button>
                      )}
                      {onCancelListing && (
                        <Button
                          variant="secondary"
                          onClick={() => onCancelListing(activeListing)}
                          className="w-full"
                        >
                          Cancel Listing
                        </Button>
                      )}
                    </div>
                  </Card>
                )}

                {/* Buy Section - Only show for non-owners */}
                {!isOwner && activeListing && !isListingExpired(activeListing.endTimestamp) && (
                  <Card>
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-400">Buy For</h3>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Ending in</p>
                          <p className="text-sm font-semibold text-primary-400">
                            {getTimeRemaining(activeListing.endTimestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-white">
                          {activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0
                            ? formatEth(activeListing.currencyApprovals[0].pricePerToken)
                            : formatEth(activeListing.pricePerToken)}
                        </span>
                        <span className="text-lg text-gray-400">
                          {(() => {
                            if (activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0) {
                              const currency = activeListing.currencyApprovals[0].currency;
                              const currencyId = currency.id.toLowerCase();
                              const isNativeToken = currencyId === ZERO_ADDRESS.toLowerCase();
                              return (isNativeToken || currency.symbol === 'UNKNOWN') ? 'ETH' : currency.symbol;
                            }
                            return 'ETH';
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Quantity Input */}
                      <div className="flex flex-col items-center bg-dark-bg border border-dark-border rounded-lg overflow-hidden p-2">
                        <div className="flex items-center w-full">
                          <button
                            onClick={handleDecrement}
                            disabled={isERC721 || quantity <= 0.1}
                            className="px-2 py-1 text-white hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={handleQuantityChange}
                            disabled={isERC721}
                            className="flex-1 bg-transparent text-center text-white outline-none disabled:cursor-not-allowed text-sm"
                            min="0.01"
                            step="0.1"
                            max={maxQuantity}
                          />
                          <button
                            onClick={handleIncrement}
                            disabled={isERC721 || quantity >= maxQuantity}
                            className="px-2 py-1 text-white hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Buy: {Math.floor(quantity)}
                        </p>
                      </div>

                      {/* Buy Now Button */}
                      <Button
                        variant="primary"
                        onClick={handleBuyNow}
                        className="col-span-1"
                      >
                        Buy {Math.floor(quantity) > 1 ? Math.floor(quantity) : ''} now
                      </Button>

                      {/* Make Offer Button */}
                      <Button
                        variant="secondary"
                        className="col-span-1"
                      >
                        Make Offer
                      </Button>
                    </div>

                    {!isERC721 && (
                      <p className="text-xs text-gray-500 mt-3">
                        Available: {maxQuantity} items | Contract will buy: {Math.floor(quantity)} items
                      </p>
                    )}
                  </Card>
                )}

                {/* Expired Listing - Show Make Offer */}
                {!isOwner && activeListing && isListingExpired(activeListing.endTimestamp) && (
                  <Card>
                    <p className="text-sm text-gray-400 mb-4">This listing has expired</p>
                    <Button variant="secondary" className="w-full">
                      Make Offer
                    </Button>
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
