import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { CompactCountdownTimer } from './CountdownTimer';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { formatUSDC, isUSDCCurrency } from '../../lib/utils/format';
import { isAuctionActive, getAuctionStatusText, getAuctionStatusVariant } from '../../lib/auction/status';
import { Auction } from '../../types';

export interface AuctionCardCompactProps {
  auction: Auction;
  onViewDetails?: (auction: Auction) => void;
  onPlaceBid?: (auction: Auction) => void;
  isOwner?: boolean;
}

/**
 * Compact Auction Card for NFT Detail Page
 * Displays auction info in a smaller format
 */
export function AuctionCardCompact({
  auction,
  onViewDetails,
  onPlaceBid,
  isOwner,
}: AuctionCardCompactProps) {
  const isActive = isAuctionActive(auction);
  const statusText = getAuctionStatusText(auction);
  const statusVariant = getAuctionStatusVariant(auction);

  const currentBid = auction.winningBid
    ? BigInt(auction.winningBid.bidAmount)
    : BigInt(auction.startPrice);
    
  // Check if this is USDC currency
  const isUSDC = isUSDCCurrency(auction.currency?.id || '');
  
  // Format price based on currency type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDC(amount, 2); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              Auction
            </h3>
            <Badge variant={statusVariant}>{statusText}</Badge>
          </div>
          <button
            onClick={() => onViewDetails?.(auction)}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View Full Details →
          </button>
        </div>

        {/* Current Bid */}
        <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
          <p className="text-xs text-gray-400 mb-1">Current Bid</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-primary-400">
              {formatPrice(currentBid)}
            </p>
            <p className="text-sm text-gray-400">{auction.currency.symbol}</p>
          </div>
          {auction.winningBid && (
            <p className="text-xs text-gray-500 mt-1">
              by {formatAddress(auction.winningBid.bidderAddress)}
            </p>
          )}
        </div>

        {/* Auction Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {isActive && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Ends In</p>
              <CompactCountdownTimer endTime={auction.endTime} />
            </div>
          )}
          {auction.bids && auction.bids.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Bids</p>
              <p className="text-sm font-semibold text-white">
                {auction.bids.length}
              </p>
            </div>
          )}
          {auction.ceilingPrice && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Buyout Price</p>
              <p className="text-sm font-semibold text-primary-400">
                {formatPrice(BigInt(auction.ceilingPrice))} {auction.currency.symbol}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-1">Min Increase</p>
            <p className="text-sm font-semibold text-white">
              +{(Number(auction.bidBufferBps) / 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isActive && !isOwner && (
          <div className="flex gap-2 pt-2 border-t border-dark-border">
            <Button
              onClick={() => onPlaceBid?.(auction)}
              variant="primary"
              fullWidth
            >
              Place Bid
            </Button>
            <Button
              onClick={() => onViewDetails?.(auction)}
              variant="secondary"
            >
              Details
            </Button>
          </div>
        )}

        {isActive && isOwner && (
          <div className="pt-2 border-t border-dark-border">
            <Button
              onClick={() => onViewDetails?.(auction)}
              variant="secondary"
              fullWidth
            >
              Manage Auction
            </Button>
          </div>
        )}

        {!isActive && (
          <div className="pt-2 border-t border-dark-border">
            <Button
              onClick={() => onViewDetails?.(auction)}
              variant="secondary"
              fullWidth
            >
              View Details
            </Button>
          </div>
        )}

        {/* Info Note */}
        {isActive && (
          <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
            <p className="text-xs text-gray-400">
              Note: {auction.timeBufferInSeconds}s time buffer applies to bids near end
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
