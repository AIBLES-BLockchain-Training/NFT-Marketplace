'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { NFTDetail } from '../../../components/nft/NFTDetail';
import { BuyModal } from '../../../components/marketplace/BuyModal';
import { CreateListingModal } from '../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../components/marketplace/CreateAuctionModal';
import { UpdateListingModal } from '../../../components/marketplace/UpdateListingModal';
import { AddCurrencyModal } from '../../../components/marketplace/AddCurrencyModal';
import { ApproveBuyerModal } from '../../../components/marketplace/ApproveBuyerModal';
import { AuctionDetailModal } from '../../../components/auction/AuctionDetailModal';
import { BidModal } from '../../../components/auction/BidModal';
import { MakeOfferModal } from '../../../components/marketplace/MakeOfferModal';
import { TransactionResultModal } from '../../../components/common/TransactionResultModal';
import { Spinner } from '../../../components/common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_NFT_BY_ID_QUERY } from '../../../lib/graphql/queries';
import { useWallet } from '../../../hooks/useWallet';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { NFT, Listing, Auction, Offer } from '../../../types';
import {
  encodeCancelListing,
  encodeApproveBuyerForListing,
  encodeAcceptOffer,
  encodeCancelOffer,
} from '../../../lib/web3/encoding';
import toast from 'react-hot-toast';

export default function AssetPage() {
  const params = useParams();
  const id = params?.id as string;
  const { address } = useWallet();
  const { sendTransaction, showResultModal, result, closeModal } = useTransactionModal();

  const [nft, setNft] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showUpdateListing, setShowUpdateListing] = useState(false);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [showApproveBuyer, setShowApproveBuyer] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showMakeOffer, setShowMakeOffer] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isNFTOwner, setIsNFTOwner] = useState(false);

  const loadNFT = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Try to load from GraphQL indexer first
      const result = await graphqlClient.query(GET_NFT_BY_ID_QUERY, { id });

      if (result?.nft) {
        console.log('NFT loaded from indexer:', {
          id: result.nft.id,
          name: result.nft.name,
          traits: result.nft.traits,
          traitsCount: result.nft.traits?.length || 0
        });
        setNft(result.nft);
        return;
      }

      // NFT not found in indexer - parse ID and fetch from Moralis
      // ID format: "0xcontract-tokenId"
      const [contractAddress, tokenId] = id.split('-');

      if (!contractAddress || !tokenId) {
        throw new Error('Invalid NFT ID format');
      }

      // Fetch from Moralis API
      const response = await fetch(`/api/nft/${contractAddress}/${tokenId}`);

      if (!response.ok) {
        throw new Error('NFT not found');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const moralisNFT = data.data;
        const metadata = moralisNFT.normalized_metadata || {};

        // Transform to app NFT format (without listings/auctions/offers)
        const nft: NFT = {
          id: id,
          tokenId: tokenId,
          name: metadata.name || moralisNFT.name || `Token #${tokenId}`,
          imageUrl: metadata.image,
          description: metadata.description,
          metadataUri: moralisNFT.token_uri,
          collection: {
            id: contractAddress.toLowerCase() as `0x${string}`,
            name: moralisNFT.name || 'Unknown Collection',
            symbol: moralisNFT.symbol || 'NFT',
            collectionType: (moralisNFT.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155') as any,
            creator: {
              id: contractAddress.toLowerCase() as `0x${string}`,
              name: moralisNFT.name || 'Unknown',
              subjectType: 'CONTRACT' as any,
              createdAt: new Date().toISOString(),
            },
            totalSupply: '0',
            createdAt: new Date().toISOString(),
          },
          traits: metadata.attributes?.map((attr: { trait_type: string; value: string | number }, idx: number) => ({
            id: `${id}-${idx}`,
            traitType: attr.trait_type,
            value: String(attr.value),
            displayType: undefined,
          })) || [],
          // No listings/auctions/offers for NFTs not in indexer
          listings: [],
          auctions: [],
          offers: [],
        };

        setNft(nft);
      } else {
        throw new Error('NFT not found');
      }
    } catch (error) {
      console.error('Failed to load NFT:', error);
      setNft(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNFT();
  }, [loadNFT]);

  // Verify ownership
  useEffect(() => {
    const verifyOwnership = async () => {
      if (!address || !nft || !id) {
        setIsNFTOwner(false);
        return;
      }

      // First check if nft.owners exists (from indexer)
      if (nft.owners && nft.owners.length > 0) {
        const ownerCheck = nft.owners.some(
          (o) => o.ownerAddress.toLowerCase() === address.toLowerCase()
        );
        setIsNFTOwner(ownerCheck);
        return;
      }

      // Otherwise verify via API (for NFTs not in indexer)
      try {
        const parts = id.split('-');
        if (parts.length < 2) {
          setIsNFTOwner(false);
          return;
        }

        const contractAddress = parts[0];
        const tokenId = parts.slice(1).join('-');

        const response = await fetch('/api/nft/verify-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            contractAddress,
            tokenId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setIsNFTOwner(data.data.isOwner);
        } else {
          setIsNFTOwner(false);
        }
      } catch (error) {
        console.error('Failed to verify ownership:', error);
        setIsNFTOwner(false);
      }
    };

    verifyOwnership();
  }, [address, nft, id]);

  const handleBuyClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleUpdateListingClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowUpdateListing(true);
  };

  const handleAddCurrencyClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowAddCurrency(true);
  };

  const handleApproveBuyerClick = (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedListing(listing);
    setShowApproveBuyer(true);
  };

  const handleApproveBuyerSubmit = async (buyerAddress: string, approve: boolean) => {
    if (!address || !selectedListing) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeApproveBuyerForListing(
        BigInt(selectedListing.id),
        buyerAddress as `0x${string}`,
        approve
      );
      const receipt = await sendTransaction(
        tx,
        approve ? 'Buyer approved successfully!' : 'Buyer approval revoked!'
      );

      if (receipt?.status === 1) {
        // Reload NFT data to get updated buyer approvals
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Approve buyer error:', error);
      throw error;
    }
  };

  const handleCancelListing = async (listing: Listing) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelListing(BigInt(listing.listingId || listing.id)); // listing.listingId is the listingId from contract
      const receipt = await sendTransaction(tx, 'Listing cancelled successfully!');

      if (receipt?.status === 1) {
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Cancel listing error:', error);
    }
  };

  const handleViewAuction = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowAuctionModal(true);
    setShowBidModal(false);
  };

  const handlePlaceBid = (auction: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    setSelectedAuction(auction);
    setShowBidModal(true);
    setShowAuctionModal(false);
  };

  const handleCloseAuctionModal = () => {
    setShowAuctionModal(false);
    setSelectedAuction(null);
  };

  const handleCloseBidModal = () => {
    setShowBidModal(false);
    // Keep selectedAuction so we can go back to detail modal
  };

  const handleBidSuccess = () => {
    setShowBidModal(false);
    loadNFT();
  };

  // Offer handlers
  const handleMakeOffer = () => {
    setShowMakeOffer(true);
  };

  const handleAcceptOffer = async (offer: Offer) => {
    try {
      const tx = encodeAcceptOffer(BigInt(offer.offerId));

      await sendTransaction(tx, 'Offer accepted successfully!');
      loadNFT();
    } catch (error) {
      console.error('Accept offer error:', error);
      toast.error('Failed to accept offer');
    }
  };

  const handleCancelOffer = async (offer: Offer) => {
    try {
      const tx = encodeCancelOffer(BigInt(offer.offerId));

      await sendTransaction(tx, 'Offer cancelled successfully!');
      loadNFT();
    } catch (error) {
      console.error('Cancel offer error:', error);
      toast.error('Failed to cancel offer');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="w-full px-4 py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!nft) {
    return (
      <MainLayout>
        <div className="w-full px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">NFT Not Found</h2>
          <p className="text-gray-400">The NFT you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </MainLayout>
    );
  }

  const activeListings = nft.listings?.filter((l) => l.status === 'CREATED') || [];
  const activeAuctions = nft.auctions?.filter((a) => a.status === 'CREATED' || a.status === 'ACTIVE') || [];
  const activeOffers = nft.offers?.filter((o) => o.status === 'ACTIVE' || o.status === 'CREATED') || [];

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        <NFTDetail
          nft={nft}
          isOwner={isNFTOwner}
          activeListings={activeListings}
          activeAuctions={activeAuctions}
          activeOffers={activeOffers}
          onBuy={handleBuyClick}
          onCreateListing={() => setShowCreateListing(true)}
          onCreateAuction={() => setShowCreateAuction(true)}
          onMakeOffer={handleMakeOffer}
          onAcceptOffer={handleAcceptOffer}
          onCancelOffer={handleCancelOffer}
          onCancelListing={handleCancelListing}
          onUpdateListing={handleUpdateListingClick}
          onAddCurrency={handleAddCurrencyClick}
          onApproveBuyer={handleApproveBuyerClick}
          onViewAuction={handleViewAuction}
          onPlaceBid={handlePlaceBid}
        />

        {/* Create Listing Modal */}
        {isNFTOwner && (
          <CreateListingModal
            nft={nft}
            isOpen={showCreateListing}
            onClose={() => setShowCreateListing(false)}
            onSuccess={() => {
              loadNFT();
            }}
          />
        )}

        {/* Create Auction Modal */}
        {isNFTOwner && nft && (
          <CreateAuctionModal
            nft={nft}
            isOpen={showCreateAuction}
            onClose={() => setShowCreateAuction(false)}
            onSuccess={() => {
              loadNFT();
            }}
          />
        )}

        {/* Update Listing Modal */}
        {selectedListing && (
          <UpdateListingModal
            listing={selectedListing}
            isOpen={showUpdateListing}
            onClose={() => {
              setShowUpdateListing(false);
              setSelectedListing(null);
            }}
            onSuccess={() => {
              loadNFT();
              setShowUpdateListing(false);
              setSelectedListing(null);
            }}
          />
        )}

        {/* Add Currency Modal */}
        {selectedListing && (
          <AddCurrencyModal
            listingId={selectedListing.id}
            isOpen={showAddCurrency}
            onClose={() => {
              setShowAddCurrency(false);
              setSelectedListing(null);
            }}
            onSuccess={() => {
              loadNFT();
              setShowAddCurrency(false);
              setSelectedListing(null);
            }}
          />
        )}

        {/* Approve Buyer Modal */}
        {selectedListing && (
          <ApproveBuyerModal
            isOpen={showApproveBuyer}
            onClose={() => {
              setShowApproveBuyer(false);
              setSelectedListing(null);
            }}
            listing={selectedListing}
            onApprove={handleApproveBuyerSubmit}
          />
        )}
      </div>

      {/* Modals */}
      {selectedListing && showBuyModal && (
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

      {/* Auction Detail Modal */}
      {selectedAuction && showAuctionModal && (
        <AuctionDetailModal
          auction={selectedAuction}
          isOpen={showAuctionModal}
          onClose={handleCloseAuctionModal}
          onRefresh={loadNFT}
        />
      )}

      {/* Bid Modal */}
      {selectedAuction && showBidModal && (
        <BidModal
          auction={selectedAuction}
          isOpen={showBidModal}
          onClose={handleCloseBidModal}
          onSuccess={handleBidSuccess}
        />
      )}

      {/* Make Offer Modal */}
      {showMakeOffer && nft && (
        <MakeOfferModal
          nft={nft}
          isOpen={showMakeOffer}
          onClose={() => setShowMakeOffer(false)}
          onSuccess={() => {
            setShowMakeOffer(false);
            loadNFT();
          }}
        />
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
    </MainLayout>
  );
}
