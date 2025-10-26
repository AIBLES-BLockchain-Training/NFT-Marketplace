import { useState } from 'react';
import { NFT } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeCreateAuction } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import {
  SECONDS_PER_DAY,
  BID_BUFFER_BPS,
  DURATION_OPTIONS,
  DEFAULT_BUYOUT_MULTIPLIER,
} from '../../lib/constants';
import { checkNFTApproval, approveNFT, isNFTCollectionWhitelisted } from '../../lib/web3/approve';
import toast from 'react-hot-toast';

interface CreateAuctionModalProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAuctionModal({ nft, isOpen, onClose, onSuccess }: CreateAuctionModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address } = useWallet();
  const [minimumBid, setMinimumBid] = useState('');
  const [buyoutBid, setBuyoutBid] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days
  const [bidBuffer, setBidBuffer] = useState(BID_BUFFER_BPS.MEDIUM);
  const [isApproving, setIsApproving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!minimumBid || parseFloat(minimumBid) <= 0) {
        toast.error('Please enter a valid minimum bid');
        return;
      }

      // Check if wallet is connected
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      const isERC1155 = nft.collection.collectionType === 'ERC1155';

      // First check if NFT collection is whitelisted
      toast.loading('Checking NFT collection whitelist...', { id: 'whitelist-check' });
      const isWhitelisted = await isNFTCollectionWhitelisted(nft.collection.id);
      toast.dismiss('whitelist-check');

      if (!isWhitelisted) {
        toast.error(
          'This NFT collection is not whitelisted. Please submit a whitelist request in your profile first.',
          { duration: 5000 }
        );
        return;
      }

      toast.loading('Checking NFT approval...', { id: 'approval-check' });
      const approvalStatus = await checkNFTApproval(
        nft.collection.id,
        nft.tokenId,
        address,
        isERC1155
      );
      toast.dismiss('approval-check');

      // If not approved, request approval first
      if (approvalStatus.needsApproval) {
        setIsApproving(true);
        toast.loading('Please approve NFT in your wallet...', { id: 'approval' });

        try {
          const approved = await approveNFT(nft.collection.id, nft.tokenId, isERC1155);

          if (!approved) {
            toast.error('NFT approval failed', { id: 'approval' });
            setIsApproving(false);
            return;
          }

          toast.success('NFT approved successfully!', { id: 'approval' });
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to approve NFT', { id: 'approval' });
          setIsApproving(false);
          return;
        } finally {
          setIsApproving(false);
        }
      }

      // Create auction
      const minimumBidWei = BigInt(Math.floor(parseFloat(minimumBid) * 1e18));
      const buyoutBidWei = buyoutBid
        ? BigInt(Math.floor(parseFloat(buyoutBid) * 1e18))
        : minimumBidWei * DEFAULT_BUYOUT_MULTIPLIER;

      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const tx = encodeCreateAuction({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: ZERO_ADDRESS, // Contract uses address(0) for native ETH
        startPrice: minimumBidWei,
        stepAmount: (minimumBidWei * BigInt(bidBuffer)) / 10000n,
        ceilingPrice: buyoutBidWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
      });

      await sendTransaction(tx, 'Auction created successfully!');
    } catch (error: unknown) {
      console.error('Create auction error:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Auction">
      {/* Info Banner */}
      <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="text-primary-400 font-semibold mb-1">Before creating an auction:</p>
            <ul className="text-gray-300 space-y-1 text-xs">
              <li>• Make sure you own this NFT</li>
              <li>• You will be asked to approve the marketplace contract first</li>
              <li>• The NFT contract must be whitelisted by an admin</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Minimum Bid (ETH) *
          </label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={minimumBid}
            onChange={(e) => setMinimumBid(e.target.value)}
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            Starting price for the auction
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Buyout Price (ETH) <span className="text-gray-600">(Optional)</span>
          </label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder={`Auto: ${parseFloat(minimumBid || '0') * 3} ETH`}
            value={buyoutBid}
            onChange={(e) => setBuyoutBid(e.target.value)}
          />
          <p className="mt-2 text-xs text-gray-500">
            Instant purchase price. Defaults to 3x minimum bid if not set
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
              Number of tokens to auction
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
            How long the auction will run
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Bid Buffer
          </label>
          <select
            value={bidBuffer}
            onChange={(e) => setBidBuffer(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value={BID_BUFFER_BPS.LOW}>Low (5% minimum increase)</option>
            <option value={BID_BUFFER_BPS.MEDIUM}>Medium (10% minimum increase)</option>
            <option value={BID_BUFFER_BPS.HIGH}>High (20% minimum increase)</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Minimum percentage increase required for new bids
          </p>
        </div>

        <div className="pt-6 border-t border-dark-border flex gap-3">
          <Button type="button" onClick={onClose} variant="secondary" fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading || isApproving}>
            {isApproving ? 'Approving...' : 'Create Auction'}
          </Button>
        </div>
      </form>

      {/* Transaction Result Modal */}
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
