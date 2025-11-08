import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeApproveCurrencyForListing } from '../../lib/web3/encoding';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_SUPPORTED_CURRENCIES_QUERY } from '../../lib/graphql/queries';
import { SupportedCurrency } from '../../types';
import { truncate } from '../../lib/utils/format';
import toast from 'react-hot-toast';

interface AddCurrencyModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddCurrencyModal({ listingId, isOpen, onClose, onSuccess }: AddCurrencyModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency | null>(null);
  const [pricePerToken, setPricePerToken] = useState('');
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);

  // Load supported currencies
  useEffect(() => {
    if (isOpen) {
      loadCurrencies();
    }
  }, [isOpen]);

  const loadCurrencies = async () => {
    setIsLoadingCurrencies(true);
    try {
      const result = await graphqlClient.query(GET_SUPPORTED_CURRENCIES_QUERY, {});
      if (result?.supportedCurrencies) {
        setCurrencies(result.supportedCurrencies);
      }
    } catch (error) {
      console.error('Failed to load currencies:', error);
      toast.error('Failed to load supported currencies');
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCurrency) {
      toast.error('Please select a currency');
      return;
    }

    if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      // Convert price to wei based on currency decimals
      const priceWei = BigInt(Math.floor(parseFloat(pricePerToken) * Math.pow(10, selectedCurrency.decimals)));

      const tx = encodeApproveCurrencyForListing(
        BigInt(listingId),
        selectedCurrency.id,
        priceWei
      );

      await sendTransaction(tx, 'Currency approved successfully!');
    } catch (error: unknown) {
      console.error('Approve currency error:', error);
    }
  };

  return (
    <>
      {/* Add Currency Modal - hide when showing result, but don't unmount */}
      <Modal isOpen={isOpen && !showResultModal} onClose={onClose} title="Add Payment Currency" zIndex="z-[60]">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-primary-400 font-semibold mb-1">Add alternative payment currency</p>
              <p className="text-gray-300 text-xs">
                Allow buyers to purchase your NFT using different cryptocurrencies at your specified price.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Currency *
            </label>
            {isLoadingCurrencies ? (
              <div className="text-center py-4 text-gray-400">Loading currencies...</div>
            ) : currencies.length === 0 ? (
              <div className="text-center py-4 text-gray-400">No supported currencies available</div>
            ) : (
              <select
                value={selectedCurrency?.id || ''}
                onChange={(e) => {
                  const currency = currencies.find(c => c.id === e.target.value);
                  setSelectedCurrency(currency || null);
                }}
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">Choose a currency...</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} - {currency.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCurrency && (
            <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Selected Currency</h4>
              <div className="space-y-1 text-sm">
                <p className="text-white font-semibold text-lg">{selectedCurrency.symbol}</p>
                <p className="text-gray-400 text-xs">
                  Address: {truncate(selectedCurrency.id)}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Price per Token ({selectedCurrency?.symbol || 'Currency'}) *
            </label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={pricePerToken}
              onChange={(e) => setPricePerToken(e.target.value)}
              required
              disabled={!selectedCurrency}
            />
            <p className="mt-2 text-xs text-gray-500">
              Set the price for this NFT in the selected currency
            </p>
          </div>

          <div className="pt-6 border-t border-dark-border flex gap-3">
            <Button type="button" onClick={onClose} variant="secondary" fullWidth disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading} disabled={!selectedCurrency}>
              Approve Currency
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Result Modal - shown independently after closing add currency modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            onClose(); // Close the add currency modal FIRST to prevent re-mount
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
