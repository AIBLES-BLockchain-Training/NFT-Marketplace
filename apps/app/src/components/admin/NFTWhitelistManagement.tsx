import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import toast from 'react-hot-toast';

const PERMISSIONS_ABI = [
  'function assignNFTRole(address[] calldata _nfts) external',
  'function revokeNFTRole(address[] calldata _nfts) external',
];

export function NFTWhitelistManagement() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [nftAddresses, setNftAddresses] = useState('');
  const [nftsToRevoke, setNftsToRevoke] = useState('');

  const handleWhitelistNFT = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const addresses = nftAddresses.split(',').map(addr => addr.trim()).filter(addr => addr);

      if (addresses.length === 0) {
        toast.error('Please enter at least one NFT contract address');
        return;
      }

      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('assignNFTRole', [addresses]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
        data,
      };

      const receipt = await sendTransaction(tx, 'NFT contracts whitelisted successfully!');

      if (receipt?.status === 1) {
        setNftAddresses('');
      }
    } catch (error) {
      console.error('Whitelist NFT error:', error);
    }
  };

  const handleRevokeNFT = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const addresses = nftsToRevoke.split(',').map(addr => addr.trim()).filter(addr => addr);

      if (addresses.length === 0) {
        toast.error('Please enter at least one NFT contract address');
        return;
      }

      const iface = new (await import('ethers')).Interface(PERMISSIONS_ABI);
      const data = iface.encodeFunctionData('revokeNFTRole', [addresses]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
        data,
      };

      const receipt = await sendTransaction(tx, 'NFT contracts revoked successfully!');

      if (receipt?.status === 1) {
        setNftsToRevoke('');
      }
    } catch (error) {
      console.error('Revoke NFT error:', error);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">NFT Whitelist Management</h2>
        <p className="text-sm text-gray-400">Control which NFT collections can be traded</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whitelist NFT */}
        <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Whitelist Collection</h3>
          <form onSubmit={handleWhitelistNFT} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">NFT Contract Address</label>
              <Input
                type="text"
                placeholder="0x... (ERC721 or ERC1155 contract)"
                value={nftAddresses}
                onChange={(e) => setNftAddresses(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">Allow this collection to be listed on marketplace</p>
            </div>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Whitelist Collection
            </Button>
          </form>
        </div>

        {/* Revoke NFT */}
        <div className="p-5 bg-gradient-to-br from-orange-500/5 to-orange-600/5 rounded-xl border border-orange-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Revoke Whitelist</h3>
          <form onSubmit={handleRevokeNFT} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">NFT Contract Address</label>
              <Input
                type="text"
                placeholder="0x..."
                value={nftsToRevoke}
                onChange={(e) => setNftsToRevoke(e.target.value)}
                required
              />
              <p className="mt-2 text-xs text-gray-500">Remove collection from marketplace</p>
            </div>
            <Button type="submit" variant="secondary" fullWidth isLoading={isLoading}>
              Revoke Access
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
