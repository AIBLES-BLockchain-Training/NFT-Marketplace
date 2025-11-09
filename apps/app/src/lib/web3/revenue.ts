import { ethers } from 'ethers';

const LISTING_ABI = [
  'function accumulatedFees(address currency) external view returns (uint256)',
  'function getCurrencyFee(address currency) external view returns (uint256)',
  'function feeReceiver() external view returns (address)',
];

/**
 * Get accumulated fees for a specific extension and currency
 */
export async function getAccumulatedFees(
  extensionType: 'listing' | 'auction' | 'offer',
  currency: string,
  routerAddress: string
): Promise<bigint> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(routerAddress, LISTING_ABI, provider);

    const fees = await contract.accumulatedFees(currency);
    return fees;
  } catch (error) {
    console.error(`Error getting accumulated fees for ${extensionType}:`, error);
    return BigInt(0);
  }
}

/**
 * Get accumulated fees for all currencies in a specific extension
 */
export async function getFeesForAllCurrencies(
  extensionType: 'listing' | 'auction' | 'offer',
  currencies: Array<{ id: string; symbol: string }>,
  routerAddress: string
): Promise<Map<string, bigint>> {
  const feesMap = new Map<string, bigint>();

  for (const currency of currencies) {
    const fees = await getAccumulatedFees(extensionType, currency.id, routerAddress);
    feesMap.set(currency.id, fees);
  }

  return feesMap;
}

/**
 * Get fee receiver address (MultiSig wallet)
 */
export async function getFeeReceiverAddress(routerAddress: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(routerAddress, LISTING_ABI, provider);

    const receiver = await contract.feeReceiver();
    return receiver;
  } catch (error) {
    console.error('Error getting fee receiver:', error);
    return '';
  }
}

/**
 * Get fee percentage for a currency
 */
export async function getCurrencyFeePercentage(
  currency: string,
  routerAddress: string
): Promise<number> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(routerAddress, LISTING_ABI, provider);

    const feeBps = await contract.getCurrencyFee(currency);
    // Convert basis points to percentage (e.g., 250 -> 2.5%)
    return Number(feeBps) / 100;
  } catch (error) {
    console.error('Error getting currency fee:', error);
    return 0;
  }
}

/**
 * Format fee amount with proper decimals
 */
export function formatFeeAmount(amount: bigint, decimals: number, symbol: string): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return `0 ${symbol}`;
  if (num < 0.0001) return `< 0.0001 ${symbol}`;

  // Format with commas for thousands
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })} ${symbol}`;
}

/**
 * Calculate USD value (if you have price feeds)
 */
export function calculateUSDValue(
  amount: bigint,
  decimals: number,
  priceUSD: number
): number {
  const formatted = ethers.formatUnits(amount, decimals);
  return parseFloat(formatted) * priceUSD;
}
