import { useState, useEffect, useCallback } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NFTImage } from '../common/NFTImage';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useWallet } from '../../hooks/useWallet';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_USER_ROLE_ASSIGNMENTS_QUERY, GET_USER_ACTIVE_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { getNFTsByAddress, MoralisNFT } from '../../lib/moralis/client';
import { REQUESTABLE_ROLES } from '../../lib/constants/roles';
import { PERMISSIONS_ADDRESS } from '../../lib/contracts/addresses';
import { truncateTokenId } from '../../lib/utils/format';
import toast from 'react-hot-toast';

interface NFT {
  id: string;
  tokenId: string;
  name: string;
  imageUrl?: string;
  amount?: string;
  availableAmount?: string;
  collection: {
    id: string;
    name: string;
    symbol: string;
    collectionType: string;
  };
}

export function RequestRoles() {
  const { address } = useWallet();
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<string>('');
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchAddress, setSearchAddress] = useState('');

  const fetchUserData = useCallback(async () => {
    if (!address) return;

    try {
      setLoadingNFTs(true);

      const [moralisResponse, rolesData, listingsResult] = await Promise.all([
        getNFTsByAddress(address),
        graphqlClient.query(GET_USER_ROLE_ASSIGNMENTS_QUERY, { address }),
        graphqlClient.query(GET_USER_ACTIVE_LISTINGS_QUERY, { address: address.toLowerCase() })
      ]);

      // Build map of listed quantities
      const listedQtyMap = new Map<string, string>();
      if (listingsResult.listings) {
        listingsResult.listings.forEach((listing: any) => {
          const nftId = listing.nft.id;
          const currentQty = BigInt(listedQtyMap.get(nftId) || '0');
          const listingQty = BigInt(listing.quantity || '1');
          listedQtyMap.set(nftId, (currentQty + listingQty).toString());
        });
      }

      // Transform Moralis NFTs to app NFT format and filter out fully listed NFTs
      const transformedNFTs: NFT[] = moralisResponse.data
        .map((nft: MoralisNFT) => {
          const metadata = nft.normalized_metadata || {};
          const nftId = `${nft.token_address.toLowerCase()}-${nft.token_id}`;
          const totalAmount = BigInt(nft.amount || '1');
          const listedAmount = BigInt(listedQtyMap.get(nftId) || '0');
          const availableAmount = totalAmount - listedAmount;

          return {
            id: nftId,
            tokenId: nft.token_id,
            name: metadata.name || nft.name || `${nft.symbol} #${nft.token_id}`,
            imageUrl: metadata.image,
            amount: totalAmount.toString(),
            availableAmount: availableAmount.toString(),
            collection: {
              id: nft.token_address.toLowerCase(),
              name: nft.name || 'Unknown Collection',
              symbol: nft.symbol || 'NFT',
              collectionType: nft.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155',
            },
          };
        })
        .filter((nft: NFT) => BigInt(nft.availableAmount || '0') > 0); // Only show NFTs with available amount > 0

      setUserNFTs(transformedNFTs);

      const roleHashes = rolesData.roleAssignments?.map((ra: { role: { roleHash: string } }) => ra.role.roleHash) || [];
      setCurrentRoles(roleHashes);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setLoadingNFTs(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchUserData();
    }
  }, [address, fetchUserData]);

  const handleRoleToggle = (roleHash: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleHash)) {
        return prev.filter(r => r !== roleHash);
      } else {
        return [...prev, roleHash];
      }
    });
  };

  const handleRequestRoles = async () => {
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    try {
      const iface = new (await import('ethers')).Interface([
        'function requestUserRoles(bytes32[] calldata roles) external'
      ]);
      const data = iface.encodeFunctionData('requestUserRoles', [selectedRoles]);

      const tx = {
        to: PERMISSIONS_ADDRESS,  // Call Permissions contract directly
        data,
      };

      const receipt = await sendTransaction(tx, 'Role requests submitted successfully!');

      if (receipt?.status === 1) {
        setSelectedRoles([]);
        fetchUserData();
      }
    } catch (error) {
      console.error('Error requesting roles:', error);
    }
  };

  const handleRequestNFTWhitelist = async () => {
    if (!selectedNFT) {
      toast.error('Please select an NFT');
      return;
    }

    const [contractAddress, tokenId] = selectedNFT.split('-');

    try {
      const iface = new (await import('ethers')).Interface([
        'function requestNFTRole(address nftContract, uint256 tokenId) external'
      ]);
      const data = iface.encodeFunctionData('requestNFTRole', [contractAddress, tokenId]);

      const tx = {
        to: PERMISSIONS_ADDRESS,  // Call Permissions contract directly
        data,
      };

      const receipt = await sendTransaction(tx, 'NFT whitelist request submitted successfully!');

      if (receipt?.status === 1) {
        setSelectedNFT('');
      }
    } catch (error) {
      console.error('Error requesting NFT whitelist:', error);
    }
  };

  const availableRoles = REQUESTABLE_ROLES.filter(
    role => !currentRoles.some(cr => cr.toLowerCase() === role.hash.toLowerCase())
  );

  // Filter NFTs by collection address search
  const filteredNFTs = userNFTs.filter(nft => {
    if (!searchAddress.trim()) return true;
    return nft.collection.id.toLowerCase().includes(searchAddress.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredNFTs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNFTs = filteredNFTs.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchAddress]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis" className="px-2 text-gray-500">...</span>);
      }
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
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

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="px-2 text-gray-500">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Request User Roles */}
      <Card>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Request User Roles</h2>
          <p className="text-sm text-gray-400">
            Request permissions to perform actions on the marketplace
          </p>
        </div>

        {availableRoles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">You already have all available roles!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {availableRoles.map((role) => (
                <label
                  key={role.hash}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedRoles.includes(role.hash)
                      ? 'border-primary bg-primary/10'
                      : 'border-dark-border bg-dark-bg/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.hash)}
                      onChange={() => handleRoleToggle(role.hash)}
                      className="w-5 h-5 rounded border-dark-border bg-dark-card text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <div>
                      <p className="font-semibold text-white">{role.displayName}</p>
                      <p className="text-sm text-gray-400">{role.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <Button
              onClick={handleRequestRoles}
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={selectedRoles.length === 0}
            >
              Request Selected Roles ({selectedRoles.length})
            </Button>
          </>
        )}
      </Card>

      {/* Request NFT Whitelist */}
      <Card>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Request NFT Whitelist</h2>
          <p className="text-sm text-gray-400">
            Request to whitelist your NFT collection for trading on the marketplace
          </p>
        </div>

        {loadingNFTs ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
            <p className="text-gray-400 mt-4">Loading your NFTs...</p>
          </div>
        ) : userNFTs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">You don&apos;t own any NFTs yet</p>
          </div>
        ) : (
          <>
            {/* Search Box */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search by Collection Address
              </label>
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter collection address..."
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Info */}
            <div className="mb-4 flex items-center justify-between text-sm">
              <p className="text-gray-400">
                Showing {filteredNFTs.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredNFTs.length)} of {filteredNFTs.length} NFTs
              </p>
              {selectedNFT && (
                <button
                  onClick={() => setSelectedNFT('')}
                  className="text-primary-400 hover:text-primary-300"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* NFT Grid */}
            {filteredNFTs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No NFTs found matching your search</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                  {paginatedNFTs.map((nft) => {
                    const nftValue = `${nft.collection.id}-${nft.tokenId}`;
                    const isSelected = selectedNFT === nftValue;

                    return (
                      <button
                        key={nft.id}
                        onClick={() => setSelectedNFT(isSelected ? '' : nftValue)}
                        className={`rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-primary-500 ring-2 ring-primary-500/50'
                            : 'border-dark-border hover:border-primary-500/50'
                        }`}
                      >
                        <div className="aspect-square bg-dark-bg relative overflow-hidden">
                          <NFTImage
                            src={nft.imageUrl}
                            alt={nft.name}
                            className="object-cover"
                            width={200}
                          />
                          {/* Token Type Badge */}
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-gray-500/50">
                            <p className="text-[10px] font-bold text-gray-300">
                              {nft.collection.collectionType === 'ERC721' ? 'ERC-721' : 'ERC-1155'}
                            </p>
                          </div>
                          {/* Available Amount Badge for ERC1155 */}
                          {nft.collection.collectionType === 'ERC1155' && nft.availableAmount && nft.availableAmount !== '1' && (
                            <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50">
                              <p className="text-xs font-bold text-green-400">x{nft.availableAmount}</p>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-dark-card">
                          <p className="text-xs font-semibold text-white truncate">{nft.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">#{truncateTokenId(nft.tokenId)}</p>
                          <p className="text-[10px] text-gray-600 truncate font-mono">{nft.collection.id.slice(0, 10)}...</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {renderPageNumbers()}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded bg-dark-card border border-dark-border text-white hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Note and Submit Button */}
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Note: This will request whitelisting for the entire collection, not just this NFT
                  </p>
                  <Button
                    onClick={handleRequestNFTWhitelist}
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                    disabled={!selectedNFT}
                  >
                    Request NFT Whitelist {selectedNFT && '(1 Selected)'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* Current Roles */}
      {currentRoles.length > 0 && (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Your Current Roles</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentRoles.map((roleHash, index) => {
              const role = REQUESTABLE_ROLES.find(r => r.hash.toLowerCase() === roleHash.toLowerCase());
              return (
                <div
                  key={index}
                  className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium"
                >
                  {role?.displayName || roleHash.slice(0, 10) + '...'}
                </div>
              );
            })}
          </div>
        </Card>
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
    </div>
  );
}
