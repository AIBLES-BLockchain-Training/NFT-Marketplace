'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RevenueDataPoint } from '../../../hooks/useDashboardCharts';

interface RevenueChartProps {
  data: RevenueDataPoint[];
  isLoading?: boolean;
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Revenue Trends</h3>
        <p className="text-gray-400 text-sm">Monthly revenue breakdown by marketplace features</p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">No revenue data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value: number) => [`$${value}`, '']}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3B82F6" 
            strokeWidth={3}
            name="Total Revenue"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="listings" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Listings"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="auctions" 
            stroke="#F59E0B" 
            strokeWidth={2}
            name="Auctions"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="offers" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            name="Offers"
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
          />
        </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}