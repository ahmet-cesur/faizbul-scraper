import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BankRate } from '../types';

interface RateChartProps {
  data: BankRate[];
}

export const RateChart: React.FC<RateChartProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.interestRate - a.interestRate);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="bankName" 
            tick={{fontSize: 12, fill: '#6B7280'}} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{fontSize: 12, fill: '#6B7280'}} 
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip 
            cursor={{fill: '#F3F4F6'}}
            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
          />
          <Bar dataKey="interestRate" radius={[4, 4, 0, 0]} barSize={40}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};