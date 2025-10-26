import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_WHITELISTED_NFTS_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface WhitelistedNFT {
  id: string;
  nftAddress: string;
  tokenId: string;
  requestedAt: string;
  processedAt: string;
  processedBy: string;
  transactionHash: string;
  requester: {
    id: string;
    name: string;
  };
}

export function WhitelistedNFTList() {
  const [nfts, setNfts] = useState<WhitelistedNFT[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNFTs();
  }, [currentPage]);

  useEffect(() => {
    if (searchTerm) {
      filterNFTs();
    } else {
      fetchNFTs();
    }
  }, [searchTerm]);

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const result = await graphqlClient.query(GET_WHITELISTED_NFTS_QUERY, {
        limit: itemsPerPage,
        offset,
      });

      setNfts(result.nftRoleRequests || []);
      setTotalCount(result.nftRoleRequestsConnection?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching whitelisted NFTs:', error);
      toast.error('Failed to load whitelisted NFTs');
    } finally {
      setLoading(false);
    }
  };

  const filterNFTs = () => {
    const filtered = nfts.filter(nft =>
      nft.nftAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setNfts(filtered);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Whitelisted NFT Collections</h2>
        <p className="text-sm text-gray-400">NFT collections approved for trading</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by contract address..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {nfts.length} of {totalCount} collections
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {searchTerm ? 'No matching NFT collections found' : 'No whitelisted NFT collections'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Contract Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Requested By</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Approved By</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Approved At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {nfts.map((nft) => (
                  <tr key={nft.id} className="border-b border-dark-border hover:bg-dark-bg/50">
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/address/${nft.nftAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary-400 hover:text-primary-300"
                      >
                        {nft.nftAddress}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-gray-400">
                        {nft.requester.id.slice(0, 10)}...{nft.requester.id.slice(-8)}
                      </p>
                      {nft.requester.name && (
                        <p className="text-xs text-gray-500 mt-1">{nft.requester.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-gray-400">
                        {nft.processedBy ? `${nft.processedBy.slice(0, 10)}...${nft.processedBy.slice(-8)}` : 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">
                        {nft.processedAt ? new Date(nft.processedAt).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${nft.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-400 hover:text-primary-300 font-mono"
                      >
                        {nft.transactionHash.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
