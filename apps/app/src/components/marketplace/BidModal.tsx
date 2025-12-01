import { useState } from 'react';
import { Auction } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { formatEth } from '../../lib/web3/utils';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeBidInAuction } from '../../lib/web3/encoding';
import toast from 'react-hot-toast';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction: Auction;
  onSuccess?: () => void;
}

export function BidModal({ isOpen, onClose, auction, onSuccess }: BidModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [bidAmount, setBidAmount] = useState('');

  const minimumBidAmount = BigInt(auction.minimumBidAmount);
  const bidBufferBps = BigInt(auction.bidBufferBps);
  const currentBid = auction.bids?.[0] ? BigInt(auction.bids[0].bidAmount) : minimumBidAmount;
  const nextMinBid = currentBid + (currentBid * bidBufferBps / 10000n);

  const handleBid = async () => {
    try {
      if (!bidAmount || parseFloat(bidAmount) <= 0) {
        toast.error('Please enter a valid bid amount');
        return;
      }

      const bidWei = BigInt(Math.floor(parseFloat(bidAmount) * 1e18));

      if (bidWei < nextMinBid) {
        toast.error(`Bid must be at least ${formatEth(nextMinBid)} ETH`);
        return;
      }

      const tx = encodeBidInAuction({
        auctionId: BigInt(auction.auctionId),
        bidAmount: bidWei,
        currency: auction.currency.id,
      });

      await sendTransaction(tx, 'Bid placed successfully!');
    } catch (error: unknown) {
      console.error('Bid error:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Place Bid">
      <div className="space-y-6">
        <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Current Bid</span>
              <span className="text-white font-semibold">
                {formatEth(currentBid)} ETH
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Minimum Next Bid</span>
              <span className="text-primary-400 font-semibold">
                {formatEth(nextMinBid)} ETH
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Bid Buffer</span>
              <span className="text-gray-500">
                {(Number(bidBufferBps) / 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Your Bid Amount (ETH)
          </label>
          <input
            type="number"
            step="any"
            min={parseFloat(formatEth(nextMinBid))}
            placeholder={formatEth(nextMinBid)}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white text-lg focus:outline-none focus:border-primary-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Enter at least {formatEth(nextMinBid)} ETH to place a valid bid
          </p>
        </div>

        <div className="bg-dark-bg rounded-lg p-4 border border-amber-500/30">
          <p className="text-xs text-amber-400">
            ⚠️ Your bid amount will be locked until you are outbid or the auction ends.
            If you win, the NFT will be transferred to you.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={onClose} variant="secondary" fullWidth disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleBid} variant="primary" fullWidth isLoading={isLoading}>
            Place Bid
          </Button>
        </div>
      </div>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            closeModal();
            if (result.success) {
              onSuccess?.();
              onClose();
            }
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </Modal>
  );
}
