import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { getBrowserProvider } from '../lib/web3/provider';
import { useWallet } from './useWallet';
import { USDC_ADDRESS, USDC_DECIMALS } from '../lib/constants';
import { ERC20_ABI } from '../lib/contracts/abis';

export function useUSDCBalance() {
  const { address, isConnected } = useWallet();
  const [usdcBalance, setUSDCBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUSDCBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setUSDCBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getBrowserProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      
      // Format with 6 decimals for USDC
      const formattedBalance = ethers.formatUnits(balance, USDC_DECIMALS);
      setUSDCBalance(formattedBalance);
    } catch (error: any) {
      console.error('Error fetching USDC balance:', error);
      setError(error.message || 'Failed to fetch USDC balance');
      setUSDCBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchUSDCBalance();
  }, [fetchUSDCBalance]);

  const refetch = useCallback(() => {
    fetchUSDCBalance();
  }, [fetchUSDCBalance]);

  return { 
    usdcBalance, 
    isLoading, 
    error,
    refetch 
  };
}