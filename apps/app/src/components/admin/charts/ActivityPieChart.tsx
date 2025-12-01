'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ActivityDataPoint } from '../../../hooks/useDashboardCharts';

interface ActivityPieChartProps {
  data: ActivityDataPoint[];
  isLoading?: boolean;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function ActivityPieChart({ data, isLoading }: ActivityPieChartProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Transaction Distribution</h3>
        <p className="text-gray-400 text-sm">Breakdown of marketplace activity by type</p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-gray-400">No activity data available</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value: number) => [`${value}%`, 'Share']}
          />
          <Legend 
            wrapperStyle={{ color: '#F3F4F6' }}
            iconType="circle"
          />
        </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}