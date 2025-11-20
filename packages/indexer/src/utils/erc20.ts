import * as p from '@subsquid/evm-codec';
import { fun } from '@subsquid/evm-abi';

// ERC-20 standard functions
export const erc20Symbol = fun('0x95d89b41', 'symbol()', {}, p.string);
export const erc20Decimals = fun('0x313ce567', 'decimals()', {}, p.uint8);
export const erc20Name = fun('0x06fdde03', 'name()', {}, p.string);

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Fetch ERC-20 token metadata from contract
 * Returns default values if contract calls fail
 */
export async function fetchTokenInfo(
  ctx: { _chain: { client: { call: (method: string, params: any[]) => Promise<any> } } },
  block: { header: { hash: string } },
  tokenAddress: string
): Promise<TokenInfo> {
  const address = tokenAddress.toLowerCase();

  // Default values for native token
  if (address === '0x0000000000000000000000000000000000000000') {
    return {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    };
  }

  let symbol = 'TKN';
  let decimals = 18;
  let name = `Token_${address.slice(0, 10)}`;

  try {
    // Try to fetch symbol
    // Use "latest" instead of historical block hash to avoid archive node requirement
    const symbolData = erc20Symbol.encode({});
    const symbolResult = await ctx._chain.client.call('eth_call', [
      { to: address, data: symbolData },
      'latest',
    ]);
    if (symbolResult && symbolResult !== '0x') {
      symbol = erc20Symbol.decodeResult(symbolResult);
    }
  } catch (error) {
    // Silently fail and use default value
  }

  try {
    // Try to fetch decimals
    const decimalsData = erc20Decimals.encode({});
    const decimalsResult = await ctx._chain.client.call('eth_call', [
      { to: address, data: decimalsData },
      'latest',
    ]);
    if (decimalsResult && decimalsResult !== '0x') {
      decimals = erc20Decimals.decodeResult(decimalsResult);
    }
  } catch (error) {
    // Silently fail and use default value
  }

  try {
    // Try to fetch name
    const nameData = erc20Name.encode({});
    const nameResult = await ctx._chain.client.call('eth_call', [
      { to: address, data: nameData },
      'latest',
    ]);
    if (nameResult && nameResult !== '0x') {
      name = erc20Name.decodeResult(nameResult);
    }
  } catch (error) {
    // Silently fail and use default value
  }

  return { name, symbol, decimals };
}
