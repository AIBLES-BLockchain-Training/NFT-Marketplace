import { useState, useCallback } from 'react';
import { getSigner } from '../lib/web3/provider';
import { EncodedTransaction } from '../types';
import { decodeContractError, isUserRejection } from '../lib/web3/errors';

interface TransactionResult {
  success: boolean;
  message: string;
  txHash?: string;
}

export function useTransactionModal() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);

  const sendTransaction = useCallback(
    async (tx: EncodedTransaction, successMessage = 'Transaction successful') => {
      setIsLoading(true);

      try {
        const signer = await getSigner();
        if (!signer) {
          setResult({
            success: false,
            message: 'Please connect your wallet',
          });
          setShowResultModal(true);
          return null;
        }

        const transaction = await signer.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });

        const receipt = await transaction.wait(1);

        if (receipt?.status === 1) {
          setResult({
            success: true,
            message: successMessage,
            txHash: receipt.hash,
          });
          setShowResultModal(true);
          return receipt;
        } else {
          setResult({
            success: false,
            message: 'Transaction failed',
            txHash: receipt?.hash,
          });
          setShowResultModal(true);
          return null;
        }
      } catch (error: unknown) {
        console.error('Transaction error:', error);

        if (isUserRejection(error)) {
          setResult({
            success: false,
            message: 'Transaction cancelled by user',
          });
        } else {
          const errorMessage = decodeContractError(error);
          setResult({
            success: false,
            message: errorMessage,
          });
        }
        setShowResultModal(true);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const closeModal = useCallback(() => {
    setShowResultModal(false);
    setResult(null);
  }, []);

  return {
    sendTransaction,
    isLoading,
    showResultModal,
    result,
    closeModal,
  };
}
