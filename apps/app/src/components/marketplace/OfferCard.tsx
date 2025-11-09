import { Offer } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { truncate } from '../../lib/utils/format';
import { formatDistanceToNow } from 'date-fns';

interface OfferCardProps {
  offer: Offer;
  onAccept?: (offer: Offer) => void;
  onCancel?: (offer: Offer) => void;
  isTokenOwner?: boolean;
  isOfferMaker?: boolean;
}

export function OfferCard({ offer, onAccept, onCancel, isTokenOwner, isOfferMaker }: OfferCardProps) {
  const isActive = offer.status === 'ACTIVE' || offer.status === 'CREATED';
  const totalPrice = BigInt(offer.totalPrice);
  const quantity = BigInt(offer.quantity);
  const pricePerToken = quantity > 0n ? totalPrice / quantity : 0n;

  const endTime = new Date(offer.expirationTimestamp).getTime();
  const now = Date.now();
  const hasExpired = now >= endTime;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                Offer
              </h3>
              <Badge variant={isActive && !hasExpired ? 'primary' : 'secondary'}>
                {hasExpired ? 'EXPIRED' : offer.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono mb-1">
              ID: {truncate(offer.offerId, 6, 4)}
            </p>
            <p className="text-sm text-gray-400">
              Made {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Price</p>
              <p className="text-xl font-bold text-primary-400">
                {formatEth(totalPrice)} ETH
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Quantity</p>
              <p className="text-xl font-bold text-white">
                {quantity.toString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Price per Token</p>
            <p className="text-sm font-semibold text-white">
              {formatEth(pricePerToken)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Expires</p>
            <p className={`text-sm font-semibold ${hasExpired ? 'text-red-400' : 'text-white'}`}>
              {formatDistanceToNow(new Date(offer.expirationTimestamp), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-gray-400">Offeror</span>
            <span className="text-xs font-mono text-primary-400">
              {formatAddress(offer.offeror.id)}
            </span>
          </div>
          {offer.tokenOwner && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Token Owner</span>
              <span className="text-xs font-mono text-primary-400">
                {formatAddress(offer.tokenOwner.id)}
              </span>
            </div>
          )}
        </div>

        {isActive && !hasExpired && (
          <div className="flex gap-2 pt-4 border-t border-dark-border">
            {isTokenOwner ? (
              <Button
                onClick={() => onAccept?.(offer)}
                variant="primary"
                fullWidth
              >
                Accept Offer
              </Button>
            ) : isOfferMaker ? (
              <Button
                onClick={() => onCancel?.(offer)}
                variant="secondary"
                fullWidth
              >
                Cancel Offer
              </Button>
            ) : null}
          </div>
        )}

        {hasExpired && (
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm text-gray-400 text-center">
              This offer has expired
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
