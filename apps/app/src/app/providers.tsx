'use client';

import { ReactNode } from 'react';
import { Provider as UrqlProvider } from 'urql';
import { Toaster } from 'react-hot-toast';
import { graphqlClient } from '../lib/graphql/client';

export function Providers({ children }: { children: ReactNode }) {
  return (
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
  );
}
