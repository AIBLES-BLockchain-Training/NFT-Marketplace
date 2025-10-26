import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeGrantRole, encodeRevokeRole } from '../../lib/web3/encoding';
import { MANAGEMENT_ROLE_HASH, isValidAddress } from '../../lib/web3/utils';
import { Address } from '../../types';
import toast from 'react-hot-toast';

interface Role {
  address: string;
  roleName: string;
  grantedAt?: string;
}

interface RoleManagementProps {
  roles?: Role[];
  onRoleUpdate?: () => void;
}

export function RoleManagement({ roles = [], onRoleUpdate }: RoleManagementProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [showGrantForm, setShowGrantForm] = useState(false);

  const handleGrantRole = async () => {
    const trimmedAddress = newAdminAddress.trim();

    if (!trimmedAddress) {
      toast.error('Please enter an address');
      return;
    }

    if (!isValidAddress(trimmedAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    try {
      const tx = encodeGrantRole(
        MANAGEMENT_ROLE_HASH,
        trimmedAddress as Address
      );

      const receipt = await sendTransaction(tx, 'Admin role granted successfully!');

      if (receipt?.status === 1) {
        setNewAdminAddress('');
        setShowGrantForm(false);
        onRoleUpdate?.();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Grant role error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to grant role');
    }
  };

  const handleRevokeRole = async (address: string) => {
    if (!isValidAddress(address)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    try {
      const tx = encodeRevokeRole(
        MANAGEMENT_ROLE_HASH,
        address as Address
      );

      const receipt = await sendTransaction(tx, 'Admin role revoked successfully!');

      if (receipt?.status === 1) {
        onRoleUpdate?.();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Revoke role error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revoke role');
    }
  };

  const adminRoles = roles.filter((r) => r.roleName === 'MANAGEMENT_ROLE');

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Role Management</h2>
          <p className="text-sm text-gray-400">
            Grant or revoke admin permissions
          </p>
        </div>
        <Button
          onClick={() => setShowGrantForm(!showGrantForm)}
          variant={showGrantForm ? "secondary" : "primary"}
          size="sm"
        >
          {showGrantForm ? 'Cancel' : 'Add Admin'}
        </Button>
      </div>

      {showGrantForm && (
        <div className="mb-6 p-5 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
          <h3 className="text-lg font-semibold text-white mb-4">
            Grant Admin Role
          </h3>
          <div className="flex gap-3">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
            />
            <Button
              onClick={handleGrantRole}
              variant="primary"
              isLoading={isLoading}
              className="whitespace-nowrap"
            >
              Grant Role
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {adminRoles.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-400 mb-1">No admin roles assigned</p>
            <p className="text-sm text-gray-500">Click &quot;Add Admin&quot; to grant admin permissions</p>
          </div>
        ) : (
          adminRoles.map((role, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-xl border border-dark-border hover:border-primary/30 transition-all"
            >
              <div className="flex-1">
                <p className="font-mono text-sm text-white mb-2">{role.address}</p>
                <Badge variant="success">Admin Access</Badge>
                {role.grantedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Granted: {new Date(role.grantedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                onClick={() => handleRevokeRole(role.address)}
                variant="secondary"
                size="sm"
                isLoading={isLoading}
              >
                Revoke
              </Button>
            </div>
          ))
        )}
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
