import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { getBrowserProvider } from '../lib/web3/provider';
import { calculateMinimumBid, calculateMinimumFirstBid, validateBidAmount, parseEthInput } from '../lib/auction/calculations';
import { Auction } from '../types';
import { ZERO_ADDRESS } from '../lib/contracts/addresses';

// Reserve 0.01 ETH for gas fees when bidding with native ETH
const GAS_BUFFER = ethers.parseEther('0.01');

export interface BidValidationResult {
  isValid: boolean;
  error?: string;
  minimumBid: bigint;
  parsedAmount: bigint | null;
  hasSufficientBalance: boolean;
  balanceError?: string;
  currentBalance?: bigint;
  isNativeToken?: boolean;
}

export interface UseBidValidationOptions {
  /** Enable balance checking (default: true) */
  checkBalance?: boolean;
}

/**
 * Hook to validate bid amounts for auctions
 * @param auction Auction object
 * @param bidInput User input string
 * @param options Validation options
 * @returns Validation result
 */
export function useBidValidation(
  auction: Auction,
  bidInput: string,
  options: UseBidValidationOptions = {}
): BidValidationResult {
  const { checkBalance = true } = options;
  const { balance, address } = useWallet();
  const [erc20Balance, setErc20Balance] = useState<bigint | null>(null);
  const [validationResult, setValidationResult] = useState<BidValidationResult>({
    isValid: false,
    minimumBid: 0n,
    parsedAmount: null,
    hasSufficientBalance: false,
  });

  // Check if currency is native ETH or ERC-20
  const isNativeToken = auction.currency?.id?.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                       auction.currency?.id?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  // Fetch ERC-20 balance if needed
  useEffect(() => {
    if (!checkBalance || !address || isNativeToken) {
      setErc20Balance(null);
      return;
    }

    const fetchERC20Balance = async () => {
      try {
        const provider = getBrowserProvider();
        if (!provider) {
          setErc20Balance(null);
          return;
        }

        const tokenAddress = auction.currency.id;

        const erc20Abi = [
          'function balanceOf(address account) view returns (uint256)'
        ];
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const tokenBalance = await tokenContract.balanceOf(address);

        setErc20Balance(tokenBalance);
      } catch (error) {
        setErc20Balance(null);
      }
    };

    fetchERC20Balance();
  }, [auction.currency.id, address, checkBalance, isNativeToken]);

  // Calculate minimum bid
  const minimumBid = useMemo(() => {
    const bidBufferBps = auction.bidBufferBps && auction.bidBufferBps !== '0'
      ? BigInt(auction.bidBufferBps)
      : 500n; // Default to 5% if not available

    // If there's no winning bid yet, minimum = startPrice + (startPrice * stepAmount%)
    // This matches contract logic: requiredAmount = startPrice + (startPrice * stepAmount / decimal)
    if (!auction.winningBid) {
      return calculateMinimumFirstBid(BigInt(auction.startPrice), bidBufferBps);
    }

    // If there's a winning bid, calculate minimum next bid with step amount
    const currentBid = BigInt(auction.winningBid.bidAmount);
    return calculateMinimumBid(currentBid, bidBufferBps);
  }, [auction]);

  // Validate bid input
  useEffect(() => {
    // Parse input with currency decimals
    const currencyDecimals = auction.currency?.decimals || 18;
    const parsedAmount = parseEthInput(bidInput, currencyDecimals);

    if (!bidInput.trim()) {
      setValidationResult({
        isValid: false,
        error: undefined,
        minimumBid,
        parsedAmount: null,
        hasSufficientBalance: false,
      });
      return;
    }

    if (parsedAmount === null) {
      setValidationResult({
        isValid: false,
        error: 'Invalid amount',
        minimumBid,
        parsedAmount: null,
        hasSufficientBalance: false,
      });
      return;
    }

    // Validate amount
    const ceilingPrice = auction.ceilingPrice ? BigInt(auction.ceilingPrice) : undefined;
    const amountValidation = validateBidAmount(parsedAmount, minimumBid, ceilingPrice);

    if (!amountValidation.isValid) {
      setValidationResult({
        isValid: false,
        error: amountValidation.error,
        minimumBid,
        parsedAmount,
        hasSufficientBalance: false,
      });
      return;
    }

    // Check balance if enabled
    if (checkBalance) {
      let balanceBigInt: bigint;
      let availableBalance: bigint;

      if (isNativeToken) {
        // Use ETH balance for native token
        if (!balance) {
          setValidationResult({
            isValid: false,
            error: 'Unable to fetch balance',
            minimumBid,
            parsedAmount,
            hasSufficientBalance: false,
          });
          return;
        }
        balanceBigInt = (() => {
          try {
            return ethers.parseEther(balance.toString());
          } catch (error) {
            console.warn('Invalid balance value:', balance);
            return 0n;
          }
        })();

        // For native ETH, reserve gas buffer for transaction fees
        availableBalance = balanceBigInt > GAS_BUFFER
          ? balanceBigInt - GAS_BUFFER
          : 0n;
      } else {
        // Use ERC-20 balance
        if (erc20Balance === null) {
          // Still loading or failed to fetch
          setValidationResult({
            isValid: false,
            error: 'Loading token balance...',
            minimumBid,
            parsedAmount,
            hasSufficientBalance: false,
          });
          return;
        }
        balanceBigInt = erc20Balance;
        availableBalance = balanceBigInt; // ERC-20 doesn't need gas buffer (gas paid in ETH)
      }

      const hasSufficientBalance = availableBalance >= parsedAmount;

      if (!hasSufficientBalance) {
        const currencyDecimals = auction.currency?.decimals || 18;
        const balanceErrorMsg = isNativeToken
          ? `You need ${formatBidAmount(parsedAmount, 4, currencyDecimals)} ${auction.currency.symbol} but have ${formatBidAmount(availableBalance, 4, currencyDecimals)} available (${formatBidAmount(balanceBigInt, 4, currencyDecimals)} total, ${formatBidAmount(GAS_BUFFER, 4, 18)} reserved for gas)`
          : `You need ${formatBidAmount(parsedAmount, 4, currencyDecimals)} ${auction.currency.symbol} but have ${formatBidAmount(balanceBigInt, 4, currencyDecimals)}`;

        setValidationResult({
          isValid: false,
          error: 'Insufficient balance',
          minimumBid,
          parsedAmount,
          hasSufficientBalance: false,
          balanceError: balanceErrorMsg,
          currentBalance: availableBalance,
          isNativeToken,
        });
        return;
      }

      setValidationResult({
        isValid: true,
        minimumBid,
        parsedAmount,
        hasSufficientBalance: true,
        currentBalance: availableBalance,
        isNativeToken,
      });
    } else {
      // Skip balance check
      setValidationResult({
        isValid: true,
        minimumBid,
        parsedAmount,
        hasSufficientBalance: true,
        isNativeToken,
      });
    }
  }, [bidInput, minimumBid, auction, balance, checkBalance, isNativeToken, erc20Balance]);

  return validationResult;
}

/**
 * Format bid amount for display
 */
function formatBidAmount(amount: bigint, displayDecimals = 4, currencyDecimals = 18): string {
  const divisor = Math.pow(10, currencyDecimals);
  const value = Number(amount) / divisor;
  return value.toFixed(displayDecimals);
}

/**
 * Hook to get quick bid suggestions
 * @param auction Auction object
 * @param percentages Percentage increases (default: [5, 10, 20])
 * @returns Array of quick bid suggestions
 */
export function useQuickBidSuggestions(
  auction: Auction,
  percentages: number[] = [5, 10, 20]
): Array<{ amount: bigint; label: string }> {
  return useMemo(() => {
    const bidBufferBps = auction.bidBufferBps && auction.bidBufferBps !== '0'
      ? BigInt(auction.bidBufferBps)
      : 500n; // Default to 5%

    // For quick bids, calculate from current bid or minimum first bid
    const baseBid = auction.winningBid
      ? BigInt(auction.winningBid.bidAmount)
      : calculateMinimumFirstBid(BigInt(auction.startPrice), bidBufferBps);

    return percentages.map((percent) => {
      const amount = baseBid + (baseBid * BigInt(percent * 100)) / 10000n;
      return {
        amount,
        label: `+${percent}%`,
      };
    });
  }, [auction, percentages]);
}

/**
 * Hook to check if bid is a buyout bid
 * @param auction Auction object
 * @param bidAmount Bid amount in wei
 * @returns True if bid equals or exceeds ceiling price
 */
export function useIsBuyoutBid(auction: Auction, bidAmount: bigint | null): boolean {
  return useMemo(() => {
    if (!bidAmount || !auction.ceilingPrice) return false;
    return bidAmount >= BigInt(auction.ceilingPrice);
  }, [auction.ceilingPrice, bidAmount]);
}
