import React from 'react';
import { Terminal, Check, X, Clock } from 'lucide-react';
import { ScraperLog } from '../types';

interface ScraperLogsProps {
  logs: ScraperLog[];
}

export const ScraperLogs: React.FC<ScraperLogsProps> = ({ logs }) => {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden text-gray-300 font-mono text-sm h-full flex flex-col">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal size={14} />
          <span className="font-semibold">Scraper Execution Log</span>
        </div>
        <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="p-4 overflow-y-auto max-h-[300px] space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
             <div className="flex-shrink-0 mt-0.5">
                {log.status === 'SUCCESS' && <Check size={14} className="text-green-500" />}
                {log.status === 'FAILURE' && <X size={14} className="text-red-500" />}
                {log.status === 'PENDING' && <Clock size={14} className="text-yellow-500" />}
             </div>
             <div>
                <span className="text-gray-500 text-xs block mb-0.5">{new Date(log.timestamp).toLocaleString()}</span>
                <p className={`${log.status === 'FAILURE' ? 'text-red-400' : 'text-gray-300'}`}>
                    {log.message}
                </p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};