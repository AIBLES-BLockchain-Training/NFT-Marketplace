'use client';

import { useState, useEffect } from 'react';
import { StatsCard } from '../StatsCard';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY, GET_FEE_WITHDRAWALS_QUERY } from '../../../lib/graphql/queries';
import { getAccumulatedFees } from '../../../lib/web3/revenue';
import { ethers } from 'ethers';

interface RevenueStatsData {
  totalCollectedUSD: string;
  totalWithdrawnUSD: string;
  availableUSD: string;
  totalCollectedETH: string;
  totalWithdrawnETH: string;
  availableETH: string;
}

export function RevenueStats() {
  const [stats, setStats] = useState<RevenueStatsData>({
    totalCollectedUSD: '0',
    totalWithdrawnUSD: '0',
    availableUSD: '0',
    totalCollectedETH: '0',
    totalWithdrawnETH: '0',
    availableETH: '0',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const routerAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS!;

      // Get currency stats from GraphQL
      const currencyResult = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});

      // Get withdrawal history from GraphQL
      const withdrawalResult = await graphqlClient.query(GET_FEE_WITHDRAWALS_QUERY, {
        limit: 1000,
        offset: 0,
      });

      let totalCollectedETH = BigInt(0);
      let totalWithdrawnETH = BigInt(0);

      // Get accumulated fees from contract for each currency
      for (const currency of currencyResult?.supportedCurrencies || []) {
        const currencyId = currency.id;

        // Get accumulated (available) from on-chain
        const accumulated = await getAccumulatedFees('listing', currencyId, routerAddress);

        if (currencyId === '0x0000000000000000000000000000000000000000') {
          // ETH
          totalCollectedETH += accumulated;

          // Calculate withdrawn from withdrawals history
          const withdrawals = (withdrawalResult?.feeWithdrawals || []).filter(
            (w: any) => w.currency.id === currencyId
          );
          for (const w of withdrawals) {
            totalWithdrawnETH += BigInt(w.amount);
          }
        }
      }

      const totalETH = totalCollectedETH + totalWithdrawnETH;

      setStats({
        totalCollectedUSD: '0', // TODO: Add USD conversion
        totalWithdrawnUSD: '0',
        availableUSD: '0',
        totalCollectedETH: ethers.formatEther(totalETH),
        totalWithdrawnETH: ethers.formatEther(totalWithdrawnETH),
        availableETH: ethers.formatEther(totalCollectedETH),
      });
    } catch (error) {
      console.error('Failed to load revenue stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard
        title="Total Fees Collected"
        value={`${parseFloat(stats.totalCollectedETH).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} ETH`}
        subtitle="All time revenue"
        icon="💰"
        isLoading={isLoading}
      />
      <StatsCard
        title="Total Withdrawn"
        value={`${parseFloat(stats.totalWithdrawnETH).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} ETH`}
        subtitle="Paid to MultiSig"
        icon="📤"
        isLoading={isLoading}
      />
      <StatsCard
        title="Available to Withdraw"
        value={`${parseFloat(stats.availableETH).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })} ETH`}
        subtitle="Current balance in contracts"
        icon="💵"
        isLoading={isLoading}
      />
    </div>
  );
}
