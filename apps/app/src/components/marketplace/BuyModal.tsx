import { useState } from 'react';
import { Listing } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { formatEth } from '../../lib/web3/utils';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { encodeBuyFromListing } from '../../lib/web3/encoding';
import { ZERO_ADDRESS } from '../../lib/contracts/addresses';
import toast from 'react-hot-toast';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: () => void;
}

export function BuyModal({ isOpen, onClose, listing, onSuccess }: BuyModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address } = useWallet();
  const [quantity, setQuantity] = useState('1');

  // Check if listing has approved currencies
  const hasApprovedCurrencies = listing.currencyApprovals && listing.currencyApprovals.length > 0;

  // Parse values - keep quantity as decimal for UI display
  const maxQuantity = parseFloat(listing.quantity);
  const quantityNum = parseFloat(quantity || '0');

  // For contract call, convert to integer
  const selectedQuantityForContract = BigInt(Math.floor(quantityNum));

  // Get currency and price from currencyApprovals
  let currencyAddress = ZERO_ADDRESS; // Contract uses address(0) for native ETH
  let pricePerToken = BigInt(listing.pricePerToken);
  let displaySymbol = 'ETH'; // Default display symbol

  if (hasApprovedCurrencies) {
    // Use the first approved currency (buyer can later choose from multiple approved currencies)
    const approvedCurrency = listing.currencyApprovals[0];
    const dbCurrencyAddress = approvedCurrency.currency.id.toLowerCase();

    // Normalize: Both 0x0000...0000 and 0xEeee...EEeE represent native ETH
    // Always use 0x0000...0000 (ZERO_ADDRESS) for contract calls
    const isNativeToken = dbCurrencyAddress === ZERO_ADDRESS.toLowerCase() ||
                          dbCurrencyAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    currencyAddress = isNativeToken ? ZERO_ADDRESS : approvedCurrency.currency.id;
    pricePerToken = BigInt(approvedCurrency.pricePerToken);

    // Display symbol: Show 'ETH' for native tokens or UNKNOWN symbols
    displaySymbol = (isNativeToken || approvedCurrency.currency.symbol === 'UNKNOWN')
      ? 'ETH'
      : approvedCurrency.currency.symbol;
  }

  // Calculate total price using decimal quantity for display
  const totalPrice = pricePerToken * selectedQuantityForContract;

  const handleBuy = async () => {
    try {
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      // Validation: must buy at least 1 item after rounding down
      if (selectedQuantityForContract < 1n) {
        toast.error('Quantity must be at least 1.0 (will be rounded down to 1)');
        return;
      }

      if (quantityNum > maxQuantity) {
        toast.error(`Maximum quantity is ${maxQuantity}`);
        return;
      }

      const tx = encodeBuyFromListing(
        BigInt(listing.id), // listing.id is the listingId from contract
        address, // Buy for connected wallet (buyer), not seller!
        selectedQuantityForContract, // Use integer quantity for contract
        currencyAddress,
        totalPrice
      );

      await sendTransaction(tx, 'Purchase successful!');
    } catch (error: unknown) {
      console.error('Buy error:', error);
    }
  };

  return (
    <>
      {/* Buy Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Buy NFT">
        {!hasApprovedCurrencies ? (
            <div className="space-y-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-red-400 font-semibold mb-2">Cannot Purchase This Listing</p>
                    <p className="text-gray-300 text-sm">
                      This listing has no approved currencies yet. The listing owner needs to approve at least one currency (e.g., ETH) before buyers can purchase.
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Owner action required: Call <code className="bg-dark-bg px-1 py-0.5 rounded">approveCurrencyForListing</code>
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={onClose} variant="secondary" fullWidth>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
              <div className="bg-dark-card rounded-lg p-3 mb-4 border border-dark-border">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Price per Token</span>
                  <span className="text-white font-bold text-lg">
                    {formatEth(pricePerToken)} {displaySymbol}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Quantity (Max: {maxQuantity})
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="Enter quantity (e.g., 1.5, 2.3)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {quantityNum >= 1 ? (
                    <>Contract will buy: <span className="font-semibold">{Math.floor(quantityNum)}</span> items (rounded down)</>
                  ) : (
                    <span className="text-red-400">⚠ Must be at least 1.0</span>
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-dark-border">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-400">Total Price</span>
                  <span className="text-2xl font-bold text-primary-400">
                    {formatEth(totalPrice)} {displaySymbol}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {Math.floor(quantityNum)} × {formatEth(pricePerToken)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={onClose} variant="secondary" fullWidth disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleBuy} variant="primary" fullWidth isLoading={isLoading}>
                Confirm Purchase
              </Button>
            </div>
          </div>
          )}
      </Modal>

      {/* Transaction Result Modal - shown independently after closing buy modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            onClose(); // Close the buy modal FIRST to prevent re-mount
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
