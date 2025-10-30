import { useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { getBrowserProvider, getSigner, getEthereumProvider } from '../lib/web3/provider';
import { CHAIN_CONFIG } from '../lib/contracts/addresses';
import { switchToCorrectNetwork, isCorrectNetwork } from '../lib/web3/network';
import { Address } from '../types';
import {
  generateNonce,
  generateMessage,
  signMessage,
  saveAuthData,
  getAuthData,
  clearAuthData,
} from '../lib/auth/signature';
import toast from 'react-hot-toast';

// Global flag to prevent multiple simultaneous signature requests across all component instances
let isRequestingSignature = false;

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
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      alert('Please install MetaMask or another Web3 wallet to use this application');
      return;
    }

    setIsConnecting(true);

    try {
      // Clear disconnect flag when manually connecting
      localStorage.removeItem('wallet-disconnected');

      const provider = getBrowserProvider();
      if (!provider) throw new Error('Provider not found');

      const accounts = await provider.send('eth_requestAccounts', []);
      let network = await provider.getNetwork();
      let currentChainId = Number(network.chainId);

      // Check if on correct network, if not, try to switch
      if (!isCorrectNetwork(currentChainId)) {
        toast.loading('Switching to Sepolia network...', { id: 'network-switch' });
        const switched = await switchToCorrectNetwork();

        if (!switched) {
          toast.error('Please switch to Sepolia network manually', { id: 'network-switch' });
          setIsConnecting(false);
          return;
        }

        toast.success('Switched to Sepolia network', { id: 'network-switch' });

        // Refresh network info after switch
        network = await provider.getNetwork();
        currentChainId = Number(network.chainId);
      }

      const userAddress = accounts[0] as Address;
      setChainId(currentChainId);

      // Check for existing auth or request signature
      const authData = getAuthData(userAddress);
      if (authData) {
        // Has valid signature, can connect
        setAddress(userAddress);
        await updateBalance(userAddress);
        setAuth(authData.signature, authData.nonce, authData.timestamp);
      } else {
        // Need signature first - check if already requesting to prevent duplicates
        if (isRequestingSignature) {
          return;
        }

        isRequestingSignature = true;

        // Safety timeout: reset flag after 30 seconds if still stuck
        const timeoutId = setTimeout(() => {
          if (isRequestingSignature) {
            isRequestingSignature = false;
          }
        }, 30000);

        try {
          const signer = await getSigner();
          if (!signer) throw new Error('Signer not found');

          const nonce = generateNonce();
          const message = generateMessage(userAddress, nonce);
          const signature = await signMessage(signer, message);

          // Only set address AFTER successful signature
          saveAuthData(userAddress, signature, nonce);
          setAuth(signature, nonce, Date.now());
          setAddress(userAddress);
          await updateBalance(userAddress);
        } finally {
          clearTimeout(timeoutId);
          isRequestingSignature = false;
        }
      }
    } catch (error: unknown) {
      console.error('Connection error:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        alert('Connection rejected by user');
      }
      // Reset state on error
      reset();
    } finally {
      setIsConnecting(false);
    }
  }, [setIsConnecting, setAddress, setChainId, updateBalance, setAuth, reset]);

  const disconnect = useCallback(() => {
    // Clear auth data for current wallet
    if (address) {
      clearAuthData(address);
    }
    clearAuth();
    reset();

    // Set flag to prevent auto-reconnect
    localStorage.setItem('wallet-disconnected', 'true');

    // Optional: Clear ALL auth data to force re-sign for all wallets
    // Uncomment this to require signature every time after disconnect
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('_signature') || key.includes('_nonce') || key.includes('_timestamp')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Reload page to clear all state
    window.location.reload();
  }, [address, clearAuth, reset]);

  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        // Clear disconnect flag when user switches account in MetaMask
        localStorage.removeItem('wallet-disconnected');

        const newAddress = accounts[0] as Address;

        const authData = getAuthData(newAddress);
        if (authData) {
          // Has signature, can set address
          setAddress(newAddress);
          updateBalance(newAddress);
          setAuth(authData.signature, authData.nonce, authData.timestamp);
        } else {
          // New wallet needs to sign first - check if already requesting
          if (isRequestingSignature) {
            return;
          }

          clearAuth();
          isRequestingSignature = true;

          // Safety timeout: reset flag after 30 seconds if still stuck
          const timeoutId = setTimeout(() => {
            if (isRequestingSignature) {
              isRequestingSignature = false;
            }
          }, 30000);

          try {
            const signer = await getSigner();
            if (signer) {
              const nonce = generateNonce();
              const message = generateMessage(newAddress, nonce);
              const signature = await signMessage(signer, message);

              // Only set address AFTER signature
              saveAuthData(newAddress, signature, nonce);
              setAuth(signature, nonce, Date.now());
              setAddress(newAddress);
              updateBalance(newAddress);
            }
          } catch (error) {
            console.error('Error signing message:', error);
            // Don't set address if signature failed
            reset();
          } finally {
            clearTimeout(timeoutId);
            isRequestingSignature = false;
          }
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [disconnect, setAddress, setChainId, updateBalance, setAuth, clearAuth, reset]);

  useEffect(() => {
    const checkConnection = async () => {
      const ethereum = getEthereumProvider();
      if (!ethereum) return;

      // Don't auto-reconnect if user manually disconnected
      const wasDisconnected = localStorage.getItem('wallet-disconnected');
      if (wasDisconnected === 'true') {
        return;
      }

      const provider = getBrowserProvider();
      if (!provider) return;

      try {
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          const userAddress = accounts[0] as Address;
          let network = await provider.getNetwork();
          let currentChainId = Number(network.chainId);

          // Check and switch network if wrong
          if (!isCorrectNetwork(currentChainId)) {
            const switched = await switchToCorrectNetwork();
            if (switched) {
              network = await provider.getNetwork();
              currentChainId = Number(network.chainId);
            }
          }

          // Only auto-connect if has valid signature
          const authData = getAuthData(userAddress);
          if (authData) {
            setAddress(userAddress);
            setChainId(currentChainId);
            await updateBalance(userAddress);
            setAuth(authData.signature, authData.nonce, authData.timestamp);
          }
          // If no auth data, don't auto-connect (user must click Connect button)
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
