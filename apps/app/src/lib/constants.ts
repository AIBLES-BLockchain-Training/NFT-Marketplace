// Time constants
export const SECONDS_PER_DAY = 24 * 60 * 60;
export const SECONDS_PER_HOUR = 60 * 60;
export const SECONDS_PER_MINUTE = 60;
export const DEFAULT_TIME_BUFFER = 300; // 5 minutes
export const AUTH_EXPIRY = 7 * SECONDS_PER_DAY * 1000; // 7 days in milliseconds

// Auction bid buffer options (in basis points)
export const BID_BUFFER_BPS = {
  LOW: '250',      // 2.5%
  MEDIUM: '500',   // 5%
  HIGH: '1000',    // 10%
  VERY_HIGH: '1500', // 15%
} as const;

// Default values
export const DEFAULT_BUYOUT_MULTIPLIER = 100n; // 100x minimum bid
export const DEFAULT_AUCTION_BID_BUFFER = BID_BUFFER_BPS.MEDIUM;

// Listing/Auction duration options (in days)
export const DURATION_OPTIONS = [
  { value: '0.00694', label: '10 Minutes (Test)' }, // 10 minutes = 600 seconds / 86400
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
] as const;

// Pagination
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

// USDC Currency Settings
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC address
export const USDC_DECIMALS = 6;
export const USDC_SYMBOL = 'USDC';
export const USDC_NAME = 'USD Coin';

// Currency Display Settings
export const DISPLAY_CURRENCY = {
  address: USDC_ADDRESS,
  symbol: USDC_SYMBOL,
  decimals: USDC_DECIMALS,
  name: USDC_NAME,
} as const;
