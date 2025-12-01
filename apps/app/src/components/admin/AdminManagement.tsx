import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { PERMISSIONS_ADDRESS } from '../../lib/contracts/addresses';
import { ROLE_HASHES } from '../../lib/constants/roles';
import toast from 'react-hot-toast';

export function AdminManagement() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [adminAddresses, setAdminAddresses] = useState('');
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLE_HASHES>('MANAGEMENT_ROLE');

  const handleAssignAdmins = async () => {
    const addresses = adminAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr && addr.startsWith('0x'));

    if (addresses.length === 0) {
      toast.error('Please enter at least one valid address');
      return;
    }

    try {
      const iface = new (await import('ethers')).Interface([
        'function assignRole(bytes32 role, address[] calldata accounts) external'
      ]);

      const data = iface.encodeFunctionData('assignRole', [
        ROLE_HASHES[selectedRole],
        addresses
      ]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Successfully assigned ${selectedRole} to ${addresses.length} address(es)`);

      if (receipt?.status === 1) {
        setAdminAddresses('');
      }
    } catch (error) {
      console.error('Error assigning admins:', error);
    }
  };

  const handleRevokeAdmins = async () => {
    const addresses = adminAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr && addr.startsWith('0x'));

    if (addresses.length === 0) {
      toast.error('Please enter at least one valid address');
      return;
    }

    try {
      const iface = new (await import('ethers')).Interface([
        'function revokeRole(bytes32 role, address[] calldata accounts) external'
      ]);

      const data = iface.encodeFunctionData('revokeRole', [
        ROLE_HASHES[selectedRole],
        addresses
      ]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Successfully revoked ${selectedRole} from ${addresses.length} address(es)`);

      if (receipt?.status === 1) {
        setAdminAddresses('');
      }
    } catch (error) {
      console.error('Error revoking admins:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Admin Management</h2>
        <p className="text-sm text-gray-400">
          Grant or revoke management roles for multiple addresses across all extensions
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Management Role
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { key: 'MANAGEMENT_ROLE', name: 'Management Role', color: 'blue' },
            ].map((role) => (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key as keyof typeof ROLE_HASHES)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedRole === role.key
                    ? `bg-${role.color}-500/20 border-${role.color}-500/50 text-${role.color}-300`
                    : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-600'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Admin Addresses (one per line)
          </label>
          <textarea
            value={adminAddresses}
            onChange={(e) => setAdminAddresses(e.target.value)}
            placeholder="0x1234...&#10;0x5678...&#10;0xabcd..."
            rows={8}
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="mt-2 text-xs text-gray-500">
            Enter one Ethereum address per line. You can assign/revoke {selectedRole} for multiple addresses at once.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleAssignAdmins}
            variant="primary"
            isLoading={isLoading}
            disabled={!adminAddresses.trim()}
            className="flex-1"
          >
            Assign Admin Role
          </Button>
          <Button
            onClick={handleRevokeAdmins}
            variant="secondary"
            isLoading={isLoading}
            disabled={!adminAddresses.trim()}
            className="flex-1"
          >
            Revoke Admin Role
          </Button>
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
