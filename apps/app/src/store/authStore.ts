import { create } from 'zustand';
import { Address } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  signature: string | null;
  nonce: string | null;
  timestamp: number | null;

  setAuth: (signature: string, nonce: string, timestamp: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  signature: null,
  nonce: null,
  timestamp: null,

  setAuth: (signature, nonce, timestamp) =>
    set({
      isAuthenticated: true,
      signature,
      nonce,
      timestamp,
    }),
  clearAuth: () =>
    set({
      isAuthenticated: false,
      signature: null,
      nonce: null,
      timestamp: null,
    }),
}));
