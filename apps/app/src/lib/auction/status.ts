/**
 * Auction Status Utilities
 * Handles auction state checks and status determinations
 */

import { Auction } from '../../types';

/**
 * Check if auction has ended
 * @param endTime Auction end time (ISO string or timestamp)
 * @returns True if auction has ended
 */
export function hasAuctionEnded(endTime: string | number): boolean {
  const endTimestamp = typeof endTime === 'string'
    ? new Date(endTime).getTime()
    : endTime;
  return Date.now() >= endTimestamp;
}

/**
 * Check if auction is ending soon (within threshold)
 * @param endTime Auction end time
 * @param thresholdMinutes Minutes threshold (default: 10)
 * @returns True if ending soon
 */
export function isAuctionEndingSoon(endTime: string | number, thresholdMinutes = 10): boolean {
  const endTimestamp = typeof endTime === 'string'
    ? new Date(endTime).getTime()
    : endTime;
  const threshold = thresholdMinutes * 60 * 1000;
  const remaining = endTimestamp - Date.now();
  return remaining > 0 && remaining <= threshold;
}

/**
 * Check if auction is in final minute
 * @param endTime Auction end time
 * @returns True if less than 1 minute remaining
 */
export function isAuctionFinalMinute(endTime: string | number): boolean {
  return isAuctionEndingSoon(endTime, 1);
}

/**
 * Check if auction is active (not ended, not cancelled)
 * @param auction Auction object
 * @returns True if auction is active
 */
export function isAuctionActive(auction: Auction): boolean {
  const statusActive = auction.status === 'CREATED' || auction.status === 'ACTIVE';
  const notEnded = !hasAuctionEnded(auction.endTime);
  return statusActive && notEnded;
}

/**
 * Check if auction has any bids
 * @param auction Auction object
 * @returns True if auction has bids
 */
export function hasAuctionBids(auction: Auction): boolean {
  return Boolean(auction.bids && auction.bids.length > 0);
}

/**
 * Check if auction can be cancelled
 * @param auction Auction object
 * @param userAddress Current user address
 * @returns Object with canCancel flag and reason
 */
export function canCancelAuction(
  auction: Auction,
  userAddress?: string
): { canCancel: boolean; reason?: string } {
  if (!userAddress) {
    return { canCancel: false, reason: 'Wallet not connected' };
  }

  if (auction.sellerAddress.toLowerCase() !== userAddress.toLowerCase()) {
    return { canCancel: false, reason: 'Only auction creator can cancel' };
  }

  if (hasAuctionEnded(auction.endTime)) {
    return { canCancel: false, reason: 'Auction has ended' };
  }

  if (auction.status === 'CANCELLED') {
    return { canCancel: false, reason: 'Auction already cancelled' };
  }

  if (auction.status === 'ACTIVE' && hasAuctionBids(auction)) {
    return { canCancel: false, reason: 'Cannot cancel auction with active bids' };
  }

  return { canCancel: true };
}

/**
 * Check if user can collect payout
 * @param auction Auction object
 * @param userAddress Current user address
 * @returns Object with canCollect flag and reason
 */
export function canCollectPayout(
  auction: Auction,
  userAddress?: string
): { canCollect: boolean; reason?: string } {
  if (!userAddress) {
    return { canCollect: false, reason: 'Wallet not connected' };
  }

  if (auction.sellerAddress.toLowerCase() !== userAddress.toLowerCase()) {
    return { canCollect: false, reason: 'Only seller can collect payout' };
  }

  // Check if auction has ended (either by time OR by status)
  const timeEnded = hasAuctionEnded(auction.endTime);
  const statusEnded = auction.status === 'ENDED';
  
  if (!timeEnded && !statusEnded) {
    return { canCollect: false, reason: 'Auction has not ended yet' };
  }

  if (!hasAuctionBids(auction)) {
    return { canCollect: false, reason: 'No bids to collect' };
  }

  if (auction.isPayoutCollected) {
    return { canCollect: false, reason: 'Payout already collected' };
  }

  return { canCollect: true };
}

/**
 * Check if user can collect NFT (winner)
 * @param auction Auction object
 * @param userAddress Current user address
 * @returns Object with canCollect flag and reason
 */
export function canCollectNFT(
  auction: Auction,
  userAddress?: string
): { canCollect: boolean; reason?: string } {
  if (!userAddress) {
    return { canCollect: false, reason: 'Wallet not connected' };
  }

  // Check if auction has ended (either by time OR by status)
  const timeEnded = hasAuctionEnded(auction.endTime);
  const statusEnded = auction.status === 'ENDED';
  
  if (!timeEnded && !statusEnded) {
    return { canCollect: false, reason: 'Auction has not ended yet' };
  }

  if (auction.isTokenCollected) {
    return { canCollect: false, reason: 'NFT already collected' };
  }

  // If no bids, seller can collect back the NFT
  if (!hasAuctionBids(auction)) {
    if (auction.sellerAddress.toLowerCase() === userAddress.toLowerCase()) {
      return { canCollect: true };
    }
    return { canCollect: false, reason: 'No winner for this auction' };
  }

  // Winner can collect
  const winningBid = auction.winningBid || auction.bids?.[0];
  if (winningBid?.bidderAddress.toLowerCase() === userAddress.toLowerCase()) {
    return { canCollect: true };
  }

  return { canCollect: false, reason: 'Only auction winner can collect NFT' };
}

/**
 * Get auction status badge variant
 * @param auction Auction object
 * @returns Badge variant string
 */
export function getAuctionStatusVariant(auction: Auction): 'success' | 'warning' | 'error' | 'secondary' {
  if (hasAuctionEnded(auction.endTime)) {
    return 'secondary';
  }

  if (isAuctionEndingSoon(auction.endTime)) {
    return 'warning';
  }

  if (auction.status === 'ACTIVE') {
    return 'success';
  }

  if (auction.status === 'CANCELLED') {
    return 'error';
  }

  return 'secondary';
}

/**
 * Get auction status display text
 * @param auction Auction object
 * @returns Status text for display
 */
export function getAuctionStatusText(auction: Auction): string {
  if (auction.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (hasAuctionEnded(auction.endTime)) {
    return 'ENDED';
  }

  if (isAuctionFinalMinute(auction.endTime)) {
    return 'ENDING NOW';
  }

  if (isAuctionEndingSoon(auction.endTime)) {
    return 'ENDING SOON';
  }

  if (auction.status === 'ACTIVE') {
    return 'LIVE';
  }

  return 'CREATED';
}
