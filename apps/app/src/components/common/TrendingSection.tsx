'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { NFT, Collection, Listing, Auction } from '../../types';
import { Card } from './Card';
import { Badge } from './Badge';
import { NFTImage } from './NFTImage';
import { NFTDetailModal } from '../nft/NFTDetailModal';
import { BuyModal } from '../marketplace/BuyModal';
import { MakeOfferModal } from '../marketplace/MakeOfferModal';
import { BidModal } from '../auction/BidModal';
import { AuctionDetailModal } from '../auction/AuctionDetailModal';
import { useWallet } from '../../hooks/useWallet';

interface TrendingSectionProps {
  title: string;
  items: NFT[] | Collection[];
  type: 'nfts' | 'collections';
}

export function TrendingSection({ title, items, type }: TrendingSectionProps) {
  const { address } = useWallet();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [showNFTDetail, setShowNFTDetail] = useState(false);

  // Modals state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showMakeOffer, setShowMakeOffer] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showAuctionDetail, setShowAuctionDetail] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 400;
    const container = scrollContainerRef.current;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  const handleNFTClick = (nft: NFT) => {
    setSelectedNFT(nft);
    setShowNFTDetail(true);
  };

  const handleCloseNFTDetail = () => {
    setShowNFTDetail(false);
    setSelectedNFT(null);
  };

  // Check if current user is owner of the selected NFT
  const isOwner = selectedNFT && address && selectedNFT.owners
    ? selectedNFT.owners.some(owner => owner.ownerAddress.toLowerCase() === address.toLowerCase())
    : false;

  // Handlers
  const handleBuyClick = (listing: Listing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handlePlaceBid = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowBidModal(true);
  };

  const handleViewAuctionDetails = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowAuctionDetail(true);
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        <div className="flex gap-2">
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 bg-dark-card border border-dark-border hover:border-primary-500 rounded-lg flex items-center justify-center text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 bg-dark-card border border-dark-border hover:border-primary-500 rounded-lg flex items-center justify-center text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {type === 'nfts'
          ? (items as NFT[]).map((nft) => (
              <button
                key={nft.id}
                onClick={() => handleNFTClick(nft)}
                className="snap-start shrink-0 text-left"
              >
                <Card hover className="w-64">
                  <div className="aspect-square bg-dark-bg rounded-lg overflow-hidden mb-4 relative">
                    {nft.imageUrl ? (
                      <NFTImage src={nft.imageUrl} alt={nft.name} width={256} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">{nft.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{nft.collection.name}</span>
                    <Badge variant="primary">{nft.collection.collectionType}</Badge>
                  </div>
                </Card>
              </button>
            ))
          : (items as Collection[]).map((collection) => (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="snap-start shrink-0"
              >
                <Card hover className="w-64">
                  <div className="aspect-video bg-dark-bg rounded-lg overflow-hidden mb-4 relative">
                    {collection.bannerUrl ? (
                      <NFTImage
                        src={collection.bannerUrl}
                        alt={collection.name}
                        width={256}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-purple-500/20" />
                    )}
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    {collection.logoUrl && (
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative">
                        <NFTImage
                          src={collection.logoUrl}
                          alt={collection.name}
                          width={48}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {collection.name}
                      </h3>
                      <p className="text-sm text-gray-400">{collection.symbol}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-dark-border">
                    <div>
                      <p className="text-gray-400 mb-1">Total Supply</p>
                      <p className="text-white font-semibold">{collection.totalSupply?.toString() || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 mb-1">Type</p>
                      <Badge variant="primary">{collection.collectionType}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <NFTDetailModal
          isOpen={showNFTDetail}
          onClose={handleCloseNFTDetail}
          nft={selectedNFT}
          isOwner={isOwner}
          activeListings={selectedNFT.listings?.filter(l => l.status === 'CREATED') || []}
          activeAuctions={selectedNFT.auctions?.filter(a => a.status === 'CREATED' || a.status === 'ACTIVE') || []}
          activeOffers={selectedNFT.offers?.filter(o => o.status === 'ACTIVE') || []}
          onBuy={handleBuyClick}
          onMakeOffer={() => setShowMakeOffer(true)}
          onPlaceBid={handlePlaceBid}
          onViewAuctionDetails={handleViewAuctionDetails}
        />
      )}

      {/* Buy Modal */}
      {selectedListing && (
        <BuyModal
          isOpen={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onSuccess={() => {
            setShowBuyModal(false);
            setSelectedListing(null);
            setShowNFTDetail(false);
            toast.success('Purchase successful!');
          }}
        />
      )}

      {/* Make Offer Modal */}
      {selectedNFT && (
        <MakeOfferModal
          isOpen={showMakeOffer}
          onClose={() => setShowMakeOffer(false)}
          nft={selectedNFT}
          onSuccess={() => {
            setShowMakeOffer(false);
            toast.success('Offer created successfully!');
          }}
        />
      )}

      {/* Bid Modal */}
      {selectedAuction && (
        <BidModal
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onSuccess={() => {
            setShowBidModal(false);
            setSelectedAuction(null);
            toast.success('Bid placed successfully!');
          }}
        />
      )}

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          isOpen={showAuctionDetail}
          onClose={() => {
            setShowAuctionDetail(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onPlaceBid={() => {
            setShowAuctionDetail(false);
            setShowBidModal(true);
          }}
        />
      )}
    </div>
  );
}
