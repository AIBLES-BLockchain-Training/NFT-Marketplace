import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_ROLE_REQUESTS_QUERY, GET_NFT_ROLE_REQUESTS_QUERY } from '../../lib/graphql/queries';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { encodeGrantRole } from '../../lib/web3/encoding';
import { Address } from '../../types';
import { truncateTokenId } from '../../lib/utils/format';
import toast from 'react-hot-toast';

interface RoleRequest {
  id: string;
  status: string;
  requestedAt: string;
  requester: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    roleName: string;
    roleHash: string;
  };
  transactionHash: string;
}

interface NFTRoleRequest {
  id: string;
  nftAddress: string;
  tokenId: string;
  status: string;
  requestedAt: string;
  requester: {
    id: string;
    name: string;
  };
  transactionHash: string;
}

export function RoleRequests() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [nftRoleRequests, setNftRoleRequests] = useState<NFTRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const [roleData, nftRoleData] = await Promise.all([
        graphqlClient.query(GET_ROLE_REQUESTS_QUERY, {
          where: { status_eq: 'PENDING' }
        }),
        graphqlClient.query(GET_NFT_ROLE_REQUESTS_QUERY, {
          where: { status_eq: 'PENDING' }
        })
      ]);

      console.log('Role Requests Data:', roleData);
      console.log('NFT Role Requests Data:', nftRoleData);

      setRoleRequests(roleData.roleRequests || []);
      setNftRoleRequests(nftRoleData.nftRoleRequests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load role requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRole = async (request: RoleRequest) => {
    try {
      const tx = encodeGrantRole(
        request.role.roleHash,
        request.requester.id as Address
      );

      const receipt = await sendTransaction(tx, 'Role granted successfully!');

      if (receipt?.status === 1) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error approving role:', error);
    }
  };

  const handleApproveNFT = async (request: NFTRoleRequest) => {
    try {
      const iface = new (await import('ethers')).Interface([
        'function assignNFTRole(address[] calldata _nfts) external'
      ]);
      const data = iface.encodeFunctionData('assignNFTRole', [[request.nftAddress]]);

      const tx = {
        to: process.env.NEXT_PUBLIC_ROUTER_ADDRESS!,
        data,
      };

      const receipt = await sendTransaction(tx, 'NFT whitelisted successfully!');

      if (receipt?.status === 1) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error approving NFT:', error);
    }
  };

  const totalRequests = roleRequests.length + nftRoleRequests.length;

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Role Requests</h2>
        <p className="text-sm text-gray-400">View and manage pending permission requests</p>
      </div>

      {loading ? (
        <div className="text-center py-16 px-4">
          <p className="text-gray-400">Loading requests...</p>
        </div>
      ) : totalRequests === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-gray-400 mb-2 font-medium">No Pending Requests</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Contract events will appear here when users request roles or whitelist access
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Role Requests */}
          {roleRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Role Requests ({roleRequests.length})</h3>
              <div className="space-y-3">
                {roleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-xl border border-dark-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-mono text-sm text-white">{request.requester.name}</p>
                        <Badge variant="warning">{request.role.roleName}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleApproveRole(request)}
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                    >
                      Approve
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NFT Role Requests */}
          {nftRoleRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">NFT Whitelist Requests ({nftRoleRequests.length})</h3>
              <div className="space-y-3">
                {nftRoleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-xl border border-dark-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex-1">
                      <div className="mb-2">
                        <p className="text-sm text-white mb-1">
                          NFT: {request.nftAddress.slice(0, 6)}...{request.nftAddress.slice(-4)} #{truncateTokenId(request.tokenId)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Requested by: {request.requester.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleApproveNFT(request)}
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                    >
                      Whitelist
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
