import { ethers } from 'ethers';
import { EncodedTransaction } from '../../types';
import { getProvider } from './provider';

/**
 * Gas Estimation Utilities
 * Provides gas estimation for transactions
 */

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  totalCost: bigint;
  formatted: string;
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  tx: EncodedTransaction,
  fromAddress: string
): Promise<GasEstimate | null> {
  try {
    const provider = getProvider();
    if (!provider) {
      console.warn('Provider not available for gas estimation');
      return null;
    }

    // Estimate gas limit
    const gasLimit = await provider.estimateGas({
      from: fromAddress,
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || '0'),
    });

    // Get current gas price
    const feeData = await provider.getFeeData();

    // Calculate total cost (gas * gas price)
    const gasPrice = feeData.gasPrice || BigInt(0);
    const totalCost = gasLimit * gasPrice;

    return {
      gasLimit,
      gasPrice: feeData.gasPrice || undefined,
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
      totalCost,
      formatted: ethers.formatEther(totalCost),
    };
  } catch (error) {
    console.error('Gas estimation error:', error);
    return null;
  }
}

/**
 * Check if user has enough balance for transaction including gas
 */
export async function hasEnoughBalanceForGas(
  fromAddress: string,
  transactionValue: bigint,
  gasEstimate: GasEstimate
): Promise<boolean> {
  try {
    const provider = getProvider();
    if (!provider) return false;

    const balance = await provider.getBalance(fromAddress);
    const totalRequired = transactionValue + gasEstimate.totalCost;

    return balance >= totalRequired;
  } catch (error) {
    console.error('Balance check error:', error);
    return false;
  }
}
