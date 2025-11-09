'use client';

import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Listing } from '../../types';
import { isAddress } from 'ethers';
import toast from 'react-hot-toast';

interface ApproveBuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onApprove: (buyerAddress: string, approve: boolean) => Promise<void>;
}

export function ApproveBuyerModal({ isOpen, onClose, listing, onApprove }: ApproveBuyerModalProps) {
  const [buyerAddress, setBuyerAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const approvedBuyers = listing.buyerApprovals?.filter(b => b.isApproved) || [];

  const handleApprove = async () => {
    if (!buyerAddress.trim()) {
      toast.error('Please enter a buyer address');
      return;
    }

    if (!isAddress(buyerAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    setIsLoading(true);
    try {
      await onApprove(buyerAddress, true);
      setBuyerAddress('');
      toast.success('Buyer approved successfully!');
    } catch (error: unknown) {
      console.error('Error approving buyer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve buyer';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (address: string) => {
    setIsLoading(true);
    try {
      await onApprove(address, false);
      toast.success('Buyer approval revoked!');
    } catch (error: unknown) {
      console.error('Error revoking buyer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke approval';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approve Buyers">
      <div className="space-y-6">
        {/* Info Banner */}
        {listing.isReserved && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
            <p className="text-sm text-primary-400">
              This is a reserved listing. Only approved buyers can purchase this NFT.
            </p>
          </div>
        )}

        {!listing.isReserved && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              This listing is not reserved. Anyone can buy it. To enable buyer approval, recreate the listing with &quot;Reserved&quot; option enabled.
            </p>
          </div>
        )}

        {/* Add Buyer */}
        {listing.isReserved && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Approve Buyer Address
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={isLoading || !buyerAddress.trim()}
              >
                {isLoading ? 'Approving...' : 'Approve'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the wallet address of the buyer you want to approve for this listing.
            </p>
          </div>
        )}

        {/* Approved Buyers List */}
        {listing.isReserved && approvedBuyers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Approved Buyers ({approvedBuyers.length})
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {approvedBuyers.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-3 bg-dark-bg border border-dark-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-white truncate">
                      {approval.buyerAddress}
                    </p>
                    <p className="text-xs text-gray-500">
                      Approved on {new Date(approval.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleRevoke(approval.buyerAddress)}
                    disabled={isLoading}
                    className="ml-3"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {listing.isReserved && approvedBuyers.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-400">
              No approved buyers yet. Add buyer addresses above.
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-dark-border">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
