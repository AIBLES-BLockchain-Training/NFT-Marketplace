'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { NFTDetail } from '../../../components/nft/NFTDetail';
import { BuyModal } from '../../../components/marketplace/BuyModal';
import { BidModal } from '../../../components/marketplace/BidModal';
import { CreateListingModal } from '../../../components/marketplace/CreateListingModal';
import { CreateAuctionModal } from '../../../components/marketplace/CreateAuctionModal';
import { TransactionResultModal } from '../../../components/common/TransactionResultModal';
import { Spinner } from '../../../components/common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_NFT_BY_ID_QUERY } from '../../../lib/graphql/queries';
import { useWallet } from '../../../hooks/useWallet';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
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
  const { sendTransaction, showResultModal, result, closeModal } = useTransactionModal();

  const [nft, setNft] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [isNFTOwner, setIsNFTOwner] = useState(false);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(false);

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
            id: contractAddress.toLowerCase(),
            name: moralisNFT.name || 'Unknown Collection',
            symbol: moralisNFT.symbol || 'NFT',
            collectionType: moralisNFT.contract_type === 'ERC721' ? 'ERC721' : 'ERC1155',
            creator: {
              id: contractAddress.toLowerCase(),
              name: moralisNFT.name || 'Unknown',
              subjectType: 'CONTRACT' as const,
              createdAt: new Date().toISOString(),
            },
            totalSupply: '0',
            createdAt: new Date().toISOString(),
          },
          traits: metadata.attributes?.map((attr: any, idx: number) => ({
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
      setIsCheckingOwnership(true);
      try {
        const parts = id.split('-');
        if (parts.length < 2) {
          setIsNFTOwner(false);
          setIsCheckingOwnership(false);
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
      } finally {
        setIsCheckingOwnership(false);
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
      const tx = encodeCancelListing(BigInt(listing.id)); // listing.id is the listingId from contract
      const receipt = await sendTransaction(tx, 'Listing cancelled successfully!');

      if (receipt?.status === 1) {
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Cancel listing error:', error);
    }
  };

  const handleCancelAuction = async (auction: Auction) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelAuction(BigInt(auction.auctionId));
      const receipt = await sendTransaction(tx, 'Auction cancelled successfully!');

      if (receipt?.status === 1) {
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Cancel auction error:', error);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeAcceptOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx, 'Offer accepted successfully!');

      if (receipt?.status === 1) {
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Accept offer error:', error);
    }
  };

  const handleCancelOffer = async (offer: Offer) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCancelOffer(BigInt(offer.offerId));
      const receipt = await sendTransaction(tx, 'Offer cancelled successfully!');

      if (receipt?.status === 1) {
        loadNFT();
      }
    } catch (error: unknown) {
      console.error('Cancel offer error:', error);
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
  const activeOffers = nft.offers?.filter((o) => o.status === 'CREATED') || [];

  return (
    <MainLayout>
      <div className="w-full px-4 py-8">
        <NFTDetail
          nft={nft}
          isOwner={isNFTOwner}
          activeListing={activeListings[0] || null}
          onBuy={handleBuyClick}
          onCreateListing={() => setShowCreateListing(true)}
          onCreateAuction={() => setShowCreateAuction(true)}
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
        {isNFTOwner && (
          <CreateAuctionModal
            nft={nft}
            isOpen={showCreateAuction}
            onClose={() => setShowCreateAuction(false)}
            onSuccess={() => {
              loadNFT();
            }}
          />
        )}
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
