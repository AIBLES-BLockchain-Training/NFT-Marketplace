/**
 * Accessibility Utilities
 * Helpers for improving component accessibility
 */

/**
 * Format time remaining for screen readers
 */
export function formatTimeForScreenReader(
  days: number,
  hours: number,
  minutes: number,
  seconds: number
): string {
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(', ');
}

/**
 * Format currency amount for screen readers
 */
export function formatCurrencyForScreenReader(
  amount: string,
  symbol: string
): string {
  return `${amount} ${symbol}`;
}

/**
 * Get ARIA label for auction status
 */
export function getAuctionStatusAriaLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Auction is currently active and accepting bids';
    case 'ENDED':
      return 'Auction has ended';
    case 'CANCELLED':
      return 'Auction was cancelled';
    case 'CREATED':
      return 'Auction has been created';
    default:
      return `Auction status: ${status}`;
  }
}

/**
 * Get ARIA label for bid button
 */
export function getBidButtonAriaLabel(
  isBuyout: boolean,
  amount?: string,
  currency?: string
): string {
  if (isBuyout) {
    return amount && currency
      ? `Buyout auction for ${amount} ${currency}`
      : 'Buyout auction';
  }
  return amount && currency
    ? `Place bid of ${amount} ${currency}`
    : 'Place bid';
}

/**
 * Generate unique ID for accessibility
 */
let idCounter = 0;
export function generateA11yId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}
