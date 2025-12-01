import { Button } from '../common/Button';
import { TransactionResultModal } from '../common/TransactionResultModal';
import { useTransactionModal } from '../../hooks/useTransactionModal';
import { useWallet } from '../../hooks/useWallet';
import { canCollectPayout, canCollectNFT } from '../../lib/auction/status';
import { encodeCollectAuctionPayout, encodeCollectAuctionToken } from '../../lib/web3/encoding';
import { parseWeb3Error } from '../../lib/utils/errors';
import { Auction } from '../../types';
import toast from 'react-hot-toast';

export interface AuctionCollectionButtonsProps {
  auction: Auction;
  onSuccess?: () => void;
}

/**
 * Auction Collection Buttons Component
 * Handles collecting payout (seller) and NFT (winner) after auction ends
 */
export function AuctionCollectionButtons({
  auction,
  onSuccess,
}: AuctionCollectionButtonsProps) {
  const { sendTransaction, isLoading, showResultModal, result, closeModal } = useTransactionModal();
  const { address } = useWallet();

  const payoutCheck = canCollectPayout(auction, address || undefined);
  const nftCheck = canCollectNFT(auction, address || undefined);

  // Check if user participated but lost
  const userBids = address && auction.bids
    ? auction.bids.filter(bid => bid.bidderAddress.toLowerCase() === address.toLowerCase())
    : [];
  const hasUserBid = userBids.length > 0;
  const isWinner = auction.winningBid?.bidderAddress.toLowerCase() === address?.toLowerCase();
  const hasLost = hasUserBid && !isWinner;

  const handleCollectPayout = async () => {
    if (!payoutCheck.canCollect) {
      toast.error(payoutCheck.reason || 'Cannot collect payout');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCollectAuctionPayout({
        auctionId: BigInt(auction.auctionId),
      });

      await sendTransaction(tx, 'Payout collected successfully!');
      onSuccess?.();
    } catch (error: unknown) {
      const errorMsg = parseWeb3Error(error);
      toast.error(errorMsg);
      console.error('Collect payout error:', error);
    }
  };

  const handleCollectNFT = async () => {
    if (!nftCheck.canCollect) {
      toast.error(nftCheck.reason || 'Cannot collect NFT');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const tx = encodeCollectAuctionToken({
        auctionId: BigInt(auction.auctionId),
      });

      await sendTransaction(tx, 'NFT collected successfully!');
      onSuccess?.();
    } catch (error: unknown) {
      const errorMsg = parseWeb3Error(error);
      toast.error(errorMsg);
      console.error('Collect NFT error:', error);
    }
  };

  // If neither can be collected, show informational message
  if (!payoutCheck.canCollect && !nftCheck.canCollect) {
    // Show "You Lost" message for users who participated but didn't win
    if (hasLost) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p className="text-sm text-red-400 font-semibold mb-1">
                You Lost
              </p>
              <p className="text-xs text-gray-300">
                You were outbid in this auction. Better luck next time!
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Default "Auction Ended" message for non-participants
    return (
      <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-gray-400 font-semibold mb-1">
              Auction Ended
            </p>
            <p className="text-xs text-gray-500">
              {payoutCheck.reason || nftCheck.reason}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Collect Payout Button (Seller) */}
        {payoutCheck.canCollect && (
          <div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-3">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-green-400 font-semibold mb-1">
                    Payout Ready
                  </p>
                  <p className="text-xs text-gray-300">
                    Your auction has ended successfully. Collect your payout now!
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleCollectPayout}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={auction.isPayoutCollected}
            >
              {auction.isPayoutCollected ? 'Payout Collected' : 'Collect Payout'}
            </Button>
          </div>
        )}

        {/* Collect NFT Button (Winner) */}
        {nftCheck.canCollect && (
          <div>
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-3">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div>
                  <p className="text-sm text-primary-400 font-semibold mb-1">
                    You Won!
                  </p>
                  <p className="text-xs text-gray-300">
                    Congratulations! Collect your NFT now.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleCollectNFT}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={auction.isTokenCollected}
            >
              {auction.isTokenCollected ? 'NFT Collected' : 'Collect NFT'}
            </Button>
          </div>
        )}

        {/* Info Message */}
        {(payoutCheck.canCollect || nftCheck.canCollect) && (
          <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
            <p className="text-xs text-gray-400">
              Note: {payoutCheck.canCollect
                ? 'Platform fees have been deducted from your payout'
                : 'The NFT will be transferred to your wallet'}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Result Modal */}
      {result && (
        <TransactionResultModal
          isOpen={showResultModal}
          onClose={() => {
            closeModal();
            if (result.success) {
              onSuccess?.();
            }
          }}
          success={result.success}
          message={result.message}
          txHash={result.txHash}
        />
      )}
    </>
  );
}

/**
 * Compact version for smaller displays
 */
export function CompactAuctionCollectionButtons({
  auction,
  onSuccess,
}: AuctionCollectionButtonsProps) {
  const { sendTransaction, isLoading } = useTransactionModal();
  const { address } = useWallet();

  const payoutCheck = canCollectPayout(auction, address || undefined);
  const nftCheck = canCollectNFT(auction, address || undefined);

  if (!payoutCheck.canCollect && !nftCheck.canCollect) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {payoutCheck.canCollect && (
        <Button
          onClick={async () => {
            const tx = encodeCollectAuctionPayout({ auctionId: BigInt(auction.auctionId) });
            await sendTransaction(tx, 'Payout collected!');
            onSuccess?.();
          }}
          variant="primary"
          size="sm"
          isLoading={isLoading}
          disabled={auction.isPayoutCollected}
        >
          {auction.isPayoutCollected ? 'Collected' : 'Collect Payout'}
        </Button>
      )}

      {nftCheck.canCollect && (
        <Button
          onClick={async () => {
            const tx = encodeCollectAuctionToken({ auctionId: BigInt(auction.auctionId) });
            await sendTransaction(tx, 'NFT collected!');
            onSuccess?.();
          }}
          variant="primary"
          size="sm"
          isLoading={isLoading}
          disabled={auction.isTokenCollected}
        >
          {auction.isTokenCollected ? 'Collected' : 'Collect NFT'}
        </Button>
      )}
    </div>
  );
}
