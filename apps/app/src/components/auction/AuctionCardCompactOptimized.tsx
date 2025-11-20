import { memo } from 'react';
import { AuctionCardCompact, AuctionCardCompactProps } from './AuctionCardCompact';

/**
 * Memoized AuctionCardCompact Component
 * Prevents unnecessary re-renders when auction data hasn't changed
 */
export const AuctionCardCompactOptimized = memo(AuctionCardCompact, (prevProps, nextProps) => {
  // Only re-render if auction data changed
  return (
    prevProps.auction.auctionId === nextProps.auction.auctionId &&
    prevProps.auction.status === nextProps.auction.status &&
    prevProps.auction.winningBid?.bidAmount === nextProps.auction.winningBid?.bidAmount &&
    prevProps.auction.endTime === nextProps.auction.endTime &&
    prevProps.isOwner === nextProps.isOwner
  );
});

AuctionCardCompactOptimized.displayName = 'AuctionCardCompactOptimized';
