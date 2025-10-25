import Image from 'next/image';
import { NFT } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

interface NFTDetailProps {
  nft: NFT;
}

export function NFTDetail({ nft }: NFTDetailProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square relative overflow-hidden rounded-2xl bg-dark-border border border-dark-border">
          {nft.imageUrl ? (
            <Image
              src={nft.imageUrl}
              alt={nft.name}
              fill
              className="object-cover"
              priority
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

        <Card>
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Token ID</span>
              <span className="font-mono text-white">{nft.tokenId}</span>
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
