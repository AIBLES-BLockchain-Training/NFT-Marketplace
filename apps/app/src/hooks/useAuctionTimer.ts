import { useState, useEffect, useCallback, useRef } from 'react';
import { hasAuctionEnded, isAuctionEndingSoon, isAuctionFinalMinute } from '../lib/auction/status';

export interface TimeRemaining {
  total: number; // milliseconds
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
  isEndingSoon: boolean;
  isFinalMinute: boolean;
}

export interface UseAuctionTimerOptions {
  /** Update interval in milliseconds (default: 1000) */
  updateInterval?: number;
  /** Callback when auction ends */
  onEnd?: () => void;
  /** Callback when entering final minute */
  onFinalMinute?: () => void;
}

/**
 * Calculate time remaining for auction
 * @param endTime Auction end time (ISO string or timestamp)
 * @returns Time remaining object
 */
function calculateTimeRemaining(endTime: string | number): TimeRemaining {
  const endTimestamp = typeof endTime === 'string'
    ? new Date(endTime).getTime()
    : endTime;

  const now = Date.now();
  const diff = endTimestamp - now;

  if (diff <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isEnded: true,
      isEndingSoon: false,
      isFinalMinute: false,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    total: diff,
    days,
    hours,
    minutes,
    seconds,
    isEnded: false,
    isEndingSoon: isAuctionEndingSoon(endTime),
    isFinalMinute: isAuctionFinalMinute(endTime),
  };
}

/**
 * Hook to manage auction countdown timer
 * @param endTime Auction end time (ISO string or timestamp)
 * @param options Timer options
 * @returns Time remaining data and formatted string
 */
export function useAuctionTimer(
  endTime: string | number,
  options: UseAuctionTimerOptions = {}
) {
  const {
    updateInterval = 1000,
    onEnd,
    onFinalMinute,
  } = options;

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(endTime)
  );

  const prevEndedRef = useRef(false);
  const prevFinalMinuteRef = useRef(false);

  useEffect(() => {
    if (hasAuctionEnded(endTime)) {
      setTimeRemaining(calculateTimeRemaining(endTime));
      return;
    }

    const updateTimer = () => {
      const newTime = calculateTimeRemaining(endTime);
      setTimeRemaining(newTime);

      // Trigger onEnd callback
      if (newTime.isEnded && !prevEndedRef.current) {
        prevEndedRef.current = true;
        onEnd?.();
      }

      // Trigger onFinalMinute callback
      if (newTime.isFinalMinute && !prevFinalMinuteRef.current) {
        prevFinalMinuteRef.current = true;
        onFinalMinute?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, updateInterval);

    return () => clearInterval(interval);
  }, [endTime, updateInterval, onEnd, onFinalMinute]);

  return timeRemaining;
}

/**
 * Format time remaining for display
 * @param timeRemaining Time remaining object
 * @param format Format type
 * @returns Formatted time string
 */
export function formatTimeRemaining(
  timeRemaining: TimeRemaining,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  if (timeRemaining.isEnded) {
    return 'Ended';
  }

  const { days, hours, minutes, seconds } = timeRemaining;

  if (format === 'full') {
    // Format: "2d 15h 30m 45s" or "15h 30m 45s" or "30m 45s" or "45s"
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  if (format === 'long') {
    // Format: "2 days 15 hours" or "15 hours 30 minutes" or "30 minutes"
    if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  // Format: "2d 15h" or "15h 30m" or "30m 45s" (default short)
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Get color class based on time remaining
 * @param timeRemaining Time remaining object
 * @returns Tailwind color class
 */
export function getTimerColorClass(timeRemaining: TimeRemaining): string {
  if (timeRemaining.isEnded) {
    return 'text-gray-500';
  }
  if (timeRemaining.isFinalMinute) {
    return 'text-red-500';
  }
  if (timeRemaining.isEndingSoon) {
    return 'text-orange-500';
  }
  if (timeRemaining.total < 60 * 60 * 1000) { // Less than 1 hour
    return 'text-yellow-500';
  }
  return 'text-white';
}
