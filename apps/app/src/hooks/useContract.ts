import { useCallback, useState } from 'react';
import { getSigner } from '../lib/web3/provider';
import { EncodedTransaction } from '../types';
import { decodeContractError, isUserRejection } from '../lib/web3/errors';
import toast from 'react-hot-toast';

export function useContract() {
  const [isLoading, setIsLoading] = useState(false);

  const sendTransaction = useCallback(async (tx: EncodedTransaction) => {
    setIsLoading(true);
    let toastId: string | undefined;

    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error('Please connect your wallet');
        return null;
      }

      // Send transaction (will open wallet popup)
      // Note: This may throw before opening popup if estimateGas fails
      const transaction = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });

      // Transaction was sent successfully (popup opened and signed)
      // Now show loading toast
      toastId = toast.loading('Transaction submitted. Waiting for confirmation...');

      const receipt = await transaction.wait();

      if (receipt?.status === 1) {
        toast.success('Transaction confirmed!', { id: toastId });
        return receipt;
      } else {
        toast.error('Transaction failed', { id: toastId });
        return null;
      }
    } catch (error: unknown) {
      console.error('Transaction error:', error);

      // Dismiss loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Don't show error if user rejected
      if (isUserRejection(error)) {
        toast.error('Transaction cancelled by user');
        return null;
      }

      // Decode and show user-friendly error message
      const errorMessage = decodeContractError(error);

      // Show detailed error message
      toast.error(errorMessage, {
        duration: 10000,
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendTransaction, isLoading };
}
