import { useState } from 'react';
import Link from 'next/link';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { NFTImage } from '../common/NFTImage';
import { LargeCountdownTimer } from './CountdownTimer';
import { BidHistory } from './BidHistory';
import { BidModal } from './BidModal';
import { AuctionCollectionButtons } from './AuctionCollectionButtons';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useWallet } from '../../hooks/useWallet';
import { useCancelAuction } from '../../hooks/useCancelAuction';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { formatUSDCFromLegacy, isUSDCCurrency } from '../../lib/utils/format';
import { isAuctionActive, hasAuctionEnded, getAuctionStatusText, getAuctionStatusVariant } from '../../lib/auction/status';
import { Auction } from '../../types';

export interface AuctionDetailModalProps {
  auction: Auction;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onPlaceBid?: () => void;
}

/**
 * Auction Detail Modal Component
 * Full-featured modal displaying all auction information, bidding interface, and history
 */
export function AuctionDetailModal({
  auction,
  isOpen,
  onClose,
  onRefresh,
  onPlaceBid,
}: AuctionDetailModalProps) {
  const { address } = useWallet();
  const [showBidModal, setShowBidModal] = useState(false);
  const { cancelAuction, isCancelling, canCancel, cancelReason } = useCancelAuction(auction, onRefresh);

  // Auto-refresh every 10 seconds when auction is active
  useAutoRefresh({
    enabled: isOpen && isAuctionActive(auction),
    interval: 10000,
    onRefresh,
  });

  const isOwner = address?.toLowerCase() === auction.sellerAddress.toLowerCase();
  const isActive = isAuctionActive(auction);
  
  // Check if this is USDC currency
  const isUSDC = isUSDCCurrency(auction.currency?.id || '');
  
  // Helper function to format currency based on type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDCFromLegacy(amount, 2, false); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };
  const hasEnded = hasAuctionEnded(auction.endTime);

  const currentBid = auction.winningBid
    ? BigInt(auction.winningBid.bidAmount)
    : BigInt(auction.startPrice);

  const handleBidSuccess = () => {
    // Refresh auction data after successful bid
    // This will be called when TransactionResultModal closes
    onRefresh?.();
  };

  const statusText = getAuctionStatusText(auction);
  const statusVariant = getAuctionStatusVariant(auction);

  return (
    <ErrorBoundary>
      <Modal
        isOpen={isOpen && !showBidModal}
        onClose={onClose}
        title=""
        size="2xl"
        zIndex="z-50"
        aria-label="Auction details"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - NFT Display */}
          <div>
            {/* NFT Image */}
            <div className="aspect-square bg-dark-bg rounded-2xl overflow-hidden mb-4 relative">
              <NFTImage
                src={auction.nft.imageUrl}
                alt={auction.nft.name}
                className="object-cover"
                width={800}
                priority
              />

              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <Badge variant={statusVariant} size="lg">
                  {statusText}
                </Badge>
              </div>
            </div>

            {/* NFT Info */}
            <div className="mb-6">
              <Link
                href={`/collection/${auction.nft.collection.id}`}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors mb-2 inline-block"
              >
                {auction.nft.collection.name}
              </Link>
              <h2 className="text-3xl font-bold text-white mb-2">
                {auction.nft.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Owned by</span>
                <Link
                  href={`/profile/${auction.sellerAddress}`}
                  className="text-primary-400 hover:text-primary-300 font-mono"
                >
                  {formatAddress(auction.sellerAddress)}
                </Link>
              </div>
            </div>

            {/* Auction Details Card */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Auction Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Start Price</p>
                  <p className="text-sm font-semibold text-white">
                    {formatPrice(BigInt(auction.startPrice))} {auction.currency.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Min Step</p>
                  <p className="text-sm font-semibold text-white">
                    +{(Number(auction.bidBufferBps) / 100).toFixed(1)}%
                  </p>
                </div>
                {auction.ceilingPrice && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Buyout Price</p>
                    <p className="text-sm font-semibold text-primary-400">
                      {formatPrice(BigInt(auction.ceilingPrice))} {auction.currency.symbol}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Time Buffer</p>
                  <p className="text-sm font-semibold text-white">
                    {auction.timeBufferInSeconds} seconds
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Quantity</p>
                  <p className="text-sm font-semibold text-white">
                    {auction.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Token Type</p>
                  <p className="text-sm font-semibold text-white">
                    {auction.tokenType}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Currency</p>
                  <p className="text-sm font-semibold text-white">
                    {auction.currency.name} ({auction.currency.symbol})
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {auction.currency.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Bidding Interface */}
          <div className="flex flex-col">
            {/* Countdown Timer */}
            <div className="mb-6">
              <LargeCountdownTimer
                endTime={auction.endTime}
                onEnd={onRefresh}
              />
            </div>

            {/* Current Bid Display */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-400 mb-2">Current Bid</p>
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-4xl font-bold text-primary-400">
                  {formatPrice(currentBid)}
                </p>
                <p className="text-xl text-gray-400">{auction.currency.symbol}</p>
              </div>

              {/* TODO: Add USD conversion when price feed is available */}
              {/* <p className="text-sm text-gray-500 mb-4">
                Approximately $XX,XXX USD
              </p> */}

              {auction.winningBid && (
                <div className="pt-3 border-t border-dark-border">
                  <p className="text-xs text-gray-400 mb-1">Leading Bidder</p>
                  <Link
                    href={`/profile/${auction.winningBid.bidderAddress}`}
                    className="text-sm font-mono text-primary-400 hover:text-primary-300"
                  >
                    {formatAddress(auction.winningBid.bidderAddress)}
                  </Link>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isActive && !isOwner && (
              <Button
                onClick={() => setShowBidModal(true)}
                variant="primary"
                size="lg"
                fullWidth
                className="mb-6"
              >
                Place Bid
              </Button>
            )}

            {isActive && isOwner && canCancel && (
              <Button
                onClick={() => cancelAuction(auction)}
                variant="secondary"
                size="lg"
                fullWidth
                isLoading={isCancelling}
                className="mb-6"
              >
                Cancel Auction
              </Button>
            )}

            {isActive && isOwner && !canCancel && cancelReason && (
              <div className="mb-6 p-3 bg-dark-bg border border-dark-border rounded-lg">
                <p className="text-xs text-gray-400">
                  Warning: {cancelReason}
                </p>
              </div>
            )}

            {/* Collection Buttons (if auction ended) */}
            {hasEnded && (
              <div className="mb-6">
                <AuctionCollectionButtons
                  auction={auction}
                  onSuccess={onRefresh}
                />
              </div>
            )}

            {/* Important Notes */}
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-400 font-semibold mb-2">
                Important Notes:
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• If you are outbid, your previous bid will be refunded automatically</li>
                <li>• Bids placed in the last {auction.timeBufferInSeconds} seconds extend the auction</li>
                {!isOwner && <li>• Winner must collect NFT after auction ends</li>}
                {isOwner && <li>• Seller must collect payout after auction ends</li>}
              </ul>
            </div>

            {/* Bid History */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <BidHistory
                bids={auction.bids || []}
                currency={auction.currency}
                startPrice={auction.startPrice}
                initialDisplayCount={5}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Bid Modal */}
      {showBidModal && (
        <BidModal
          auction={auction}
          isOpen={showBidModal}
          onClose={() => setShowBidModal(false)}
          onSuccess={handleBidSuccess}
        />
      )}
    </ErrorBoundary>
  );
}
