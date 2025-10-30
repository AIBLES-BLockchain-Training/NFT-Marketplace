import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { NFT, ListingStatus } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatEth } from '../../lib/web3/utils';
import { getIpfsGateways } from '../../lib/utils/format';

interface NFTCardProps {
  nft: NFT;
}

export function NFTCard({ nft }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const activeListings = nft.listings?.filter(l => l.status === ListingStatus.CREATED) || [];
  const lowestPrice = activeListings.length > 0
    ? activeListings.reduce((min, listing) => {
        const price = BigInt(listing.pricePerToken);
        return price < min ? price : min;
      }, BigInt(activeListings[0].pricePerToken))
    : null;

  // Get listing owner (for cards that represent individual listings)
  const listingOwner = activeListings.length === 1 ? activeListings[0].owner : null;

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
                {formatEth(lowestPrice)} ETH
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
