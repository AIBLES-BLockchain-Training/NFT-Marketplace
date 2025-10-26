import { useState } from 'react';
import { Listing } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { formatEth } from '../../lib/web3/utils';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeBuyFromListing } from '../../lib/web3/encoding';
import toast from 'react-hot-toast';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: () => void;
}

export function BuyModal({ isOpen, onClose, listing, onSuccess }: BuyModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address } = useWallet();
  const [quantity, setQuantity] = useState('1');

  const maxQuantity = BigInt(listing.quantity);
  const pricePerToken = BigInt(listing.pricePerToken);
  const selectedQuantity = BigInt(quantity || '0');
  const totalPrice = pricePerToken * selectedQuantity;

  const handleBuy = async () => {
    try {
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      if (selectedQuantity <= 0n || selectedQuantity > maxQuantity) {
        toast.error('Invalid quantity');
        return;
      }

      const tx = encodeBuyFromListing({
        listingId: BigInt(listing.listingId),
        buyFor: address, // Buy for connected wallet (buyer), not seller!
        quantity: selectedQuantity,
        currency: listing.currency,
        expectedTotalPrice: totalPrice,
      });

      const receipt = await sendTransaction(tx, 'Purchase successful!');

      if (receipt?.status === 1) {
        onSuccess?.();
        onClose();
      }
    } catch (error: unknown) {
      console.error('Buy error:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buy NFT">
      <div className="space-y-6">
        <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Price per Token</span>
            <span className="text-white font-semibold">
              {formatEth(pricePerToken)} ETH
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Quantity (Max: {maxQuantity.toString()})
            </label>
            <input
              type="number"
              min="1"
              max={maxQuantity.toString()}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="pt-4 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-400">Total Price</span>
              <span className="text-2xl font-bold text-primary-400">
                {formatEth(totalPrice)} ETH
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onClose} variant="secondary" fullWidth disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleBuy} variant="primary" fullWidth isLoading={isLoading}>
            Confirm Purchase
          </Button>
        </div>
      </div>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={closeModal}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </Modal>
  );
}
