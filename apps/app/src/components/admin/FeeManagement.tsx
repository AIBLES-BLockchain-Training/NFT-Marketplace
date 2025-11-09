import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import toast from 'react-hot-toast';

const LISTING_ABI = [
  'function setCurrencyFee(address currency, uint256 fee) external',
  'function withdrawFees(address currency) external',
];

export function FeeManagement() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [currency, setCurrency] = useState('');
  const [feePercentage, setFeePercentage] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState('');

  const handleSetFee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const fee = Math.floor(parseFloat(feePercentage) * 100); // Convert to basis points

      if (fee < 0 || fee > 10000) {
        toast.error('Fee must be between 0% and 100%');
        return;
      }

      const iface = new (await import('ethers')).Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('setCurrencyFee', [currency, fee]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
        data,
      };

      const receipt = await sendTransaction(tx, `Fee set to ${feePercentage}% for currency`);

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

    try {
      const iface = new (await import('ethers')).Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('withdrawFees', [withdrawCurrency]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
        data,
      };

      const receipt = await sendTransaction(tx, 'Fees withdrawn successfully!');

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
        <p className="text-sm text-gray-400">Configure marketplace fees and withdraw revenue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Fee */}
        <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Set Fee Rate</h3>
          <form onSubmit={handleSetFee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
              <Input
                type="text"
                placeholder="0x0000000000000000000000000000000000000000 (ETH/Native)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fee Percentage</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="2.5"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">Enter percentage (e.g., 2.5 for 2.5% fee)</p>
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update Fee
            </Button>
          </form>
        </div>

        {/* Withdraw Fees */}
        <div className="p-5 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 rounded-xl border border-yellow-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Withdraw Revenue</h3>
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
              <p className="mt-2 text-xs text-gray-500">Withdraw accumulated fees to admin wallet</p>
            </div>
            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Withdraw Fees
            </Button>
          </form>
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
