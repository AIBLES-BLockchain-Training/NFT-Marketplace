import { create } from 'zustand';
import { Address } from '../types';

interface WalletState {
  address: Address | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;

  setAddress: (address: Address | null) => void;
  setChainId: (chainId: number | null) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setBalance: (balance: string | null) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  balance: null,

  setAddress: (address) => set({ address, isConnected: !!address }),
  setChainId: (chainId) => set({ chainId }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setBalance: (balance) => set({ balance }),
  reset: () =>
    set({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
    }),
}));
