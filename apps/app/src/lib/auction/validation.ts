import { Auction } from '../../types';
import { hasAuctionEnded } from './status';

/**
 * Auction Validation Utilities
 * Additional validation checks for auction operations
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate bid amount against auction rules
 */
export function validateBidAmount(
  auction: Auction,
  bidAmount: bigint
): ValidationResult {
  // Check if auction has ended
  if (hasAuctionEnded(auction.endTime)) {
    return { isValid: false, error: 'Auction has ended' };
  }

  // Check minimum bid
  const currentBid = auction.winningBid
    ? BigInt(auction.winningBid.bidAmount)
    : BigInt(auction.startPrice);

  const minimumBid = currentBid + (currentBid * BigInt(auction.stepAmount)) / 10000n;

  if (bidAmount < minimumBid) {
    return {
      isValid: false,
      error: `Bid must be at least ${minimumBid} wei`,
    };
  }

  // Check ceiling price (if exists)
  if (auction.ceilingPrice && bidAmount > BigInt(auction.ceilingPrice)) {
    return {
      isValid: false,
      error: `Bid cannot exceed ceiling price of ${auction.ceilingPrice} wei`,
    };
  }

  return { isValid: true };
}

/**
 * Validate user can collect payout
 */
export function validatePayoutCollection(
  auction: Auction,
  userAddress?: string
): ValidationResult {
  if (!userAddress) {
    return { isValid: false, error: 'Wallet not connected' };
  }

  if (!hasAuctionEnded(auction.endTime)) {
    return { isValid: false, error: 'Auction has not ended yet' };
  }

  if (userAddress.toLowerCase() !== auction.sellerAddress.toLowerCase()) {
    return { isValid: false, error: 'Only seller can collect payout' };
  }

  if (!auction.winningBid) {
    return { isValid: false, error: 'No bids placed on this auction' };
  }

  if (auction.isPayoutCollected) {
    return { isValid: false, error: 'Payout already collected' };
  }

  return { isValid: true };
}

/**
 * Validate user can collect NFT
 */
export function validateNFTCollection(
  auction: Auction,
  userAddress?: string
): ValidationResult {
  if (!userAddress) {
    return { isValid: false, error: 'Wallet not connected' };
  }

  if (!hasAuctionEnded(auction.endTime)) {
    return { isValid: false, error: 'Auction has not ended yet' };
  }

  if (!auction.winningBid) {
    return { isValid: false, error: 'No bids placed on this auction' };
  }

  if (
    userAddress.toLowerCase() !== auction.winningBid.bidderAddress.toLowerCase()
  ) {
    return { isValid: false, error: 'Only winner can collect NFT' };
  }

  if (auction.isTokenCollected) {
    return { isValid: false, error: 'NFT already collected' };
  }

  return { isValid: true };
}

/**
 * Validate user can cancel auction
 */
export function validateAuctionCancellation(
  auction: Auction,
  userAddress?: string
): ValidationResult {
  if (!userAddress) {
    return { isValid: false, error: 'Wallet not connected' };
  }

  if (userAddress.toLowerCase() !== auction.sellerAddress.toLowerCase()) {
    return { isValid: false, error: 'Only seller can cancel auction' };
  }

  if (hasAuctionEnded(auction.endTime)) {
    return { isValid: false, error: 'Cannot cancel ended auction' };
  }

  if (auction.winningBid) {
    return {
      isValid: false,
      error: 'Cannot cancel auction with existing bids',
    };
  }

  if (auction.status === 'CANCELLED') {
    return { isValid: false, error: 'Auction already cancelled' };
  }

  return { isValid: true };
}

/**
 * Validate auction is in correct state for bidding
 */
export function validateAuctionForBidding(auction: Auction): ValidationResult {
  if (auction.status === 'CANCELLED') {
    return { isValid: false, error: 'Auction has been cancelled' };
  }

  if (auction.status === 'ENDED') {
    return { isValid: false, error: 'Auction has ended' };
  }

  if (hasAuctionEnded(auction.endTime)) {
    return { isValid: false, error: 'Auction has ended' };
  }

  const startTime = new Date(auction.startTime).getTime();
  if (Date.now() < startTime) {
    return { isValid: false, error: 'Auction has not started yet' };
  }

  return { isValid: true };
}
