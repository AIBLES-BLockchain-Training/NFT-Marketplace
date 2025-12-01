'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserGrowthDataPoint } from '../../../hooks/useDashboardCharts';

interface UserGrowthChartProps {
  data: UserGrowthDataPoint[];
  isLoading?: boolean;
}

export function UserGrowthChart({ data, isLoading }: UserGrowthChartProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">User Growth Analytics</h3>
        <p className="text-gray-400 text-sm">Monthly user registration and activity metrics</p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">No user data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
          />
          <Legend />
          <Bar 
            dataKey="newUsers" 
            fill="#3B82F6" 
            name="New Users"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="activeUsers" 
            fill="#10B981" 
            name="Active Users"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}