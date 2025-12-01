'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../common/Card';
import { Button } from '../../common/Button';
import { TransactionResultModal } from '../../common/TransactionResultModal';
import { useTransactionModal } from '../../../hooks/useTransactionModal';
import { useMultiSigData } from '../../../hooks/useMultiSigData';
import { CONTRACT_ADDRESSES } from '../../../lib/contracts/addresses';
import { formatEther, formatUSDCWithSymbol } from '../../../lib/utils/format';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const MULTISIG_ABI = [
  'function confirmTransaction(uint txIndex) external',
  'function revokeConfirmation(uint txIndex) external',
  'function executeTransaction(uint txIndex) external',
  'function isConfirmed(uint txIndex, address owner) public view returns (bool)',
];

interface TransactionData {
  index: number;
  to: string;
  value: bigint;
  data: string;
  executed: boolean;
  confirmations: number;
  isConfirmedByUser: boolean;
  description: string;
}

export function PendingTransactions() {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { pendingTransactions, currentUserIsOwner, requiredConfirmations, refreshData } = useMultiSigData();
  const [expandedTx, setExpandedTx] = useState<number | null>(null);

  const getTransactionDescription = (tx: TransactionData): string => {
    if (tx.value > 0) {
      return `Transfer ${formatEther(tx.value)} ETH to ${tx.to.slice(0, 10)}...`;
    }
    
    // Decode function calls for better description
    try {
      const selector = tx.data.slice(0, 10);
      
      // Common function selectors
      const functionMap: { [key: string]: string } = {
        '0xa9059cbb': 'Transfer Token',
        '0x23b872dd': 'Transfer From',
        '0x095ea7b3': 'Approve Token',
        '0x7fffffff': 'Withdraw Fees',
        '0x1785f53c': 'Execute Withdrawal',
      };

      if (functionMap[selector]) {
        return `${functionMap[selector]} - ${tx.to.slice(0, 10)}...`;
      }
    } catch (error) {
      console.error('Error decoding transaction data:', error);
    }

    return `Contract Call - ${tx.to.slice(0, 10)}...`;
  };

  const handleConfirm = async (txIndex: number) => {
    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('confirmTransaction', [txIndex]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Transaction #${txIndex} confirmed`);
      
      if (receipt?.status === 1) {
        refreshData();
      }
    } catch (error) {
      console.error('Confirm transaction error:', error);
      toast.error('Unable to confirm transaction');
    }
  };

  const handleRevoke = async (txIndex: number) => {
    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('revokeConfirmation', [txIndex]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Transaction #${txIndex} confirmation revoked`);
      
      if (receipt?.status === 1) {
        refreshData();
      }
    } catch (error) {
      console.error('Revoke confirmation error:', error);
      toast.error('Unable to revoke confirmation');
    }
  };

  const handleExecute = async (txIndex: number) => {
    try {
      const iface = new ethers.Interface(MULTISIG_ABI);
      const data = iface.encodeFunctionData('executeTransaction', [txIndex]);

      const tx = {
        to: CONTRACT_ADDRESSES.MULTISIG as `0x${string}`,
        data,
        value: '0',
      };

      const receipt = await sendTransaction(tx, `Transaction #${txIndex} executed`);
      
      if (receipt?.status === 1) {
        refreshData();
      }
    } catch (error) {
      console.error('Execute transaction error:', error);
      toast.error('Unable to execute transaction');
    }
  };

  const getStatusColor = (tx: TransactionData) => {
    if (tx.executed) {
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    } else if (tx.confirmations >= requiredConfirmations) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    } else {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStatusText = (tx: TransactionData) => {
    if (tx.executed) {
      return 'Executed';
    } else if (tx.confirmations >= requiredConfirmations) {
      return 'Ready to Execute';
    } else {
      return `${tx.confirmations}/${requiredConfirmations} confirmations`;
    }
  };

  if (pendingTransactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Transactions</h3>
        <p className="text-gray-400">All transactions have been processed or no transactions have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Pending Transactions</h3>
          <p className="text-gray-400 text-sm mt-1">
            Requires {requiredConfirmations} confirmations to execute transaction
          </p>
        </div>
        <Button onClick={refreshData} variant="secondary" size="sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {pendingTransactions.map((tx) => (
          <Card key={tx.index} className={`border ${getStatusColor(tx)}`}>
            <div className="space-y-4">
              {/* Transaction Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <span className="text-primary-400 font-bold">#{tx.index}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{getTransactionDescription(tx)}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${getStatusColor(tx)}`}>
                        {getStatusText(tx)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        Value: {tx.value > 0 ? formatEther(tx.value) + ' ETH' : '0 ETH'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setExpandedTx(expandedTx === tx.index ? null : tx.index)}
                    variant="secondary"
                    size="sm"
                  >
                    {expandedTx === tx.index ? 'Collapse' : 'Details'}
                  </Button>
                  {currentUserIsOwner && !tx.executed && (
                    <div className="flex gap-2">
                      {tx.isConfirmedByUser ? (
                        <Button
                          onClick={() => handleRevoke(tx.index)}
                          variant="danger"
                          size="sm"
                          isLoading={isLoading}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConfirm(tx.index)}
                          variant="primary"
                          size="sm"
                          isLoading={isLoading}
                        >
                          Confirm
                        </Button>
                      )}
                      {tx.confirmations >= requiredConfirmations && (
                        <Button
                          onClick={() => handleExecute(tx.index)}
                          variant="success"
                          size="sm"
                          isLoading={isLoading}
                        >
                          Execute
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Confirmation Progress</span>
                  <span className="text-gray-400">{tx.confirmations}/{requiredConfirmations}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      tx.executed ? 'bg-green-500' : 
                      tx.confirmations >= requiredConfirmations ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min((tx.confirmations / requiredConfirmations) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTx === tx.index && (
                <div className="border-t border-dark-border pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Transaction Info</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">To Address:</span>
                          <span className="text-white font-mono">{tx.to.slice(0, 20)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Value:</span>
                          <span className="text-white">{formatEther(tx.value)} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={tx.executed ? 'text-green-400' : 'text-yellow-400'}>
                            {tx.executed ? 'Executed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Transaction Data</h5>
                      <div className="bg-dark-bg border border-dark-border rounded p-3">
                        <code className="text-xs text-gray-300 font-mono break-all">
                          {tx.data.slice(0, 100)}...
                        </code>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`https://sepolia.etherscan.io/address/${tx.to}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 text-xs"
                        >
                          View contract ↗
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.data)}
                          className="text-primary-400 hover:text-primary-300 text-xs"
                        >
                          Copy data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={closeModal}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </div>
  );
}