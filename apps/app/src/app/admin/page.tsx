'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { RoleProtected } from '../../components/admin/RoleProtected';
import { StatsCard } from '../../components/admin/StatsCard';
import { AdminManagement } from '../../components/admin/AdminManagement';
import { UserRoleRequests } from '../../components/admin/UserRoleRequests';
import { NFTWhitelistRequests } from '../../components/admin/NFTWhitelistRequests';
import { NFTWhitelistManagement } from '../../components/admin/NFTWhitelistManagement';
import { CurrencyManagement } from '../../components/admin/CurrencyManagement';
import { FeeManagement } from '../../components/admin/FeeManagement';
import { ActivityTable } from '../../components/admin/ActivityTable';
import { AdminList } from '../../components/admin/AdminList';
import { RoleAssignmentsList } from '../../components/admin/RoleAssignmentsList';
import { WhitelistedNFTList } from '../../components/admin/WhitelistedNFTList';
import { WhitelistedCurrenciesList } from '../../components/admin/WhitelistedCurrenciesList';
import { Spinner } from '../../components/common/Spinner';
import { graphqlClient } from '../../lib/graphql/client';
import {
  GET_ADMIN_STATS_QUERY,
  GET_PURCHASE_HISTORY_QUERY,
} from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface Activity {
  id: string;
  type: string;
  actor: { id: string };
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'settings' | 'data'>('overview');
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalNFTs: 0,
    activeListings: 0,
    activeAuctions: 0,
    totalUsers: 0,
    recentTrades: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load stats
      const statsResult = await graphqlClient.query(GET_ADMIN_STATS_QUERY, {});
      if (statsResult) {
        setStats({
          totalCollections: statsResult.collectionsConnection?.totalCount || 0,
          totalNFTs: statsResult.nftsConnection?.totalCount || 0,
          activeListings: statsResult.listingsConnection?.totalCount || 0,
          activeAuctions: statsResult.auctionsConnection?.totalCount || 0,
          totalUsers: statsResult.subjectsConnection?.totalCount || 0,
          recentTrades: statsResult.purchaseHistoriesConnection?.totalCount || 0,
        });
      }

      // Load recent activities - use purchase histories instead
      const purchaseResult = await graphqlClient.query(GET_PURCHASE_HISTORY_QUERY, {
        limit: 10,
        offset: 0,
        where: {}
      });
      if (purchaseResult?.purchaseHistories) {
        // Transform purchase histories to activities format
        const activities = purchaseResult.purchaseHistories.map((p: any) => ({
          id: p.id,
          type: p.tradeType || 'PURCHASE',
          actor: p.buyer || { id: 'unknown' },
          timestamp: p.timestamp,
          metadata: {
            nft: p.nft,
            seller: p.seller,
            price: p.totalPrice,
            currency: p.currency
          }
        }));
        setActivities(activities);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <RoleProtected>
        <MainLayout>
          <div className="container mx-auto px-4 py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        </MainLayout>
      </RoleProtected>
    );
  }

  return (
    <RoleProtected>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">
              Manage marketplace operations and monitor system health
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-dark-border overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'permissions'
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Permissions & Roles
              {activeTab === 'permissions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Settings & Revenue
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === 'data'
                  ? 'text-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Data & Lists
              {activeTab === 'data' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                  title="Total Collections"
                  value={stats.totalCollections}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  }
                />

                <StatsCard
                  title="Total NFTs"
                  value={stats.totalNFTs}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                />

                <StatsCard
                  title="Active Listings"
                  value={stats.activeListings}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  }
                />

                <StatsCard
                  title="Active Auctions"
                  value={stats.activeAuctions}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />

                <StatsCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  }
                />

                <StatsCard
                  title="Recent Trades"
                  value={stats.recentTrades}
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  }
                />
              </div>

              {/* Activity Table */}
              <ActivityTable activities={activities} />
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-8">
              {/* User Role Requests */}
              <UserRoleRequests />

              {/* NFT Whitelist Requests */}
              <NFTWhitelistRequests />

              {/* Admin Management */}
              <AdminManagement />

              {/* NFT Whitelist Management */}
              <NFTWhitelistManagement />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Currency Management */}
              <CurrencyManagement />

              {/* Fee Management */}
              <FeeManagement />
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8">
              {/* Admin List */}
              <AdminList />

              {/* Role Assignments List */}
              <RoleAssignmentsList />

              {/* Whitelisted NFTs */}
              <WhitelistedNFTList />

              {/* Whitelisted Currencies */}
              <WhitelistedCurrenciesList />
            </div>
          )}
        </div>
      </MainLayout>
    </RoleProtected>
  );
}
