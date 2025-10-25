'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '../../../components/layout/MainLayout';
import { NFTGrid } from '../../../components/nft/NFTGrid';
import { Badge } from '../../../components/common/Badge';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_USER_NFTS_QUERY } from '../../../lib/graphql/queries';
import { useWallet } from '../../../hooks/useWallet';
import { NFT } from '../../../types';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const params = useParams();
  const profileAddress = params?.address as string;
  const { address: connectedAddress } = useWallet();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'listed' | 'offers'>('owned');

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress?.toLowerCase();

  const loadUserNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_USER_NFTS_QUERY, {
        address: profileAddress.toLowerCase(),
      });

      if (result.data?.tokenOwnerships) {
        const ownedNFTs = result.data.tokenOwnerships.map((ownership: { nft: NFT }) => ownership.nft);
        setNfts(ownedNFTs);
      }
    } catch (error) {
      console.error('Failed to load user NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [profileAddress]);

  useEffect(() => {
    if (profileAddress) {
      loadUserNFTs();
    }
  }, [profileAddress, activeTab, loadUserNFTs]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {isOwnProfile ? 'My Profile' : 'User Profile'}
                </h1>
                {isOwnProfile && <Badge variant="primary">You</Badge>}
              </div>

              <p className="text-gray-400 font-mono text-sm mb-4">
                {profileAddress}
              </p>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-white">{nfts.length}</p>
                  <p className="text-sm text-gray-400">NFTs Owned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">-</p>
                  <p className="text-sm text-gray-400">Collections</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-dark-border">
          <button
            onClick={() => setActiveTab('owned')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'owned'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Owned
            {activeTab === 'owned' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('listed')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'listed'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Listed
            {activeTab === 'listed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              activeTab === 'offers'
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Offers Made
            {activeTab === 'offers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'owned' && <NFTGrid nfts={nfts} isLoading={isLoading} />}

        {activeTab === 'listed' && (
          <div className="text-center py-16">
            <p className="text-gray-400">Listed NFTs view - Coming soon</p>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="text-center py-16">
            <p className="text-gray-400">Offers view - Coming soon</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
