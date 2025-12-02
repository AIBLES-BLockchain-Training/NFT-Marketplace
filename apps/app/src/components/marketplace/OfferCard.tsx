import { useState } from 'react';
import { Offer } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { truncate, formatUSDC, isUSDCCurrency } from '../../lib/utils/format';
import { formatDistanceToNow } from 'date-fns';

interface OfferCardProps {
  offer: Offer;
  onAccept?: (offer: Offer) => void;
  onCancel?: (offer: Offer) => void;
  isTokenOwner?: boolean;
  isOfferMaker?: boolean;
}

export function OfferCard({ offer, onAccept, onCancel, isTokenOwner, isOfferMaker }: OfferCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = offer.status === 'ACTIVE' || offer.status === 'CREATED';
  const totalPrice = BigInt(offer.totalPrice);
  const quantity = BigInt(offer.quantity);
  const pricePerToken = quantity > 0n ? totalPrice / quantity : 0n;

  const endTime = new Date(offer.expirationTimestamp).getTime();
  const now = Date.now();
  const hasExpired = now >= endTime;

  // Get currency symbol, fallback to 'TOKEN' if not available
  const currencySymbol = offer.currency?.symbol || 'TOKEN';
  
  // Check if this is USDC currency
  const isUSDC = isUSDCCurrency(offer.currency?.id || '');
  
  // Format price based on currency type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDC(amount, 2); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };

  const showActions = isActive && !hasExpired && (isTokenOwner || isOfferMaker);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
                {formatPrice(totalPrice)} {currencySymbol}
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
              {formatPrice(pricePerToken)} {currencySymbol}
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
          <div className="pt-2 border-t border-dark-border">
            <p className="text-xs text-gray-400 mb-2">Offer made by</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {offer.offeror?.name || 'Unknown'}
                </p>
                <p className="text-xs font-mono text-gray-400 truncate">
                  {formatAddress(offer.offeror.id)}
                </p>
              </div>
            </div>
          </div>

          {offer.tokenOwner && (
            <div className="flex justify-between pt-2 border-t border-dark-border">
              <span className="text-xs text-gray-400">Token Owner</span>
              <span className="text-xs font-mono text-primary-400">
                {formatAddress(offer.tokenOwner.id)}
              </span>
            </div>
          )}
          {offer.currency && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Currency</span>
              <span className="text-xs font-mono text-primary-400">
                {offer.currency.symbol} ({formatAddress(offer.currency.id)})
              </span>
            </div>
          )}
          {offer.transactionHash && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Transaction</span>
              <a
                href={`https://etherscan.io/tx/${offer.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-primary-400 hover:text-primary-300 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {truncate(offer.transactionHash, 8, 6)}
              </a>
            </div>
          )}
          {offer.blockNumber && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Block</span>
              <span className="text-xs font-mono text-gray-300">
                #{offer.blockNumber}
              </span>
            </div>
          )}
        </div>

        {hasExpired && (
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm text-gray-400 text-center">
              This offer has expired
            </p>
          </div>
        )}
      </div>
    </Card>

      {/* Hover Overlay for Actions */}
      {showActions && isHovered && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-xs space-y-3">
            {isTokenOwner && onAccept && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(offer);
                }}
                variant="primary"
                fullWidth
              >
                Accept Offer
              </Button>
            )}
            {isOfferMaker && onCancel && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(offer);
                }}
                variant="secondary"
                fullWidth
              >
                Cancel Offer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
