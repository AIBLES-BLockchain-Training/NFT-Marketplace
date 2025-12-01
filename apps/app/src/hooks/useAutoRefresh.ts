import { useEffect, useRef } from 'react';

export interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onRefresh?: () => void | Promise<void>;
}

/**
 * Auto-refresh hook
 * Automatically calls refresh function at specified intervals
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const {
    enabled = true,
    interval = 10000, // Default 10 seconds
    onRefresh,
  } = options;

  const refreshFnRef = useRef(onRefresh);

  // Update ref when callback changes
  useEffect(() => {
    refreshFnRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !refreshFnRef.current) {
      return;
    }

    const intervalId = setInterval(() => {
      refreshFnRef.current?.();
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval]);
}
