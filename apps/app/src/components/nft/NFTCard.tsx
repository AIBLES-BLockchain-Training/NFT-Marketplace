import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { NFT, ListingStatus } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatEth } from '../../lib/web3/utils';
import { getIpfsGateways, formatUSDC, isUSDCCurrency } from '../../lib/utils/format';

interface NFTCardProps {
  nft: NFT;
}

export function NFTCard({ nft }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const activeListings = nft.listings?.filter(l => l.status === ListingStatus.CREATED) || [];
  
  // Find the listing with the lowest price (also get currency info)
  const lowestPriceListing = activeListings.length > 0
    ? activeListings.reduce((min, listing) => {
        const price = BigInt(listing.pricePerToken);
        const minPrice = BigInt(min.pricePerToken);
        return price < minPrice ? listing : min;
      }, activeListings[0])
    : null;
    
  const lowestPrice = lowestPriceListing ? BigInt(lowestPriceListing.pricePerToken) : null;

  // Get listing owner (for cards that represent individual listings)
  const listingOwner = activeListings.length === 1 ? activeListings[0].owner : null;
  
  // Get currency info from the lowest price listing
  let currencySymbol = 'TOKEN';
  let currencyAddress = '';
  
  if (lowestPriceListing) {
    // Check if listing has currency approvals
    if (lowestPriceListing.currencyApprovals && lowestPriceListing.currencyApprovals.length > 0) {
      const currencyInfo = lowestPriceListing.currencyApprovals[0].currency;
      currencySymbol = currencyInfo.symbol;
      currencyAddress = currencyInfo.id;
    } else {
      // Fallback to basic currency field
      currencyAddress = lowestPriceListing.currency || '';
      currencySymbol = currencyAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN';
    }
  }
  
  // Check if this is USDC currency
  const isUSDC = isUSDCCurrency(currencyAddress);
  
  // Format price based on currency type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDC(amount, 2); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };

  // Check if listing is reserved
  const firstListing = activeListings[0];
  const isReservedListing = firstListing?.isReserved || false;

  // Get all IPFS gateways for fallback with thumbnail size (300px)
  const imageGateways = getIpfsGateways(nft.imageUrl, 300);
  const imageUrl = imageGateways.length > 0 ? imageGateways[fallbackIndex] : nft.imageUrl;

  const handleImageError = () => {
    if (imageGateways.length > 0 && fallbackIndex < imageGateways.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  return (
    <Link href={`/asset/${nft.id}`}>
      <Card hover className="group p-3">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-2 bg-dark-border">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={nft.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority={false}
              unoptimized
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-600"
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
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="primary" className="text-xs px-2 py-0.5">{nft.collection.collectionType}</Badge>
          </div>

          {/* Reserved Listing Badge - Top Right under collection type */}
          {isReservedListing && (
            <div className="absolute top-10 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-orange-500/50">
              <p className="text-xs font-bold text-orange-400">RESERVED</p>
            </div>
          )}

          {nft.collection.collectionType === 'ERC1155' && (
            <>
              {/* Show available amount if present, otherwise show total amount */}
              {nft.availableAmount && nft.availableAmount !== '1' && (
                <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50">
                  <p className="text-xs font-bold text-green-400">x{nft.availableAmount}</p>
                </div>
              )}
              {!nft.availableAmount && nft.amount && nft.amount !== '1' && (
                <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-primary-500/50">
                  <p className="text-xs font-bold text-primary-400">x{nft.amount}</p>
                </div>
              )}
              {nft.listedAmount && nft.listedAmount !== '0' && (
                <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-yellow-500/50">
                  <p className="text-xs font-bold text-yellow-400">Listed: {nft.listedAmount}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 truncate">{nft.collection.name}</p>
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
            {nft.name}
          </h3>

          {listingOwner && (
            <div className="pt-1 border-t border-dark-border">
              <span className="text-[10px] text-gray-400">Listed by</span>
              <p className="text-xs font-mono text-gray-300 truncate">
                {listingOwner.id.slice(0, 6)}...{listingOwner.id.slice(-4)}
              </p>
            </div>
          )}

          {lowestPrice !== null && (
            <div className="flex items-center justify-between pt-1.5 border-t border-dark-border">
              <span className="text-[10px] text-gray-400">Price</span>
              <span className="text-xs font-semibold text-primary-400">
                {formatPrice(lowestPrice!)} USDC
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
