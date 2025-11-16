import { EncodedTransaction } from '../../types';
import { getProvider } from './provider';

/**
 * Security Utilities for Web3 Transactions
 * Provides transaction simulation and security checks
 */

export interface SecurityCheck {
  isSafe: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Simulate transaction before sending
 * Helps detect errors before actual execution
 */
export async function simulateTransaction(
  tx: EncodedTransaction,
  fromAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const provider = getProvider();
    if (!provider) {
      return { success: false, error: 'Provider not available' };
    }

    // Use eth_call to simulate transaction
    await provider.call({
      from: fromAddress,
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || '0'),
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if contract address is verified
 * Basic check to warn about unverified contracts
 */
export async function isContractVerified(
  contractAddress: string
): Promise<boolean> {
  try {
    const provider = getProvider();
    if (!provider) return false;

    // Check if address has code (is a contract)
    const code = await provider.getCode(contractAddress);
    return code !== '0x' && code !== '0x0';
  } catch (error) {
    console.error('Contract verification check error:', error);
    return false;
  }
}

/**
 * Perform security checks on transaction
 */
export async function performSecurityChecks(
  tx: EncodedTransaction,
  fromAddress: string,
  options: {
    checkSimulation?: boolean;
    checkContract?: boolean;
    maxValue?: bigint;
  } = {}
): Promise<SecurityCheck> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const { checkSimulation = true, checkContract = true, maxValue } = options;

  try {
    // Check 1: Verify contract exists
    if (checkContract) {
      const isVerified = await isContractVerified(tx.to);
      if (!isVerified) {
        warnings.push('Contract address could not be verified');
      }
    }

    // Check 2: Simulate transaction
    if (checkSimulation) {
      const simulation = await simulateTransaction(tx, fromAddress);
      if (!simulation.success) {
        errors.push(`Transaction simulation failed: ${simulation.error}`);
      }
    }

    // Check 3: Check transaction value
    const txValue = BigInt(tx.value || '0');
    if (maxValue && txValue > maxValue) {
      warnings.push(
        `Transaction value (${txValue}) exceeds recommended maximum (${maxValue})`
      );
    }

    // Check 4: Warn about high value transactions
    if (txValue > BigInt('1000000000000000000')) {
      // > 1 ETH
      warnings.push('High value transaction detected. Please verify carefully');
    }

    return {
      isSafe: errors.length === 0,
      warnings,
      errors,
    };
  } catch (error) {
    console.error('Security check error:', error);
    return {
      isSafe: false,
      warnings,
      errors: ['Security check failed'],
    };
  }
}

/**
 * Check if user is attempting to interact with known malicious contract
 * (Placeholder - would need actual blacklist/registry)
 */
export function isKnownMaliciousContract(address: string): boolean {
  // This would be replaced with actual blacklist check
  // For now, just a basic sanity check
  const blacklist: string[] = [];
  return blacklist.includes(address.toLowerCase());
}

/**
 * Validate transaction data format
 */
export function validateTransactionFormat(tx: EncodedTransaction): {
  isValid: boolean;
  error?: string;
} {
  // Check required fields
  if (!tx.to || !tx.data) {
    return { isValid: false, error: 'Missing required transaction fields' };
  }

  // Check address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(tx.to)) {
    return { isValid: false, error: 'Invalid contract address format' };
  }

  // Check data format
  if (!tx.data.startsWith('0x')) {
    return { isValid: false, error: 'Invalid transaction data format' };
  }

  return { isValid: true };
}
