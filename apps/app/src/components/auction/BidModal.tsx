import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { useBidValidation, useQuickBidSuggestions, useIsBuyoutBid } from '../../hooks/useBidValidation';
import { formatEth } from '../../lib/web3/utils';
import { encodeBidInAuction } from '../../lib/web3/encoding';
import { checkERC20Allowance, approveERC20 } from '../../lib/web3/approve';
import { parseWeb3Error, retryWithBackoff } from '../../lib/utils/errors';
import { hasAuctionEnded } from '../../lib/auction/status';
import { Auction } from '../../types';
import { ZERO_ADDRESS, ROUTER_ADDRESS } from '../../lib/contracts/addresses';
import toast from 'react-hot-toast';

export interface BidModalProps {
  auction: Auction;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Bid Modal Component
 * Allows users to place bids on auctions with validation and approval flow
 */
export function BidModal({ auction, isOpen, onClose, onSuccess }: BidModalProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address, balance } = useWallet();
  const [bidInput, setBidInput] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [selectedQuickBid, setSelectedQuickBid] = useState<string | null>(null);

  const validation = useBidValidation(auction, bidInput);
  const quickBids = useQuickBidSuggestions(auction, [5, 10, 20]);
  const isBuyout = useIsBuyoutBid(auction, validation.parsedAmount);

  const currentBid = auction.winningBid
    ? BigInt(auction.winningBid.bidAmount)
    : BigInt(auction.startPrice);

  // Fallback for currency symbol
  const currencySymbol = auction.currency?.symbol || 'UNKNOWN';

  // Auto-select +5% bid when modal opens (only once when opening)
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setBidInput('');
      setSelectedQuickBid(null);
      setAuctionEnded(false);
      return;
    }

    // Auto-select the minimum bid when modal opens
    const bidBufferBps = auction.bidBufferBps && auction.bidBufferBps !== '0'
      ? BigInt(auction.bidBufferBps)
      : 500n; // Default to 5%

    if (!auction.winningBid) {
      // No bids yet - set to startPrice + X% (matching contract logic)
      // Contract requires: startPrice + (startPrice * stepAmount / decimal)
      const minimumFirstBid = BigInt(auction.startPrice) +
        (BigInt(auction.startPrice) * bidBufferBps) / 10000n;
      setBidInput(formatEth(minimumFirstBid));
      setSelectedQuickBid(null);
    } else {
      // Has bids - set to +5% of current bid
      const currentBid = BigInt(auction.winningBid.bidAmount);
      const nextBidAmount = currentBid + (currentBid * bidBufferBps) / 10000n;
      setBidInput(formatEth(nextBidAmount));
      setSelectedQuickBid('+5%');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen, not quickBids!

  // Check if auction has ended
  useEffect(() => {
    if (!isOpen) return;

    const checkAuctionStatus = () => {
      const ended = hasAuctionEnded(auction.endTime);
      if (ended && !auctionEnded) {
        setAuctionEnded(true);
        toast.error('This auction has ended');
      }
    };

    // Check immediately
    checkAuctionStatus();

    // Check every 5 seconds while modal is open
    const interval = setInterval(checkAuctionStatus, 5000);

    return () => clearInterval(interval);
  }, [isOpen, auction.endTime, auctionEnded]);

  const handleQuickBid = (amount: bigint, label: string) => {
    setBidInput(formatEth(amount));
    setSelectedQuickBid(label);
  };

  const handleMaxBid = () => {
    if (auction.ceilingPrice) {
      setBidInput(formatEth(BigInt(auction.ceilingPrice)));
      setSelectedQuickBid('buyout');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBidInput(e.target.value);
    setSelectedQuickBid(null); // Clear selection when user types manually
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Check if auction has ended (final check before submission)
    if (hasAuctionEnded(auction.endTime)) {
      toast.error('This auction has ended. Refresh the page to see the latest status');
      setAuctionEnded(true);
      return;
    }

    if (!validation.isValid || !validation.parsedAmount) {
      toast.error(validation.error || 'Invalid bid amount');
      return;
    }

    // Check balance
    if (validation.balanceError) {
      toast.error(validation.balanceError);
      return;
    }

    try {
      // Check if currency is ERC20 (not native ETH)
      const isNativeCurrency = auction.currency.id.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                               auction.currency.id.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      // If ERC20, check and request approval if needed
      if (!isNativeCurrency) {
        setIsApproving(true);

        try {
          const { hasAllowance } = await checkERC20Allowance(
            auction.currency.id,
            address,
            ROUTER_ADDRESS,
            validation.parsedAmount!
          );

          if (!hasAllowance) {
            toast.loading('Approving token...', { id: 'approval' });

            // Request approval
            const approved = await approveERC20(auction.currency.id, ROUTER_ADDRESS);

            if (!approved) {
              toast.error('Token approval failed', { id: 'approval' });
              setIsApproving(false);
              return;
            }

            toast.success('Token approved successfully!', { id: 'approval' });
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'User rejected approval') {
            toast.error('You rejected the token approval', { id: 'approval' });
          } else {
            toast.error('Failed to approve token', { id: 'approval' });
          }
          setIsApproving(false);
          return;
        } finally {
          setIsApproving(false);
        }
      }

      // Final check before placing bid
      if (hasAuctionEnded(auction.endTime)) {
        toast.error('Auction ended while preparing your bid. Please refresh');
        setAuctionEnded(true);
        return;
      }

      // Place bid
      const tx = encodeBidInAuction({
        auctionId: BigInt(auction.auctionId),
        bidAmount: validation.parsedAmount,
        currency: auction.currency.id,
      });

      const receipt = await sendTransaction(
        tx,
        isBuyout ? 'Buyout successful! You won the auction!' : 'Bid placed successfully!'
      );

      // Clear input on success
      setBidInput('');
      setSelectedQuickBid(null);

      // Trigger immediate refresh (don't wait for modal close)
      // Indexer needs a few seconds to index the new bid
      if (receipt) {
        setTimeout(() => {
          onSuccess?.();
        }, 3000); // Wait 3 seconds for indexer to process
      }
    } catch (error: unknown) {
      const errorMsg = parseWeb3Error(error);
      toast.error(errorMsg);
      console.error('Bid error:', error);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showResultModal}
        onClose={onClose}
        title="Place Your Bid"
        zIndex="z-[60]"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ERC20 Info Banner */}
          {auction.currency.id.toLowerCase() !== ZERO_ADDRESS.toLowerCase() &&
           auction.currency.id.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-400 font-semibold mb-1">ERC20 Token Payment</p>
                  <p className="text-gray-300 text-xs mb-2">
                    You&apos;ll need to approve the {currencySymbol} token before bidding. This is a one-time approval that allows the marketplace to transfer tokens on your behalf.
                  </p>
                  <p className="text-gray-400 text-xs font-mono break-all">
                    {auction.currency.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auction Info */}
          <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Bid</p>
                <p className="text-xl font-bold text-primary-400">
                  {formatEth(currentBid)} {currencySymbol}
                </p>
                {auction.winningBid && (
                  <p className="text-xs text-gray-500 mt-1">
                    by {auction.winningBid.bidderAddress.slice(0, 6)}...{auction.winningBid.bidderAddress.slice(-4)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  {auction.winningBid ? 'Minimum Next Bid' : 'Minimum First Bid'}
                </p>
                <p className="text-lg font-bold text-white">
                  {formatEth(validation.minimumBid)} {currencySymbol}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {auction.winningBid ? '+' : 'Start + '}{(Number(auction.bidBufferBps) / 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Bid Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Bid Amount ({currencySymbol})
            </label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder={formatEth(validation.minimumBid)}
              value={bidInput}
              onChange={handleInputChange}
              required
            />
            {validation.error && (
              <p className="mt-2 text-xs text-red-400">
                {validation.error}
              </p>
            )}
            {validation.balanceError && (
              <p className="mt-2 text-xs text-red-400">
                {validation.balanceError}
              </p>
            )}
          </div>

          {/* Quick Bid Buttons */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick Bids</p>
            <div className="flex gap-2">
              {quickBids.map((qb) => {
                const isSelected = selectedQuickBid === qb.label;
                return (
                  <button
                    key={qb.label}
                    type="button"
                    onClick={() => handleQuickBid(qb.amount, qb.label)}
                    className={`flex-1 py-2 px-3 border rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary-500/30 border-primary-500 text-primary-300'
                        : 'bg-dark-card hover:bg-dark-bg border-dark-border text-white'
                    }`}
                  >
                    {qb.label}
                    <span className={`block text-xs mt-1 ${isSelected ? 'text-primary-400' : 'text-gray-500'}`}>
                      {formatEth(qb.amount)}
                    </span>
                  </button>
                );
              })}
              {auction.ceilingPrice && (() => {
                const isBuyoutSelected = selectedQuickBid === 'buyout';
                return (
                  <button
                    type="button"
                    onClick={handleMaxBid}
                    className={`flex-1 py-2 px-3 border rounded-lg text-sm transition-colors ${
                      isBuyoutSelected
                        ? 'bg-primary-500/40 border-primary-400 text-primary-300'
                        : 'bg-dark-card hover:bg-primary-500/20 border-primary-500/30 text-primary-400'
                    }`}
                  >
                    Buyout
                    <span className={`block text-xs mt-1 ${isBuyoutSelected ? 'text-primary-300' : 'text-primary-500/80'}`}>
                      {formatEth(BigInt(auction.ceilingPrice))}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Balance Check */}
          <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Available Balance
                  {validation.isNativeToken && (
                    <span className="text-[10px] text-gray-500 ml-1">(0.01 ETH reserved for gas)</span>
                  )}
                </p>
                <p className="text-sm font-semibold text-white">
                  {validation.currentBalance !== undefined
                    ? (Number(validation.currentBalance) / 1e18).toFixed(4)
                    : validation.isNativeToken && balance
                    ? Number(balance).toFixed(4)
                    : '0.00'
                  } {currencySymbol}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Status</p>
                {validation.hasSufficientBalance ? (
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Sufficient
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Insufficient
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buyout Notice */}
          {isBuyout && auction.ceilingPrice && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <div className="text-sm">
                  <p className="text-primary-400 font-semibold mb-1">Instant Buyout!</p>
                  <p className="text-gray-300 text-xs">
                    This bid meets the buyout price. You will instantly win the auction if you proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auction Ended Warning */}
          {auctionEnded && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="text-red-400 font-semibold mb-1">Auction Has Ended</p>
                  <p className="text-gray-300 text-xs">
                    This auction has ended. Please refresh the page to see the final results.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          {!auctionEnded && (
            <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
              <p className="text-xs text-gray-400 font-semibold">
                Important:
              </p>
              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                <li>• If you are outbid, your bid will be automatically refunded</li>
                <li>• Bids placed near the end may extend the auction</li>
                <li>• Make sure you have enough {currencySymbol} in your wallet</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 border-t border-dark-border flex gap-3">
            <Button type="button" onClick={onClose} variant="secondary" fullWidth>
              {auctionEnded ? 'Close' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant={isBuyout ? 'primary' : 'primary'}
              fullWidth
              isLoading={isLoading || isApproving}
              disabled={!validation.isValid || !validation.hasSufficientBalance || auctionEnded}
            >
              {isApproving
                ? 'Approving...'
                : isBuyout
                ? `Buyout ${bidInput && validation.parsedAmount ? formatEth(validation.parsedAmount) : ''} ${currencySymbol}`
                : `Place Bid ${bidInput && validation.parsedAmount ? formatEth(validation.parsedAmount) : ''} ${currencySymbol}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Result Modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            closeModal();
            onClose(); // Close BidModal
            // Don't call onSuccess here - already called after transaction
            // This prevents double refresh
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </>
  );
}
