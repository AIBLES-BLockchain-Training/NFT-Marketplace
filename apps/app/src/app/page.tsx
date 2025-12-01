'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <MainLayout>
      {/* Hero Section with Animations */}
      <section className="relative bg-gradient-to-br from-dark-bg via-dark-card to-dark-bg py-24 md:py-32 px-4 border-b border-dark-border overflow-hidden">
        <div className="w-full text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Animated heading */}
            <h1
              className={`text-5xl md:text-7xl font-bold mb-6 transition-all duration-1000 ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              <span className="gradient-text">Discover</span>{' '}
              <span className="text-white">Rare</span>{' '}
              <span className="gradient-text">NFTs</span>
            </h1>

            {/* Animated subtext */}
            <p
              className={`text-xl md:text-2xl text-gray-400 mb-4 transition-all duration-1000 delay-200 ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              The premier marketplace for unique digital collectibles
            </p>

            <p
              className={`text-base md:text-lg text-gray-500 mb-10 transition-all duration-1000 delay-300 ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              Trade, collect, and own exclusive NFTs on Ethereum
            </p>

            {/* Animated buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-500 ${
                mounted
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              <Link href="/explore">
                <Button
                  variant="primary"
                  size="lg"
                  className="group relative overflow-hidden"
                >
                  <span className="relative z-10">Explore NFTs</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </Button>
              </Link>
              <Link href="/collections">
                <Button
                  variant="secondary"
                  size="lg"
                  className="group hover:bg-dark-bg hover:scale-105 transition-all duration-300"
                >
                  View Collections
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Animated decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500 rounded-full blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary-400 rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="py-16 px-4 bg-dark-card border-b border-dark-border">
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'NFTs Listed', delay: '100' },
              { value: '2.5K+', label: 'Collections', delay: '200' },
              { value: '5K+', label: 'Active Users', delay: '300' },
              { value: '1.2K ETH', label: 'Trading Volume', delay: '400' },
            ].map((stat, index) => (
              <div
                key={index}
                className={`text-center transform transition-all duration-1000 delay-${stat.delay} hover:scale-110 ${
                  mounted
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
              >
                <div className="relative inline-block mb-2">
                  <p className="text-4xl font-bold gradient-text">{stat.value}</p>
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                <p className="text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works with Enhanced Design */}
      <section className="py-20 px-4 bg-dark-bg border-t border-dark-border">
        <div className="w-full">
          <div
            className={`text-center mb-16 transition-all duration-1000 delay-200 ${
              mounted
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Start your NFT journey in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                ),
                title: 'Connect Wallet',
                description: 'Connect your Ethereum wallet to start trading NFTs securely on the blockchain',
                delay: '300',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ),
                title: 'Browse & Discover',
                description: 'Explore thousands of unique NFTs across various collections and find your favorites',
                delay: '400',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                ),
                title: 'Buy & Sell',
                description: 'Trade NFTs with confidence using smart contracts and transparent pricing',
                delay: '500',
              },
            ].map((step, index) => (
              <div
                key={index}
                className={`group relative bg-dark-card border border-dark-border rounded-2xl p-8 hover:border-primary-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/20 delay-${step.delay} ${
                  mounted
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
              >
                {/* Number badge */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {step.icon}
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:gradient-text transition-all">
                  {step.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Decorative corner */}
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-primary-500/10 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-500/10 via-dark-card to-accent-500/10 border-t border-dark-border">
        <div className="w-full">
          <div
            className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-300 ${
              mounted
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Ready to Start Trading?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of collectors and traders in the world&apos;s most vibrant NFT marketplace
            </p>
            <Link href="/explore">
              <Button
                variant="primary"
                size="lg"
                className="group relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary-500/50 transition-all duration-300"
              >
                <span className="relative z-10 text-lg">Get Started Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-15px) translateX(5px);
          }
        }
      `}</style>
    </MainLayout>
  );
}
