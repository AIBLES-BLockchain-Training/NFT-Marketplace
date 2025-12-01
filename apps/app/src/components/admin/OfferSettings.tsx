import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { USDC_ADDRESS } from '../../lib/constants';
import { useWallet } from '../../hooks/useWallet';
import { Spinner } from '../common/Spinner';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const OFFER_ABI = [
  'function setFeePercentage(uint256) external',
  'function setFeeRecipient(address) external',
  'function feePercentage() view returns (uint256)',
  'function feeRecipient() view returns (address)',
  'function offerAccumulatedFees(address) view returns (uint256)',
  'function withdrawOfferFees(address) external',
];

interface AccumulatedFee {
  currency: string;
  symbol: string;
  amount: string;
}

/**
 * Offer Settings Component
 * Manage offer-specific admin functions
 */
export function OfferSettings() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { isConnected } = useWallet();
  
  // Current settings
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentFeePercentage, setCurrentFeePercentage] = useState<number>(0);
  const [currentFeeRecipient, setCurrentFeeRecipient] = useState<string>('');
  
  // Form state
  const [newFeePercentage, setNewFeePercentage] = useState<string>('');
  const [newFeeRecipient, setNewFeeRecipient] = useState<string>('');
  
  // Fee withdrawal (USDC only)
  const [accumulatedFees, setAccumulatedFees] = useState<AccumulatedFee[]>([]);

  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        loadCurrentSettings(),
        loadAccumulatedFees(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadCurrentSettings = async () => {
    if (!isConnected) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const routerAddress = process.env.NEXT_PUBLIC_ROUTER_CONTRACT!;
      const contract = new ethers.Contract(routerAddress, OFFER_ABI, provider);

      // Get current fee percentage
      const feePercentageBps = await contract.feePercentage();
      const feePercentage = Number(feePercentageBps) / 100; // Convert basis points to percentage
      setCurrentFeePercentage(feePercentage);
      setNewFeePercentage(feePercentage.toString());

      // Get current fee recipient
      const feeRecipient = await contract.feeRecipient();
      setCurrentFeeRecipient(feeRecipient);
      
      // Only set as new value if it's not zero address
      if (feeRecipient !== '0x0000000000000000000000000000000000000000') {
        setNewFeeRecipient(feeRecipient);
      }

    } catch (error) {
      console.error('Failed to load current settings:', error);
      toast.error('Failed to load current settings');
    }
  };

  const loadAccumulatedFees = async () => {
    if (!isConnected) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const routerAddress = process.env.NEXT_PUBLIC_ROUTER_CONTRACT!;
      const contract = new ethers.Contract(routerAddress, OFFER_ABI, provider);

      const fees: AccumulatedFee[] = [];
      
      // Check USDC fees only
      try {
        const amount = await contract.offerAccumulatedFees(USDC_ADDRESS);
        if (amount > 0n) {
          fees.push({
            currency: USDC_ADDRESS,
            symbol: 'USDC',
            amount: ethers.formatUnits(amount, 6), // USDC has 6 decimals
          });
        }
      } catch (error) {
        console.warn('Failed to get USDC fees:', error);
      }
      
      setAccumulatedFees(fees);
    } catch (error) {
      console.error('Failed to load accumulated fees:', error);
    }
  };

  const handleSetFeePercentage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFeePercentage) {
      toast.error('Please enter a valid fee percentage');
      return;
    }

    try {
      const feePercentage = parseFloat(newFeePercentage);
      
      if (feePercentage < 0 || feePercentage > 10) {
        toast.error('Fee percentage must be between 0% and 10%');
        return;
      }

      // Convert percentage to basis points (e.g., 2.5% -> 250)
      const feePercentageBps = Math.round(feePercentage * 100);

      const iface = new ethers.Interface(OFFER_ABI);
      const data = iface.encodeFunctionData('setFeePercentage', [feePercentageBps]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, `Offer fee percentage set to ${feePercentage}% successfully!`);
      
      // Reload current settings after successful transaction
      await loadCurrentSettings();
    } catch (error) {
      console.error('Set offer fee percentage error:', error);
    }
  };

  const handleSetFeeRecipient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFeeRecipient) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    if (!ethers.isAddress(newFeeRecipient)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    try {
      const iface = new ethers.Interface(OFFER_ABI);
      const data = iface.encodeFunctionData('setFeeRecipient', [newFeeRecipient]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, `Offer fee recipient updated successfully!`);
      
      // Reload current settings after successful transaction
      await loadCurrentSettings();
    } catch (error) {
      console.error('Set offer fee recipient error:', error);
    }
  };

  const handleWithdrawFees = async (currencyAddress: string) => {
    try {
      const iface = new ethers.Interface(OFFER_ABI);
      const data = iface.encodeFunctionData('withdrawOfferFees', [currencyAddress]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, `USDC fees withdrawn successfully!`);
      
      // Reload accumulated fees after withdrawal
      await loadAccumulatedFees();
    } catch (error) {
      console.error('Withdraw offer fees error:', error);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
          <p className="text-gray-400">Please connect your wallet to manage offer settings</p>
        </div>
      </Card>
    );
  }

  if (isLoadingData) {
    return (
      <Card>
        <div className="text-center py-12">
          <Spinner size="lg" />
          <p className="text-gray-400 mt-4">Loading offer settings...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Offer Settings</h2>
        <p className="text-sm text-gray-400">
          Configure fees and settings for offer transactions
        </p>
      </div>

      {/* Current Settings Display */}
      <div className="mb-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Current Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Fee Percentage</div>
            <div className="text-xl font-bold text-white">{currentFeePercentage}%</div>
            <div className="text-xs text-gray-500 mt-1">
              ({Math.round(currentFeePercentage * 100)} basis points)
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Fee Recipient</div>
            <div className="text-sm font-mono text-white break-all">
              {currentFeeRecipient === '0x0000000000000000000000000000000000000000' ? 'Not configured' : currentFeeRecipient || 'Not set'}
            </div>
            {currentFeeRecipient === '0x0000000000000000000000000000000000000000' && (
              <div className="text-xs text-yellow-400 mt-1">
                Please configure fee recipient first
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Percentage Configuration */}
        <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Fee Percentage Configuration</h3>
          <form onSubmit={handleSetFeePercentage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Fee Percentage (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="e.g., 2.5"
                value={newFeePercentage}
                onChange={(e) => setNewFeePercentage(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter percentage (e.g., 2.5 for 2.5%). Maximum 10%.
              </p>
            </div>

            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update Fee Percentage
            </Button>
          </form>
        </div>

        {/* Fee Recipient Configuration */}
        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Fee Recipient Configuration</h3>
          <form onSubmit={handleSetFeeRecipient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Fee Recipient Address
              </label>
              <Input
                type="text"
                placeholder="0x..."
                value={newFeeRecipient}
                onChange={(e) => setNewFeeRecipient(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter the Ethereum address that will receive offer fees.
              </p>
            </div>

            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update Fee Recipient
            </Button>
          </form>
        </div>
      </div>

      {/* Accumulated Fees & Withdrawal */}
      <div className="mt-6 p-5 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 rounded-xl border border-yellow-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">USDC Fee Withdrawal</h3>
        
        {accumulatedFees.length > 0 ? (
          <div className="space-y-3">
            {accumulatedFees.map((fee) => (
              <div key={fee.currency} className="flex items-center justify-between p-3 bg-dark-card rounded-lg">
                <div>
                  <div className="text-white font-medium">{fee.symbol}</div>
                  <div className="text-sm text-gray-400">
                    Amount: {parseFloat(fee.amount).toFixed(6)} {fee.symbol}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    USDC ({fee.currency.slice(0, 6)}...{fee.currency.slice(-4)})
                  </div>
                </div>
                <Button
                  onClick={() => handleWithdrawFees(fee.currency)}
                  variant="accent"
                  size="sm"
                  isLoading={isLoading}
                >
                  Withdraw
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-3">No accumulated USDC fees detected</div>
            <Button
              onClick={() => handleWithdrawFees(USDC_ADDRESS)}
              variant="secondary"
              size="sm"
              isLoading={isLoading}
            >
              Try Withdraw USDC
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Attempt withdrawal in case there are fees not displayed
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">How it works</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <strong>Fee Percentage:</strong> Applied when offers are accepted</li>
          <li>• <strong>Fee Recipient:</strong> Address that receives marketplace fees</li>
          <li>• <strong>USDC Only:</strong> System currently supports USDC offers only</li>
          <li>• <strong>Withdrawal:</strong> Accumulated fees can be withdrawn by admin</li>
          <li>• Fees are charged from the total offer amount when accepted</li>
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