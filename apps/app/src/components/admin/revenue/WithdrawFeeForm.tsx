'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { TransactionResultModal } from '../../common/TransactionResultModal';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY } from '../../../lib/graphql/queries';
import { getAccumulatedFees, formatFeeAmount } from '../../../lib/web3/revenue';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const LISTING_ABI = ['function withdrawFees(address currency) external'];

interface Currency {
  id: string;
  symbol: string;
  decimals: number;
}

export function WithdrawFeeForm() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } =
    useTransactionModal();
  const [extension, setExtension] = useState<'listing' | 'auction' | 'offer'>('listing');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [availableAmount, setAvailableAmount] = useState(BigInt(0));
  const [isLoadingAmount, setIsLoadingAmount] = useState(false);

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      loadAvailableAmount();
    }
  }, [extension, selectedCurrency]);

  const loadCurrencies = async () => {
    try {
      const result = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});
      setCurrencies(result?.supportedCurrencies || []);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadAvailableAmount = async () => {
    if (!selectedCurrency) return;

    setIsLoadingAmount(true);
    try {
      const amount = await getAccumulatedFees(extension, selectedCurrency);
      setAvailableAmount(amount);
    } catch (error) {
      console.error('Failed to load available amount:', error);
      setAvailableAmount(BigInt(0));
    } finally {
      setIsLoadingAmount(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (availableAmount === BigInt(0)) {
      toast.error('No fees available to withdraw');
      return;
    }

    try {
      const iface = new ethers.Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('withdrawFees', [selectedCurrency]);

      const selectedCurrencyData = currencies.find((c) => c.id === selectedCurrency);
      const formattedAmount = selectedCurrencyData
        ? formatFeeAmount(availableAmount, selectedCurrencyData.decimals, selectedCurrencyData.symbol)
        : 'fees';

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Successfully withdrew ${formattedAmount}!`);

      if (receipt?.status === 1) {
        // Reload available amount
        await loadAvailableAmount();
      }
    } catch (error: any) {
      console.error('Withdraw fees error:', error);
      toast.error(error?.message || 'Failed to withdraw fees');
    }
  };

  const selectedCurrencyData = currencies.find((c) => c.id === selectedCurrency);

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Withdraw Fees</h3>
        <p className="text-sm text-gray-400">
          Only the MultiSig wallet owner can withdraw accumulated fees
        </p>
      </div>

      <form onSubmit={handleWithdraw} className="space-y-6">
        {/* Extension Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Extension</label>
          <select
            value={extension}
            onChange={(e) => setExtension(e.target.value as 'listing' | 'auction' | 'offer')}
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="listing">Listing</option>
            <option value="auction">Auction</option>
            <option value="offer" disabled>
              Offer (Coming Soon)
            </option>
          </select>
        </div>

        {/* Currency Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Currency</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select currency...</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.symbol} ({currency.id === '0x0000000000000000000000000000000000000000'
                  ? 'Native'
                  : `${currency.id.slice(0, 6)}...${currency.id.slice(-4)}`})
              </option>
            ))}
          </select>
        </div>

        {/* Available Amount Display */}
        {selectedCurrency && (
          <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Available Amount:</span>
              <span className="text-lg font-bold text-primary-400">
                {isLoadingAmount
                  ? 'Loading...'
                  : selectedCurrencyData
                  ? formatFeeAmount(availableAmount, selectedCurrencyData.decimals, selectedCurrencyData.symbol)
                  : '0'}
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isLoading}
          disabled={!selectedCurrency || availableAmount === BigInt(0) || isLoadingAmount}
        >
          {availableAmount === BigInt(0) ? 'No Fees Available' : 'Withdraw to MultiSig'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Fees will be sent to the MultiSig wallet configured in the contract
        </p>
      </form>

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
