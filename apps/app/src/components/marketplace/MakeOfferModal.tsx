import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeMakeOffer } from '../../lib/web3/encoding';
import { formatEth } from '../../lib/web3/utils';
import { checkERC20Allowance, approveERC20 } from '../../lib/web3/approve';
import { ZERO_ADDRESS, ROUTER_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import { NFT } from '../../types';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export interface MakeOfferModalProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Make Offer Modal Component
 * Allows users to make offers on NFTs with validation and approval flow
 */
export function MakeOfferModal({ nft, isOpen, onClose, onSuccess }: MakeOfferModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address, balance } = useWallet();
  const [offerAmount, setOfferAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const isERC1155 = nft.collection.collectionType === 'ERC1155';

  // Calculate values
  const totalPriceWei = offerAmount ? BigInt(Math.floor(parseFloat(offerAmount) * 1e18)) : 0n;
  const quantityBigInt = BigInt(quantity || 1);
  const pricePerToken = quantityBigInt > 0n ? totalPriceWei / quantityBigInt : 0n;
  const expirationTime = BigInt(Math.floor(Date.now() / 1000) + parseInt(duration) * SECONDS_PER_DAY);
  const expirationDate = new Date((Number(expirationTime) * 1000));

  // Validation
  const hasSufficientBalance = balance >= totalPriceWei;
  const isValidAmount = totalPriceWei > 0n;
  const isValidQuantity = quantityBigInt > 0n;
  const canSubmit = isValidAmount && isValidQuantity && hasSufficientBalance && !isLoading && !isApproving;

  const handleMakeOffer = async () => {
    if (!canSubmit) return;

    try {
      const tx = encodeMakeOffer({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: quantityBigInt,
        currency: ZERO_ADDRESS, // Using ETH
        totalPrice: totalPriceWei,
        expirationTime: expirationTime,
      });

      await sendTransaction(tx, 'Offer made successfully!');

      // Close modal on success
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: unknown) {
      console.error('Make offer error:', error);
      toast.error('Failed to make offer');
    }
  };

  const handleClose = () => {
    setOfferAmount('');
    setQuantity('1');
    setDuration('7');
    setIsApproving(false);
    setNeedsApproval(false);
    onClose();
  };

  const handleResultClose = () => {
    closeModal();
    if (result?.success) {
      handleClose();
      onSuccess?.();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Make an Offer"
        size="lg"
      >
        <div className="space-y-6">
          {/* NFT Info */}
          <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border">
            {nft.imageUrl && (
              <img
                src={nft.imageUrl}
                alt={nft.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">{nft.name}</h3>
              <p className="text-sm text-gray-400">{nft.collection.name}</p>
            </div>
          </div>

          {/* Offer Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Offer Amount (ETH) *
            </label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
            />
            {offerAmount && (
              <div className="mt-2 space-y-1">
                {!hasSufficientBalance && (
                  <p className="text-xs text-red-400">
                    ⚠️ Insufficient balance. You have {formatEth(balance)} ETH
                  </p>
                )}
                {isERC1155 && quantityBigInt > 0n && (
                  <p className="text-xs text-gray-500">
                    Price per token: {formatEth(pricePerToken)} ETH
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quantity (ERC1155 only) */}
          {isERC1155 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Quantity *
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-500">
                Number of tokens you want to buy
              </p>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Valid For (Days) *
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {duration && (
              <p className="mt-2 text-xs text-gray-500">
                Expires: {expirationDate.toLocaleDateString()} {expirationDate.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-dark-bg rounded-lg p-4 border border-dark-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Offer Amount</span>
              <span className="text-white font-semibold">
                {offerAmount || '0.00'} ETH
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Balance</span>
              <span className={`font-semibold ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                {formatEth(balance)} ETH
              </span>
            </div>
          </div>

          {/* Important Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-xs text-amber-400 space-y-1">
              <span className="block font-semibold mb-2">ℹ️ Important Information:</span>
              <span className="block">• Your ETH will be locked until the offer is accepted, expires, or you cancel it</span>
              <span className="block">• The NFT owner can accept your offer at any time before expiration</span>
              <span className="block">• You can cancel your offer at any time to get your ETH back</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="secondary"
              fullWidth
              disabled={isLoading || isApproving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMakeOffer}
              variant="primary"
              fullWidth
              disabled={!canSubmit}
              isLoading={isLoading || isApproving}
            >
              {isApproving ? 'Approving...' : 'Make Offer'}
            </Button>
          </div>
        </div>
      </Modal>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={handleResultClose}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </>
  );
}
