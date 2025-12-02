'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VolumeDataPoint } from '../../../hooks/useDashboardCharts';

interface VolumeAreaChartProps {
  data: VolumeDataPoint[];
  isLoading?: boolean;
}

export function VolumeAreaChart({ data, isLoading }: VolumeAreaChartProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Weekly Trading Volume</h3>
        <p className="text-gray-400 text-sm">Daily trading volume and transaction count</p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">No volume data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="day" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value: number, name: string) => [
              name === 'volume' ? `$${value}` : `${value}`,
              name === 'volume' ? 'Volume (USD)' : 'Transactions'
            ]}
          />
          <Area 
            type="monotone" 
            dataKey="volume" 
            stroke="#3B82F6" 
            fillOpacity={1} 
            fill="url(#colorVolume)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="transactions" 
            stroke="#10B981" 
            fillOpacity={1} 
            fill="url(#colorTransactions)" 
            strokeWidth={2}
          />
        </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}