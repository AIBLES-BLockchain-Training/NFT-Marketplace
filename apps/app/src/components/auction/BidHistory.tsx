import { formatDistanceToNow } from 'date-fns';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { formatUSDCFromLegacy, isUSDCCurrency } from '../../lib/utils/format';
import { calculateBidIncrease } from '../../lib/auction/calculations';
import { Card } from '../common/Card';

export interface Bid {
  id: string;
  bidderAddress: string;
  bidAmount: string;
  timestamp: string;
  bidder?: {
    id: string;
    name?: string;
  };
}

export interface BidHistoryProps {
  bids: Bid[];
  currency: {
    symbol: string;
    decimals: number;
    id?: string; // Currency contract address for USDC detection
  };
  startPrice?: string;
  /** Maximum number of bids to show initially */
  initialDisplayCount?: number;
  /** Show rank numbers */
  showRank?: boolean;
  /** Highlight top N bids */
  highlightTopCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Bid History Component
 * Displays chronological list of all bids with bidder info and timestamps
 * Shows top 3 bids, rest are scrollable with thin scrollbar
 */
export function BidHistory({
  bids,
  currency,
  startPrice,
  initialDisplayCount = 10,
  showRank = true,
  highlightTopCount = 3,
  className = '',
}: BidHistoryProps) {
  // Check if this is USDC currency
  const isUSDC = isUSDCCurrency(currency?.id || '');
  
  // Helper function to format currency based on type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDCFromLegacy(amount, 2, false); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };

  if (bids.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No bids yet</p>
          <p className="text-gray-500 text-xs mt-2">
            Be the first to place a bid!
          </p>
        </div>
      </Card>
    );
  }

  // Split bids: top 3 always visible, rest in scrollable area
  const topBids = bids.slice(0, 3);
  const remainingBids = bids.slice(3);

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">
          Bid History ({bids.length})
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Showing all bids from highest to lowest
        </p>
      </div>

      {/* Top 3 Bids - Always Visible */}
      <div className="space-y-2 flex-shrink-0">
        {topBids.map((bid, index) => {
          const isTopBid = index < highlightTopCount;
          const bidAmount = BigInt(bid.bidAmount);
          const previousBidAmount = index < bids.length - 1
            ? BigInt(bids[index + 1].bidAmount)
            : (startPrice ? BigInt(startPrice) : 0n);

          const increasePercent = previousBidAmount > 0n
            ? calculateBidIncrease(bidAmount, previousBidAmount)
            : 0;

          return (
            <BidItem
              key={bid.id}
              bid={bid}
              rank={index + 1}
              showRank={showRank}
              isTopBid={isTopBid}
              isWinningBid={index === 0}
              increasePercent={increasePercent}
              currencySymbol={currency.symbol}
              formatPrice={formatPrice}
            />
          );
        })}
      </div>

      {/* Remaining Bids - Scrollable with Thin Scrollbar */}
      {remainingBids.length > 0 && (
        <div className="mt-2 space-y-2 flex-1 min-h-0 max-h-[250px] overflow-y-auto pr-1 thin-scrollbar">
          {remainingBids.map((bid, index) => {
            const actualIndex = index + 3; // Offset by top 3 bids
            const bidAmount = BigInt(bid.bidAmount);
            const previousBidAmount = actualIndex < bids.length - 1
              ? BigInt(bids[actualIndex + 1].bidAmount)
              : (startPrice ? BigInt(startPrice) : 0n);

            const increasePercent = previousBidAmount > 0n
              ? calculateBidIncrease(bidAmount, previousBidAmount)
              : 0;

            return (
              <BidItem
                key={bid.id}
                bid={bid}
                rank={actualIndex + 1}
                showRank={showRank}
                isTopBid={false}
                isWinningBid={false}
                increasePercent={increasePercent}
                currencySymbol={currency.symbol}
                formatPrice={formatPrice}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

/**
 * Individual Bid Item Component
 */
interface BidItemProps {
  bid: Bid;
  rank: number;
  showRank: boolean;
  isTopBid: boolean;
  isWinningBid: boolean;
  increasePercent: number;
  currencySymbol: string;
  formatPrice: (amount: bigint) => string;
}

function BidItem({
  bid,
  rank,
  showRank,
  isTopBid,
  isWinningBid,
  increasePercent,
  currencySymbol,
  formatPrice,
}: BidItemProps) {
  const bgClass = isTopBid
    ? isWinningBid
      ? 'bg-primary-500/10 border border-primary-500/30'
      : 'bg-dark-card border border-dark-border'
    : 'bg-dark-bg border border-dark-border';

  return (
    <div className={`${bgClass} rounded-lg p-3 transition-colors`}>
      <div className="flex items-center justify-between gap-4">
        {/* Rank & Bidder */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showRank && (
            <div className="flex-shrink-0">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    isWinningBid
                      ? 'bg-primary-500 text-white'
                      : isTopBid
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-dark-card text-gray-500'
                  }
                `}
              >
                #{rank}
              </div>
            </div>
          )}

          {/* Bidder Avatar & Address */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />
            <div className="min-w-0">
              {bid.bidder?.name ? (
                <p className="text-sm font-medium text-white truncate">
                  {bid.bidder.name}
                </p>
              ) : null}
              <p className="text-xs font-mono text-gray-400 truncate">
                {formatAddress(bid.bidderAddress)}
              </p>
            </div>
          </div>
        </div>

        {/* Bid Amount & Info */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <p className={`text-lg font-bold ${isWinningBid ? 'text-primary-400' : 'text-white'}`}>
              {formatPrice(BigInt(bid.bidAmount))}
            </p>
            <p className="text-xs text-gray-500">{currencySymbol}</p>
          </div>
          <div className="flex items-center gap-2 justify-end mt-1">
            {increasePercent > 0 && (
              <span className="text-xs text-green-400">
                +{increasePercent.toFixed(1)}%
              </span>
            )}
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(bid.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Winning Badge */}
      {isWinningBid && (
        <div className="mt-2 pt-2 border-t border-primary-500/30">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <p className="text-xs text-primary-400 font-semibold">
              Winning Bid
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Bid History for smaller displays
 */
export function CompactBidHistory({ bids, currency }: Pick<BidHistoryProps, 'bids' | 'currency'>) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No bids yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bids.slice(0, 3).map((bid, index) => (
        <div
          key={bid.id}
          className="flex items-center justify-between py-2 px-3 bg-dark-bg rounded-lg"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">#{index + 1}</span>
            <span className="text-xs font-mono text-gray-400">
              {formatAddress(bid.bidderAddress)}
            </span>
          </div>
          <span className="text-sm font-semibold text-white">
            {formatEth(BigInt(bid.bidAmount))} {currency.symbol}
          </span>
        </div>
      ))}
      {bids.length > 3 && (
        <p className="text-xs text-center text-gray-500">
          +{bids.length - 3} more {bids.length - 3 === 1 ? 'bid' : 'bids'}
        </p>
      )}
    </div>
  );
}
