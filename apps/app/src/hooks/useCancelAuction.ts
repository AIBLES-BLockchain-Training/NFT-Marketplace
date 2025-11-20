import { useState } from 'react';
import { useTransactionModal } from './useTransactionModal';
import { useWallet } from './useWallet';
import { canCancelAuction } from '../lib/auction/status';
import { encodeCancelAuction } from '../lib/web3/encoding';
import { Auction } from '../types';
import toast from 'react-hot-toast';

export interface UseCancelAuctionResult {
  cancelAuction: (auction: Auction) => Promise<void>;
  isCancelling: boolean;
  canCancel: boolean;
  cancelReason?: string;
}

/**
 * Hook to handle auction cancellation
 * @param auction Auction to cancel
 * @param onSuccess Callback on successful cancellation
 * @returns Cancel function and status
 */
export function useCancelAuction(
  auction: Auction | null,
  onSuccess?: () => void
): UseCancelAuctionResult {
  const { sendTransaction, isLoading } = useTransactionModal();
  const { address } = useWallet();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelCheck = auction ? canCancelAuction(auction, address || undefined) : { canCancel: false };

  const cancelAuction = async (auctionToCancel: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    const check = canCancelAuction(auctionToCancel, address);
    if (!check.canCancel) {
      toast.error(check.reason || 'Cannot cancel auction');
      return;
    }

    try {
      setIsCancelling(true);

      const tx = encodeCancelAuction({
        auctionId: BigInt(auctionToCancel.auctionId),
      });

      await sendTransaction(tx, 'Auction cancelled successfully!');

      onSuccess?.();
    } catch (error: unknown) {
      console.error('Cancel auction error:', error);
      toast.error('Failed to cancel auction');
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    cancelAuction,
    isCancelling: isCancelling || isLoading,
    canCancel: cancelCheck.canCancel,
    cancelReason: cancelCheck.reason,
  };
}
