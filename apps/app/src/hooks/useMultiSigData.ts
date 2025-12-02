import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getBrowserProvider } from '../lib/web3/provider';
import { CONTRACT_ADDRESSES } from '../lib/contracts/addresses';
import { useWallet } from './useWallet';

const MULTISIG_ABI = [
  'function owners(uint) public view returns (address)',
  'function getOwners() public view returns (address[])',
  'function isOwner(address) public view returns (bool)',
  'function numConfirmationsRequired() public view returns (uint)',
  'function getTransactionCount() public view returns (uint)',
  'function transactions(uint) public view returns (address to, uint value, bytes data, bool executed, uint numConfirmations)',
  'function isConfirmed(uint txIndex, address owner) public view returns (bool)',
];

interface MultiSigTransaction {
  index: number;
  to: string;
  value: bigint;
  data: string;
  executed: boolean;
  confirmations: number;
  isConfirmedByUser: boolean;
  description: string;
}

export function useMultiSigData() {
  const [owners, setOwners] = useState<string[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<MultiSigTransaction[]>([]);
  const [requiredConfirmations, setRequiredConfirmations] = useState(0);
  const [balance, setBalance] = useState(BigInt(0));
  const [currentUserIsOwner, setCurrentUserIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { address } = useWallet();

  const loadMultiSigData = useCallback(async () => {
    const multisigAddress = CONTRACT_ADDRESSES.MULTISIG || '0xE41FBfa9c12476a61bd8C36212a8C65C24eB0867';
    if (!multisigAddress) {
      console.warn('MultiSig contract address not configured');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const provider = getBrowserProvider();
      if (!provider) return;

      const contract = new ethers.Contract(multisigAddress, MULTISIG_ABI, provider);

      // Load basic info in parallel
      const [
        ownersResult,
        requiredResult,
        balanceResult,
        txCountResult
      ] = await Promise.all([
        contract.getOwners(),
        contract.numConfirmationsRequired(),
        provider.getBalance(multisigAddress),
        contract.getTransactionCount()
      ]);

      setOwners(ownersResult);
      setRequiredConfirmations(Number(requiredResult));
      setBalance(balanceResult);

      // Check if current user is owner
      if (address) {
        try {
          const isOwnerResult = await contract.isOwner(address);
          setCurrentUserIsOwner(isOwnerResult);
        } catch (error) {
          console.error('Failed to check owner status:', error);
          setCurrentUserIsOwner(false);
        }
      } else {
        setCurrentUserIsOwner(false);
      }

      // Load transactions
      const txCount = Number(txCountResult);
      const transactions: MultiSigTransaction[] = [];

      if (txCount > 0) {
        // Load last 50 transactions or all if less than 50
        const startIndex = Math.max(0, txCount - 50);
        const transactionPromises: Promise<MultiSigTransaction>[] = [];

        for (let i = startIndex; i < txCount; i++) {
          transactionPromises.push(
            contract.transactions(i).then(async (tx: any): Promise<MultiSigTransaction> => {
              const isConfirmedByUser = address ? await contract.isConfirmed(i, address) : false;
              
              return {
                index: i,
                to: tx.to,
                value: tx.value,
                data: tx.data,
                executed: tx.executed,
                confirmations: Number(tx.numConfirmations),
                isConfirmedByUser,
                description: getTransactionDescription(tx)
              };
            })
          );
        }

        const loadedTransactions = await Promise.all(transactionPromises);
        
        // Filter to show only non-executed transactions or recently executed ones
        const filteredTransactions = loadedTransactions.filter(tx => 
          !tx.executed || (tx.executed && tx.index >= txCount - 10)
        );

        transactions.push(...filteredTransactions.reverse()); // Show newest first
      }

      setPendingTransactions(transactions);

    } catch (error) {
      console.error('Failed to load MultiSig data:', error);
      setOwners([]);
      setPendingTransactions([]);
      setRequiredConfirmations(0);
      setBalance(BigInt(0));
      setCurrentUserIsOwner(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getTransactionDescription = (tx: any): string => {
    if (tx.value > 0) {
      return `Transfer ${ethers.formatEther(tx.value)} ETH`;
    }
    
    // Try to decode withdrawal transactions directly first
    try {
      const WITHDRAWAL_ABI = [
        'function withdrawListingFees(address currency) external',
        'function withdrawFeesAuction(address currency) external', 
        'function withdrawOfferFees(address currency) external'
      ];
      
      const withdrawalIface = new ethers.Interface(WITHDRAWAL_ABI);
      const decoded = withdrawalIface.parseTransaction({ data: tx.data });
      
      if (decoded?.name === 'withdrawListingFees') {
        const currency = decoded.args[0];
        // Check if it's USDC address
        if (currency.toLowerCase() === '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') {
          return `Withdraw Listing Fees (USDC)`;
        }
        return `Withdraw Listing Fees (${currency.slice(0, 8)}...)`;
      } else if (decoded?.name === 'withdrawFeesAuction') {
        const currency = decoded.args[0];
        if (currency.toLowerCase() === '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') {
          return `Withdraw Auction Fees (USDC)`;
        }
        return `Withdraw Auction Fees (${currency.slice(0, 8)}...)`;
      } else if (decoded?.name === 'withdrawOfferFees') {
        const currency = decoded.args[0];
        if (currency.toLowerCase() === '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238') {
          return `Withdraw Offer Fees (USDC)`;
        }
        return `Withdraw Offer Fees (${currency.slice(0, 8)}...)`;
      }
    } catch (error) {
      // Direct withdrawal decoding failed, try MultiSig format
    }
    
    // Try to decode as MultiSig submitTransaction 
    try {
      const MULTISIG_SUBMIT_ABI = ['function submitTransaction(address to, uint value, bytes data) external'];
      const WITHDRAWAL_ABI = [
        'function withdrawListingFees(address currency) external',
        'function withdrawFeesAuction(address currency) external', 
        'function withdrawOfferFees(address currency) external'
      ];
      
      const multiSigIface = new ethers.Interface(MULTISIG_SUBMIT_ABI);
      const decoded = multiSigIface.parseTransaction({ data: tx.data });
      
      if (decoded?.name === 'submitTransaction') {
        const innerData = decoded.args[2];
        const innerValue = decoded.args[1];
        
        // Check if it's ETH transfer
        if (innerValue > 0n) {
          return `Withdraw ${ethers.formatEther(innerValue)} ETH`;
        }
        
        // Try to decode withdrawal function
        try {
          const withdrawalIface = new ethers.Interface(WITHDRAWAL_ABI);
          const innerDecoded = withdrawalIface.parseTransaction({ data: innerData });
          
          if (innerDecoded?.name === 'withdrawListingFees') {
            return `Withdraw Listing Fees (USDC)`;
          } else if (innerDecoded?.name === 'withdrawFeesAuction') {
            return `Withdraw Auction Fees (USDC)`;
          } else if (innerDecoded?.name === 'withdrawOfferFees') {
            return `Withdraw Offer Fees (USDC)`;
          }
        } catch (error) {
          // Inner decoding failed
        }
        
        return `MultiSig Transaction`;
      }
    } catch (error) {
      // Decoding failed
    }
    
    // Try to decode common function calls by selector
    try {
      const selector = tx.data.slice(0, 10);
      
      const functionMap: { [key: string]: string } = {
        '0xa9059cbb': 'Transfer Token',
        '0x23b872dd': 'Transfer From', 
        '0x095ea7b3': 'Approve Token',
        '0x779450ba': 'Withdraw Listing Fees (USDC)', // Direct mapping for this selector
        '0x7b76583c': 'Add Owner',
        '0x173825d9': 'Remove Owner',
        '0x797af627': 'Change Requirement',
        '0x2f54bf6e': 'Grant Role',
        '0xd547741f': 'Revoke Role',
      };

      return functionMap[selector] || 'Contract Call';
    } catch (error) {
      return 'Contract Call';
    }
  };

  const refreshData = useCallback(() => {
    loadMultiSigData();
  }, [loadMultiSigData]);

  useEffect(() => {
    loadMultiSigData();
  }, [loadMultiSigData]);

  // Auto refresh every 2 minutes to avoid excessive reloading
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if user is not currently interacting (to avoid interrupting workflow)
      if (document.visibilityState === 'visible') {
        loadMultiSigData();
      }
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [loadMultiSigData]);

  return {
    owners,
    pendingTransactions,
    requiredConfirmations,
    balance,
    currentUserIsOwner,
    isLoading,
    refreshData
  };
}