import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Listing } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeUpdateListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import { truncateTokenId } from '../../lib/utils/format';
import toast from 'react-hot-toast';

interface UpdateListingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UpdateListingModal({ listing, isOpen, onClose, onSuccess }: UpdateListingModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();

  // Initialize with current listing values
  const [pricePerToken, setPricePerToken] = useState('');
  const [quantity, setQuantity] = useState('');
  const [duration, setDuration] = useState('7');

  // Update form when listing changes
  useEffect(() => {
    if (listing) {
      // Convert from wei to ETH
      const currentPrice = ethers.formatEther(listing.pricePerToken);
      setPricePerToken(currentPrice);
      setQuantity(listing.quantity);

      // Calculate remaining duration in days
      const now = Math.floor(Date.now() / 1000);
      const endTime = parseInt(listing.endTimestamp);
      const remainingSeconds = endTime - now;
      const remainingDays = Math.max(1, Math.ceil(remainingSeconds / SECONDS_PER_DAY));
      setDuration(remainingDays.toString());
    }
  }, [listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      const priceWei = BigInt(Math.floor(parseFloat(pricePerToken) * 1e18));
      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeUpdateListing(BigInt(listing.id), {
        assetContract: listing.nft.collection.id,
        tokenId: BigInt(listing.nft.tokenId),
        quantity: BigInt(quantity),
        currency: ZERO_ADDRESS,
        pricePerToken: priceWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
        reserved: false,
      });

      await sendTransaction(tx, 'Listing updated successfully!');
    } catch (error: unknown) {
      console.error('Update listing error:', error);
    }
  };

  const isERC1155 = listing?.nft.collection.collectionType === 'ERC1155';

  return (
    <>
      {/* Update Listing Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Update Listing" zIndex="z-[60]">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-sm">
              <p className="text-blue-400 font-semibold mb-1">Update Your Listing</p>
              <p className="text-gray-300 text-xs">
                You can update price, quantity, and duration. Asset contract and token ID cannot be changed.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* NFT Info - Read Only */}
            <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">NFT Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Collection:</span>
                  <span className="text-white">{listing?.nft.collection.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Token ID:</span>
                  <span className="text-white font-mono">{truncateTokenId(listing?.nft.tokenId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{listing?.nft.collection.collectionType}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Price per Token (ETH)
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Current: {ethers.formatEther(listing?.pricePerToken || '0')} ETH
              </p>
            </div>

            {isERC1155 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Current: {listing?.quantity} items
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Duration (Days)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                New end date will be set from now
              </p>
            </div>

            <div className="pt-6 border-t border-dark-border flex gap-3">
              <Button type="button" onClick={onClose} variant="secondary" fullWidth disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                Update Listing
              </Button>
            </div>
          </form>
      </Modal>

      {/* Transaction Result Modal - shown independently after closing update modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            onClose(); // Close the update modal FIRST to prevent re-mount
            closeModal(); // Then close result modal
            if (result.success) {
              onSuccess?.();
            }
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </>
  );
}
