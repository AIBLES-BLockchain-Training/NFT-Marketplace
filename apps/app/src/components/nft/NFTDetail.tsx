import { useState } from 'react';
import Image from 'next/image';
import { NFT, Listing } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatEth } from '../../lib/web3/utils';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { getIpfsGateways, truncateTokenId } from '../../lib/utils/format';
import { useWallet } from '../../hooks/useWallet';
import toast from 'react-hot-toast';

interface NFTDetailProps {
  nft: NFT;
  isOwner?: boolean;
  activeListings?: Listing[];
  onBuy?: (listing: Listing) => void;
  onCreateListing?: () => void;
  onCreateAuction?: () => void;
  onCancelListing?: (listing: Listing) => void;
  onUpdateListing?: (listing: Listing) => void;
}

export function NFTDetail({ nft, isOwner, activeListings = [], onBuy, onCreateListing, onCreateAuction, onCancelListing, onUpdateListing }: NFTDetailProps) {
  const { address } = useWallet();
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const isERC721 = nft.collection.collectionType === 'ERC721';

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

        {/* Listings Section */}
        {activeListings.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Available Listings ({activeListings.length})
            </h3>
            <div className="space-y-3">
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

                  return (
                    <div
                      key={listing.id}
                      className="flex items-center gap-3 p-3 bg-dark-bg border border-dark-border rounded-lg"
                    >
                      {/* Seller */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Seller</p>
                        <p className="text-sm text-white font-mono truncate">
                          {isMyListing ? 'You' : `${listing.owner.id.slice(0, 6)}...${listing.owner.id.slice(-4)}`}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-lg text-white font-bold">
                          {formatEth(price)} <span className="text-sm text-gray-400">{currencySymbol}</span>
                        </p>
                      </div>

                      {/* Quantity */}
                      {!isERC721 && (
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="text-sm text-white">{listing.quantity}</p>
                        </div>
                      )}

                      {/* Expiry */}
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className={`text-sm font-semibold ${isExpired ? 'text-red-400' : 'text-primary-400'}`}>
                          {getTimeRemaining(listing.endTimestamp)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      {isMyListing ? (
                        // Owner's listing - show Update/Cancel
                        <div className="flex gap-2">
                          {!isExpired && onUpdateListing && (
                            <Button
                              variant="secondary"
                              onClick={() => onUpdateListing(listing)}
                              className="whitespace-nowrap"
                            >
                              Update
                            </Button>
                          )}
                          {!isExpired && onCancelListing && (
                            <Button
                              variant="secondary"
                              onClick={() => onCancelListing(listing)}
                              className="whitespace-nowrap"
                            >
                              Cancel
                            </Button>
                          )}
                          {isExpired && (
                            <span className="text-sm text-red-400 px-3">Expired</span>
                          )}
                        </div>
                      ) : (
                        // Other's listing - show Buy button
                        !isExpired ? (
                          <Button
                            variant="primary"
                            onClick={() => onBuy && onBuy(listing)}
                            className="whitespace-nowrap"
                          >
                            Buy Now
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={handleMakeOffer}
                            className="whitespace-nowrap"
                            disabled
                          >
                            Expired
                          </Button>
                        )
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Make Offer Button (always available for non-owners) */}
            {!isOwner && (
              <div className="mt-4 pt-4 border-t border-dark-border">
                <Button
                  variant="secondary"
                  onClick={handleMakeOffer}
                  className="w-full"
                >
                  Make Offer
                </Button>
              </div>
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
