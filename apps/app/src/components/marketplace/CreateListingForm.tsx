import { useState } from 'react';
import { NFT } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useContract } from '../../hooks/useContract';
import { encodeCreateListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
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
      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeCreateListing({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: ZERO_ADDRESS, // Contract uses address(0) for native ETH
        pricePerToken: priceWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
        reserved: false,
      });

      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Listing created successfully!');
        onSuccess?.();
      }
      // Error handling is done in useContract hook
    } catch (error: unknown) {
      console.error('Create listing error:', error);
      // Error toast is already shown by useContract
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Create Fixed Price Listing</h2>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="text-primary-400 font-semibold mb-1">Before creating a listing:</p>
            <ul className="text-gray-300 space-y-1 text-xs">
              <li>• Make sure you own this NFT</li>
              <li>• You may need to approve the marketplace contract to manage your NFT</li>
              <li>• The NFT contract must be whitelisted by an admin</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
