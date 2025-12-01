import { useState, useEffect } from 'react';
import { NFT, SupportedCurrency } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeCreateAuction } from '../../lib/web3/encoding';
import {
  SECONDS_PER_DAY,
  BID_BUFFER_BPS,
  DURATION_OPTIONS,
  DEFAULT_BUYOUT_MULTIPLIER,
} from '../../lib/constants';
import { checkNFTApproval, approveNFT, isNFTCollectionWhitelisted } from '../../lib/web3/approve';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_SUPPORTED_CURRENCIES_QUERY } from '../../lib/graphql/queries';
import { truncate } from '../../lib/utils/format';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

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
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency | null>(null);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);

  // Load supported currencies when modal opens
  useEffect(() => {
    const loadCurrencies = async () => {
      if (!isOpen) return;

      setIsLoadingCurrencies(true);
      try {
        const result = await graphqlClient.query(GET_SUPPORTED_CURRENCIES_QUERY, {});
        if (result?.supportedCurrencies) {
          setCurrencies(result.supportedCurrencies);
          // Auto-select first currency (usually ETH)
          if (result.supportedCurrencies.length > 0) {
            setSelectedCurrency(result.supportedCurrencies[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load currencies:', error);
        toast.error('Failed to load supported currencies');
      } finally {
        setIsLoadingCurrencies(false);
      }
    };

    loadCurrencies();
  }, [isOpen]);

  // Check approval status when modal opens
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!isOpen || !address || !nft) {
        setIsApproved(false);
        return;
      }

      setIsCheckingApproval(true);
      try {
        const isERC1155 = nft.collection.collectionType === 'ERC1155';
        const approvalStatus = await checkNFTApproval(
          nft.collection.id,
          nft.tokenId,
          address,
          isERC1155
        );
        setIsApproved(!approvalStatus.needsApproval);
      } catch (error) {
        console.error('Check approval error:', error);
        setIsApproved(false);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkApprovalStatus();
  }, [isOpen, address, nft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate NFT and capture values immediately at start
    if (!nft) {
      toast.error('NFT data is missing. Please close and reopen the modal.');
      return;
    }

    if (!nft.collection || !nft.collection.id) {
      toast.error('NFT collection data is missing. Please refresh the page.');
      return;
    }

    // Capture NFT values at the start to prevent closure/stale prop issues
    const capturedCollectionId = nft.collection.id;
    const capturedTokenId = nft.tokenId;
    const capturedCollectionType = nft.collection.collectionType;

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

      const isERC1155 = capturedCollectionType === 'ERC1155';

      // First check if NFT collection is whitelisted
      toast.loading('Checking NFT collection whitelist...', { id: 'whitelist-check' });
      const isWhitelisted = await isNFTCollectionWhitelisted(capturedCollectionId);
      toast.dismiss('whitelist-check');

      if (!isWhitelisted) {
        toast.error(
          'This NFT collection is not whitelisted. Please submit a whitelist request in your profile first.',
          { duration: 5000 }
        );
        return;
      }

      // If not approved, request approval first
      if (!isApproved) {
        setIsApproving(true);
        toast.loading('Please approve NFT in your wallet...', { id: 'approval' });

        try {
          const approved = await approveNFT(capturedCollectionId, capturedTokenId, isERC1155);

          if (!approved) {
            toast.error('NFT approval failed', { id: 'approval' });
            setIsApproving(false);
            return;
          }

          toast.success('NFT approved successfully!', { id: 'approval' });
          setIsApproved(true);
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Failed to approve NFT', { id: 'approval' });
          setIsApproving(false);
          return;
        } finally {
          setIsApproving(false);
        }

        // Continue to create auction automatically after approval
        toast.loading('Creating auction...', { id: 'create-auction' });
      }

      // Create auction - use captured values
      const minimumBidWei = (() => {
        try {
          return ethers.parseEther(minimumBid.toString());
        } catch (error) {
          console.warn('Invalid minimum bid:', minimumBid);
          return 0n;
        }
      })();
      
      const buyoutBidWei = buyoutBid
        ? (() => {
            try {
              return ethers.parseEther(buyoutBid.toString());
            } catch (error) {
              console.warn('Invalid buyout bid:', buyoutBid);
              return minimumBidWei * DEFAULT_BUYOUT_MULTIPLIER;
            }
          })()
        : minimumBidWei * DEFAULT_BUYOUT_MULTIPLIER;

      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      // Check if currency is selected
      if (!selectedCurrency) {
        toast.error('Please select a currency');
        return;
      }

      const auctionParams = {
        assetContract: capturedCollectionId,
        tokenId: BigInt(capturedTokenId),
        quantity: BigInt(quantity),
        currency: selectedCurrency.id, // Use selected currency address
        startPrice: minimumBidWei,
        stepAmount: BigInt(bidBuffer), // Send BPS directly (e.g., 500 for 5%), not Wei value
        ceilingPrice: buyoutBidWei,
        timeBufferInSeconds: 600n, // 10 minutes - extends auction if bid placed near end
        startTimestamp: startTime,
        endTimestamp: endTime,
      };

      const tx = encodeCreateAuction(auctionParams);

      await sendTransaction(tx, 'Auction created successfully!');

      // Dismiss loading toast
      toast.dismiss('create-auction');

      // Reset approval state on success
      setIsApproved(false);
    } catch (error: unknown) {
      console.error('Create auction error:', error);
    }
  };

  return (
    <>
      {/* Create Auction Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Create Auction" zIndex="z-[60]">
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
            {/* Currency Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Payment Currency *
              </label>
              {isLoadingCurrencies ? (
                <div className="text-center py-4 text-gray-400">Loading currencies...</div>
              ) : currencies.length === 0 ? (
                <div className="text-center py-4 text-red-400">No supported currencies available</div>
              ) : (
                <>
                  <select
                    value={selectedCurrency?.id || ''}
                    onChange={(e) => {
                      const currency = currencies.find(c => c.id === e.target.value);
                      setSelectedCurrency(currency || null);
                    }}
                    className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                    required
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} - ({truncate(currency.id, 6, 4)})
                      </option>
                    ))}
                  </select>
                  {selectedCurrency && (
                    <p className="mt-2 text-xs text-gray-500">
                      Symbol: {selectedCurrency.symbol} | Full Address: {selectedCurrency.id}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Bid ({selectedCurrency?.symbol || 'Token'}) *
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={minimumBid}
                onChange={(e) => setMinimumBid(e.target.value)}
                required
                disabled={!selectedCurrency}
              />
              <p className="mt-2 text-xs text-gray-500">
                Starting price for the auction
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Buyout Price ({selectedCurrency?.symbol || 'Token'}) <span className="text-gray-600">(Optional)</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder={`Auto: ${parseFloat(minimumBid || '0') * 3} ${selectedCurrency?.symbol || ''}`}
                value={buyoutBid}
                onChange={(e) => setBuyoutBid(e.target.value)}
                disabled={!selectedCurrency}
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
                onChange={(e) => setBidBuffer(e.target.value as typeof BID_BUFFER_BPS.MEDIUM)}
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
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading || isApproving || isCheckingApproval}
              >
                {isCheckingApproval
                  ? 'Checking...'
                  : isApproving
                  ? 'Approving...'
                  : isApproved
                  ? 'Create Auction'
                  : 'Approve & Create'}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Transaction Result Modal - shown independently after closing create modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            onClose(); // Close the create modal FIRST to prevent re-mount
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
