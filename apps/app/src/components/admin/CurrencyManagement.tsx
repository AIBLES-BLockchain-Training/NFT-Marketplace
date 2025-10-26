import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { PERMISSIONS_ADDRESS } from '../../lib/contracts/addresses';
import toast from 'react-hot-toast';

const PERMISSIONS_ABI = [
  'function addCurrency(address[] calldata _currencies) external',
  'function removeCurrency(address[] calldata _currencies) external',
];

export function CurrencyManagement() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [currencyAddress, setCurrencyAddress] = useState('');
  const [currenciesToRemove, setCurrenciesToRemove] = useState('');

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const addresses = currencyAddress.split(',').map(addr => addr.trim()).filter(addr => addr);

      if (addresses.length === 0) {
        toast.error('Please enter at least one currency address');
        return;
      }

      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('addCurrency', [addresses]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
      };

      const receipt = await sendTransaction(tx, 'Currencies added successfully!');

      if (receipt?.status === 1) {
        setCurrencyAddress('');
      }
    } catch (error) {
      console.error('Add currency error:', error);
    }
  };

  const handleRemoveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const addresses = currenciesToRemove.split(',').map(addr => addr.trim()).filter(addr => addr);

      if (addresses.length === 0) {
        toast.error('Please enter at least one currency address');
        return;
      }

      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('removeCurrency', [addresses]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
      };

      const receipt = await sendTransaction(tx, 'Currencies removed successfully!');

      if (receipt?.status === 1) {
        setCurrenciesToRemove('');
      }
    } catch (error) {
      console.error('Remove currency error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Currency Management</h2>
        <p className="text-sm text-gray-400">Manage supported payment currencies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Currency */}
        <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Add Currency</h3>
          <form onSubmit={handleAddCurrency} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
              <Input
                type="text"
                placeholder="0x0000000000000000000000000000000000000000 (ETH/Native)"
                value={currencyAddress}
                onChange={(e) => setCurrencyAddress(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">Enter ERC20 addresses or comma-separated for multiple</p>
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Add Currency
            </Button>
          </form>
        </div>

        {/* Remove Currency */}
        <div className="p-5 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl border border-red-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Remove Currency</h3>
          <form onSubmit={handleRemoveCurrency} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
              <Input
                type="text"
                placeholder="0x..."
                value={currenciesToRemove}
                onChange={(e) => setCurrenciesToRemove(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">Comma-separated for multiple addresses</p>
            </div>
            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Remove Currency
            </Button>
          </form>
        </div>
      </div>

      {/* Transaction Result Modal */}
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
