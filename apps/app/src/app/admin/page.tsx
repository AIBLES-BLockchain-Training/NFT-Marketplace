'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { RoleProtected } from '../../components/admin/RoleProtected';
import { StatsCard } from '../../components/admin/StatsCard';
import { AdminManagement } from '../../components/admin/AdminManagement';
import { UserRoleRequests } from '../../components/admin/UserRoleRequests';
import { NFTWhitelistRequests } from '../../components/admin/NFTWhitelistRequests';
import { NFTWhitelistManagement } from '../../components/admin/NFTWhitelistManagement';
import { GlobalPermissions } from '../../components/admin/GlobalPermissions';
import { CurrencyManagement } from '../../components/admin/CurrencyManagement';
import { PermissionsSettings } from '../../components/admin/PermissionsSettings';
import { ListingSettings } from '../../components/admin/ListingSettings';
import { AuctionSettings } from '../../components/admin/AuctionSettings';
import { ActivityTable } from '../../components/admin/ActivityTable';
import { AdminList } from '../../components/admin/AdminList';
import { RoleAssignmentsList } from '../../components/admin/RoleAssignmentsList';
import { WhitelistedNFTList } from '../../components/admin/WhitelistedNFTList';
import { WhitelistedCurrenciesList } from '../../components/admin/WhitelistedCurrenciesList';
import { RevenueStats } from '../../components/admin/revenue/RevenueStats';
import { FeePoolsTable } from '../../components/admin/revenue/FeePoolsTable';
import { WithdrawFeeForm } from '../../components/admin/revenue/WithdrawFeeForm';
import { WithdrawalHistory } from '../../components/admin/revenue/WithdrawalHistory';
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

type MenuItem =
  | 'dashboard'
  | 'users'
  | 'nfts'
  | 'currencies'
  | 'marketplace-settings'
  | 'fee-config'
  | 'revenue'
  | 'activity';

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<MenuItem>('dashboard');
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

      // Load recent activities - wrap in try-catch due to null nft records
      try {
        const purchaseResult = await graphqlClient.query(GET_PURCHASE_HISTORY_QUERY, {
          limit: 10,
          offset: 0,
          where: {}
        });
        if (purchaseResult?.purchaseHistories) {
          const activities = purchaseResult.purchaseHistories
            .filter((p: any) => p.nft != null) // Skip items with null nft
            .map((p: any) => ({
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
      } catch (purchaseError) {
        // Ignore purchase history errors due to schema issues
        console.warn('Could not load purchase history due to null NFT records:', purchaseError);
        setActivities([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'dashboard' as MenuItem,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'users' as MenuItem,
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'nfts' as MenuItem,
      label: 'NFT Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'currencies' as MenuItem,
      label: 'Currency Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'marketplace-settings' as MenuItem,
      label: 'Marketplace Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'fee-config' as MenuItem,
      label: 'Fee Configuration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'revenue' as MenuItem,
      label: 'Revenue & Withdrawal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: 'activity' as MenuItem,
      label: 'Activity Logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <RoleProtected>
        <MainLayout>
          <div className="w-full px-4 py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        </MainLayout>
      </RoleProtected>
    );
  }

  return (
    <RoleProtected>
      <MainLayout>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-dark-card border-r border-dark-border flex-shrink-0">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeMenu === item.id
                        ? 'bg-primary-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Dashboard */}
            {activeMenu === 'dashboard' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                  <p className="text-gray-400">Marketplace overview and statistics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatsCard
                    title="Total Collections"
                    value={stats.totalCollections}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    }
                  />
                  <StatsCard
                    title="Total NFTs"
                    value={stats.totalNFTs}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                  <StatsCard
                    title="Active Listings"
                    value={stats.activeListings}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    }
                  />
                  <StatsCard
                    title="Active Auctions"
                    value={stats.activeAuctions}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                  />
                  <StatsCard
                    title="Recent Trades"
                    value={stats.recentTrades}
                    icon={
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    }
                  />
                </div>

                {/* Recent Activity */}
                <ActivityTable activities={activities} />
              </div>
            )}

            {/* User Management */}
            {activeMenu === 'users' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                  <p className="text-gray-400">Manage admins, users, and role assignments</p>
                </div>
                <UserRoleRequests />
                <AdminManagement />
                <AdminList />
                <RoleAssignmentsList />
              </div>
            )}

            {/* NFT Management */}
            {activeMenu === 'nfts' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">NFT Management</h1>
                  <p className="text-gray-400">Manage NFT whitelist and permissions</p>
                </div>
                <GlobalPermissions />
                <NFTWhitelistRequests />
                <NFTWhitelistManagement />
                <WhitelistedNFTList />
              </div>
            )}

            {/* Currency Management */}
            {activeMenu === 'currencies' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Currency Management</h1>
                  <p className="text-gray-400">Manage supported currencies for the marketplace</p>
                </div>
                <CurrencyManagement />
                <WhitelistedCurrenciesList />
              </div>
            )}

            {/* Marketplace Settings */}
            {activeMenu === 'marketplace-settings' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Marketplace Settings</h1>
                  <p className="text-gray-400">Configure contract permissions and fee receivers</p>
                </div>
                <PermissionsSettings />
              </div>
            )}

            {/* Fee Configuration */}
            {activeMenu === 'fee-config' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Fee Configuration</h1>
                  <p className="text-gray-400">Set marketplace fees for listings, auctions, and offers</p>
                </div>
                <ListingSettings />
                <AuctionSettings />
                <div className="p-8 bg-dark-card border border-dark-border rounded-xl text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Offer Fee Settings</h3>
                  <p className="text-gray-400 mb-4">Coming Soon</p>
                  <p className="text-sm text-gray-500">Offer fee configuration will be available in a future update</p>
                </div>
              </div>
            )}

            {/* Revenue & Withdrawal */}
            {activeMenu === 'revenue' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Revenue & Withdrawal</h1>
                  <p className="text-gray-400">Monitor revenue and withdraw accumulated fees</p>
                </div>
                <RevenueStats />
                <FeePoolsTable />
                <WithdrawFeeForm />
                <WithdrawalHistory />
              </div>
            )}

            {/* Activity Logs */}
            {activeMenu === 'activity' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Activity Logs</h1>
                  <p className="text-gray-400">View recent marketplace activities and transactions</p>
                </div>
                <ActivityTable activities={activities} />
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RoleProtected>
  );
}
