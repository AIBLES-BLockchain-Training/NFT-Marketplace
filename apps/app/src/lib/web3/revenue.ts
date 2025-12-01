import { ethers } from 'ethers';

const LISTING_ABI = [
  'function listingAccumulatedFees(address currency) external view returns (uint256)',
  'function getCurrencyFee(address currency) external view returns (uint256)',
  'function feeReceiver() external view returns (address)',
];

const AUCTION_ABI = [
  'function getAccumulatedFeeAuction(address currency) external view returns (uint256)',
  'function getFeeReceiverAuction() external view returns (address)',
];

const OFFER_ABI = [
  'function offerAccumulatedFees(address currency) external view returns (uint256)',
  'function feeRecipient() external view returns (address)',
  'function feePercentage() external view returns (uint256)',
];

// Shared ABI for getCurrencyFee - both extensions use Listing's implementation via Router
const GET_CURRENCY_FEE_ABI = [
  'function getCurrencyFee(address currency) external view returns (uint256)',
];

/**
 * Get accumulated fees for a specific extension and currency
 * NOTE: Uses Router contract address because it uses delegatecall pattern
 * Router stores data and delegates to extension contracts for logic
 */
export async function getAccumulatedFees(
  extensionType: 'listing' | 'auction' | 'offer',
  currency: string
): Promise<bigint> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const routerAddress = process.env.NEXT_PUBLIC_ROUTER_CONTRACT!;

    // Different ABIs for different extensions
    if (extensionType === 'listing') {
      const contract = new ethers.Contract(routerAddress, LISTING_ABI, provider);
      const fees = await contract.listingAccumulatedFees(currency);
      return fees;
    } else if (extensionType === 'auction') {
      const contract = new ethers.Contract(routerAddress, AUCTION_ABI, provider);
      const fees = await contract.getAccumulatedFeeAuction(currency);
      return fees;
    } else if (extensionType === 'offer') {
      const contract = new ethers.Contract(routerAddress, OFFER_ABI, provider);
      const fees = await contract.offerAccumulatedFees(currency);
      return fees;
    } else {
      return BigInt(0);
    }
  } catch (error) {
    // Currency may not be configured in this extension, return 0
    console.debug(`No accumulated fees for ${extensionType} (currency not configured or no fees yet)`);
    return BigInt(0);
  }
}

/**
 * Get accumulated fees for all currencies in a specific extension
 */
export async function getFeesForAllCurrencies(
  extensionType: 'listing' | 'auction' | 'offer',
  currencies: Array<{ id: string; symbol: string }>
): Promise<Map<string, bigint>> {
  const feesMap = new Map<string, bigint>();

  for (const currency of currencies) {
    const fees = await getAccumulatedFees(extensionType, currency.id);
    feesMap.set(currency.id, fees);
  }

  return feesMap;
}

/**
 * Get fee receiver address (MultiSig wallet)
 */
export async function getFeeReceiverAddress(
  extensionType: 'listing' | 'auction' | 'offer'
): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const routerAddress = process.env.NEXT_PUBLIC_ROUTER_CONTRACT!;
    
    let contract;
    if (extensionType === 'auction') {
      contract = new ethers.Contract(routerAddress, AUCTION_ABI, provider);
      const receiver = await contract.getFeeReceiverAuction();
      return receiver;
    } else if (extensionType === 'offer') {
      contract = new ethers.Contract(routerAddress, OFFER_ABI, provider);
      const receiver = await contract.feeRecipient();
      return receiver;
    } else {
      contract = new ethers.Contract(routerAddress, LISTING_ABI, provider);
      const receiver = await contract.feeReceiver();
      return receiver;
    }
  } catch (error) {
    console.error('Error getting fee receiver:', error);
    return '';
  }
}

/**
 * Get fee percentage for a currency
 * NOTE: getCurrencyFee is only registered in Listing extension (selector 0x752d8a09)
 * Both Listing and Auction use the same storage, so we always call via Listing's function
 */
export async function getCurrencyFeePercentage(
  extensionType: 'listing' | 'auction' | 'offer',
  currency: string
): Promise<number> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const routerAddress = process.env.NEXT_PUBLIC_ROUTER_CONTRACT!;

    if (extensionType === 'offer') {
      // Offer uses global fee percentage, not currency-specific
      const contract = new ethers.Contract(routerAddress, OFFER_ABI, provider);
      const feeBps = await contract.feePercentage();
      return Number(feeBps) / 100;
    } else {
      // Listing and Auction use currency-specific fees via getCurrencyFee function
      const contract = new ethers.Contract(routerAddress, GET_CURRENCY_FEE_ABI, provider);
      const feeBps = await contract.getCurrencyFee(currency);
      return Number(feeBps) / 100;
    }
  } catch (error) {
    console.debug(`Currency ${currency} fee not configured in ${extensionType}`);
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
