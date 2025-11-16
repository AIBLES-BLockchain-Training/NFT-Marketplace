'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { NFTImage } from '../../components/common/NFTImage';
import { AuctionDetailModal } from '../../components/auction/AuctionDetailModal';
import { CompactCountdownTimer } from '../../components/auction/CountdownTimer';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_AUCTIONS_QUERY } from '../../lib/graphql/queries';
import { Auction } from '../../types';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { getAuctionStatusText, getAuctionStatusVariant, hasAuctionEnded, canCollectPayout, canCollectNFT } from '../../lib/auction/status';
import { useWallet } from '../../hooks/useWallet';
import toast from 'react-hot-toast';

type TabType = 'active' | 'expired' | 'claimable';

export default function AuctionsPage() {
  const { address } = useWallet();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  useEffect(() => {
    loadAuctions();
  }, [activeTab, address]);

  const loadAuctions = async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_AUCTIONS_QUERY, {
        limit: 100,
        offset: 0,
        where: {
          status_in: ['CREATED', 'ACTIVE', 'ENDED'],
        },
      });

      if (result.auctions) {
        // Transform auctions: compute winningBid from bids array
        let transformedAuctions = result.auctions.map((auction: Auction) => {
          const sortedBids = auction.bids
            ? [...auction.bids].sort((a, b) => {
                const amountDiff = BigInt(b.bidAmount) - BigInt(a.bidAmount);
                if (amountDiff !== 0n) return Number(amountDiff);
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              })
            : [];

          return {
            ...auction,
            bids: sortedBids,
            winningBid: sortedBids.length > 0 ? sortedBids[0] : undefined,
          };
        });

        // Apply client-side filters based on tab
        if (activeTab === 'active') {
          transformedAuctions = transformedAuctions.filter((auction: Auction) =>
            !hasAuctionEnded(auction.endTime) && auction.status !== 'CANCELLED'
          );
        } else if (activeTab === 'expired') {
          transformedAuctions = transformedAuctions.filter((auction: Auction) =>
            hasAuctionEnded(auction.endTime) && auction.status !== 'CANCELLED'
          );
        } else if (activeTab === 'claimable') {
          transformedAuctions = transformedAuctions.filter((auction: Auction) => {
            if (!hasAuctionEnded(auction.endTime)) return false;
            if (!address) return false;
            if (auction.status === 'CANCELLED') return false;

            const payoutCheck = canCollectPayout(auction, address);
            const nftCheck = canCollectNFT(auction, address);

            return payoutCheck.canCollect || nftCheck.canCollect;
          });
        }

        setAuctions(transformedAuctions);

        // Update selectedAuction if it exists in the new data
        if (selectedAuction) {
          const updatedAuction = transformedAuctions.find((a: Auction) => a.id === selectedAuction.id);
          if (updatedAuction) {
            setSelectedAuction(updatedAuction);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load auctions:', error);
      toast.error('Failed to load auctions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleAuctionClick = (auction: Auction) => {
    setSelectedAuction(auction);
  };

  const handleCloseModal = () => {
    setSelectedAuction(null);
  };

  const handleRefresh = async () => {
    await loadAuctions();
  };

  // Determine claim type for claimable auctions
  const getClaimType = (auction: Auction): 'payout' | 'nft' | 'both' | 'none' => {
    if (!address) return 'none';

    const payoutCheck = canCollectPayout(auction, address);
    const nftCheck = canCollectNFT(auction, address);

    if (payoutCheck.canCollect && nftCheck.canCollect) return 'both';
    if (payoutCheck.canCollect) return 'payout';
    if (nftCheck.canCollect) return 'nft';
    return 'none';
  };

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Auctions</h1>
          <p className="text-gray-400">Browse NFT auctions on the marketplace</p>
        </div>

        {/* Sub-tabs (exactly like Yours tab sub-tabs) */}
        <div className="flex gap-3 mb-6 px-4">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleTabChange('expired')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'expired'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => handleTabChange('claimable')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'claimable'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
            }`}
          >
            Claimable
          </button>
        </div>

        {/* Auctions Grid */}
        {activeTab === 'claimable' && !address ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400 mb-4">Please connect your wallet to view claimable auctions</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
            <p className="text-gray-400">
              {activeTab === 'active' && 'No active auctions found'}
              {activeTab === 'expired' && 'No expired auctions found'}
              {activeTab === 'claimable' && 'No claimable auctions found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {auctions.map((auction) => {
              const statusText = getAuctionStatusText(auction);
              const statusVariant = getAuctionStatusVariant(auction);
              const claimType = activeTab === 'claimable' ? getClaimType(auction) : 'none';

              return (
              <div key={auction.id} onClick={() => handleAuctionClick(auction)} className="cursor-pointer">
                <Card hover>
                  {/* Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    {activeTab === 'claimable' ? (
                      <Badge variant="success">
                        {claimType === 'payout' && 'CLAIM PAYOUT'}
                        {claimType === 'nft' && 'CLAIM NFT'}
                        {claimType === 'both' && 'CLAIM ALL'}
                      </Badge>
                    ) : (
                      <Badge variant={statusVariant}>{statusText}</Badge>
                    )}
                  </div>

                  {/* NFT Image */}
                  <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4 relative">
                    <NFTImage
                      src={auction.nft.imageUrl}
                      alt={auction.nft.name}
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      width={300}
                    />
                  </div>

                  {/* NFT Info */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">
                      {auction.nft.collection.name}
                    </p>
                    <h3 className="text-lg font-semibold text-white truncate">
                      {auction.nft.name}
                    </h3>
                  </div>

                  {/* Price Info */}
                  <div className="mb-3">
                    {/* ACTIVE TAB */}
                    {activeTab === 'active' && (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                            {auction.winningBid ? (
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-white">
                                  {formatEth(auction.winningBid.bidAmount)}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {auction.currency.symbol}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-2">
                                <p className="text-lg font-semibold text-gray-400">
                                  {formatEth(auction.startPrice)}
                                </p>
                                <p className="text-xs text-gray-500">Start</p>
                              </div>
                            )}
                          </div>
                          {auction.bids && auction.bids.length > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400 mb-1">Bids</p>
                              <p className="text-sm font-semibold text-white">
                                {auction.bids.length}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">Ends in</p>
                          <CompactCountdownTimer endTime={auction.endTime} />
                        </div>
                      </>
                    )}

                    {/* EXPIRED TAB */}
                    {activeTab === 'expired' && (
                      <>
                        {auction.winningBid ? (
                          <>
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-1">Winning Bid</p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-primary-400">
                                  {formatEth(auction.winningBid.bidAmount)}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {auction.currency.symbol}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Winner</p>
                              <p className="text-sm font-mono text-white">
                                {formatAddress(auction.winningBid.bidderAddress)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-2 bg-dark-bg rounded-lg">
                            <p className="text-xs text-gray-500">No bids received</p>
                          </div>
                        )}
                        {auction.bids && auction.bids.length > 0 && (
                          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                            <span>Total Bids</span>
                            <span className="font-semibold text-white">{auction.bids.length}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* CLAIMABLE TAB */}
                    {activeTab === 'claimable' && (
                      <>
                        {auction.winningBid ? (
                          <>
                            <div className="mb-2">
                              <p className="text-xs text-gray-400 mb-1">
                                {claimType === 'payout' ? 'Payout Amount' : 'Winning Bid'}
                              </p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-primary-400">
                                  {formatEth(auction.winningBid.bidAmount)}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {auction.currency.symbol}
                                </p>
                              </div>
                            </div>
                            {claimType === 'nft' && (
                              <div>
                                <p className="text-xs text-gray-400 mb-1">You won this auction!</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-2 bg-dark-bg rounded-lg mb-2">
                            <p className="text-xs text-gray-500">No bids - Reclaim your NFT</p>
                          </div>
                        )}
                        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-2">
                          <p className="text-xs text-primary-400 text-center">
                            {claimType === 'payout' && 'Click to collect your payout'}
                            {claimType === 'nft' && 'Click to collect your NFT'}
                            {claimType === 'both' && 'Click to collect payout & NFT'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status & Creator */}
                  <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                      <p className="text-xs text-gray-400 truncate max-w-[100px]">
                        {auction.seller?.name || auction.sellerAddress.slice(0, 6)}
                      </p>
                    </div>
                    <Link
                      href={`/asset/${auction.nft.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      View NFT →
                    </Link>
                  </div>
                </Card>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          auction={selectedAuction}
          isOpen={!!selectedAuction}
          onClose={handleCloseModal}
          onRefresh={handleRefresh}
        />
      )}
    </MainLayout>
  );
}
