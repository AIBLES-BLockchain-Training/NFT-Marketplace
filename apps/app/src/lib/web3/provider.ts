import { ethers } from 'ethers';
import { CHAIN_CONFIG } from '../contracts/addresses';

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Get the Ethereum provider with multi-wallet support
 * Priority: MetaMask > Other wallets
 */
export function getEthereumProvider(): any {
  if (typeof window === 'undefined') return null;

  // Check if MetaMask is available
  if (window.ethereum?.isMetaMask) {
    return window.ethereum;
  }

  // Check if there are multiple providers (injected by different wallets)
  if (window.ethereum?.providers?.length) {
    // Try to find MetaMask in providers array
    const metamaskProvider = window.ethereum.providers.find((p: any) => p.isMetaMask);
    if (metamaskProvider) {
      return metamaskProvider;
    }
    // Return first provider if MetaMask not found
    return window.ethereum.providers[0];
  }

  // Return default ethereum provider
  return window.ethereum || null;
}

export function getBrowserProvider(): ethers.BrowserProvider | null {
  const provider = getEthereumProvider();
  if (!provider) {
    return null;
  }
  return new ethers.BrowserProvider(provider);
}

export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const provider = getBrowserProvider();
  if (!provider) return null;

  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
}

export function getRpcProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcEndpoint);
}

export async function switchNetwork(chainId: number): Promise<boolean> {
  const provider = getEthereumProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      console.error('Network not added to wallet');
    }
    return false;
  }
}
