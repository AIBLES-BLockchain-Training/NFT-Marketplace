'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface TimerContextValue {
  currentTime: number;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

/**
 * Timer Provider
 * Provides a shared timer that updates every second
 * All countdown components can subscribe to this instead of creating their own intervals
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TimerContext.Provider value={{ currentTime }}>
      {children}
    </TimerContext.Provider>
  );
}

/**
 * Hook to access shared timer
 */
export function useSharedTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    // Fallback to local time if not in provider
    return { currentTime: Date.now() };
  }
  return context;
}
