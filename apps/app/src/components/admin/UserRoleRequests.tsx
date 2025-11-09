import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_ROLE_REQUESTS_QUERY } from '../../lib/graphql/queries';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { PERMISSIONS_ADDRESS } from '../../lib/contracts/addresses';
import { ROLE_HASHES } from '../../lib/constants/roles';
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

interface RoleBoxProps {
  title: string;
  description: string;
  roleHash: string;
  requests: RoleRequest[];
  onApprove: (roleHash: string, addresses: string[]) => Promise<void>;
  isLoading: boolean;
}

function RoleBox({ title, description, roleHash, requests, onApprove, isLoading }: RoleBoxProps) {
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter by role hash and search query
  const filteredRequests = requests.filter(request => {
    if (request.role.roleHash.toLowerCase() !== roleHash.toLowerCase()) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.requester.id.toLowerCase().includes(query) ||
      request.requester.name.toLowerCase().includes(query)
    );
  });

  const handleToggle = (address: string) => {
    const newSelected = new Set(selectedAddresses);
    if (newSelected.has(address)) {
      newSelected.delete(address);
    } else {
      newSelected.add(address);
    }
    setSelectedAddresses(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedAddresses.size === filteredRequests.length) {
      setSelectedAddresses(new Set());
    } else {
      setSelectedAddresses(new Set(filteredRequests.map(r => r.requester.id)));
    }
  };

  const handleApprove = async () => {
    if (selectedAddresses.size === 0) {
      toast.error('Please select at least one user');
      return;
    }
    await onApprove(roleHash, Array.from(selectedAddresses));
    setSelectedAddresses(new Set());
  };

  return (
    <Card className="flex-1 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-gray-400">{description}</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by address..."
          className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Actions */}
      {selectedAddresses.size > 0 && (
        <div className="mb-4">
          <Button
            onClick={handleApprove}
            variant="primary"
            isLoading={isLoading}
            className="w-full text-sm"
          >
            Approve Selected ({selectedAddresses.size})
          </Button>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No requests found' : 'No pending requests'}
            </p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-dark-border">
              <span className="text-xs text-gray-400">{filteredRequests.length} request(s)</span>
              <button
                onClick={handleToggleAll}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                {selectedAddresses.size === filteredRequests.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedAddresses.has(request.requester.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-dark-bg/50 border-dark-border hover:border-primary/30'
                }`}
                onClick={() => handleToggle(request.requester.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedAddresses.has(request.requester.id)}
                  onChange={() => handleToggle(request.requester.id)}
                  className="w-4 h-4 rounded border-dark-border bg-dark-card text-primary focus:ring-primary focus:ring-offset-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-white truncate">{request.requester.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}

export function UserRoleRequests() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const roleData = await graphqlClient.query(GET_ROLE_REQUESTS_QUERY, {
        where: { status_eq: 'PENDING' }
      });

      console.log('Role Requests Data:', roleData);
      setRoleRequests(roleData.roleRequests || []);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      toast.error('Failed to load role requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRole = async (roleHash: string, addresses: string[]) => {
    try {
      const iface = new (await import('ethers')).Interface([
        'function assignRole(bytes32 role, address[] calldata accounts) external'
      ]);

      const data = iface.encodeFunctionData('assignRole', [roleHash, addresses]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
      };

      const receipt = await sendTransaction(tx, `Successfully approved ${addresses.length} user(s)`);

      if (receipt?.status === 1) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error approving role:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">User Role Requests</h2>
          <p className="text-sm text-gray-400">Review and approve pending role requests from users</p>
        </div>
        <div className="text-center py-16 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">User Role Requests</h2>
        <p className="text-sm text-gray-400">Review and approve pending role requests from users</p>
      </div>

      {/* 3 Boxes in a Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RoleBox
          title="Listing Requests"
          description="Users requesting permission to create listings"
          roleHash={ROLE_HASHES.LISTING_ROLE}
          requests={roleRequests}
          onApprove={handleApproveRole}
          isLoading={isLoading}
        />

        <RoleBox
          title="Auction Requests"
          description="Users requesting permission to create auctions"
          roleHash={ROLE_HASHES.AUCTION_ROLE}
          requests={roleRequests}
          onApprove={handleApproveRole}
          isLoading={isLoading}
        />

        <RoleBox
          title="Offer Requests"
          description="Users requesting permission to make offers"
          roleHash={ROLE_HASHES.OFFER_ROLE}
          requests={roleRequests}
          onApprove={handleApproveRole}
          isLoading={isLoading}
        />
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
    </div>
  );
}
