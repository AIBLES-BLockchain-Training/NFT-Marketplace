import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_NFT_ROLE_REQUESTS_QUERY } from '../../lib/graphql/queries';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { PERMISSIONS_ADDRESS } from '../../lib/contracts/addresses';
import toast from 'react-hot-toast';

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

export function NFTWhitelistRequests() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [nftRoleRequests, setNftRoleRequests] = useState<NFTRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const nftRoleData = await graphqlClient.query(GET_NFT_ROLE_REQUESTS_QUERY, {
        where: { status_eq: 'PENDING' }
      });

      console.log('NFT Role Requests Data:', nftRoleData);
      setNftRoleRequests(nftRoleData.nftRoleRequests || []);
    } catch (error) {
      console.error('Error fetching NFT role requests:', error);
      toast.error('Failed to load NFT whitelist requests');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedRequests.size === filteredRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filteredRequests.map(r => r.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedRequests.size === 0) {
      toast.error('Please select at least one request');
      return;
    }

    try {
      // Get unique NFT addresses from selected requests
      const nftAddresses = Array.from(new Set(
        nftRoleRequests
          .filter(r => selectedRequests.has(r.id))
          .map(r => r.nftAddress)
      ));

      const iface = new (await import('ethers')).Interface([
        'function assignNFTRole(address[] calldata _nfts) external'
      ]);

      const data = iface.encodeFunctionData('assignNFTRole', [nftAddresses]);

      const tx = {
        to: PERMISSIONS_ADDRESS,
        data,
      };

      const receipt = await sendTransaction(tx, `Successfully whitelisted ${nftAddresses.length} NFT collection(s)`);

      if (receipt?.status === 1) {
        setSelectedRequests(new Set());
        fetchRequests();
      }
    } catch (error) {
      console.error('Error whitelisting NFTs:', error);
    }
  };

  // Filter requests
  const filteredRequests = nftRoleRequests.filter(request => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.nftAddress.toLowerCase().includes(query) ||
      request.requester.id.toLowerCase().includes(query) ||
      request.requester.name.toLowerCase().includes(query) ||
      request.tokenId.includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => setCurrentPage(1)}
          className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis" className="px-2 text-gray-500">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 rounded transition-colors ${
            currentPage === i
              ? 'bg-primary text-white'
              : 'bg-dark-card border border-dark-border text-white hover:border-primary'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="px-2 text-gray-500">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">NFT Whitelist Requests</h2>
        <p className="text-sm text-gray-400">Review and approve NFT collection whitelist requests</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by NFT address, requester, or token ID..."
            className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {selectedRequests.size > 0 && (
          <Button
            onClick={handleBatchApprove}
            variant="primary"
            isLoading={isLoading}
          >
            Approve Selected ({selectedRequests.size})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-gray-400 mb-2 font-medium">
            {searchQuery ? 'No requests found matching your search' : 'No Pending Requests'}
          </p>
          {!searchQuery && (
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              NFT whitelist requests will appear here when users request collection whitelisting
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Info Bar */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <p className="text-gray-400">
              Showing {filteredRequests.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
            </p>
            <button
              onClick={handleToggleAll}
              className="text-primary-400 hover:text-primary-300"
            >
              {selectedRequests.size === filteredRequests.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Requests Table */}
          <div className="space-y-3 mb-6">
            {paginatedRequests.map((request) => (
              <div
                key={request.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  selectedRequests.has(request.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-dark-bg/50 border-dark-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedRequests.has(request.id)}
                    onChange={() => handleToggleRequest(request.id)}
                    className="w-5 h-5 rounded border-dark-border bg-dark-card text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="mb-2">
                      <p className="text-sm text-white font-mono mb-1">
                        NFT: {request.nftAddress.slice(0, 10)}...{request.nftAddress.slice(-8)} #{request.tokenId}
                      </p>
                      <p className="text-xs text-gray-400">
                        Requested by: {request.requester.name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {renderPageNumbers()}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
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
