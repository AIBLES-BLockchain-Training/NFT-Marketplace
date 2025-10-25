'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { useAdminCheck } from '../../hooks/useAdminCheck';
import { Button } from '../common/Button';
import { formatAddress } from '../../lib/web3/utils';
import { useState } from 'react';
import clsx from 'clsx';

export function Header() {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { isAdmin } = useAdminCheck();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/explore', label: 'Explore' },
    { href: '/collections', label: 'Collections' },
    { href: '/create', label: 'Create' },
  ];

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg bg-opacity-95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500" />
              <span className="text-xl font-bold gradient-text">AIBLES</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-dark-card text-primary-400'
                      : 'text-gray-400 hover:text-white hover:bg-dark-card'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && address ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/profile/${address}`}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary-500 transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                  <span className="text-sm font-medium">{formatAddress(address)}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connect} isLoading={isConnecting}>
                Connect Wallet
              </Button>
            )}

            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-dark-border">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-dark-card text-primary-400'
                    : 'text-gray-400 hover:text-white hover:bg-dark-card'
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
