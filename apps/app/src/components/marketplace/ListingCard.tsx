import { Listing } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { formatDistanceToNow } from 'date-fns';

interface ListingCardProps {
  listing: Listing;
  onBuy?: (listing: Listing) => void;
  onCancel?: (listing: Listing) => void;
  isOwner?: boolean;
}

export function ListingCard({ listing, onBuy, onCancel, isOwner }: ListingCardProps) {
  const isActive = listing.status === 'CREATED';
  const price = BigInt(listing.pricePerToken);
  const quantity = BigInt(listing.quantity);
  const totalPrice = price * quantity;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                Fixed Price Listing
              </h3>
              <Badge variant={isActive ? 'success' : 'secondary'}>
                {listing.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">
              Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Price per Token</p>
            <p className="text-lg font-semibold text-primary-400">
              {formatEth(price)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Quantity</p>
            <p className="text-lg font-semibold text-white">
              {quantity.toString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Price</p>
            <p className="text-lg font-semibold text-white">
              {formatEth(totalPrice)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Seller</p>
            <p className="text-sm font-mono text-primary-400">
              {formatAddress(listing.listingCreator.id)}
            </p>
          </div>
        </div>

        {listing.endTimestamp && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Expires</p>
            <p className="text-sm text-white">
              {new Date(parseInt(listing.endTimestamp) * 1000).toLocaleString()}
            </p>
          </div>
        )}

        {isActive && (
          <div className="flex gap-2 pt-4 border-t border-dark-border">
            {isOwner ? (
              <Button
                onClick={() => onCancel?.(listing)}
                variant="secondary"
                fullWidth
              >
                Cancel Listing
              </Button>
            ) : (
              <Button
                onClick={() => onBuy?.(listing)}
                variant="primary"
                fullWidth
              >
                Buy Now
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
