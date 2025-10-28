import { useState } from 'react';
import Image from 'next/image';
import { NFT, Listing } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatEth } from '../../lib/web3/utils';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { getIpfsGateways, truncateTokenId } from '../../lib/utils/format';
import toast from 'react-hot-toast';

interface NFTDetailProps {
  nft: NFT;
  isOwner?: boolean;
  activeListing?: Listing | null;
  onBuy?: (listing: Listing) => void;
  onCreateListing?: () => void;
  onCreateAuction?: () => void;
}

export function NFTDetail({ nft, isOwner, activeListing, onBuy, onCreateListing, onCreateAuction }: NFTDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  console.log('NFTDetail render:', {
    nftId: nft.id,
    name: nft.name,
    hasTraits: !!nft.traits,
    traitsLength: nft.traits?.length || 0,
    traits: nft.traits
  });

  const isERC721 = nft.collection.collectionType === 'ERC721';
  const maxQuantity = activeListing ? parseFloat(activeListing.quantity) : 1;

  // Get all IPFS gateways for fallback with larger size for detail view (800px)
  const imageGateways = getIpfsGateways(nft.imageUrl, 800);
  const imageUrl = imageGateways.length > 0 ? imageGateways[fallbackIndex] : nft.imageUrl;

  const handleImageError = () => {
    if (imageGateways.length > 0 && fallbackIndex < imageGateways.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

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

  const handleMakeOffer = () => {
    toast.info('Make offer feature coming soon');
  };

  const getTimeRemaining = (endTimestamp: string) => {
    const end = new Date(endTimestamp).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (years > 0) return `${years} ${years === 1 ? 'YEAR' : 'YEARS'}`;
    if (months > 0) return `${months} ${months === 1 ? 'MONTH' : 'MONTHS'}`;
    if (days > 0) return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'}`;
    return `${minutes} ${minutes === 1 ? 'MINUTE' : 'MINUTES'}`;
  };

  const isListingExpired = (endTimestamp: string) => {
    const end = new Date(endTimestamp).getTime();
    const now = Date.now();
    return now >= end;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1fr] gap-8">
      <div className="max-w-md">
        <div className="aspect-square relative overflow-hidden rounded-2xl bg-dark-border border border-dark-border">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={nft.name}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
              priority
              unoptimized
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-24 h-24 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-400">{nft.collection.name}</span>
            <Badge variant="primary">{nft.collection.collectionType}</Badge>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{nft.name}</h1>
          {nft.description && (
            <p className="text-gray-400">{nft.description}</p>
          )}
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">List for Sale</h3>
            <div className="space-y-3">
              {onCreateListing && (
                <Button
                  variant="primary"
                  onClick={onCreateListing}
                  className="w-full"
                >
                  Create Fixed Price Listing
                </Button>
              )}
              {onCreateAuction && (
                <Button
                  variant="secondary"
                  onClick={onCreateAuction}
                  className="w-full"
                >
                  Create Auction
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Note: Your NFT is always open to receive offers from buyers
            </p>
          </Card>
        )}

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

        {/* Buy/Offer Section */}
        {!isOwner && activeListing && (
          <Card>
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-400">Buy For</h3>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {isListingExpired(activeListing.endTimestamp) ? 'Listing' : 'Ending in'}
                  </p>
                  <p className={`text-sm font-semibold ${
                    isListingExpired(activeListing.endTimestamp) ? 'text-red-400' : 'text-primary-400'
                  }`}>
                    {getTimeRemaining(activeListing.endTimestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0
                    ? formatEth(activeListing.currencyApprovals[0].pricePerToken)
                    : formatEth(activeListing.pricePerToken)}
                </span>
                <span className="text-lg text-gray-400">
                  {(() => {
                    // Normalize display symbol: Show 'ETH' for native tokens or UNKNOWN symbols
                    if (activeListing.currencyApprovals && activeListing.currencyApprovals.length > 0) {
                      const currency = activeListing.currencyApprovals[0].currency;
                      const currencyId = currency.id.toLowerCase();
                      const isNativeToken = currencyId === ZERO_ADDRESS.toLowerCase() ||
                                            currencyId === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
                      return (isNativeToken || currency.symbol === 'UNKNOWN') ? 'ETH' : currency.symbol;
                    }
                    return 'ETH';
                  })()}
                </span>
              </div>
            </div>

            {isListingExpired(activeListing.endTimestamp) ? (
              // Only show Make Offer button if expired
              <Button
                variant="secondary"
                onClick={handleMakeOffer}
                className="w-full"
              >
                Make Offer
              </Button>
            ) : (
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
                  onClick={handleMakeOffer}
                  className="col-span-1"
                >
                  Make Offer
                </Button>
              </div>
            )}

            {!isERC721 && !isListingExpired(activeListing.endTimestamp) && (
              <p className="text-xs text-gray-500 mt-3">
                Available: {maxQuantity} items | Contract will buy: {Math.floor(quantity)} items
              </p>
            )}
          </Card>
        )}

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
      </div>
    </div>
  );
}
