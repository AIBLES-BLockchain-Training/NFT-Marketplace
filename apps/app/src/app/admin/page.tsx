'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { RoleProtected } from '../../components/admin/RoleProtected';
import { StatsCard } from '../../components/admin/StatsCard';
import { RoleManagement } from '../../components/admin/RoleManagement';
import { ActivityTable } from '../../components/admin/ActivityTable';
import { Spinner } from '../../components/common/Spinner';
import { graphqlClient } from '../../lib/graphql/client';
import {
  GET_ADMIN_STATS_QUERY,
  GET_ROLE_ASSIGNMENTS_QUERY,
  GET_RECENT_TRADES_QUERY,
} from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface RoleAssignment {
  address: string;
  roleName: string;
  grantedAt: string;
}

interface Activity {
  id: string;
  type: string;
  actor: { id: string };
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalNFTs: 0,
    activeListings: 0,
    activeAuctions: 0,
    totalUsers: 0,
    recentTrades: 0,
  });
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
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
      if (statsResult.data) {
        setStats({
          totalCollections: statsResult.data.collectionsConnection?.totalCount || 0,
          totalNFTs: statsResult.data.nftsConnection?.totalCount || 0,
          activeListings: statsResult.data.listingsConnection?.totalCount || 0,
          activeAuctions: statsResult.data.auctionsConnection?.totalCount || 0,
          totalUsers: statsResult.data.subjectsConnection?.totalCount || 0,
          recentTrades: statsResult.data.tradesConnection?.totalCount || 0,
        });
      }

      // Load roles
      const rolesResult = await graphqlClient.query(GET_ROLE_ASSIGNMENTS_QUERY, {});
      if (rolesResult.data?.roleAssignments) {
        setRoles(
          rolesResult.data.roleAssignments.map((ra: { subject: { id: string }; role: { roleName: string }; timestamp: string }) => ({
            address: ra.subject.id,
            roleName: ra.role.roleName,
            grantedAt: ra.timestamp,
          }))
        );
      }

      // Load recent activities
      const tradesResult = await graphqlClient.query(GET_RECENT_TRADES_QUERY, {
        limit: 10,
      });
      if (tradesResult.data?.trades) {
        setActivities(tradesResult.data.trades);
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

          {/* Role Management */}
          <div className="mb-8">
            <RoleManagement roles={roles} onRoleUpdate={loadDashboardData} />
          </div>

          {/* Activity Table */}
          <ActivityTable activities={activities} />
        </div>
      </MainLayout>
    </RoleProtected>
  );
}
