'use client';

import { useState } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/Input';
import { TransactionResultModal } from '../../common/TransactionResultModal';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { useMultiSigData } from '../../../hooks/useMultiSigData';
import { CONTRACT_ADDRESSES } from '../../../lib/contracts/addresses';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const MULTISIG_ABI = [
  'function addOwner(address owner) external',
  'function removeOwner(address owner) external',
  'function changeRequirement(uint newRequirement) external',
  'function isOwner(address) public view returns (bool)',
];

export function MultiSigOwnersList() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showChangeRequirementModal, setShowChangeRequirementModal] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [ownerToRemove, setOwnerToRemove] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { owners, requiredConfirmations, currentUserIsOwner, refreshData } = useMultiSigData();

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ethers.isAddress(newOwnerAddress)) {
      toast.error('Invalid address');
      return;
    }

    if (owners.includes(newOwnerAddress)) {
      toast.error('This address is already an admin');
      return;
    }

    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('addOwner', [newOwnerAddress]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Add admin request sent: ${newOwnerAddress.slice(0, 10)}...`);
      
      if (receipt?.status === 1) {
        setShowAddModal(false);
        setNewOwnerAddress('');
        refreshData();
      }
    } catch (error) {
      console.error('Add owner error:', error);
      toast.error('Unable to send add admin request');
    }
  };

  const handleRemoveOwner = async (e: React.FormEvent) => {
    e.preventDefault();

    if (owners.length <= 1) {
      toast.error('Cannot remove the last admin');
      return;
    }

    if (requiredConfirmations > owners.length - 1) {
      toast.error('Need to reduce required confirmations before removing admin');
      return;
    }

    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('removeOwner', [ownerToRemove]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Remove admin request sent: ${ownerToRemove.slice(0, 10)}...`);
      
      if (receipt?.status === 1) {
        setShowRemoveModal(false);
        setOwnerToRemove('');
        refreshData();
      }
    } catch (error) {
      console.error('Remove owner error:', error);
      toast.error('Unable to send remove admin request');
    }
  };

  const handleChangeRequirement = async (e: React.FormEvent) => {
    e.preventDefault();

    const requirement = parseInt(newRequirement);
    if (requirement < 1 || requirement > owners.length) {
      toast.error(`Confirmation count must be from 1 to ${owners.length}`);
      return;
    }

    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('changeRequirement', [requirement]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Change requirement request sent: ${requirement}`);
      
      if (receipt?.status === 1) {
        setShowChangeRequirementModal(false);
        setNewRequirement('');
        refreshData();
      }
    } catch (error) {
      console.error('Change requirement error:', error);
      toast.error('Unable to send change request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">MultiSig Admin Management</h3>
          <p className="text-gray-400 text-sm mt-1">
            Requires {requiredConfirmations} confirmations out of {owners.length} admins
          </p>
        </div>
        {currentUserIsOwner && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowChangeRequirementModal(true)}
              variant="secondary"
              size="sm"
            >
              Change Requirement
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Admin
            </Button>
          </div>
        )}
      </div>

      {/* Owners List */}
      <Card>
        <div className="divide-y divide-dark-border">
          {owners.map((owner, index) => (
            <div key={owner} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">
                        {owner.slice(0, 10)}...{owner.slice(-8)}
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(owner)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy address"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        Admin
                      </span>
                      <span className="text-gray-500 text-xs">
                        Role: Transaction Approval
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://sepolia.etherscan.io/address/${owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                    title="View on Etherscan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {currentUserIsOwner && owners.length > 1 && (
                    <Button
                      onClick={() => {
                        setOwnerToRemove(owner);
                        setShowRemoveModal(true);
                      }}
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Owner Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Admin">
        <form onSubmit={handleAddOwner} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Admin Address
            </label>
            <Input
              type="text"
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              placeholder="0x..."
              required
              className="font-mono"
            />
            <p className="text-gray-500 text-xs mt-1">
              Enter a valid Ethereum address for the new admin
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Owner Modal */}
      <Modal isOpen={showRemoveModal} onClose={() => setShowRemoveModal(false)} title="Remove Admin">
        <form onSubmit={handleRemoveOwner} className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-red-300 font-medium">Confirm Admin Removal</h4>
                <p className="text-red-400/70 text-sm mt-1">
                  Are you sure you want to remove admin: <br />
                  <span className="font-mono">{ownerToRemove}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRemoveModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isLoading}
            >
              Confirm Remove
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Requirement Modal */}
      <Modal isOpen={showChangeRequirementModal} onClose={() => setShowChangeRequirementModal(false)} title="Change Confirmation Requirement">
        <form onSubmit={handleChangeRequirement} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Confirmations Required (current: {requiredConfirmations})
            </label>
            <Input
              type="number"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              min="1"
              max={owners.length}
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              Must be from 1 to {owners.length} (total current admins)
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowChangeRequirementModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Submit Request
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