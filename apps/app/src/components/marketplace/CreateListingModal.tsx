import { useState } from 'react';
import { ethers } from 'ethers';
import { NFT } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeCreateListing, encodeApproveCurrencyForListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import { checkNFTApproval, approveNFT, isNFTCollectionWhitelisted } from '../../lib/web3/approve';
import { ListingABI } from '../../lib/contracts/abis';
import toast from 'react-hot-toast';

interface CreateListingModalProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateListingModal({ nft, isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address } = useWallet();
  const [pricePerToken, setPricePerToken] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [duration, setDuration] = useState('7'); // days
  const [isApproving, setIsApproving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'creating' | 'approving'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
        toast.error('Please enter a valid price');
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

      // Step 1: Create listing
      setCurrentStep('creating');
      const priceWei = BigInt(Math.floor(parseFloat(pricePerToken) * 1e18));
      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const createListingTx = encodeCreateListing({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: ZERO_ADDRESS, // Contract uses address(0) for native ETH
        pricePerToken: priceWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
        reserved: false,
      });

      const createReceipt = await sendTransaction(createListingTx, 'Step 1/2: Listing created!');

      if (createReceipt?.status !== 1) {
        setCurrentStep('idle');
        return;
      }

      // Extract listingId from event logs
      let listingId: bigint | null = null;
      try {
        const listingInterface = new ethers.Interface(ListingABI);

        for (const log of createReceipt.logs) {
          try {
            const parsedLog = listingInterface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });

            if (parsedLog?.name === 'ListingCreated') {
              listingId = parsedLog.args[0]; // First argument is listingId
              break;
            }
          } catch {
            // Skip logs that don't match
            continue;
          }
        }
      } catch (error) {
        console.error('Failed to extract listingId:', error);
      }

      if (!listingId) {
        toast.error('Failed to extract listing ID. Please approve currency manually from your profile.');
        setCurrentStep('idle');
        onSuccess?.();
        onClose();
        return;
      }

      // Step 2: Approve currency for listing
      setCurrentStep('approving');
      const approveCurrencyTx = encodeApproveCurrencyForListing(
        listingId,
        ZERO_ADDRESS, // Contract uses address(0) for native ETH
        priceWei
      );

      await sendTransaction(
        approveCurrencyTx,
        'Step 2/2: Currency approved! Listing is now live and ready for purchase.'
      );

      setCurrentStep('idle');
    } catch (error: unknown) {
      console.error('Create listing error:', error);
      setCurrentStep('idle');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Fixed Price Listing" zIndex="z-[60]">
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
              <li>• You will be asked to approve the marketplace contract first</li>
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
          <Button type="button" onClick={onClose} variant="secondary" fullWidth disabled={isLoading || isApproving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading || isApproving}>
            {isApproving
              ? 'Approving NFT...'
              : currentStep === 'creating'
                ? 'Step 1/2: Creating Listing...'
                : currentStep === 'approving'
                  ? 'Step 2/2: Approving Currency...'
                  : 'Create Listing'}
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
