import { useState, useEffect } from 'react';
import { NFT } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeCreateListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { SECONDS_PER_DAY, DURATION_OPTIONS } from '../../lib/constants';
import { checkNFTApproval, approveNFT, isNFTCollectionWhitelisted } from '../../lib/web3/approve';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_WHITELISTED_CURRENCIES_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

interface WhitelistedCurrency {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
}

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
  const [duration, setDuration] = useState('7');
  const [reserved, setReserved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [currencies, setCurrencies] = useState<WhitelistedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(ZERO_ADDRESS);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  // Fetch whitelisted currencies when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCurrencies();
    }
  }, [isOpen]);

  const fetchCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      const result = await graphqlClient.query(GET_WHITELISTED_CURRENCIES_QUERY, {
        limit: 100,
        offset: 0,
      });

      const fetchedCurrencies = result.supportedCurrencies || [];

      // Add ETH as first option if not already present
      const ethCurrency = {
        id: ZERO_ADDRESS,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        isActive: true,
      };

      const hasEth = fetchedCurrencies.some((c: WhitelistedCurrency) =>
        c.id.toLowerCase() === ZERO_ADDRESS.toLowerCase()
      );

      const allCurrencies = hasEth ? fetchedCurrencies : [ethCurrency, ...fetchedCurrencies];
      setCurrencies(allCurrencies);
      setSelectedCurrency(ZERO_ADDRESS); // Default to ETH
    } catch (error) {
      console.error('Error fetching currencies:', error);
      // Fallback to ETH only
      setCurrencies([{
        id: ZERO_ADDRESS,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        isActive: true,
      }]);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  // Helper function to truncate address
  const truncateAddress = (address: string) => {
    if (address === ZERO_ADDRESS) {
      return '0x0...0000';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      const isERC1155 = nft.collection.collectionType === 'ERC1155';

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

      const priceWei = (() => {
        try {
          return ethers.parseEther(pricePerToken.toString());
        } catch (error) {
          console.warn('Invalid price per token:', pricePerToken);
          return 0n;
        }
      })();
      const startTime = BigInt(Math.floor(Date.now() / 1000) + 60);
      const endTime = startTime + BigInt(parseInt(duration) * SECONDS_PER_DAY);

      const createListingTx = encodeCreateListing({
        assetContract: nft.collection.id,
        tokenId: BigInt(nft.tokenId),
        quantity: BigInt(quantity),
        currency: selectedCurrency as `0x${string}`, // Use selected currency
        pricePerToken: priceWei,
        startTimestamp: startTime,
        endTimestamp: endTime,
        reserved: reserved,
      });

      await sendTransaction(createListingTx, 'Listing created successfully! Your NFT is now live and ready for purchase.');
    } catch (error: unknown) {
      // Error handling is done in useContract hook
    }
  };

  return (
    <>
      {/* Create Listing Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Create Fixed Price Listing" zIndex="z-[60]">
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
            {/* Currency Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Payment Currency
              </label>
              {loadingCurrencies ? (
                <div className="flex items-center justify-center py-3 px-4 bg-dark-card border border-dark-border rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                  <span className="text-sm text-gray-400">Loading currencies...</span>
                </div>
              ) : (
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  required
                >
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.symbol} - {currency.name} ({truncateAddress(currency.id)})
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Select the currency buyers will use to purchase
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Price per Token ({currencies.find(c => c.id === selectedCurrency)?.symbol || 'Token'})
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
                Set your listing price in {currencies.find(c => c.id === selectedCurrency)?.symbol || 'selected currency'}
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

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-dark-card border border-dark-border rounded-lg">
                <input
                  type="checkbox"
                  id="reserved-checkbox"
                  checked={reserved}
                  onChange={(e) => setReserved(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-dark-bg text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-bg"
                />
                <div className="flex-1">
                  <label htmlFor="reserved-checkbox" className="block text-sm font-medium text-white cursor-pointer">
                    Reserved Listing (Private Sale)
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    Only buyers you specifically approve will be able to purchase this NFT. You can approve buyers after creating the listing.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-dark-border flex gap-3">
              <Button type="button" onClick={onClose} variant="secondary" fullWidth disabled={isLoading || isApproving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth isLoading={isLoading || isApproving}>
                {isApproving ? 'Approving NFT...' : isLoading ? 'Creating Listing...' : 'Create Listing'}
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
