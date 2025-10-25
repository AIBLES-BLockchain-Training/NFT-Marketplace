import { useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { getBrowserProvider, getSigner } from '../lib/web3/provider';
import { CHAIN_CONFIG } from '../lib/contracts/addresses';
import { Address } from '../types';
import {
  generateNonce,
  generateMessage,
  signMessage,
  saveAuthData,
  getAuthData,
  clearAuthData,
} from '../lib/auth/signature';

export function useWallet() {
  const { address, chainId, isConnected, isConnecting, balance, setAddress, setChainId, setIsConnecting, setBalance, reset } =
    useWalletStore();
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const updateBalance = useCallback(async (addr: Address) => {
    const provider = getBrowserProvider();
    if (!provider) return;

    try {
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [setBalance]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    setIsConnecting(true);

    try {
      const provider = getBrowserProvider();
      if (!provider) throw new Error('Provider not found');

      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      const userAddress = accounts[0] as Address;
      setAddress(userAddress);
      setChainId(Number(network.chainId));
      await updateBalance(userAddress);

      const authData = getAuthData(userAddress);
      if (authData) {
        setAuth(authData.signature, authData.nonce, authData.timestamp);
      } else {
        const signer = await getSigner();
        if (!signer) throw new Error('Signer not found');

        const nonce = generateNonce();
        const message = generateMessage(userAddress, nonce);
        const signature = await signMessage(signer, message);

        saveAuthData(userAddress, signature, nonce);
        setAuth(signature, nonce, Date.now());
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      if (error.code === 4001) {
        alert('Connection rejected by user');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [setIsConnecting, setAddress, setChainId, updateBalance, setAuth]);

  const disconnect = useCallback(() => {
    if (address) {
      clearAuthData(address);
    }
    clearAuth();
    reset();
  }, [address, clearAuth, reset]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddress = accounts[0] as Address;
        setAddress(newAddress);
        updateBalance(newAddress);

        const authData = getAuthData(newAddress);
        if (authData) {
          setAuth(authData.signature, authData.nonce, authData.timestamp);
        } else {
          clearAuth();
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect, setAddress, setChainId, updateBalance, setAuth, clearAuth]);

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      const provider = getBrowserProvider();
      if (!provider) return;

      try {
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          const userAddress = accounts[0] as Address;
          const network = await provider.getNetwork();

          setAddress(userAddress);
          setChainId(Number(network.chainId));
          await updateBalance(userAddress);

          const authData = getAuthData(userAddress);
          if (authData) {
            setAuth(authData.signature, authData.nonce, authData.timestamp);
          }
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };

    checkConnection();
  }, [setAddress, setChainId, updateBalance, setAuth]);

  return {
    address,
    chainId,
    isConnected,
    isConnecting,
    isAuthenticated,
    balance,
    connect,
    disconnect,
    isCorrectNetwork: chainId === CHAIN_CONFIG.chainId,
  };
}
