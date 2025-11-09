import { useState } from 'react';
import { NFT } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeMakeOffer } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import toast from 'react-hot-toast';

interface MakeOfferFormProps {
  nft: NFT;
  tokenOwner?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MakeOfferForm({ nft, tokenOwner, onSuccess, onCancel }: MakeOfferFormProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [totalPrice, setTotalPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!totalPrice || parseFloat(totalPrice) <= 0) {
        toast.error('Please enter a valid offer amount');
        return;
      }

      const totalPriceWei = BigInt(Math.floor(parseFloat(totalPrice) * 1e18));
      const expirationTime = BigInt(Math.floor(Date.now() / 1000) + parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeMakeOffer({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: ZERO_ADDRESS, // Contract uses address(0) for native ETH
        totalPrice: totalPriceWei,
        expirationTime: expirationTime,
      });

      await sendTransaction(tx, 'Offer made successfully!');
    } catch (error: unknown) {
      console.error('Make offer error:', error);
    }
  };

  const calculatePricePerToken = () => {
    if (!totalPrice || !quantity) return '0.00';
    const price = parseFloat(totalPrice) / parseInt(quantity);
    return price.toFixed(4);
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Make an Offer</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Total Offer Amount (ETH)
          </label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            Total amount you&apos;re willing to pay
          </p>
        </div>

        {nft.collection.collectionType === 'ERC1155' && (
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
              Price per token: {calculatePricePerToken()} ETH
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Offer Duration (Days)
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
            How long your offer will remain valid
          </p>
        </div>

        {tokenOwner && (
          <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
            <p className="text-xs text-gray-400 mb-1">Specific Offer To</p>
            <p className="text-sm font-mono text-white break-all">{tokenOwner}</p>
          </div>
        )}

        <div className="bg-dark-bg rounded-lg p-4 border border-amber-500/30">
          <p className="text-xs text-amber-400">
            ℹ️ Your offer can be accepted by the NFT owner at any time before expiration.
            Make sure you have sufficient ETH in your wallet.
          </p>
        </div>

        <div className="pt-6 border-t border-dark-border flex gap-3">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary" fullWidth>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Make Offer
          </Button>
        </div>
      </form>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            closeModal();
            if (result.success) {
              onSuccess?.();
            }
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </Card>
  );
}
