import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const LISTING_ABI = [
  'function setCurrencyFee(address currency, uint256 fee) external',
];

interface Currency {
  id: string;
  symbol: string;
  decimals: number;
}

/**
 * Listing Settings Component
 * Manage listing-specific admin functions
 */
export function ListingSettings() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currency, setCurrency] = useState('');
  const [feePercentage, setFeePercentage] = useState('');

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const result = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});
      setCurrencies(result?.supportedCurrencies || []);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const handleSetCurrencyFee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currency) {
      toast.error('Please select a currency');
      return;
    }

    try {
      const fee = Math.floor(parseFloat(feePercentage) * 100); // Convert to basis points

      if (fee <= 0 || fee > 10000) {
        toast.error('Fee must be between 0.01% and 100%');
        return;
      }

      const iface = new ethers.Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('setCurrencyFee', [currency, fee]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT!,
        data,
      };

      await sendTransaction(tx, `Listing fee set to ${feePercentage}% successfully!`);
      setCurrency('');
      setFeePercentage('');
    } catch (error) {
      console.error('Set listing currency fee error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Listing Settings</h2>
        <p className="text-sm text-gray-400">
          Configure fees and settings for fixed-price listings
        </p>
      </div>

      {/* Fee Management */}
      <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Currency Fee Configuration</h3>
        <form onSubmit={handleSetCurrencyFee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select a currency...</option>
              {currencies.map((curr) => (
                <option key={curr.id} value={curr.id}>
                  {curr.symbol} ({curr.id === '0x0000000000000000000000000000000000000000'
                    ? 'Native Token'
                    : `${curr.id.slice(0, 6)}...${curr.id.slice(-4)}`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fee Percentage
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              placeholder="2.5"
              value={feePercentage}
              onChange={(e) => setFeePercentage(e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter percentage (e.g., 2.5 for 2.5% marketplace fee)
            </p>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Update Listing Fee
          </Button>
        </form>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">How it works</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Fees are set per currency and applied to all listings using that currency</li>
          <li>• Fees are deducted from seller&apos;s payout when NFT is sold</li>
          <li>• Accumulated fees can be withdrawn from Revenue & Fees tab</li>
          <li>• Fee is expressed in basis points (100 = 1%, 250 = 2.5%)</li>
        </ul>
      </div>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={closeModal}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </Card>
  );
}
