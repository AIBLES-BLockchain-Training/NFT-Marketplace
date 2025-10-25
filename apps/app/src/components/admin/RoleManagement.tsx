import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { useContract } from '../../hooks/useContract';
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
  roles: Role[];
  onRoleUpdate?: () => void;
}

export function RoleManagement({ roles, onRoleUpdate }: RoleManagementProps) {
  const { sendTransaction, isLoading } = useContract();
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

      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Admin role granted successfully!');
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

      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Admin role revoked successfully!');
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
          <h2 className="text-2xl font-bold text-white mb-1">Role Management</h2>
          <p className="text-sm text-gray-400">
            Manage admin access and permissions
          </p>
        </div>
        <Button
          onClick={() => setShowGrantForm(!showGrantForm)}
          variant="primary"
          size="sm"
        >
          {showGrantForm ? 'Cancel' : 'Add Admin'}
        </Button>
      </div>

      {showGrantForm && (
        <div className="mb-6 p-4 bg-dark-bg rounded-lg border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Grant Admin Role
          </h3>
          <div className="flex gap-3">
            <Input
              placeholder="0x..."
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
            />
            <Button
              onClick={handleGrantRole}
              variant="primary"
              isLoading={isLoading}
            >
              Grant
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {adminRoles.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No admin roles assigned
          </div>
        ) : (
          adminRoles.map((role, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-mono text-sm text-white">{role.address}</p>
                  <Badge variant="success">Admin</Badge>
                </div>
                {role.grantedAt && (
                  <p className="text-xs text-gray-500">
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
    </Card>
  );
}
