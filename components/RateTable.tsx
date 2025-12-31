import React from 'react';
import { ArrowUpRight, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { BankRate } from '../types';

interface RateTableProps {
  rates: BankRate[];
}

export const RateTable: React.FC<RateTableProps> = ({ rates }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Interest Rate</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Maturity</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Min. Amount</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Benefits</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rates.map((rate) => (
            <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold overflow-hidden">
                    {rate.logoUrl ? <img src={rate.logoUrl} alt={rate.bankName} className="h-full w-full object-cover" /> : rate.bankName.substring(0, 2)}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{rate.bankName}</div>
                    <div className="text-xs text-gray-500">Updated {new Date(rate.lastUpdated).toLocaleTimeString()}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm font-bold text-gray-900">
                  <span className="text-lg text-emerald-600">{rate.interestRate}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {rate.maturityDays} Days
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {rate.minAmount > 0 ? `${rate.minAmount.toLocaleString()} TL` : 'None'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                 <div className="flex flex-wrap gap-1">
                    {rate.benefits.map((benefit, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {benefit}
                        </span>
                    ))}
                 </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" className="text-accent hover:text-blue-700 flex items-center justify-end gap-1">
                  Details <ArrowUpRight size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};