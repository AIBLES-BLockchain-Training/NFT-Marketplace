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
  const widthParam = width ? `?width=${width}` : '';

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
