'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { NFTDetail } from '../../../components/nft/NFTDetail';
import { ListingCard } from '../../../components/marketplace/ListingCard';
import { AuctionCard } from '../../../components/marketplace/AuctionCard';
import { OfferCard } from '../../../components/marketplace/OfferCard';
import { BuyModal } from '../../../components/marketplace/BuyModal';
import { BidModal } from '../../../components/marketplace/BidModal';
import { Spinner } from '../../../components/common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_NFT_BY_ID_QUERY } from '../../../lib/graphql/queries';
import { useWallet } from '../../../hooks/useWallet';
import { useContract } from '../../../hooks/useContract';
import { NFT, Listing, Auction, Offer } from '../../../types';
import {
  encodeCancelListing,
  encodeCancelAuction,
  encodeAcceptOffer,
  encodeCancelOffer,
} from '../../../lib/web3/encoding';
import toast from 'react-hot-toast';

export default function AssetPage() {
  const params = useParams();
  const id = params?.id as string;
  const { address } = useWallet();
  const { sendTransaction } = useContract();

  const [nft, setNft] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);

  const loadNFT = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_NFT_BY_ID_QUERY, { id });

      if (result.data?.nft) {
        setNft(result.data.nft);
      }
    } catch (error) {
      console.error('Failed to load NFT:', error);
      toast.error('Failed to load NFT');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNFT();
  }, [loadNFT]);

  const handleBuyClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleBidClick = (auction: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedAuction(auction);
    setShowBidModal(true);
  };

  const isOwner = (ownerId: string) => {
    return address?.toLowerCase() === ownerId.toLowerCase();
  };

  const handleCancelListing = async (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelListing(BigInt(listing.listingId));
      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Listing cancelled successfully!');
        loadNFT();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Cancel listing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel listing');
    }
  };

  const handleCancelAuction = async (auction: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelAuction(BigInt(auction.auctionId));
      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Auction cancelled successfully!');
        loadNFT();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Cancel auction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel auction');
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeAcceptOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Offer accepted successfully!');
        loadNFT();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Accept offer error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept offer');
    }
  };

  const handleCancelOffer = async (offer: Offer) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx);

      if (receipt?.status === 1) {
        toast.success('Offer cancelled successfully!');
        loadNFT();
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Cancel offer error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel offer');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!nft) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">NFT Not Found</h2>
          <p className="text-gray-400">The NFT you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </MainLayout>
    );
  }

  const activeListings = nft.listings?.filter((l) => l.status === 'CREATED') || [];
  const activeAuctions = nft.auctions?.filter((a) => a.status === 'CREATED' || a.status === 'ACTIVE') || [];
  const activeOffers = nft.offers?.filter((o) => o.status === 'CREATED') || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <NFTDetail nft={nft} />

        {/* Trading Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Trading Activity</h2>

          <div className="space-y-8">
            {/* Active Listings */}
            {activeListings.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Active Listings ({activeListings.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onBuy={handleBuyClick}
                      onCancel={handleCancelListing}
                      isOwner={isOwner(listing.listingCreator.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Auctions */}
            {activeAuctions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Active Auctions ({activeAuctions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAuctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onBid={handleBidClick}
                      onCancel={handleCancelAuction}
                      isOwner={isOwner(auction.auctionCreator.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Offers */}
            {activeOffers.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Active Offers ({activeOffers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onAccept={handleAcceptOffer}
                      onCancel={handleCancelOffer}
                      isTokenOwner={
                        nft.owners?.some((o) => isOwner(o.ownerAddress)) || false
                      }
                      isOfferMaker={isOwner(offer.offeror.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeListings.length === 0 &&
              activeAuctions.length === 0 &&
              activeOffers.length === 0 && (
                <div className="text-center py-12 bg-dark-card border border-dark-border rounded-2xl">
                  <p className="text-gray-400">
                    No active trading activity for this NFT
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedListing && (
        <BuyModal
          isOpen={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          onSuccess={loadNFT}
        />
      )}

      {selectedAuction && (
        <BidModal
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            setSelectedAuction(null);
          }}
          auction={selectedAuction}
          onSuccess={loadNFT}
        />
      )}
    </MainLayout>
  );
}
