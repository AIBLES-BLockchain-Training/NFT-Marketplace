import { useState, useEffect } from 'react';
import { Auction } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatEth, formatAddress } from '../../lib/web3/utils';
import { formatUSDCFromLegacy, isUSDCCurrency } from '../../lib/utils/format';
import { truncate } from '../../lib/utils/format';
import { formatDistanceToNow } from 'date-fns';

interface AuctionCardProps {
  auction: Auction;
  onBid?: (auction: Auction) => void;
  onCancel?: (auction: Auction) => void;
  isOwner?: boolean;
}

export function AuctionCard({ auction, onBid, onCancel, isOwner }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const isActive = auction.status === 'CREATED' || auction.status === 'ACTIVE';
  const endTime = new Date(auction.endTime).getTime();
  const now = Date.now();
  const hasEnded = now >= endTime;

  useEffect(() => {
    if (hasEnded) {
      setTimeLeft('Ended');
      return;
    }

    const updateTimer = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime, hasEnded]);

  const minimumBidAmount = BigInt(auction.minimumBidAmount);
  const bidBufferBps = BigInt(auction.bidBufferBps);
  const currentBid = auction.bids?.[0] ? BigInt(auction.bids[0].bidAmount) : minimumBidAmount;
  const nextMinBid = currentBid + (currentBid * bidBufferBps / 10000n);
  
  // Get currency info
  const currencySymbol = auction.currency?.symbol || 'TOKEN';
  const isUSDC = isUSDCCurrency(auction.currency?.id || '');
  
  // Format price based on currency type
  const formatPrice = (amount: bigint) => {
    if (isUSDC) {
      return formatUSDCFromLegacy(amount, 2, false); // Don't show symbol, we add it separately
    }
    return formatEth(amount);
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                Auction
              </h3>
              <Badge variant={isActive && !hasEnded ? 'success' : 'secondary'}>
                {hasEnded ? 'ENDED' : auction.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono mb-1">
              ID: {truncate(auction.auctionId, 6, 4)}
            </p>
            <p className="text-sm text-gray-400">
              Started {formatDistanceToNow(new Date(auction.startTime), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Bid</p>
              <p className="text-xl font-bold text-primary-400">
                {formatPrice(currentBid)} {currencySymbol}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Time Left</p>
              <p className={`text-xl font-bold ${hasEnded ? 'text-gray-500' : 'text-white'}`}>
                {timeLeft}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Minimum Bid</p>
            <p className="text-sm font-semibold text-white">
              {formatPrice(minimumBidAmount)} {currencySymbol}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Next Min Bid</p>
            <p className="text-sm font-semibold text-white">
              {formatPrice(nextMinBid)} {currencySymbol}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Quantity</p>
            <p className="text-sm font-semibold text-white">
              {auction.quantity}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Auctioneer</p>
            <p className="text-xs font-mono text-primary-400">
              {formatAddress(auction.seller.id)}
            </p>
          </div>
        </div>

        {auction.bids && auction.bids.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Leading Bidder</p>
            <p className="text-sm font-mono text-white">
              {formatAddress(auction.bids[0]?.bidder?.id || '')}
            </p>
          </div>
        )}

        {isActive && !hasEnded && (
          <div className="flex gap-2 pt-4 border-t border-dark-border">
            {isOwner ? (
              <Button
                onClick={() => onCancel?.(auction)}
                variant="secondary"
                fullWidth
              >
                Cancel Auction
              </Button>
            ) : (
              <Button
                onClick={() => onBid?.(auction)}
                variant="primary"
                fullWidth
              >
                Place Bid
              </Button>
            )}
          </div>
        )}

        {hasEnded && auction.bids && auction.bids.length > 0 && (
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm text-gray-400 text-center">
              Auction ended - Winner: {formatAddress(auction.bids[0]?.bidder?.id || '')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
