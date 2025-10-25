'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MainLayout } from '../../components/layout/MainLayout';
import { CreateListingForm } from '../../components/marketplace/CreateListingForm';
import { CreateAuctionForm } from '../../components/marketplace/CreateAuctionForm';
import { MakeOfferForm } from '../../components/marketplace/MakeOfferForm';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { graphqlClient } from '../../lib/graphql/client';
import { GET_NFT_BY_ID_QUERY } from '../../lib/graphql/queries';
import { useWallet } from '../../hooks/useWallet';
import { NFT } from '../../types';
import toast from 'react-hot-toast';

type SaleType = 'listing' | 'auction' | 'offer';

export default function CreatePage() {
  const [nftId, setNftId] = useState('');
  const [nft, setNft] = useState<NFT | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>('listing');

  const searchNFT = async () => {
    if (!nftId.trim()) {
      toast.error('Please enter an NFT ID');
      return;
    }

    setIsSearching(true);
    try {
      const result = await graphqlClient.query(GET_NFT_BY_ID_QUERY, {
        id: nftId.trim(),
      });

      if (result.data?.nft) {
        setNft(result.data.nft);
      } else {
        toast.error('NFT not found');
        setNft(null);
      }
    } catch (error) {
      console.error('Failed to search NFT:', error);
      toast.error('Failed to search NFT');
      setNft(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuccess = () => {
    toast.success('Successfully created!');
    setNft(null);
    setNftId('');
  };

  const handleCancel = () => {
    setNft(null);
    setNftId('');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">List Your NFT</h1>
            <p className="text-gray-400">
              Create a listing, auction, or offer for your NFT
            </p>
          </div>

          {!nft ? (
            <>
              {/* Search NFT */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-8 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Find Your NFT
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Enter the NFT ID to search for your token. The NFT ID format is:
                  <code className="text-primary-400 ml-1">
                    contractAddress-tokenId
                  </code>
                </p>

                <div className="flex gap-3">
                  <Input
                    placeholder="0x123...abc-1"
                    value={nftId}
                    onChange={(e) => setNftId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchNFT()}
                  />
                  <Button
                    onClick={searchNFT}
                    isLoading={isSearching}
                    variant="primary"
                  >
                    Search
                  </Button>
                </div>
              </div>

              {/* Help */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  How to find your NFT ID?
                </h3>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li>1. Go to your profile page</li>
                  <li>2. Click on the NFT you want to list</li>
                  <li>3. Copy the NFT ID from the URL or details section</li>
                  <li>4. Paste it here and click Search</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              {/* NFT Preview */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-dark-bg rounded-lg overflow-hidden relative">
                    {nft.imageUrl && (
                      <Image
                        src={nft.imageUrl}
                        alt={nft.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{nft.name}</h3>
                    <p className="text-sm text-gray-400">{nft.collection.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      Token ID: {nft.tokenId}
                    </p>
                  </div>
                  <Button onClick={handleCancel} variant="secondary" size="sm">
                    Change
                  </Button>
                </div>
              </div>

              {/* Sale Type Selection */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Choose Sale Type
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSaleType('listing')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      saleType === 'listing'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-gray-600'
                    }`}
                  >
                    <p className="font-semibold text-white mb-1">Fixed Price</p>
                    <p className="text-xs text-gray-400">List at a set price</p>
                  </button>
                  <button
                    onClick={() => setSaleType('auction')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      saleType === 'auction'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-gray-600'
                    }`}
                  >
                    <p className="font-semibold text-white mb-1">Auction</p>
                    <p className="text-xs text-gray-400">Accept bids</p>
                  </button>
                  <button
                    onClick={() => setSaleType('offer')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      saleType === 'offer'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-gray-600'
                    }`}
                  >
                    <p className="font-semibold text-white mb-1">Make Offer</p>
                    <p className="text-xs text-gray-400">Offer to buy</p>
                  </button>
                </div>
              </div>

              {/* Form */}
              {saleType === 'listing' && (
                <CreateListingForm
                  nft={nft}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              )}
              {saleType === 'auction' && (
                <CreateAuctionForm
                  nft={nft}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              )}
              {saleType === 'offer' && (
                <MakeOfferForm
                  nft={nft}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
