'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Provider as UrqlProvider } from 'urql';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { graphqlClient } from '../lib/graphql/client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Safety: Ensure body overflow is always restored on app mount/reload
  useEffect(() => {
    // Force restore scroll on initial mount (handles page reload scenarios)
    if (typeof window !== 'undefined' && document.body.style.overflow === 'hidden') {
      console.warn('[Providers] Found body with overflow:hidden on mount, restoring scroll');
      document.body.style.overflow = 'unset';
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UrqlProvider value={graphqlClient}>
        {children}
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#141b34',
            color: '#fff',
            border: '1px solid #1e293b',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      </UrqlProvider>
    </QueryClientProvider>
  );
}
