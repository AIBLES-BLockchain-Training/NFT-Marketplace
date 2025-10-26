'use client';

import Link from 'next/link';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';

export default function HomePage() {

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-dark-bg via-dark-card to-dark-bg py-20 px-4 border-b border-dark-border">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-6">
              Discover, Collect, and Trade NFTs
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              The premier decentralized marketplace for unique digital assets on Ethereum
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/explore">
                <Button variant="primary" size="lg">
                  Explore NFTs
                </Button>
              </Link>
              <Link href="/collections">
                <Button variant="secondary" size="lg">
                  View Collections
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-[128px] opacity-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500 rounded-full blur-[128px] opacity-10" />
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-dark-card border-b border-dark-border">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-400 mb-2">10K+</p>
              <p className="text-gray-400">NFTs Listed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-400 mb-2">2.5K+</p>
              <p className="text-gray-400">Collections</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-400 mb-2">5K+</p>
              <p className="text-gray-400">Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-400 mb-2">1.2K ETH</p>
              <p className="text-gray-400">Trading Volume</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-dark-card border-y border-dark-border">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
              <p className="text-gray-400">
                Connect your Ethereum wallet to start buying and selling NFTs
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Browse & Discover</h3>
              <p className="text-gray-400">
                Explore thousands of unique NFTs from various collections
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Buy & Sell</h3>
              <p className="text-gray-400">
                Trade NFTs securely with smart contracts on the blockchain
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
