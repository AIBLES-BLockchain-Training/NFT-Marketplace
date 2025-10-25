import { useState } from 'react';
import { NFT } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useContract } from '../../hooks/useContract';
import { encodeCreateListing } from '../../lib/web3/encoding';
import { NATIVE_TOKEN_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import toast from 'react-hot-toast';

interface CreateListingFormProps {
  nft: NFT;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateListingForm({ nft, onSuccess, onCancel }: CreateListingFormProps) {
  const { sendTransaction, isLoading } = useContract();
  const [pricePerToken, setPricePerToken] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      const priceWei = BigInt(Math.floor(parseFloat(pricePerToken) * 1e18));
      const startTime = BigInt(Math.floor(Date.now() / 1000));
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeCreateListing({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: NATIVE_TOKEN_ADDRESS,
        pricePerToken: priceWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
        reserved: false,
      });

      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Listing created successfully!');
        onSuccess?.();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Create listing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create listing');
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Create Fixed Price Listing</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Price per Token (ETH)
          </label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder="0.00"
            value={pricePerToken}
            onChange={(e) => setPricePerToken(e.target.value)}
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            Set your listing price in ETH
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
              Number of tokens to list
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
            How long your listing will be active
          </p>
        </div>

        <div className="pt-6 border-t border-dark-border flex gap-3">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary" fullWidth>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Create Listing
          </Button>
        </div>
      </form>
    </Card>
  );
}
