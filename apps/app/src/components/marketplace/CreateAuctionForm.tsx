import { useState } from 'react';
import { NFT } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useContract } from '../../hooks/useContract';
import { encodeCreateAuction } from '../../lib/web3/encoding';
import { NATIVE_TOKEN_ADDRESS } from '../../lib/contracts/addresses';
import {
  SECONDS_PER_DAY,
  BID_BUFFER_BPS,
  DURATION_OPTIONS,
  DEFAULT_BUYOUT_MULTIPLIER,
} from '../../lib/constants';
import toast from 'react-hot-toast';

interface CreateAuctionFormProps {
  nft: NFT;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateAuctionForm({ nft, onSuccess, onCancel }: CreateAuctionFormProps) {
  const { sendTransaction, isLoading } = useContract();
  const [minimumBid, setMinimumBid] = useState('');
  const [buyoutBid, setBuyoutBid] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days
  const [bidBuffer, setBidBuffer] = useState(BID_BUFFER_BPS.MEDIUM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!minimumBid || parseFloat(minimumBid) <= 0) {
        toast.error('Please enter a valid minimum bid');
        return;
      }

      const minimumBidWei = BigInt(Math.floor(parseFloat(minimumBid) * 1e18));
      const buyoutBidWei = buyoutBid
        ? BigInt(Math.floor(parseFloat(buyoutBid) * 1e18))
        : minimumBidWei * DEFAULT_BUYOUT_MULTIPLIER;

      const startTime = BigInt(Math.floor(Date.now() / 1000));
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeCreateAuction({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: NATIVE_TOKEN_ADDRESS,
        startPrice: minimumBidWei,
        stepAmount: (minimumBidWei * BigInt(bidBuffer)) / 10000n,
        ceilingPrice: buyoutBidWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
      });

      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Auction created successfully!');
        onSuccess?.();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Create auction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create auction');
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6">Create Auction</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Minimum Bid (ETH) *
          </label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder="0.00"
            value={minimumBid}
            onChange={(e) => setMinimumBid(e.target.value)}
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            Starting price for your auction
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Buyout Price (ETH)
          </label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder="Optional - Leave empty for no buyout"
            value={buyoutBid}
            onChange={(e) => setBuyoutBid(e.target.value)}
          />
          <p className="mt-2 text-xs text-gray-500">
            Price at which the auction ends immediately
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
            {DURATION_OPTIONS.slice(0, 4).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Bid Buffer (%)
          </label>
          <select
            value={bidBuffer}
            onChange={(e) => setBidBuffer(e.target.value)}
            className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value={BID_BUFFER_BPS.LOW}>2.5%</option>
            <option value={BID_BUFFER_BPS.MEDIUM}>5%</option>
            <option value={BID_BUFFER_BPS.HIGH}>10%</option>
            <option value={BID_BUFFER_BPS.VERY_HIGH}>15%</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Minimum percentage increase required for each new bid
          </p>
        </div>

        <div className="pt-6 border-t border-dark-border flex gap-3">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary" fullWidth>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Create Auction
          </Button>
        </div>
      </form>
    </Card>
  );
}
