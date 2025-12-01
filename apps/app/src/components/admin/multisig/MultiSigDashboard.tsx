'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Spinner } from '../../common/Spinner';
import { MultiSigOwnersList } from './MultiSigOwnersList';
import { PendingTransactions } from './PendingTransactions';
import { WithdrawRequestForm } from './WithdrawRequestForm';
import { AdminManagementForm } from './AdminManagementForm';
import { useMultiSigData } from '../../../hooks/useMultiSigData';
import { formatEther } from '../../../lib/utils/format';

interface TabInfo {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function MultiSigDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    owners,
    pendingTransactions,
    requiredConfirmations,
    balance,
    isLoading,
    currentUserIsOwner,
    refreshData
  } = useMultiSigData();

  const tabs: TabInfo[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'owners',
      label: 'Admin Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'transactions',
      label: 'Pending Transactions',
      badge: pendingTransactions.length,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'withdraw',
      label: 'Withdrawal Request',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
    },
    {
      id: 'admin',
      label: 'Permission Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-300">Total Admins</h3>
              <p className="text-2xl font-bold text-white">{owners.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-600/20 to-green-700/20 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-300">Required Confirmations</h3>
              <p className="text-2xl font-bold text-white">{requiredConfirmations}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-600/20 to-purple-700/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-300">Pending Transactions</h3>
              <p className="text-2xl font-bold text-white">{pendingTransactions.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-300">Wallet Balance</h3>
              <p className="text-2xl font-bold text-white">{formatEther(balance.toString())}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* User Status Alert */}
      {!currentUserIsOwner && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-yellow-300 font-medium">You are not a MultiSig admin</p>
              <p className="text-yellow-400/70 text-sm">You can only view information, cannot perform transactions</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-bg'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Card>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">MultiSig Wallet Overview</h3>
              <Button onClick={refreshData} variant="secondary" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest pending transactions */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Recent Transactions</h4>
                {pendingTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {pendingTransactions.slice(0, 3).map((tx, index) => (
                      <div key={index} className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">Transaction #{tx.index}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            tx.isExecuted ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {tx.isExecuted ? 'Executed' : `${tx.confirmations}/${requiredConfirmations} confirmations`}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          <p>To: {tx.to.slice(0, 10)}...{tx.to.slice(-8)}</p>
                          <p>Value: {formatEther(tx.value)} ETH</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No transactions</p>
                )}
              </div>

              {/* Owner list preview */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Admin List</h4>
                <div className="space-y-3">
                  {owners.map((owner, index) => (
                    <div key={owner} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 font-medium">{index + 1}</span>
                        </div>
                        <span className="text-white text-sm font-mono">
                          {owner.slice(0, 10)}...{owner.slice(-8)}
                        </span>
                      </div>
                      <span className="text-green-400 text-sm">Admin</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'owners' && <MultiSigOwnersList />}
        {activeTab === 'transactions' && <PendingTransactions />}
        {activeTab === 'withdraw' && <WithdrawRequestForm />}
        {activeTab === 'admin' && <AdminManagementForm />}
      </Card>
    </div>
  );
}