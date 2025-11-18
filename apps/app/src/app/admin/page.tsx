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
import { GET_ADMIN_STATS_QUERY } from '../../lib/graphql/queries';
import toast from 'react-hot-toast';

interface SubMenuItem {
  id: string;
  label: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [activeSubMenu, setActiveSubMenu] = useState<string>('');
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalNFTs: 0,
    activeListings: 0,
    activeAuctions: 0,
    totalUsers: 0,
    recentTrades: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      subItems: [
        { id: 'users-requests', label: 'Role Requests' },
        { id: 'users-admin-management', label: 'Admin Management' },
        { id: 'users-admin-list', label: 'Admin List' },
        { id: 'users-role-assignments', label: 'Role Assignments' },
      ],
    },
    {
      id: 'nfts',
      label: 'NFT Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      subItems: [
        { id: 'nfts-global-permissions', label: 'Global Permissions' },
        { id: 'nfts-whitelist-requests', label: 'Whitelist Requests' },
        { id: 'nfts-manage-whitelist', label: 'Manage Whitelist' },
        { id: 'nfts-whitelist-list', label: 'Whitelist List' },
      ],
    },
    {
      id: 'currencies',
      label: 'Currency Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subItems: [
        { id: 'currencies-add', label: 'Add Currency' },
        { id: 'currencies-list', label: 'Currency List' },
      ],
    },
    {
      id: 'marketplace-settings',
      label: 'Marketplace Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'fee-config',
      label: 'Fee Configuration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      subItems: [
        { id: 'fee-listing', label: 'Listing Fees' },
        { id: 'fee-auction', label: 'Auction Fees' },
        { id: 'fee-offer', label: 'Offer Fees' },
      ],
    },
    {
      id: 'revenue',
      label: 'Revenue & Withdrawal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      subItems: [
        { id: 'revenue-stats', label: 'Revenue Stats' },
        { id: 'revenue-pools', label: 'Fee Pools' },
        { id: 'revenue-withdraw', label: 'Withdraw' },
        { id: 'revenue-history', label: 'History' },
      ],
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = (menuId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      // Toggle expand/collapse
      const newExpanded = new Set(expandedMenus);
      if (newExpanded.has(menuId)) {
        newExpanded.delete(menuId);
      } else {
        newExpanded.add(menuId);
        // Set first sub-item as active
        const menu = menuItems.find(m => m.id === menuId);
        if (menu?.subItems && menu.subItems.length > 0) {
          setActiveMenu(menuId);
          setActiveSubMenu(menu.subItems[0].id);
        }
      }
      setExpandedMenus(newExpanded);
    } else {
      // No sub-items, just activate
      setActiveMenu(menuId);
      setActiveSubMenu('');
    }
  };

  const handleSubMenuClick = (menuId: string, subMenuId: string) => {
    setActiveMenu(menuId);
    setActiveSubMenu(subMenuId);
  };

  const renderContent = () => {
    // Dashboard
    if (activeMenu === 'dashboard') {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Marketplace overview and statistics</p>
          </div>

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
        </div>
      );
    }

    // User Management
    if (activeMenu === 'users') {
      if (activeSubMenu === 'users-requests') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Role Requests</h1>
              <p className="text-gray-400">Review and approve user role requests</p>
            </div>
            <UserRoleRequests />
          </div>
        );
      }
      if (activeSubMenu === 'users-admin-management') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Management</h1>
              <p className="text-gray-400">Add or remove admin privileges</p>
            </div>
            <AdminManagement />
          </div>
        );
      }
      if (activeSubMenu === 'users-admin-list') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin List</h1>
              <p className="text-gray-400">View all administrators</p>
            </div>
            <AdminList />
          </div>
        );
      }
      if (activeSubMenu === 'users-role-assignments') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Role Assignments</h1>
              <p className="text-gray-400">History of role assignments</p>
            </div>
            <RoleAssignmentsList />
          </div>
        );
      }
    }

    // NFT Management
    if (activeMenu === 'nfts') {
      if (activeSubMenu === 'nfts-global-permissions') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Global Permissions</h1>
              <p className="text-gray-400">Configure global NFT permissions</p>
            </div>
            <GlobalPermissions />
          </div>
        );
      }
      if (activeSubMenu === 'nfts-whitelist-requests') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Whitelist Requests</h1>
              <p className="text-gray-400">Review NFT whitelist requests</p>
            </div>
            <NFTWhitelistRequests />
          </div>
        );
      }
      if (activeSubMenu === 'nfts-manage-whitelist') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Manage Whitelist</h1>
              <p className="text-gray-400">Add or remove NFTs from whitelist</p>
            </div>
            <NFTWhitelistManagement />
          </div>
        );
      }
      if (activeSubMenu === 'nfts-whitelist-list') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Whitelist List</h1>
              <p className="text-gray-400">All whitelisted NFTs</p>
            </div>
            <WhitelistedNFTList />
          </div>
        );
      }
    }

    // Currency Management
    if (activeMenu === 'currencies') {
      if (activeSubMenu === 'currencies-add') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Add Currency</h1>
              <p className="text-gray-400">Add new supported currencies</p>
            </div>
            <CurrencyManagement />
          </div>
        );
      }
      if (activeSubMenu === 'currencies-list') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Currency List</h1>
              <p className="text-gray-400">All supported currencies</p>
            </div>
            <WhitelistedCurrenciesList />
          </div>
        );
      }
    }

    // Marketplace Settings
    if (activeMenu === 'marketplace-settings') {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Marketplace Settings</h1>
            <p className="text-gray-400">Configure contract permissions and fee receivers</p>
          </div>
          <PermissionsSettings />
        </div>
      );
    }

    // Fee Configuration
    if (activeMenu === 'fee-config') {
      if (activeSubMenu === 'fee-listing') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Listing Fees</h1>
              <p className="text-gray-400">Configure marketplace fees for listings</p>
            </div>
            <ListingSettings />
          </div>
        );
      }
      if (activeSubMenu === 'fee-auction') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Auction Fees</h1>
              <p className="text-gray-400">Configure marketplace fees for auctions</p>
            </div>
            <AuctionSettings />
          </div>
        );
      }
      if (activeSubMenu === 'fee-offer') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Offer Fees</h1>
              <p className="text-gray-400">Configure marketplace fees for offers</p>
            </div>
            <div className="p-8 bg-dark-card border border-dark-border rounded-xl text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400 mb-4">Offer fee configuration will be available in a future update</p>
            </div>
          </div>
        );
      }
    }

    // Revenue & Withdrawal
    if (activeMenu === 'revenue') {
      if (activeSubMenu === 'revenue-stats') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Revenue Stats</h1>
              <p className="text-gray-400">Monitor marketplace revenue</p>
            </div>
            <RevenueStats />
          </div>
        );
      }
      if (activeSubMenu === 'revenue-pools') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Fee Pools</h1>
              <p className="text-gray-400">View accumulated fees by extension</p>
            </div>
            <FeePoolsTable />
          </div>
        );
      }
      if (activeSubMenu === 'revenue-withdraw') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Withdraw Fees</h1>
              <p className="text-gray-400">Withdraw accumulated fees</p>
            </div>
            <WithdrawFeeForm />
          </div>
        );
      }
      if (activeSubMenu === 'revenue-history') {
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Withdrawal History</h1>
              <p className="text-gray-400">History of fee withdrawals</p>
            </div>
            <WithdrawalHistory />
          </div>
        );
      }
    }

    return null;
  };

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
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 bg-dark-card border-r border-dark-border flex-shrink-0 overflow-y-auto scrollbar-hide">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <div key={item.id}>
                    {/* Main Menu Item */}
                    <button
                      onClick={() => handleMenuClick(item.id, !!item.subItems)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                        activeMenu === item.id && !item.subItems
                          ? 'bg-primary-500 text-white shadow-lg'
                          : activeMenu === item.id && item.subItems
                          ? 'bg-dark-bg text-white'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm whitespace-nowrap">{item.label}</span>
                      </div>
                      {item.subItems && (
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            expandedMenus.has(item.id) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Sub Menu Items */}
                    {item.subItems && expandedMenus.has(item.id) && (
                      <div className="mt-1 ml-4 space-y-1 border-l-2 border-dark-border pl-4">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubMenuClick(item.id, subItem.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              activeSubMenu === subItem.id
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                            }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </MainLayout>
    </RoleProtected>
  );
}
