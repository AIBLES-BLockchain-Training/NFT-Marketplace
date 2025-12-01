import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { PERMISSIONS_ADDRESS, ZERO_ADDRESS } from '../../lib/contracts/addresses';
import { clearWhitelistCache } from '../../lib/web3/approve';
import { ROLE_HASHES } from '../../lib/constants/roles';
import toast from 'react-hot-toast';

const PERMISSIONS_ABI = [
  'function assignNFTRole(address[] calldata _nfts) external',
  'function revokeNFTRole(address[] calldata _nfts) external',
  'function assignRole(bytes32 role, address[] calldata accounts) external',
  'function revokeRole(bytes32 role, address[] calldata accounts) external',
];

// Role constants imported from centralized roles file

export function GlobalPermissions() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'nft-allow' | 'nft-restrict' | 'listing-allow' | 'listing-restrict' |
          'auction-allow' | 'auction-restrict' | 'offer-allow' | 'offer-restrict' | null;
    title: string;
    message: string;
  } | null>(null);

  const handleNFTAllow = async () => {
    try {
      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('assignNFTRole', [[ZERO_ADDRESS]]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, 'All NFT contracts are now globally allowed!');

      if (receipt?.status === 1) {
        // Clear whitelist cache so checks will use new contract state
        clearWhitelistCache();
        console.log('Whitelist cache cleared after global NFT approval');
      }

      setConfirmAction(null);
    } catch (error) {
      console.error('Allow all NFTs error:', error);
    }
  };

  const handleNFTRestrict = async () => {
    try {
      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('revokeNFTRole', [[ZERO_ADDRESS]]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, 'NFT whitelist restriction enabled!');

      if (receipt?.status === 1) {
        // Clear whitelist cache so checks will use new contract state
        clearWhitelistCache();
        console.log('Whitelist cache cleared after NFT restriction');
      }

      setConfirmAction(null);
    } catch (error) {
      console.error('Restrict NFTs error:', error);
    }
  };

  const handleUserRoleAllow = async (role: string, roleName: string) => {
    try {
      const { ethers } = await import('ethers');
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));

      const iface = new ethers.Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('assignRole', [roleHash, [ZERO_ADDRESS]]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      await sendTransaction(tx, `All users can now ${roleName.toLowerCase()}!`);
      setConfirmAction(null);
    } catch (error) {
      console.error(`Allow all users for ${roleName} error:`, error);
    }
  };

  const handleUserRoleRestrict = async (role: string, roleName: string) => {
    try {
      const { ethers } = await import('ethers');
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));

      const iface = new ethers.Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('revokeRole', [roleHash, [ZERO_ADDRESS]]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
        value: '0',
      };

      await sendTransaction(tx, `${roleName} is now restricted to role holders only!`);
      setConfirmAction(null);
    } catch (error) {
      console.error(`Restrict ${roleName} error:`, error);
    }
  };

  const confirmAndExecute = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'nft-allow':
        handleNFTAllow();
        break;
      case 'nft-restrict':
        handleNFTRestrict();
        break;
      case 'listing-allow':
        handleUserRoleAllow('LISTING_ROLE', 'Create Listings');
        break;
      case 'listing-restrict':
        handleUserRoleRestrict('LISTING_ROLE', 'Create Listings');
        break;
      case 'auction-allow':
        handleUserRoleAllow('AUCTION_ROLE', 'Create Auctions');
        break;
      case 'auction-restrict':
        handleUserRoleRestrict('AUCTION_ROLE', 'Create Auctions');
        break;
      case 'offer-allow':
        handleUserRoleAllow('OFFER_ROLE', 'Make Offers');
        break;
      case 'offer-restrict':
        handleUserRoleRestrict('OFFER_ROLE', 'Make Offers');
        break;
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Global Permissions</h2>
        <p className="text-sm text-gray-400">
          Configure system-wide permissions using address(0). These settings affect all users/NFTs globally.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div>
          <p className="text-yellow-400 font-semibold mb-1">Critical System Settings</p>
          <p className="text-gray-300 text-sm">
            These permissions use address(0) to grant/revoke access <strong>globally</strong>.
            Enabling &quot;Allow All&quot; bypasses individual whitelist checks. Use with caution!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NFT Contract Global Permission */}
        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">NFT Contract Whitelist</h3>
            <p className="text-sm text-gray-400 mt-1">
              Control whether all NFT contracts are allowed or require individual approval
            </p>
          </div>
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'nft-allow',
                title: 'Allow All NFT Contracts?',
                message: 'This will grant NFT_ROLE to address(0), allowing ANY NFT contract to be listed without individual approval. Users can create listings for any ERC721/ERC1155 contract.'
              })}
            >
              Allow All NFT Contracts
            </Button>
            <Button
              variant="secondary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'nft-restrict',
                title: 'Restrict NFT Contracts?',
                message: 'This will revoke NFT_ROLE from address(0), requiring each NFT contract to be individually whitelisted by admins before it can be listed.'
              })}
            >
              Require Whitelist Approval
            </Button>
          </div>
        </div>

        {/* User Role: Listing */}
        <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Create Listings Permission</h3>
            <p className="text-sm text-gray-400 mt-1">
              Control who can create fixed-price listings
            </p>
          </div>
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'listing-allow',
                title: 'Allow All Users to Create Listings?',
                message: 'This will grant LISTING_ROLE to address(0), allowing ANY user to create fixed-price listings without requesting permission.'
              })}
            >
              Allow All Users
            </Button>
            <Button
              variant="secondary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'listing-restrict',
                title: 'Restrict Listing Creation?',
                message: 'This will revoke LISTING_ROLE from address(0), requiring users to request and be granted the LISTING_ROLE before they can create listings.'
              })}
            >
              Require Role Approval
            </Button>
          </div>
        </div>

        {/* User Role: Auction */}
        <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-xl border border-purple-500/20">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Create Auctions Permission</h3>
            <p className="text-sm text-gray-400 mt-1">
              Control who can create auction listings
            </p>
          </div>
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'auction-allow',
                title: 'Allow All Users to Create Auctions?',
                message: 'This will grant AUCTION_ROLE to address(0), allowing ANY user to create auctions without requesting permission.'
              })}
            >
              Allow All Users
            </Button>
            <Button
              variant="secondary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'auction-restrict',
                title: 'Restrict Auction Creation?',
                message: 'This will revoke AUCTION_ROLE from address(0), requiring users to request and be granted the AUCTION_ROLE before they can create auctions.'
              })}
            >
              Require Role Approval
            </Button>
          </div>
        </div>

        {/* User Role: Offer */}
        <div className="p-5 bg-gradient-to-br from-orange-500/5 to-orange-600/5 rounded-xl border border-orange-500/20">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Make Offers Permission</h3>
            <p className="text-sm text-gray-400 mt-1">
              Control who can make offers on NFTs
            </p>
          </div>
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'offer-allow',
                title: 'Allow All Users to Make Offers?',
                message: 'This will grant OFFER_ROLE to address(0), allowing ANY user to make offers on NFTs without requesting permission.'
              })}
            >
              Allow All Users
            </Button>
            <Button
              variant="secondary"
              fullWidth
              isLoading={isLoading}
              onClick={() => setConfirmAction({
                type: 'offer-restrict',
                title: 'Restrict Offer Making?',
                message: 'This will revoke OFFER_ROLE from address(0), requiring users to request and be granted the OFFER_ROLE before they can make offers.'
              })}
            >
              Require Role Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-3">{confirmAction.title}</h3>
            <p className="text-gray-300 text-sm mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConfirmAction(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={confirmAndExecute}
                isLoading={isLoading}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

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
