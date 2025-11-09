'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../common/Card';
import { Spinner } from '../../common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_CURRENCY_FEE_STATS_QUERY } from '../../../lib/graphql/queries';
import { getAccumulatedFees, formatFeeAmount } from '../../../lib/web3/revenue';

interface CurrencyFee {
  currency: string;
  currencyAddress: string;
  decimals: number;
  accumulated: bigint;
  feePercentage: number;
}

interface ExtensionPool {
  extension: string;
  currencies: CurrencyFee[];
  isActive: boolean;
}

export function FeePoolsTable() {
  const [extensionPools, setExtensionPools] = useState<ExtensionPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    setIsLoading(true);
    try {
      const routerAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS!;

      // Query currencies from GraphQL
      const result = await graphqlClient.query(GET_CURRENCY_FEE_STATS_QUERY, {});
      const allCurrencies = result?.supportedCurrencies || [];
      const currencies = allCurrencies.slice(0, 5); // Giới hạn 5 currencies

      // Define extensions
      const extensions = [
        { name: 'Listing', isActive: true },
        { name: 'Auction', isActive: false },
        { name: 'Offer', isActive: false },
      ];

      const poolsData: ExtensionPool[] = [];

      for (const ext of extensions) {
        const currencyFees: CurrencyFee[] = [];

        if (ext.isActive) {
          for (const currency of currencies) {
            // Query on-chain accumulated fees
            const accumulated = await getAccumulatedFees(
              ext.name.toLowerCase() as 'listing',
              currency.id,
              routerAddress
            );

            currencyFees.push({
              currency: currency.symbol,
              currencyAddress: currency.id,
              decimals: currency.decimals,
              accumulated: accumulated,
              feePercentage: currency.feePercentage || 0,
            });
          }
        }

        poolsData.push({
          extension: ext.name,
          currencies: currencyFees,
          isActive: ext.isActive,
        });
      }

      setExtensionPools(poolsData);
    } catch (error) {
      console.error('Failed to load fee pools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="flex justify-center items-center py-12">
              <Spinner size="md" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Fee Pools by Extension</h3>
        <p className="text-sm text-gray-400">Available balances per extension (max 5 currencies shown)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {extensionPools.map((pool) => (
          <Card key={pool.extension}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-border">
              <div>
                <h4 className="text-lg font-bold text-white">{pool.extension} Pool</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {pool.isActive ? `${pool.currencies.length} currencies` : 'Coming Soon'}
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

            {/* Currency List */}
            {pool.isActive ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                <style jsx>{`
                  .scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 2px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(124, 58, 237, 0.5);
                    border-radius: 2px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: rgba(124, 58, 237, 0.7);
                  }
                  .scrollbar-thin {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(124, 58, 237, 0.5) rgba(255, 255, 255, 0.05);
                  }
                `}</style>
                {pool.currencies.map((curr) => (
                  <div
                    key={curr.currencyAddress}
                    className="p-3 bg-dark-bg/50 border border-dark-border/50 rounded-lg hover:border-primary-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{curr.currency}</span>
                      <span className="text-xs text-gray-500">{curr.feePercentage.toFixed(2)}% fee</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-400">Available:</span>
                      <span className="text-sm font-bold text-primary-400">
                        {formatFeeAmount(curr.accumulated, curr.decimals, curr.currency)}
                      </span>
                    </div>
                  </div>
                ))}
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
  );
}
