import Link from 'next/link';
import Image from 'next/image';
import { NFT, ListingStatus } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatEth } from '../../lib/web3/utils';

interface NFTCardProps {
  nft: NFT;
}

// Convert IPFS URLs to HTTP gateway URLs
function convertIpfsUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
}

export function NFTCard({ nft }: NFTCardProps) {
  const activeListings = nft.listings?.filter(l => l.status === ListingStatus.CREATED) || [];
  const lowestPrice = activeListings.length > 0
    ? activeListings.reduce((min, listing) => {
        const price = BigInt(listing.pricePerToken);
        return price < min ? price : min;
      }, BigInt(activeListings[0].pricePerToken))
    : null;

  const imageUrl = convertIpfsUrl(nft.imageUrl);

  return (
    <Link href={`/asset/${nft.id}`}>
      <Card hover className="group p-3">
        <div className="aspect-square relative overflow-hidden rounded-lg mb-2 bg-dark-border">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={nft.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
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
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 truncate">{nft.collection.name}</p>
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
            {nft.name}
          </h3>

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
