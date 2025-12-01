/**
 * Auction Calculation Utilities
 * Handles bid calculations, validations, and price formatting
 */

/**
 * Calculate minimum next bid based on current bid and step percentage
 * @param currentBid Current highest bid in wei
 * @param stepPercentage Step percentage in basis points (e.g., 500 = 5%)
 * @returns Minimum next bid amount in wei
 */
export function calculateMinimumBid(currentBid: bigint, stepPercentage: bigint): bigint {
  return currentBid + (currentBid * stepPercentage) / 10000n;
}

/**
 * Calculate minimum first bid based on start price and step percentage
 * @param startPrice Starting price in wei
 * @param stepPercentage Step percentage in basis points
 * @returns Minimum first bid amount in wei
 */
export function calculateMinimumFirstBid(startPrice: bigint, stepPercentage: bigint): bigint {
  return startPrice + (startPrice * stepPercentage) / 10000n;
}

/**
 * Validate bid amount against minimum required bid
 * @param bidAmount Proposed bid amount in wei
 * @param minimumBid Minimum required bid in wei
 * @param ceilingPrice Optional ceiling/buyout price in wei
 * @returns Object with validation result and error message
 */
export function validateBidAmount(
  bidAmount: bigint,
  minimumBid: bigint,
  ceilingPrice?: bigint
): { isValid: boolean; error?: string } {
  if (bidAmount <= 0n) {
    return { isValid: false, error: 'Bid amount must be greater than 0' };
  }

  if (bidAmount < minimumBid) {
    return { isValid: false, error: 'Bid amount is below minimum required' };
  }

  if (ceilingPrice && bidAmount > ceilingPrice) {
    return { isValid: false, error: 'Bid amount exceeds ceiling price' };
  }

  return { isValid: true };
}

/**
 * Check if bid amount is valid for buyout
 * @param bidAmount Proposed bid amount in wei
 * @param ceilingPrice Ceiling/buyout price in wei
 * @returns True if bid equals or exceeds ceiling price
 */
export function isBuyoutBid(bidAmount: bigint, ceilingPrice: bigint): boolean {
  return bidAmount >= ceilingPrice;
}

/**
 * Calculate percentage increase from previous bid
 * @param newBid New bid amount in wei
 * @param previousBid Previous bid amount in wei
 * @returns Percentage increase (e.g., 5.5 for 5.5%)
 */
export function calculateBidIncrease(newBid: bigint, previousBid: bigint): number {
  if (previousBid === 0n) return 0;
  const increase = ((newBid - previousBid) * 10000n) / previousBid;
  return Number(increase) / 100;
}

/**
 * Format bid amount for display with proper decimals
 * @param amount Amount in wei
 * @param decimals Number of decimal places (default: 4)
 * @returns Formatted string (e.g., "1.2345")
 */
export function formatBidAmount(amount: bigint, decimals = 4): string {
  const eth = Number(amount) / 1e18;
  return eth.toFixed(decimals);
}

/**
 * Convert ETH to USD based on current price
 * @param ethAmount Amount in ETH (as number)
 * @param ethPriceUsd Current ETH price in USD
 * @returns USD amount
 */
export function ethToUsd(ethAmount: number, ethPriceUsd: number): number {
  return ethAmount * ethPriceUsd;
}

/**
 * Calculate quick bid suggestions (e.g., +10%, +20%)
 * @param currentBid Current highest bid in wei
 * @param percentages Array of percentage increases (e.g., [10, 20, 50])
 * @returns Array of suggested bid amounts in wei
 */
export function calculateQuickBids(currentBid: bigint, percentages: number[]): bigint[] {
  return percentages.map((percent) => {
    return currentBid + (currentBid * BigInt(percent * 100)) / 10000n;
  });
}

/**
 * Parse user input to wei amount
 * @param input User input string (e.g., "1.5")
 * @returns Amount in wei, or null if invalid
 */
export function parseEthInput(input: string): bigint | null {
  try {
    const cleaned = input.trim();
    if (!cleaned || isNaN(Number(cleaned))) return null;

    const amount = parseFloat(cleaned);
    if (amount <= 0) return null;

    return BigInt(Math.floor(amount * 1e18));
  } catch {
    return null;
  }
}
