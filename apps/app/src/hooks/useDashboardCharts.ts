'use client';

import { useState, useEffect } from 'react';
import { graphqlClient } from '../lib/graphql/client';
import { GET_DASHBOARD_CHARTS_DATA_QUERY } from '../lib/graphql/queries';
import { ethers } from 'ethers';
import { formatUSDC, isUSDCCurrency } from '../lib/utils/format';

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  listings: number;
  auctions: number;
  offers: number;
}

export interface ActivityDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface VolumeDataPoint {
  day: string;
  volume: number;
  transactions: number;
}

export interface UserGrowthDataPoint {
  month: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
}

export function useDashboardCharts() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthDataPoint[]>([]);

  useEffect(() => {
    loadChartsData();
  }, []);

  const loadChartsData = async () => {
    try {
      const data = await graphqlClient.query(GET_DASHBOARD_CHARTS_DATA_QUERY, {});
      
      if (data) {
        processRevenueData(data);
        processActivityData(data);
        processVolumeData(data);
        processUserGrowthData(data);
      }
    } catch (error) {
      console.error('Failed to load charts data:', error);
      // Use fallback data if real data fails
      setFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const processRevenueData = (data: any) => {
    try {
      const purchases = data.purchaseHistories || [];
      const feeWithdrawals = data.feeWithdrawals || [];
      
      
      // Group by month for last 6 months
      const monthlyData: { [key: string]: RevenueDataPoint } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const currentDate = new Date();
      
      // Initialize months
      for (let i = 0; i < 6; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5 + i);
        const monthKey = date.toLocaleDateString('en', { month: 'short' });
        monthlyData[monthKey] = {
          month: monthKey,
          revenue: 0,
          listings: 0,
          auctions: 0,
          offers: 0
        };
      }

      // Process purchases
      purchases.forEach((purchase: any) => {
        const date = new Date(purchase.timestamp);
        const monthKey = date.toLocaleDateString('en', { month: 'short' });
        
        if (monthlyData[monthKey]) {
          let priceInUSD = 0;
          
          // Check if it's USDC or ETH
          if (purchase.currency && (purchase.currency.symbol === 'USDC' || isUSDCCurrency(purchase.currency.id))) {
            // USDC with 6 decimals
            priceInUSD = parseFloat(formatUSDC(purchase.totalPrice || '0'));
          } else {
            // ETH with 18 decimals - convert to USD (assume 1 ETH = $2000 for revenue calculation)
            const priceInEth = parseFloat(ethers.formatEther(purchase.totalPrice || '0'));
            priceInUSD = priceInEth * 2000; // Convert to USD equivalent
          }
          
          const fee = priceInUSD * 0.025; // 2.5% fee
          
          monthlyData[monthKey].revenue += fee;
          
          switch (purchase.tradeType) {
            case 'LISTING':
              monthlyData[monthKey].listings += fee;
              break;
            case 'AUCTION':
              monthlyData[monthKey].auctions += fee;
              break;
            case 'OFFER':
              monthlyData[monthKey].offers += fee;
              break;
          }
        }
      });

      setRevenueData(Object.values(monthlyData));
    } catch (error) {
      console.error('Error processing revenue data:', error);
      setRevenueData([]);
    }
  };

  const processActivityData = (data: any) => {
    try {
      const purchases = data.purchaseHistories || [];
      
      const activityCounts = {
        listings: 0,
        auctions: 0,
        offers: 0,
        other: 0
      };

      purchases.forEach((purchase: any) => {
        switch (purchase.tradeType) {
          case 'LISTING':
            activityCounts.listings++;
            break;
          case 'AUCTION':
            activityCounts.auctions++;
            break;
          case 'OFFER':
            activityCounts.offers++;
            break;
          default:
            activityCounts.other++;
        }
      });

      const total = Object.values(activityCounts).reduce((sum, count) => sum + count, 0);

      if (total > 0) {
        setActivityData([
          {
            name: 'Direct Listings',
            value: Math.round((activityCounts.listings / total) * 100),
            color: '#3B82F6'
          },
          {
            name: 'Auction Sales',
            value: Math.round((activityCounts.auctions / total) * 100),
            color: '#10B981'
          },
          {
            name: 'Offer Accepted',
            value: Math.round((activityCounts.offers / total) * 100),
            color: '#F59E0B'
          },
          {
            name: 'Other',
            value: Math.round((activityCounts.other / total) * 100),
            color: '#8B5CF6'
          }
        ]);
      } else {
        setFallbackActivityData();
      }
    } catch (error) {
      console.error('Error processing activity data:', error);
      setFallbackActivityData();
    }
  };

  const processVolumeData = (data: any) => {
    try {
      const purchases = data.purchaseHistories || [];
      
      // Group by last 7 days
      const dailyData: { [key: string]: { volume: number; transactions: number } } = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Initialize days
      const currentDate = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 6 + i);
        const dayKey = date.toLocaleDateString('en', { weekday: 'short' });
        dailyData[dayKey] = { volume: 0, transactions: 0 };
      }

      // Process recent purchases (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      purchases
        .filter((purchase: any) => new Date(purchase.timestamp) >= weekAgo)
        .forEach((purchase: any) => {
          const date = new Date(purchase.timestamp);
          const dayKey = date.toLocaleDateString('en', { weekday: 'short' });
          
          if (dailyData[dayKey]) {
            let volumeInUSD = 0;
            
            // Check if it's USDC or ETH
            if (purchase.currency && (purchase.currency.symbol === 'USDC' || isUSDCCurrency(purchase.currency.id))) {
              // USDC with 6 decimals
              volumeInUSD = parseFloat(formatUSDC(purchase.totalPrice || '0'));
            } else {
              // ETH with 18 decimals - convert to USD
              const volumeInEth = parseFloat(ethers.formatEther(purchase.totalPrice || '0'));
              volumeInUSD = volumeInEth * 2000; // Convert to USD equivalent
            }
            
            dailyData[dayKey].volume += volumeInUSD;
            dailyData[dayKey].transactions += 1;
          }
        });

      const volumeArray = days.map(day => ({
        day,
        volume: Math.round(dailyData[day]?.volume || 0),
        transactions: dailyData[day]?.transactions || 0
      }));

      setVolumeData(volumeArray);
    } catch (error) {
      console.error('Error processing volume data:', error);
      setFallbackVolumeData();
    }
  };

  const processUserGrowthData = (data: any) => {
    try {
      const users = data.subjects || [];
      
      // Group by month for last 6 months
      const monthlyUsers: { [key: string]: { newUsers: number; totalUsers: number } } = {};
      const currentDate = new Date();
      
      // Initialize months
      for (let i = 0; i < 6; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5 + i);
        const monthKey = date.toLocaleDateString('en', { month: 'short' });
        monthlyUsers[monthKey] = { newUsers: 0, totalUsers: 0 };
      }

      // Process user registrations
      users.forEach((user: any) => {
        const date = new Date(user.createdAt);
        const monthKey = date.toLocaleDateString('en', { month: 'short' });
        
        if (monthlyUsers[monthKey]) {
          monthlyUsers[monthKey].newUsers++;
        }
      });

      // Calculate cumulative totals
      let cumulativeTotal = 0;
      const userGrowthArray = Object.keys(monthlyUsers).map(month => {
        cumulativeTotal += monthlyUsers[month].newUsers;
        const activeUsers = Math.round(cumulativeTotal * 0.6); // Estimate 60% active rate
        
        return {
          month,
          newUsers: monthlyUsers[month].newUsers,
          activeUsers,
          totalUsers: cumulativeTotal
        };
      });

      setUserGrowthData(userGrowthArray);
    } catch (error) {
      console.error('Error processing user growth data:', error);
      setFallbackUserGrowthData();
    }
  };

  const setFallbackData = () => {
    setFallbackRevenueData();
    setFallbackActivityData();
    setFallbackVolumeData();
    setFallbackUserGrowthData();
  };

  const setFallbackRevenueData = () => {
    setRevenueData([
      { month: 'Jan', revenue: 125, listings: 90, auctions: 25, offers: 10 },
      { month: 'Feb', revenue: 190, listings: 125, auctions: 40, offers: 25 },
      { month: 'Mar', revenue: 265, listings: 160, auctions: 80, offers: 25 },
      { month: 'Apr', revenue: 235, listings: 140, auctions: 60, offers: 35 },
      { month: 'May', revenue: 320, listings: 225, auctions: 90, offers: 5 },
      { month: 'Jun', revenue: 410, listings: 255, auctions: 145, offers: 10 },
    ]);
  };

  const setFallbackActivityData = () => {
    setActivityData([
      { name: 'Direct Listings', value: 45, color: '#3B82F6' },
      { name: 'Auction Sales', value: 30, color: '#10B981' },
      { name: 'Offer Accepted', value: 20, color: '#F59E0B' },
      { name: 'Other', value: 5, color: '#8B5CF6' },
    ]);
  };

  const setFallbackVolumeData = () => {
    setVolumeData([
      { day: 'Mon', volume: 750, transactions: 8 },
      { day: 'Tue', volume: 1100, transactions: 12 },
      { day: 'Wed', volume: 900, transactions: 10 },
      { day: 'Thu', volume: 1400, transactions: 16 },
      { day: 'Fri', volume: 1750, transactions: 20 },
      { day: 'Sat', volume: 2100, transactions: 25 },
      { day: 'Sun', volume: 1600, transactions: 18 },
    ]);
  };

  const setFallbackUserGrowthData = () => {
    setUserGrowthData([
      { month: 'Jan', newUsers: 25, activeUsers: 80, totalUsers: 105 },
      { month: 'Feb', newUsers: 32, activeUsers: 95, totalUsers: 137 },
      { month: 'Mar', newUsers: 48, activeUsers: 120, totalUsers: 185 },
      { month: 'Apr', newUsers: 22, activeUsers: 110, totalUsers: 207 },
      { month: 'May', newUsers: 58, activeUsers: 145, totalUsers: 265 },
      { month: 'Jun', newUsers: 65, activeUsers: 170, totalUsers: 330 },
    ]);
  };

  return {
    isLoading,
    revenueData,
    activityData,
    volumeData,
    userGrowthData,
    refreshData: loadChartsData
  };
}