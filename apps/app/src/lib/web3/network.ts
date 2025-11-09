import { CHAIN_CONFIG } from '../contracts/addresses';

export interface NetworkConfig {
  chainId: string; // hex
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

// Sepolia Testnet configuration
export const SEPOLIA_NETWORK: NetworkConfig = {
  chainId: '0xaa36a7', // 11155111 in decimal
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'SepoliaETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://sepolia.infura.io/v3/',
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia.publicnode.com',
  ],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

/**
 * Switch to the correct network or add it if it doesn't exist
 */
export async function switchToCorrectNetwork(): Promise<boolean> {
  if (!window.ethereum) {
    console.error('MetaMask not installed');
    return false;
  }

  const targetChainId = `0x${CHAIN_CONFIG.chainId.toString(16)}`;

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });

    return true;
  } catch (switchError: unknown) {
    // Error code 4902 means the chain has not been added to MetaMask
    if (switchError && typeof switchError === 'object' && 'code' in switchError && switchError.code === 4902) {
      try {
        // Add the network to MetaMask
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_NETWORK],
        });

        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        return false;
      }
    }

    // User rejected the request or other error
    console.error('Failed to switch network:', switchError);
    return false;
  }
}

/**
 * Check if current network is correct
 */
export function isCorrectNetwork(currentChainId: number): boolean {
  return currentChainId === CHAIN_CONFIG.chainId;
}
