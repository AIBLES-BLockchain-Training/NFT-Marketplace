import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useWallet } from '../../hooks/useWallet';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { address, isConnected } = useWallet();

  // Auto-redirect admin to dashboard (with protection against infinite loop)
  useAdminRedirect(address, isConnected);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
