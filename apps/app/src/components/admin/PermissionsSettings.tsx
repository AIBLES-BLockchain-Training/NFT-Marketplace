import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const LISTING_ABI = [
  'function setPermissionContract(address _permissionContract) external',
  'function setFeeReceiver(address _feeReceiver) external',
];

const AUCTION_ABI = [
  'function setPermissionsContract(address _permissionContract) external',
  'function setFeeReceiver(address _feeReceiver) external',
];

const OFFER_ABI = [
  'function setFeeRecipient(address _feeRecipient) external',
];

/**
 * Permissions Settings Component
 * Manage contract settings for Listing, Auction, and Offer contracts
 */
export function PermissionsSettings() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();

  // Listing
  const [listingPermissionContract, setListingPermissionContract] = useState('');
  const [listingFeeReceiver, setListingFeeReceiver] = useState('');

  // Auction
  const [auctionPermissionContract, setAuctionPermissionContract] = useState('');
  const [auctionFeeReceiver, setAuctionFeeReceiver] = useState('');

  // Offer
  const [offerFeeRecipient, setOfferFeeRecipient] = useState('');

  const handleSetListingPermissionContract = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(listingPermissionContract)) {
      toast.error('Invalid permission contract address');
      return;
    }

    try {
      const iface = new ethers.Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('setPermissionContract', [listingPermissionContract]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, 'Listing permission contract updated successfully!');
      setListingPermissionContract('');
    } catch (error) {
      console.error('Set listing permission contract error:', error);
    }
  };

  const handleSetListingFeeReceiver = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(listingFeeReceiver)) {
      toast.error('Invalid fee receiver address');
      return;
    }

    try {
      const iface = new ethers.Interface(LISTING_ABI);
      const data = iface.encodeFunctionData('setFeeReceiver', [listingFeeReceiver]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, 'Listing fee receiver updated successfully!');
      setListingFeeReceiver('');
    } catch (error) {
      console.error('Set listing fee receiver error:', error);
    }
  };

  const handleSetAuctionPermissionContract = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(auctionPermissionContract)) {
      toast.error('Invalid permission contract address');
      return;
    }

    try {
      const iface = new ethers.Interface(AUCTION_ABI);
      const data = iface.encodeFunctionData('setPermissionsContract', [auctionPermissionContract]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, 'Auction permission contract updated successfully!');
      setAuctionPermissionContract('');
    } catch (error) {
      console.error('Set auction permission contract error:', error);
    }
  };

  const handleSetAuctionFeeReceiver = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(auctionFeeReceiver)) {
      toast.error('Invalid fee receiver address');
      return;
    }

    try {
      const iface = new ethers.Interface(AUCTION_ABI);
      const data = iface.encodeFunctionData('setFeeReceiver', [auctionFeeReceiver]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, 'Auction fee receiver updated successfully!');
      setAuctionFeeReceiver('');
    } catch (error) {
      console.error('Set auction fee receiver error:', error);
    }
  };

  const handleSetOfferFeeRecipient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethers.isAddress(offerFeeRecipient)) {
      toast.error('Invalid fee recipient address');
      return;
    }

    try {
      const iface = new ethers.Interface(OFFER_ABI);
      const data = iface.encodeFunctionData('setFeeRecipient', [offerFeeRecipient]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_CONTRACT! as `0x${string}`,
        data,
        value: '0',
      };

      await sendTransaction(tx, 'Offer fee recipient updated successfully!');
      setOfferFeeRecipient('');
    } catch (error) {
      console.error('Set offer fee recipient error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Contract Settings</h2>
        <p className="text-sm text-gray-400">
          Manage permission contracts and fee receivers for all marketplace extensions
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-yellow-400 font-semibold mb-1">Critical Settings</p>
            <p className="text-gray-300 text-sm">
              Changing these settings will affect core marketplace functionality. Only update if you know what you&apos;re doing.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Listing Settings */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Listing Contract</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Permission Contract */}
            <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
              <h4 className="text-lg font-semibold text-white mb-4">Permission Contract</h4>
              <form onSubmit={handleSetListingPermissionContract} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contract Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={listingPermissionContract}
                    onChange={(e) => setListingPermissionContract(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Update the Permissions contract used for role checks
                  </p>
                </div>
                <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                  Update Permission Contract
                </Button>
              </form>
            </div>

            {/* Set Fee Receiver */}
            <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
              <h4 className="text-lg font-semibold text-white mb-4">Fee Receiver</h4>
              <form onSubmit={handleSetListingFeeReceiver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MultiSig Wallet Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={listingFeeReceiver}
                    onChange={(e) => setListingFeeReceiver(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Only the current fee receiver can update this
                  </p>
                </div>
                <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                  Update Fee Receiver
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Auction Settings */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Auction Contract</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Permission Contract */}
            <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
              <h4 className="text-lg font-semibold text-white mb-4">Permission Contract</h4>
              <form onSubmit={handleSetAuctionPermissionContract} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contract Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={auctionPermissionContract}
                    onChange={(e) => setAuctionPermissionContract(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Update the Permissions contract used for role checks
                  </p>
                </div>
                <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                  Update Permission Contract
                </Button>
              </form>
            </div>

            {/* Set Fee Receiver */}
            <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
              <h4 className="text-lg font-semibold text-white mb-4">Fee Receiver</h4>
              <form onSubmit={handleSetAuctionFeeReceiver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MultiSig Wallet Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={auctionFeeReceiver}
                    onChange={(e) => setAuctionFeeReceiver(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Destination for auction fee withdrawals
                  </p>
                </div>
                <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                  Update Fee Receiver
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Offer Settings */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Offer Contract</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Fee Recipient */}
            <div className="p-5 bg-gradient-to-br from-orange-500/5 to-orange-600/5 rounded-xl border border-orange-500/20">
              <h4 className="text-lg font-semibold text-white mb-4">Fee Recipient</h4>
              <form onSubmit={handleSetOfferFeeRecipient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fee Recipient Address
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={offerFeeRecipient}
                    onChange={(e) => setOfferFeeRecipient(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Fees are sent immediately when offers are accepted
                  </p>
                </div>
                <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                  Update Fee Recipient
                </Button>
              </form>
            </div>

            {/* Coming Soon Placeholder */}
            <div className="p-5 bg-gradient-to-br from-gray-500/5 to-gray-600/5 rounded-xl border border-gray-500/20 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 font-semibold mb-2">Offer Management</p>
                <p className="text-xs text-gray-500">Additional offer settings coming soon</p>
              </div>
            </div>
          </div>
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
