'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { TransactionResultModal } from '../../common/TransactionResultModal';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { useMultiSigData } from '../../../hooks/useMultiSigData';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY } from '../../../lib/graphql/queries';
import { getAccumulatedFees } from '../../../lib/web3/revenue';
import { CONTRACT_ADDRESSES } from '../../../lib/contracts/addresses';
import { formatUSDCWithSymbol, formatEther } from '../../../lib/utils/format';
import { USDC_ADDRESS } from '../../../lib/constants';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const MULTISIG_ABI = ['function submitTransaction(address to, uint value, bytes data) external'];
const LISTING_ABI = ['function withdrawListingFees(address currency) external'];
const AUCTION_ABI = ['function withdrawFeesAuction(address currency) external'];
const OFFER_ABI = ['function withdrawOfferFees(address currency) external'];

interface Currency {
  id: string;
  symbol: string;
  decimals: number;
}

type ExtensionType = 'listing' | 'auction' | 'offer';

export function WithdrawRequestForm() {
  const [extension, setExtension] = useState<ExtensionType>('listing');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [availableAmount, setAvailableAmount] = useState(BigInt(0));
  const [isLoadingAmount, setIsLoadingAmount] = useState(false);
  const [customWithdrawal, setCustomWithdrawal] = useState(false);
  const [customTo, setCustomTo] = useState('');
  const [customValue, setCustomValue] = useState('');

  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { currentUserIsOwner, requiredConfirmations } = useMultiSigData();

  useEffect(() => {
    loadCurrencies();
    setSelectedCurrency(USDC_ADDRESS);
  }, []);

  const loadAvailableAmountCallback = useCallback(async () => {
    if (!selectedCurrency || customWithdrawal) return;

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
  }, [extension, selectedCurrency, customWithdrawal]);

  useEffect(() => {
    if (selectedCurrency && !customWithdrawal) {
      loadAvailableAmountCallback();
    }
  }, [selectedCurrency, loadAvailableAmountCallback, customWithdrawal]);

  const loadCurrencies = async () => {
    try {
      const result = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});
      setCurrencies(result?.supportedCurrencies || []);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserIsOwner) {
      toast.error('Only MultiSig admin can create withdrawal request');
      return;
    }

    try {
      let targetContract: string;
      let callData: string;

      if (customWithdrawal) {
        // Custom withdrawal to specified address
        if (!ethers.isAddress(customTo)) {
          toast.error('Invalid address');
          return;
        }

        const value = ethers.parseEther(customValue || '0');
        targetContract = customTo;
        callData = '0x'; // Empty data for ETH transfer
        
        // Submit custom transaction
        const iface = new ethers.Interface(MULTISIG_ABI);
        const data = iface.encodeFunctionData('submitTransaction', [targetContract, value, callData]);

        const tx = {
          to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
          data,
          value: '0',
        };

        const receipt = await sendTransaction(tx, `Created ETH transfer request: ${customValue} ETH to ${customTo.slice(0, 10)}...`);
        
        if (receipt?.status === 1) {
          setCustomTo('');
          setCustomValue('');
        }
      } else {
        // Fee withdrawal from extensions
        if (availableAmount === BigInt(0)) {
          toast.error('No fees available to withdraw');
          return;
        }

        // Get target contract address and encode withdrawal call
        if (extension === 'listing') {
          targetContract = CONTRACT_ADDRESSES.ROUTER;
          const iface = new ethers.Interface(LISTING_ABI);
          callData = iface.encodeFunctionData('withdrawListingFees', [selectedCurrency]);
        } else if (extension === 'auction') {
          targetContract = CONTRACT_ADDRESSES.ROUTER;
          const iface = new ethers.Interface(AUCTION_ABI);
          callData = iface.encodeFunctionData('withdrawFeesAuction', [selectedCurrency]);
        } else if (extension === 'offer') {
          targetContract = CONTRACT_ADDRESSES.OFFER;
          const iface = new ethers.Interface(OFFER_ABI);
          callData = iface.encodeFunctionData('withdrawOfferFees', [selectedCurrency]);
        } else {
          throw new Error('Invalid extension selected');
        }

        // Submit withdrawal transaction to MultiSig
        const iface = new ethers.Interface(MULTISIG_ABI);
        const data = iface.encodeFunctionData('submitTransaction', [targetContract, 0, callData]);

        const tx = {
          to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
          data,
          value: '0',
        };

        const formattedAmount = formatUSDCWithSymbol(availableAmount.toString());
        const receipt = await sendTransaction(tx, `Created withdrawal request: ${formattedAmount} from ${extension} extension`);
        
        if (receipt?.status === 1) {
          await loadAvailableAmountCallback();
        }
      }
    } catch (error: unknown) {
      console.error('Submit withdrawal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create withdrawal request';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Withdrawal Request</h3>
          <p className="text-gray-400 text-sm mt-1">
            Create withdrawal request for fees or transfer ETH from MultiSig wallet
          </p>
        </div>
      </div>

      {!currentUserIsOwner && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-yellow-300 font-medium">You are not a MultiSig admin</p>
              <p className="text-yellow-400/70 text-sm">Only MultiSig admins can create withdrawal requests</p>
            </div>
          </div>
        </Card>
      )}

      {/* Withdrawal Type Selector */}
      <Card>
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">Withdrawal Type</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setCustomWithdrawal(false)}
              className={`p-4 border-2 rounded-lg transition-all ${
                !customWithdrawal
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-border bg-dark-bg hover:border-primary-500/50'
              }`}
            >
              <div className="text-left">
                <h5 className="text-white font-medium mb-1">Withdraw Fees from Extension</h5>
                <p className="text-gray-400 text-sm">Withdraw accumulated fees from Listing, Auction, or Offer</p>
              </div>
            </button>
            <button
              onClick={() => setCustomWithdrawal(true)}
              className={`p-4 border-2 rounded-lg transition-all ${
                customWithdrawal
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-border bg-dark-bg hover:border-primary-500/50'
              }`}
            >
              <div className="text-left">
                <h5 className="text-white font-medium mb-1">Custom ETH Transfer</h5>
                <p className="text-gray-400 text-sm">Transfer ETH to specified address</p>
              </div>
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmitWithdrawal} className="space-y-6">
          {!customWithdrawal ? (
            <>
              {/* Extension Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Extension</label>
                <select
                  value={extension}
                  onChange={(e) => setExtension(e.target.value as ExtensionType)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="listing">Listing Extension</option>
                  <option value="auction">Auction Extension</option>
                  <option value="offer">Offer Extension</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                <div className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white">
                  <div className="flex items-center justify-between">
                    <span>USDC (USD Coin)</span>
                    <span className="text-sm text-gray-400">
                      {USDC_ADDRESS.slice(0, 6)}...{USDC_ADDRESS.slice(-4)}
                    </span>
                  </div>
                </div>
                <input type="hidden" value={USDC_ADDRESS} />
              </div>

              {/* Available Amount Display */}
              {selectedCurrency && (
                <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Available Amount:</span>
                    <span className="text-lg font-bold text-primary-400">
                      {isLoadingAmount
                        ? 'Loading...'
                        : formatUSDCWithSymbol(availableAmount.toString())}
                    </span>
                  </div>
                </div>
              )}

              {/* Withdrawal Info */}
              {selectedCurrency && availableAmount > BigInt(0) && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-400 font-semibold mb-1">Full Amount Withdrawal</p>
                      <p className="text-gray-300 mb-2">
                        This will create a MultiSig request to withdraw the entire available amount of <span className="font-semibold text-white">{formatUSDCWithSymbol(availableAmount.toString())}</span> from {extension} extension.
                      </p>
                      <p className="text-blue-400/80 text-xs">
                        ⚠️ Current contracts only support full withdrawal. Partial amounts require contract upgrades.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Custom Withdrawal Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">To Address</label>
                  <Input
                    type="text"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    placeholder="0x..."
                    required
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ETH Amount</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={
              !currentUserIsOwner ||
              (!customWithdrawal && (availableAmount === BigInt(0) || isLoadingAmount)) ||
              (customWithdrawal && (!customTo || !customValue))
            }
          >
            {!currentUserIsOwner ? 'No Permission' :
             !customWithdrawal && availableAmount === BigInt(0) ? 'No Fees Available' :
             !customWithdrawal ? `Create Request: ${formatUSDCWithSymbol(availableAmount.toString())}` :
             'Create ETH Transfer Request'}
          </Button>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h5 className="text-blue-300 font-medium mb-2">💡 Important Notes</h5>
            <div className="text-xs text-blue-300/80 space-y-1">
              <p>• All withdrawal requests must go through MultiSig system</p>
              <p>• Requires {requiredConfirmations || 'X'} confirmations from admins to execute</p>
              <p>• Withdrawn fees will be transferred to MultiSig wallet address</p>
              <p>• Only MultiSig admins can create and approve requests</p>
              <p>• Replaces old direct withdrawal system for security</p>
            </div>
          </div>
        </form>
      </Card>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={closeModal}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </div>
  );
}