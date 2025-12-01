/**
 * Convert IPFS URLs to HTTP gateway URLs with multiple fallbacks
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // Already HTTP URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    let hash = url.replace('ipfs://', '');
    // Handle Rarible's format: ipfs://ipfs/hash -> remove duplicate /ipfs/
    if (hash.startsWith('ipfs/')) {
      hash = hash.replace('ipfs/', '');
    }
    return `https://dweb.link/ipfs/${hash}`;
  }

  // Handle /ipfs/ path
  if (url.startsWith('/ipfs/')) {
    return `https://dweb.link${url}`;
  }

  // Handle bare IPFS hash (no protocol)
  if (url.length === 46 && url.startsWith('Qm')) {
    return `https://dweb.link/ipfs/${url}`;
  }

  return url;
}

/**
 * Get multiple IPFS gateway URLs for fallback
 * @param url - IPFS URL to convert
 * @param width - Optional width for image optimization (in pixels)
 */
export function getIpfsGateways(url: string | undefined, width?: number): string[] {
  if (!url) return [];

  let hash = '';

  if (url.startsWith('ipfs://')) {
    hash = url.replace('ipfs://', '');
    // Handle Rarible's format: ipfs://ipfs/hash -> remove duplicate /ipfs/
    if (hash.startsWith('ipfs/')) {
      hash = hash.replace('ipfs/', '');
    }
  } else if (url.startsWith('/ipfs/')) {
    hash = url.replace('/ipfs/', '');
  } else if (url.startsWith('http')) {
    return [url];
  } else if (url.length === 46 && url.startsWith('Qm')) {
    // Bare IPFS hash
    hash = url;
  } else {
    return [];
  }

  // Build width parameter for gateways that support it
  // const widthParam = width ? `?width=${width}` : '';  // Currently unused

  // Return multiple gateways for fallback with optimization
  return [
    `https://dweb.link/ipfs/${hash}`,
    `https://ipfs.io/ipfs/${hash}`,
    `https://gateway.pinata.cloud/ipfs/${hash}`,
    `https://4everland.io/ipfs/${hash}`,
  ];
}

/**
 * Truncate long string (for addresses, tokenIds, etc.)
 */
export function truncate(str: string | undefined, startChars = 6, endChars = 4): string {
  if (!str) return '';

  if (str.length <= startChars + endChars) {
    return str;
  }

  return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
}

/**
 * Truncate tokenId intelligently
 */
export function truncateTokenId(tokenId: string | undefined): string {
  if (!tokenId) return '';

  // If tokenId is short (< 10 chars), show full
  if (tokenId.length <= 10) {
    return tokenId;
  }

  // If tokenId is very long (> 20 chars), truncate more
  if (tokenId.length > 20) {
    return truncate(tokenId, 8, 4);
  }

  // Medium length
  return truncate(tokenId, 6, 4);
}

/**
 * Format USDC amount from wei (6 decimals) to human readable
 * @param amount - Amount in USDC wei (6 decimals)
 * @param displayDecimals - Number of decimal places to show
 */
export function formatUSDC(amount: string | bigint, displayDecimals = 2): string {
  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    if (amountBigInt === 0n) return '0.00';
    
    // Convert from 6 decimals to human readable
    const divisor = 10n ** 6n;
    const whole = amountBigInt / divisor;
    const fraction = amountBigInt % divisor;
    
    // Format with the specified number of decimal places
    const fractionStr = fraction.toString().padStart(6, '0');
    const truncatedFraction = fractionStr.slice(0, displayDecimals);
    
    if (displayDecimals === 0) {
      return whole.toString();
    }
    
    // Remove trailing zeros
    const cleanFraction = truncatedFraction.replace(/0+$/, '');
    if (cleanFraction === '') {
      return whole.toString() + '.00';
    }
    
    return `${whole.toString()}.${cleanFraction.padEnd(Math.max(2, displayDecimals), '0')}`;
  } catch (error) {
    console.warn('Failed to format USDC amount:', amount, error);
    return '0.00';
  }
}

/**
 * Format USDC amount with symbol
 * @param amount - Amount in USDC wei (6 decimals)
 * @param displayDecimals - Number of decimal places to show
 * @param showSymbol - Whether to show USDC symbol
 */
export function formatUSDCWithSymbol(
  amount: string | bigint, 
  displayDecimals = 2, 
  showSymbol = true
): string {
  const formatted = formatUSDC(amount, displayDecimals);
  return showSymbol ? `${formatted} USDC` : formatted;
}

/**
 * Format USDC amount from legacy 18-decimal storage to proper display
 * This handles old database entries that stored USDC prices in 18-decimal format
 * @param amount - Amount in legacy 18-decimal format
 * @param displayDecimals - Number of decimal places to show
 * @param showSymbol - Whether to show USDC symbol
 */
export function formatUSDCFromLegacy(
  amount: string | bigint, 
  displayDecimals = 2, 
  showSymbol = true
): string {
  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    
    // Check the size of the number to determine format
    // For USDC: 10 USDC = 10,000,000 (6 decimals) or 10,000,000,000,000,000,000 (18 decimals legacy)
    
    // If number is very large (18+ digits), it's definitely 18-decimal format
    if (amountBigInt >= BigInt('1000000000000000000')) { // 1e18
      const usdcAmount = amountBigInt / BigInt(10**12);
      return formatUSDCWithSymbol(usdcAmount, displayDecimals, showSymbol);
    }
    
    // If number is medium (7-17 digits), could be either format - check more carefully
    if (amountBigInt >= BigInt('1000000')) { // 1e6
      // If it's exactly divisible by 10^12 and result > 0, it's likely 18-decimal
      if (amountBigInt % BigInt(10**12) === 0n && amountBigInt >= BigInt(10**12)) {
        const usdcAmount = amountBigInt / BigInt(10**12);
        return formatUSDCWithSymbol(usdcAmount, displayDecimals, showSymbol);
      }
      
      // Otherwise assume 6-decimal format
      return formatUSDCWithSymbol(amountBigInt, displayDecimals, showSymbol);
    }
    
    // Small numbers (< 1M) - assume already in 6-decimal
    return formatUSDCWithSymbol(amountBigInt, displayDecimals, showSymbol);
    
  } catch (error) {
    console.warn('Failed to format USDC amount from legacy format:', amount, error);
    return showSymbol ? '0.00 USDC' : '0.00';
  }
}

/**
 * Check if a currency address is USDC
 * @param currencyAddress - Currency contract address
 */
export function isUSDCCurrency(currencyAddress: string): boolean {
  // Use direct import instead of require
  const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  return currencyAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase();
}

/**
 * Format ETH amount from wei to human readable
 * @param amount - Amount in wei (18 decimals)
 * @param displayDecimals - Number of decimal places to show
 */
export function formatEther(amount: string | bigint, displayDecimals = 4): string {
  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    if (amountBigInt === 0n) return '0.0000';
    
    // Convert from 18 decimals to human readable
    const divisor = 10n ** 18n;
    const whole = amountBigInt / divisor;
    const fraction = amountBigInt % divisor;
    
    // Format with the specified number of decimal places
    const fractionStr = fraction.toString().padStart(18, '0');
    const truncatedFraction = fractionStr.slice(0, displayDecimals);
    
    if (displayDecimals === 0) {
      return whole.toString();
    }
    
    // Remove trailing zeros
    const cleanFraction = truncatedFraction.replace(/0+$/, '');
    if (cleanFraction === '') {
      return whole.toString() + '.0000';
    }
    
    return `${whole.toString()}.${cleanFraction.padEnd(Math.max(4, displayDecimals), '0')}`;
  } catch (error) {
    console.warn('Failed to format Ether amount:', amount, error);
    return '0.0000';
  }
}

/**
 * Format ETH amount with symbol
 * @param amount - Amount in wei (18 decimals)
 * @param displayDecimals - Number of decimal places to show
 * @param showSymbol - Whether to show ETH symbol
 */
export function formatEtherWithSymbol(
  amount: string | bigint, 
  displayDecimals = 4, 
  showSymbol = true
): string {
  const formatted = formatEther(amount, displayDecimals);
  return showSymbol ? `${formatted} ETH` : formatted;
}

/**
 * Filter and format only USDC amounts from multi-currency data
 * @param items - Array of items with currency property
 * @param amountField - Field name that contains the amount
 * @param currencyField - Field name that contains currency info
 */
export function filterAndFormatUSDCAmounts<T>(
  items: T[],
  amountField: keyof T,
  currencyField: keyof T
): Array<T & { formattedAmount: string; isUSDC: boolean }> {
  return items.map(item => {
    const currency = item[currencyField] as Record<string, unknown>;
    const amount = item[amountField] as string | bigint;
    
    // Check if currency is USDC (handle both direct address and currency object)
    let isUSDC = false;
    if (typeof currency === 'string') {
      isUSDC = isUSDCCurrency(currency);
    } else if (currency?.id || currency?.address) {
      isUSDC = isUSDCCurrency(currency.id || currency.address);
    }
    
    return {
      ...item,
      formattedAmount: isUSDC ? formatUSDC(amount) : '0.00',
      isUSDC
    };
  });
}
