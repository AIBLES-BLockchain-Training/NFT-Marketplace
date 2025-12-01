'use client';

import { useState, useEffect } from 'react';
import { StatsCard } from '../StatsCard';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY, GET_FEE_WITHDRAWALS_QUERY } from '../../../lib/graphql/queries';
import { getAccumulatedFees, getCurrencyFeePercentage } from '../../../lib/web3/revenue';
import { formatUSDCWithSymbol, isUSDCCurrency } from '../../../lib/utils/format';
import { USDC_ADDRESS } from '../../../lib/constants';
import { Card } from '../../common/Card';

interface RevenueStatsData {
  totalCollectedUSDC: string;
  totalWithdrawnUSDC: string;
  availableUSDC: string;
}

interface USDCFeePool {
  extension: string;
  accumulated: bigint;
  feePercentage: number;
  isActive: boolean;
}

export function RevenueStats() {
  const [stats, setStats] = useState<RevenueStatsData>({
    totalCollectedUSDC: '0',
    totalWithdrawnUSDC: '0',
    availableUSDC: '0',
  });
  const [feePools, setFeePools] = useState<USDCFeePool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Get currency stats from GraphQL
      const currencyResult = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});

      // Get withdrawal history from GraphQL
      const withdrawalResult = await graphqlClient.query(GET_FEE_WITHDRAWALS_QUERY, {
        limit: 1000,
        offset: 0,
      });

      let totalCollectedUSDC = BigInt(0);
      let totalWithdrawnUSDC = BigInt(0);

      // Get accumulated fees from contract for USDC only
      for (const currency of currencyResult?.supportedCurrencies || []) {
        const currencyId = currency.id;

        // Only process USDC
        if (!isUSDCCurrency(currencyId)) {
          continue;
        }

        // Get accumulated from Listing contract
        const listingFees = await getAccumulatedFees('listing', currencyId);

        // Get accumulated from Auction contract (may fail if currency not configured)
        let auctionFees = BigInt(0);
        try {
          auctionFees = await getAccumulatedFees('auction', currencyId);
        } catch (auctionError) {
          // Currency not configured in Auction contract, skip
        }

        // Get accumulated from Offer contract 
        let offerFees = BigInt(0);
        try {
          offerFees = await getAccumulatedFees('offer', currencyId);
        } catch (offerError) {
          // Currency not configured in Offer contract, skip
        }

        const accumulated = listingFees + auctionFees + offerFees;
        totalCollectedUSDC += accumulated;

        // Calculate withdrawn from withdrawals history (USDC only)
        const withdrawals = (withdrawalResult?.feeWithdrawals || []).filter(
          (w: Record<string, unknown>) => isUSDCCurrency((w.currency as Record<string, unknown>)?.id as string)
        );
        for (const w of withdrawals) {
          totalWithdrawnUSDC += BigInt(w.amount as string);
        }
      }

      const totalUSDC = totalCollectedUSDC + totalWithdrawnUSDC;

      setStats({
        totalCollectedUSDC: totalUSDC.toString(),
        totalWithdrawnUSDC: totalWithdrawnUSDC.toString(),
        availableUSDC: totalCollectedUSDC.toString(),
      });

      // Load fee pools by extension (USDC only)
      const extensions = [
        { name: 'Listing', isActive: true },
        { name: 'Auction', isActive: true },
        { name: 'Offer', isActive: true },
      ];

      const poolsData: USDCFeePool[] = [];
      for (const ext of extensions) {
        if (ext.isActive) {
          const extensionType = ext.name.toLowerCase() as 'listing' | 'auction' | 'offer';
          
          let accumulated = BigInt(0);
          let feePercentage = 0;
          
          try {
            accumulated = await getAccumulatedFees(extensionType, USDC_ADDRESS);
            if (extensionType === 'offer') {
              // Offer uses global fee percentage, not per-currency
              feePercentage = await getCurrencyFeePercentage(extensionType, '');
            } else {
              feePercentage = await getCurrencyFeePercentage(extensionType, USDC_ADDRESS);
            }
          } catch (error) {
            // Extension may not have USDC configured
          }

          poolsData.push({
            extension: ext.name,
            accumulated,
            feePercentage,
            isActive: ext.isActive,
          });
        } else {
          poolsData.push({
            extension: ext.name,
            accumulated: BigInt(0),
            feePercentage: 0,
            isActive: false,
          });
        }
      }

      setFeePools(poolsData);
    } catch (error) {
      console.error('Failed to load revenue stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Fees Collected"
          value={formatUSDCWithSymbol(stats.totalCollectedUSDC)}
          subtitle="All time revenue"
          icon="💰"
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Withdrawn"
          value={formatUSDCWithSymbol(stats.totalWithdrawnUSDC)}
          subtitle="Paid to MultiSig"
          icon="📤"
          isLoading={isLoading}
        />
        <StatsCard
          title="Available to Withdraw"
          value={formatUSDCWithSymbol(stats.availableUSDC)}
          subtitle="Current balance in contracts"
          icon="💵"
          isLoading={isLoading}
        />
      </div>

      {/* USDC Fee Pools */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">USDC Fee Pools by Extension</h3>
          <p className="text-sm text-gray-400">Available USDC balances per extension</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {feePools.map((pool) => (
            <Card key={pool.extension}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-border">
                <div>
                  <h4 className="text-lg font-bold text-white">{pool.extension} Pool</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {pool.isActive ? 'USDC Only' : 'Coming Soon'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    pool.isActive
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  }`}
                >
                  {pool.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* USDC Pool Info */}
              {pool.isActive ? (
                <div className="p-3 bg-dark-bg/50 border border-dark-border/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-white">USDC</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({USDC_ADDRESS.slice(0, 6)}...{USDC_ADDRESS.slice(-4)})
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{pool.feePercentage.toFixed(2)}% fee</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-400">Available:</span>
                    <span className="text-sm font-bold text-primary-400">
                      {formatUSDCWithSymbol(pool.accumulated.toString())}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">This extension will be available soon</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
