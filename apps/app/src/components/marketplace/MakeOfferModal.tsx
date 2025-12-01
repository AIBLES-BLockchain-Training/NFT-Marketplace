import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { NFT, SupportedCurrency } from '../../types';
import { GET_SUPPORTED_CURRENCIES_QUERY } from '../../lib/graphql/queries';
import { graphqlClient } from '../../lib/graphql/client';
import { getBrowserProvider } from '../../lib/web3/provider';
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
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(ZERO_ADDRESS);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
  const [erc20Balance, setErc20Balance] = useState<bigint | null>(null);

  const isERC1155 = nft.collection.collectionType === 'ERC1155';

  // Helper function to truncate address
  const truncateAddress = (address: string) => {
    if (address === ZERO_ADDRESS || address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return '0x0...0000';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Load supported currencies when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCurrencies = async () => {
      setIsLoadingCurrencies(true);
      try {
        const data = await graphqlClient.query(GET_SUPPORTED_CURRENCIES_QUERY);
        if (data?.supportedCurrencies) {
          setCurrencies(data.supportedCurrencies);
          // Auto-select first currency (usually ETH)
          if (data.supportedCurrencies.length > 0) {
            setSelectedCurrency(data.supportedCurrencies[0].id);
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

  // Fetch ERC20 balance when currency changes
  useEffect(() => {
    if (!address || !selectedCurrency) {
      setErc20Balance(null);
      return;
    }

    // Check if currency is native ETH
    const isNativeCurrency = selectedCurrency.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                             selectedCurrency.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    if (isNativeCurrency) {
      setErc20Balance(null);
      return;
    }

    // Fetch ERC20 balance
    const fetchERC20Balance = async () => {
      try {
        const provider = getBrowserProvider();
        if (!provider) {
          setErc20Balance(null);
          return;
        }

        const erc20Abi = [
          'function balanceOf(address account) view returns (uint256)'
        ];
        const tokenContract = new ethers.Contract(selectedCurrency, erc20Abi, provider);
        const tokenBalance = await tokenContract.balanceOf(address);

        setErc20Balance(tokenBalance);
      } catch (error) {
        console.error('Failed to fetch ERC20 balance:', error);
        setErc20Balance(null);
      }
    };

    fetchERC20Balance();
  }, [selectedCurrency, address]);

  // Calculate values
  const totalPriceWei = (() => {
    if (!offerAmount || offerAmount.trim() === '') return 0n;
    try {
      return ethers.parseEther(offerAmount.toString());
    } catch (error) {
      console.warn('Invalid offer amount:', offerAmount);
      return 0n;
    }
  })();
  const quantityBigInt = BigInt(quantity || 1);
  const pricePerToken = quantityBigInt > 0n ? totalPriceWei / quantityBigInt : 0n;
  const expirationTime = BigInt(Math.floor(Date.now() / 1000) + parseInt(duration) * SECONDS_PER_DAY);
  const expirationDate = new Date((Number(expirationTime) * 1000));

  // Check if currency is native ETH
  const isNativeCurrency = selectedCurrency.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                           selectedCurrency.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  // Get current balance based on currency type
  const currentBalance = isNativeCurrency
    ? (balance ?? 0n)
    : (erc20Balance ?? 0n);

  // Validation
  const hasSufficientBalance = currentBalance >= totalPriceWei;
  const isValidAmount = totalPriceWei > 0n;
  const isValidQuantity = quantityBigInt > 0n;
  const canSubmit = isValidAmount && isValidQuantity && hasSufficientBalance && !isLoading && !isApproving;

  const handleMakeOffer = async () => {
    if (!canSubmit) return;

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate NFT data
    if (!nft.tokenId || !nft.collection.id) {
      toast.error('Invalid NFT data');
      return;
    }

    // Validate currency selected
    if (!selectedCurrency) {
      toast.error('Please select a currency');
      return;
    }

    try {
      // Check if currency is ERC20 (not native ETH)
      const isNativeCurrency = selectedCurrency.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                               selectedCurrency.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      // If ERC20, check and request approval if needed
      if (!isNativeCurrency) {
        setIsApproving(true);

        try {
          const { hasAllowance } = await checkERC20Allowance(
            selectedCurrency as `0x${string}`,
            address as `0x${string}`,
            ROUTER_ADDRESS,
            totalPriceWei
          );

          if (!hasAllowance) {
            toast.loading('Approving token...', { id: 'approval' });

            // Request approval
            const approved = await approveERC20(selectedCurrency as `0x${string}`, ROUTER_ADDRESS);

            if (!approved) {
              toast.error('Token approval failed', { id: 'approval' });
              setIsApproving(false);
              return;
            }

            toast.success('Token approved successfully!', { id: 'approval' });
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'User rejected approval') {
            toast.error('You rejected the token approval', { id: 'approval' });
          } else {
            toast.error('Failed to approve token', { id: 'approval' });
          }
          setIsApproving(false);
          return;
        } finally {
          setIsApproving(false);
        }
      }

      // Make offer with selected currency
      let tokenIdBigInt: bigint;
      try {
        tokenIdBigInt = BigInt(nft.tokenId);
      } catch (error) {
        toast.error('Invalid token ID');
        return;
      }

      const tx = encodeMakeOffer({
        assetContract: nft.collection.id,
        tokenId: tokenIdBigInt,
        quantity: quantityBigInt,
        currency: selectedCurrency as `0x${string}`,
        totalPrice: totalPriceWei,
        expirationTimestamp: expirationTime,
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
              <Image
                src={nft.imageUrl}
                alt={nft.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">{nft.name}</h3>
              <p className="text-sm text-gray-400">{nft.collection.name}</p>
            </div>
          </div>

          {/* Currency Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Currency *
            </label>
            {isLoadingCurrencies ? (
              <div className="flex items-center justify-center py-3 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500 mr-2" />
                Loading currencies...
              </div>
            ) : (
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} - {currency.name} ({truncateAddress(currency.id)})
                  </option>
                ))}
              </select>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Select the currency you want to use for this offer
            </p>
            {!isLoadingCurrencies && selectedCurrency.toLowerCase() !== ZERO_ADDRESS.toLowerCase() &&
             selectedCurrency.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && (
              <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  INFO: This currency requires approval. You will be asked to approve the token before making the offer.
                </p>
              </div>
            )}
          </div>

          {/* Offer Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Offer Amount ({currencies.find(c => c.id === selectedCurrency)?.symbol || 'TOKEN'}) *
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
                    WARNING: Insufficient balance. You have {formatEth(currentBalance)} {currencies.find(c => c.id === selectedCurrency)?.symbol || 'TOKEN'}
                  </p>
                )}
                {isERC1155 && quantityBigInt > 0n && (
                  <p className="text-xs text-gray-500">
                    Price per token: {formatEth(pricePerToken)} {currencies.find(c => c.id === selectedCurrency)?.symbol || 'TOKEN'}
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
                {offerAmount || '0.00'} {currencies.find(c => c.id === selectedCurrency)?.symbol || 'TOKEN'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Balance</span>
              <span className={`font-semibold ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                {formatEth(currentBalance)} {currencies.find(c => c.id === selectedCurrency)?.symbol || 'TOKEN'}
              </span>
            </div>
          </div>

          {/* Important Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-xs text-amber-400 space-y-1">
              <span className="block font-semibold mb-2">Important Information:</span>
              <span className="block">Your {currencies.find(c => c.id === selectedCurrency)?.symbol || 'tokens'} will be held in escrow until the offer is accepted, expires, or you cancel it</span>
              <span className="block">The NFT owner can accept your offer at any time before expiration</span>
              <span className="block">You can cancel your offer at any time to get your {currencies.find(c => c.id === selectedCurrency)?.symbol || 'tokens'} back</span>
              {selectedCurrency.toLowerCase() !== ZERO_ADDRESS.toLowerCase() &&
               selectedCurrency.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && (
                <span className="block mt-2">This offer uses an ERC20 token - you must approve the contract before making the offer</span>
              )}
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
