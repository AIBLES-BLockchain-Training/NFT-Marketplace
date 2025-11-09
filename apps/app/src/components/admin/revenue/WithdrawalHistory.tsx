'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { Spinner } from '../../common/Spinner';
import { graphqlClient } from '../../../lib/graphql/client';
import { GET_FEE_WITHDRAWALS_QUERY } from '../../../lib/graphql/queries';
import { formatFeeAmount } from '../../../lib/web3/revenue';

interface FeeWithdrawal {
  id: string;
  extensionType: string;
  currency: {
    id: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  receiver: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
}

export function WithdrawalHistory() {
  const [withdrawals, setWithdrawals] = useState<FeeWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [offset]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await graphqlClient.query(GET_FEE_WITHDRAWALS_QUERY, {
        limit,
        offset,
      });

      const newWithdrawals = result?.feeWithdrawals || [];
      setWithdrawals((prev) => (offset === 0 ? newWithdrawals : [...prev, ...newWithdrawals]));
      setHasMore(newWithdrawals.length === limit);
    } catch (error) {
      console.error('Failed to load withdrawal history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    setOffset(offset + limit);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getExplorerUrl = (txHash: string) => {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || '11155111';
    if (chainId === '11155111') {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    } else if (chainId === '1') {
      return `https://etherscan.io/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  };

  if (isLoading && offset === 0) {
    return (
      <Card>
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Withdrawal History</h3>
        <p className="text-sm text-gray-400">Complete history of fee withdrawals</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Extension</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Currency</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Receiver</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w, index) => (
              <tr
                key={w.id}
                className={`border-b border-dark-border/50 hover:bg-dark-bg/50 transition-colors ${
                  index % 2 === 0 ? 'bg-dark-bg/20' : ''
                }`}
              >
                <td className="py-4 px-4 text-sm text-gray-300">{formatDate(w.timestamp)}</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
                    {w.extensionType}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="font-medium text-white">{w.currency.symbol}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-semibold text-white">
                    {formatFeeAmount(BigInt(w.amount), w.currency.decimals, w.currency.symbol)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-gray-400 text-sm font-mono">
                    {truncateAddress(w.receiver)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <a
                    href={getExplorerUrl(w.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 text-sm font-mono hover:underline"
                  >
                    {truncateHash(w.transactionHash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {withdrawals.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No withdrawal history yet</p>
            <p className="text-sm">Withdrawals will appear here once fees are withdrawn</p>
          </div>
        )}
      </div>

      {hasMore && withdrawals.length > 0 && (
        <div className="mt-6 text-center">
          <Button onClick={loadMore} variant="secondary" isLoading={isLoading && offset > 0}>
            Load More
          </Button>
        </div>
      )}
    </Card>
  );
}
