import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import toast from 'react-hot-toast';

const LISTING_ABI = [
  'function setCurrencyFee(address currency, uint256 fee) external',
  'function withdrawListingFees(address currency) external',
];

const AUCTION_ABI = [
  'function setCurrencyFee(address currency, uint256 fee) external',
  'function withdrawAuctionFees(address currency) external',
];

const OFFER_ABI = [
  'function setFeePercentage(uint256) external',
  'function setFeeRecipient(address) external',
  'function withdrawOfferFees(address currency) external',
];

export function FeeManagement() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [selectedExtension, setSelectedExtension] = useState<'listing' | 'auction' | 'offer'>('listing');
  const [currency, setCurrency] = useState('');
  const [feePercentage, setFeePercentage] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState('');

  const handleSetFee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currency && selectedExtension !== 'offer') {
      toast.error('Please enter a currency address');
      return;
    }

    if (!feePercentage) {
      toast.error('Please enter a fee percentage');
      return;
    }

    try {
      const fee = Math.floor(parseFloat(feePercentage) * 100); // Convert to basis points

      if (fee < 0 || fee > 10000) {
        toast.error('Fee must be between 0% and 100%');
        return;
      }

      let abi: string[];
      let functionName: string;
      let args: any[];

      if (selectedExtension === 'offer') {
        // Offer uses global fee percentage (no per-currency setting)
        abi = OFFER_ABI;
        functionName = 'setFeePercentage';
        args = [fee];
      } else {
        // Listing and Auction use per-currency fees
        abi = selectedExtension === 'listing' ? LISTING_ABI : AUCTION_ABI;
        functionName = 'setCurrencyFee';
        args = [currency, fee];
      }

      const iface = new (await import('ethers')).Interface(abi);
      const data = iface.encodeFunctionData(functionName, args);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      const successMessage = selectedExtension === 'offer' 
        ? `Offer fee set to ${feePercentage}% successfully!`
        : `${selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} fee set to ${feePercentage}% for currency`;

      const receipt = await sendTransaction(tx, successMessage);

      if (receipt?.status === 1) {
        setCurrency('');
        setFeePercentage('');
      }
    } catch (error) {
      console.error('Set fee error:', error);
    }
  };

  const handleWithdrawFees = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawCurrency) {
      toast.error('Please enter a currency address');
      return;
    }

    try {
      let abi: string[];
      let functionName: string;

      switch (selectedExtension) {
        case 'listing':
          abi = LISTING_ABI;
          functionName = 'withdrawListingFees';
          break;
        case 'auction':
          abi = AUCTION_ABI;
          functionName = 'withdrawAuctionFees';
          break;
        case 'offer':
          abi = OFFER_ABI;
          functionName = 'withdrawOfferFees';
          break;
      }

      const iface = new (await import('ethers')).Interface(abi);
      const data = iface.encodeFunctionData(functionName, [withdrawCurrency]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      const successMessage = `${selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} fees withdrawn successfully!`;

      const receipt = await sendTransaction(tx, successMessage);

      if (receipt?.status === 1) {
        setWithdrawCurrency('');
      }
    } catch (error) {
      console.error('Withdraw fees error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Fee Management</h2>
        <p className="text-sm text-gray-400">Configure marketplace fees and withdraw revenue for all extensions</p>
      </div>

      {/* Extension Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Extension</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'listing', name: 'Listing', color: 'blue' },
            { id: 'auction', name: 'Auction', color: 'purple' },
            { id: 'offer', name: 'Offer', color: 'green' },
          ].map((extension) => (
            <button
              key={extension.id}
              onClick={() => setSelectedExtension(extension.id as 'listing' | 'auction' | 'offer')}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                selectedExtension === extension.id
                  ? `bg-${extension.color}-500/20 border-${extension.color}-500/50 text-${extension.color}-300`
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-600'
              }`}
            >
              {extension.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Fee */}
        <div className={`p-5 bg-gradient-to-br rounded-xl border ${
          selectedExtension === 'listing' 
            ? 'from-blue-500/5 to-blue-600/5 border-blue-500/20'
            : selectedExtension === 'auction'
            ? 'from-purple-500/5 to-purple-600/5 border-purple-500/20'
            : 'from-green-500/5 to-green-600/5 border-green-500/20'
        }`}>
          <h3 className="text-lg font-semibold text-white mb-4">
            Set {selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} Fee Rate
          </h3>
          <form onSubmit={handleSetFee} className="space-y-4">
            {selectedExtension !== 'offer' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
                <Input
                  type="text"
                  placeholder="0x0000000000000000000000000000000000000000 (ETH/Native)"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Enter currency address (0x0 for native token)</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fee Percentage</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedExtension === 'offer' ? '10' : '100'}
                placeholder="2.5"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                {selectedExtension === 'offer' 
                  ? 'Enter percentage (e.g., 2.5 for 2.5%). Max 10% for offers.'
                  : 'Enter percentage (e.g., 2.5 for 2.5% fee)'
                }
              </p>
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update {selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} Fee
            </Button>
          </form>
        </div>

        {/* Withdraw Fees */}
        <div className={`p-5 bg-gradient-to-br rounded-xl border ${
          selectedExtension === 'listing' 
            ? 'from-yellow-500/5 to-yellow-600/5 border-yellow-500/20'
            : selectedExtension === 'auction'
            ? 'from-orange-500/5 to-orange-600/5 border-orange-500/20'
            : 'from-red-500/5 to-red-600/5 border-red-500/20'
        }`}>
          <h3 className="text-lg font-semibold text-white mb-4">
            Withdraw {selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} Revenue
          </h3>
          <form onSubmit={handleWithdrawFees} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
              <Input
                type="text"
                placeholder="0x0000000000000000000000000000000000000000 (ETH/Native)"
                value={withdrawCurrency}
                onChange={(e) => setWithdrawCurrency(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Withdraw accumulated {selectedExtension} fees to admin wallet
              </p>
            </div>
            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Withdraw {selectedExtension.charAt(0).toUpperCase() + selectedExtension.slice(1)} Fees
            </Button>
          </form>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-dark-bg border border-dark-border rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Extension-Specific Notes</h4>
        <div className="text-xs text-gray-500 space-y-1">
          {selectedExtension === 'listing' && (
            <>
              <p>• Listing fees are charged per currency when NFTs are purchased</p>
              <p>• Set different fee percentages for different currencies</p>
            </>
          )}
          {selectedExtension === 'auction' && (
            <>
              <p>• Auction fees are charged per currency when auctions end</p>
              <p>• Set different fee percentages for different currencies</p>
            </>
          )}
          {selectedExtension === 'offer' && (
            <>
              <p>• Offer fees use a global percentage (not per-currency)</p>
              <p>• Maximum fee percentage is 10% for offers</p>
              <p>• Fees are charged when offers are accepted</p>
            </>
          )}
        </div>
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
