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

const AUCTION_ABI = [
  'function setCurrencyFee(address currency, uint256 fee) external',
  'function setMinTimeAuction(uint256 _minTimeAuction) external',
];

interface Currency {
  id: string;
  symbol: string;
  decimals: number;
}

/**
 * Auction Settings Component
 * Manage auction-specific admin functions
 */
export function AuctionSettings() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();

  // Currency Fee
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currency, setCurrency] = useState('');
  const [feePercentage, setFeePercentage] = useState('');

  // Min Time Auction
  const [minTimeMinutes, setMinTimeMinutes] = useState('');

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

      const iface = new ethers.Interface(AUCTION_ABI);
      const data = iface.encodeFunctionData('setCurrencyFee', [currency, fee]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, `Auction fee set to ${feePercentage}% successfully!`);
      setCurrency('');
      setFeePercentage('');
    } catch (error) {
      console.error('Set auction currency fee error:', error);
    }
  };

  const handleSetMinTimeAuction = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const minutes = parseInt(minTimeMinutes);

      if (minutes < 1) {
        toast.error('Minimum time must be at least 1 minute');
        return;
      }

      if (minutes > 10080) { // 7 days
        toast.error('Minimum time cannot exceed 7 days (10080 minutes)');
        return;
      }

      const seconds = minutes * 60;

      const iface = new ethers.Interface(AUCTION_ABI);
      const data = iface.encodeFunctionData('setMinTimeAuction', [seconds]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, `Minimum auction time set to ${minutes} minute${minutes > 1 ? 's' : ''} successfully!`);
      setMinTimeMinutes('');
    } catch (error) {
      console.error('Set min time auction error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Auction Settings</h2>
        <p className="text-sm text-gray-400">
          Configure fees and time constraints for auctions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currency Fee Configuration */}
        <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
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
              Update Auction Fee
            </Button>
          </form>
        </div>

        {/* Minimum Auction Time */}
        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Minimum Auction Duration</h3>
          <form onSubmit={handleSetMinTimeAuction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Time (Minutes)
              </label>
              <Input
                type="number"
                min="1"
                max="10080"
                placeholder="15"
                value={minTimeMinutes}
                onChange={(e) => setMinTimeMinutes(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Current default: 15 minutes (900 seconds)
              </p>
            </div>

            <div className="p-3 bg-dark-bg rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Common durations:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMinTimeMinutes('15')}
                  className="p-2 bg-dark-card hover:bg-dark-border rounded text-gray-300 transition-colors"
                >
                  15 min
                </button>
                <button
                  type="button"
                  onClick={() => setMinTimeMinutes('30')}
                  className="p-2 bg-dark-card hover:bg-dark-border rounded text-gray-300 transition-colors"
                >
                  30 min
                </button>
                <button
                  type="button"
                  onClick={() => setMinTimeMinutes('60')}
                  className="p-2 bg-dark-card hover:bg-dark-border rounded text-gray-300 transition-colors"
                >
                  1 hour
                </button>
                <button
                  type="button"
                  onClick={() => setMinTimeMinutes('1440')}
                  className="p-2 bg-dark-card hover:bg-dark-border rounded text-gray-300 transition-colors"
                >
                  1 day
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update Minimum Time
            </Button>
          </form>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">How it works</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <strong>Currency Fee:</strong> Applied when auction ends and winner collects NFT</li>
          <li>• <strong>Minimum Duration:</strong> Prevents auctions from being too short (anti-sniping)</li>
          <li>• Fees are accumulated in the contract and can be withdrawn from Revenue & Fees tab</li>
          <li>• Time buffer extends auction if bids come in near the end</li>
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
