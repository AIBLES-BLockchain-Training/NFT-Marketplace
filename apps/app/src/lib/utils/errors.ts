/**
 * Error Handling Utilities
 * Provides user-friendly error messages and retry logic
 */

export class AuctionError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'AuctionError';
  }
}

/**
 * Parse Web3 error and return user-friendly message
 */
export function parseWeb3Error(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  const errorString = String(error);
  const errorMessage = error instanceof Error ? error.message : errorString;

  // User rejected transaction
  if (
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('denied transaction')
  ) {
    return 'Transaction was cancelled';
  }

  // Insufficient funds
  if (
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient balance')
  ) {
    return 'Insufficient funds in your wallet';
  }

  // Auction-specific errors
  if (errorMessage.includes('auction ended')) {
    return 'This auction has ended';
  }

  if (errorMessage.includes('bid too low')) {
    return 'Your bid is too low. Please bid higher';
  }

  if (errorMessage.includes('not winning bidder')) {
    return 'You are not the winning bidder';
  }

  if (errorMessage.includes('auction not ended')) {
    return 'Auction has not ended yet';
  }

  if (errorMessage.includes('already collected')) {
    return 'Already collected';
  }

  if (errorMessage.includes('no bids')) {
    return 'No bids placed on this auction';
  }

  // Gas-related errors
  if (
    errorMessage.includes('gas required exceeds') ||
    errorMessage.includes('out of gas')
  ) {
    return 'Transaction requires too much gas. Try again with a higher gas limit';
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch')
  ) {
    return 'Network error. Please check your connection and try again';
  }

  // Nonce errors
  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error. Please refresh and try again';
  }

  // Contract paused
  if (errorMessage.includes('paused')) {
    return 'Contract is currently paused';
  }

  // Generic revert
  if (errorMessage.includes('revert')) {
    return 'Transaction failed. Please check the conditions and try again';
  }

  // Default
  return 'Transaction failed. Please try again';
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if user rejected transaction
      const errorMsg = parseWeb3Error(error);
      if (errorMsg.includes('cancelled') || errorMsg.includes('denied')) {
        throw error;
      }

      // Last attempt, throw error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorMsg = parseWeb3Error(error);

  // Don't retry user cancellations
  if (errorMsg.includes('cancelled') || errorMsg.includes('denied')) {
    return false;
  }

  // Don't retry validation errors
  if (
    errorMsg.includes('too low') ||
    errorMsg.includes('ended') ||
    errorMsg.includes('Already collected')
  ) {
    return false;
  }

  // Retry network and temporary errors
  return (
    errorMsg.includes('Network error') ||
    errorMsg.includes('timeout') ||
    errorMsg.includes('nonce') ||
    errorMsg.includes('gas')
  );
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown, context?: string): string {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return `[${timestamp}]${context ? ` [${context}]` : ''} ${errorMessage}${
    stack ? `\n${stack}` : ''
  }`;
}
