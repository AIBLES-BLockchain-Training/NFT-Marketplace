/**
 * Auction Utilities Barrel Export
 * Centralized exports for all auction-related utilities
 */

// Calculations
export {
  calculateMinimumBid,
  calculateMinimumFirstBid,
  validateBidAmount,
  isBuyoutBid,
  calculateBidIncrease,
  formatBidAmount,
  ethToUsd,
  calculateQuickBids,
  parseEthInput,
} from './calculations';

// Status Utilities
export {
  hasAuctionEnded,
  isAuctionEndingSoon,
  isAuctionFinalMinute,
  isAuctionActive,
  hasAuctionBids,
  canCancelAuction,
  canCollectPayout,
  canCollectNFT,
  getAuctionStatusVariant,
  getAuctionStatusText,
} from './status';
