'use client';

import { useState } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Modal } from '../../common/Modal';
import { TransactionResultModal } from '../../common/TransactionResultModal';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { useMultiSigData } from '../../../hooks/useMultiSigData';
import { CONTRACT_ADDRESSES } from '../../../lib/contracts/addresses';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const PERMISSIONS_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function MANAGEMENT_ROLE() external view returns (bytes32)',
];

const MULTISIG_ABI = ['function submitTransaction(address to, uint value, bytes data) external'];

interface RoleRequest {
  id: string;
  action: 'grant' | 'revoke';
  role: string;
  address: string;
  description: string;
}

export function AdminManagementForm() {
  const [activeTab, setActiveTab] = useState<'permissions' | 'roles'>('permissions');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [targetAddress, setTargetAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState('MANAGEMENT_ROLE');

  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { currentUserIsOwner } = useMultiSigData();

  const availableRoles = [
    { 
      id: 'MANAGEMENT_ROLE', 
      name: 'Management Role', 
      description: 'Permission to manage marketplace and change settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(targetAddress)) {
      toast.error('Invalid address');
      return;
    }

    try {
      // Encode the grant role call
      const permissionsIface = new ethers.Interface(PERMISSIONS_ABI);
      
      // Get role hash (assuming MANAGEMENT_ROLE for now)
      const roleHash = ethers.id('MANAGEMENT_ROLE');
      const grantRoleData = permissionsIface.encodeFunctionData('grantRole', [roleHash, targetAddress]);

      // Submit to MultiSig
      const multisigIface = new ethers.Interface(MULTISIG_ABI);
      const data = multisigIface.encodeFunctionData('submitTransaction', [
        CONTRACT_ADDRESSES.PERMISSIONS,
        0,
        grantRoleData
      ]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Grant permission request created for ${selectedRole} to ${targetAddress.slice(0, 10)}...`);
      
      if (receipt?.status === 1) {
        setShowGrantModal(false);
        setTargetAddress('');
      }
    } catch (error) {
      console.error('Grant role error:', error);
      toast.error('Unable to create grant permission request');
    }
  };

  const handleRevokeRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(targetAddress)) {
      toast.error('Invalid address');
      return;
    }

    try {
      // Encode the revoke role call
      const permissionsIface = new ethers.Interface(PERMISSIONS_ABI);
      
      // Get role hash
      const roleHash = ethers.id('MANAGEMENT_ROLE');
      const revokeRoleData = permissionsIface.encodeFunctionData('revokeRole', [roleHash, targetAddress]);

      // Submit to MultiSig
      const multisigIface = new ethers.Interface(MULTISIG_ABI);
      const data = multisigIface.encodeFunctionData('submitTransaction', [
        CONTRACT_ADDRESSES.PERMISSIONS,
        0,
        revokeRoleData
      ]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Revoke permission request created for ${selectedRole} from ${targetAddress.slice(0, 10)}...`);
      
      if (receipt?.status === 1) {
        setShowRevokeModal(false);
        setTargetAddress('');
      }
    } catch (error) {
      console.error('Revoke role error:', error);
      toast.error('Unable to create revoke permission request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">System Permission Management</h3>
          <p className="text-gray-400 text-sm mt-1">
            Grant or revoke admin permissions for addresses in the system
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
              <p className="text-yellow-400/70 text-sm">Only MultiSig admins can manage system permissions</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'permissions'
                ? 'border-b-2 border-primary-500 text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Grant Permissions
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'roles'
                ? 'border-b-2 border-primary-500 text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Role List
          </button>
        </div>

        {activeTab === 'permissions' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowGrantModal(true)}
                variant="primary"
                fullWidth
                disabled={!currentUserIsOwner}
                className="h-16 flex-col gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Grant Admin Role
              </Button>
              <Button
                onClick={() => setShowRevokeModal(true)}
                variant="danger"
                fullWidth
                disabled={!currentUserIsOwner}
                className="h-16 flex-col gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Revoke Admin Role
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="p-6 space-y-4">
            <h4 className="text-lg font-semibold text-white">Available Role Types</h4>
            <div className="space-y-3">
              {availableRoles.map((role) => (
                <div key={role.id} className="flex items-start gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {role.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-white font-medium mb-1">{role.name}</h5>
                    <p className="text-gray-400 text-sm mb-2">{role.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                        {role.id}
                      </span>
                      <code className="text-xs text-gray-500 font-mono">
                        Hash: {ethers.id(role.id).slice(0, 10)}...
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Grant Role Modal */}
      <Modal isOpen={showGrantModal} onClose={() => setShowGrantModal(false)} title="Grant Admin Role">
        <form onSubmit={handleGrantRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role Type
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address to Grant Permission
            </label>
            <Input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x..."
              required
              className="font-mono"
            />
            <p className="text-gray-500 text-xs mt-1">
              This address will be granted marketplace admin permissions
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> This request will be sent to MultiSig for other admins to review and approve.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowGrantModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Create Grant Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Role Modal */}
      <Modal isOpen={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="Revoke Admin Role">
        <form onSubmit={handleRevokeRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role Type
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address to Revoke Permission
            </label>
            <Input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x..."
              required
              className="font-mono"
            />
            <p className="text-gray-500 text-xs mt-1">
              Marketplace admin permissions will be revoked from this address
            </p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm">
              <strong>Warning:</strong> Revoking permissions will prevent this address from accessing admin functions.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRevokeModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isLoading}
            >
              Create Revoke Request
            </Button>
          </div>
        </form>
      </Modal>

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