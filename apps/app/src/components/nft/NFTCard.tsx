import Link from 'next/link';
import Image from 'next/image';
import { NFT, ListingStatus } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatEth } from '../../lib/web3/utils';

interface NFTCardProps {
  nft: NFT;
}

export function NFTCard({ nft }: NFTCardProps) {
  const activeListings = nft.listings?.filter(l => l.status === ListingStatus.CREATED) || [];
  const lowestPrice = activeListings.length > 0
    ? activeListings.reduce((min, listing) => {
        const price = BigInt(listing.pricePerToken);
        return price < min ? price : min;
      }, BigInt(activeListings[0].pricePerToken))
    : null;

  return (
    <Link href={`/asset/${nft.id}`}>
      <Card hover className="group">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-4 bg-dark-border">
          {nft.imageUrl ? (
            <Image
              src={nft.imageUrl}
              alt={nft.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-600"
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
          <div className="absolute top-2 right-2">
            <Badge variant="primary">{nft.collection.collectionType}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-400">{nft.collection.name}</p>
          <h3 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
            {nft.name}
          </h3>

          {lowestPrice !== null && (
            <div className="flex items-center justify-between pt-2 border-t border-dark-border">
              <span className="text-xs text-gray-400">Price</span>
              <span className="font-semibold text-primary-400">
                {formatEth(lowestPrice)} ETH
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
