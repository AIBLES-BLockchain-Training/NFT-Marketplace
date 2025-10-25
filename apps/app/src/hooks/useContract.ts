import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import { getSigner } from '../lib/web3/provider';
import { EncodedTransaction } from '../types';
import toast from 'react-hot-toast';

export function useContract() {
  const [isLoading, setIsLoading] = useState(false);

  const sendTransaction = useCallback(async (tx: EncodedTransaction) => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      if (!signer) {
        toast.error('Please connect your wallet');
        return null;
      }

      const toastId = toast.loading('Waiting for confirmation...');

      const transaction = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });

      toast.loading('Transaction submitted. Waiting for confirmation...', { id: toastId });

      const receipt = await transaction.wait();

      if (receipt?.status === 1) {
        toast.success('Transaction confirmed!', { id: toastId });
        return receipt;
      } else {
        toast.error('Transaction failed', { id: toastId });
        return null;
      }
    } catch (error: any) {
      console.error('Transaction error:', error);

      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected');
      } else {
        toast.error(error.message || 'Transaction failed');
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendTransaction, isLoading };
}
