import { ethers } from 'ethers';
import { Address } from '../../types';

const NONCE_STORAGE_KEY = 'auth_nonce';
const SIGNATURE_STORAGE_KEY = 'auth_signature';
const TIMESTAMP_STORAGE_KEY = 'auth_timestamp';
const AUTH_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

export function generateMessage(address: Address, nonce: string): string {
  return `Sign in to AIBLES NFT Marketplace

Wallet: ${address}
Nonce: ${nonce}
Timestamp: ${Date.now()}

This signature will not trigger any blockchain transaction or cost any gas fees.`;
}

export function saveAuthData(address: Address, signature: string, nonce: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(`${address.toLowerCase()}_nonce`, nonce);
  localStorage.setItem(`${address.toLowerCase()}_signature`, signature);
  localStorage.setItem(`${address.toLowerCase()}_timestamp`, Date.now().toString());
}

export function getAuthData(address: Address): { signature: string; nonce: string; timestamp: number } | null {
  if (typeof window === 'undefined') return null;

  const signature = localStorage.getItem(`${address.toLowerCase()}_signature`);
  const nonce = localStorage.getItem(`${address.toLowerCase()}_nonce`);
  const timestamp = localStorage.getItem(`${address.toLowerCase()}_timestamp`);

  if (!signature || !nonce || !timestamp) return null;

  const authTime = parseInt(timestamp, 10);
  if (Date.now() - authTime > AUTH_EXPIRY) {
    clearAuthData(address);
    return null;
  }

  return { signature, nonce, timestamp: authTime };
}

export function clearAuthData(address: Address): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(`${address.toLowerCase()}_nonce`);
  localStorage.removeItem(`${address.toLowerCase()}_signature`);
  localStorage.removeItem(`${address.toLowerCase()}_timestamp`);
}

export function isAuthenticated(address: Address): boolean {
  return getAuthData(address) !== null;
}

export async function signMessage(signer: ethers.Signer, message: string): Promise<string> {
  return await signer.signMessage(message);
}

export function verifySignature(message: string, signature: string, expectedAddress: Address): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
