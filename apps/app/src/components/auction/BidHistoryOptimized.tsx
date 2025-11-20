import { memo } from 'react';
import { BidHistory } from './BidHistory';

/**
 * Memoized BidHistory Component
 * Prevents unnecessary re-renders when auction data hasn't changed
 */
export const BidHistoryOptimized = memo(BidHistory, (prevProps, nextProps) => {
  // Only re-render if bids array changed
  return (
    prevProps.bids.length === nextProps.bids.length &&
    prevProps.currency.symbol === nextProps.currency.symbol &&
    prevProps.startPrice === nextProps.startPrice
  );
});

BidHistoryOptimized.displayName = 'BidHistoryOptimized';
