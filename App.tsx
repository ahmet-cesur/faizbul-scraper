import React, { useState, useEffect } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { RateChart } from './components/RateChart';
import { RateTable } from './components/RateTable';
import { AIAdvisor } from './components/AIAdvisor';
import { ScraperLogs } from './components/ScraperLogs';
import { MOCK_RATES, MOCK_LOGS } from './services/mockData';
import { fetchSheetData } from './services/sheetService';
import { getRateInsights } from './services/geminiService';
import { TrendingUp, Database, AlertCircle, ExternalLink } from 'lucide-react';
import { BankRate } from './types';

export default function App() {
  const [rates, setRates] = useState<BankRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [logs] = useState(MOCK_LOGS);
  const [insight, setInsight] = useState<{marketTrend?: string, topPick?: string}>({});

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      
      // 1. Try to fetch real data from Google Sheet
      const sheetRates = await fetchSheetData();
      
      let finalRates = [];
      if (sheetRates.length > 0) {
        finalRates = sheetRates;
        setUsingMockData(false);
      } else {
        // 2. Fallback to Mock Data
        finalRates = MOCK_RATES;
        setUsingMockData(true);
      }
      
      setRates(finalRates);
      
      // 3. Generate AI Insights based on whatever data we have
      if (process.env.API_KEY) {
          const data = await getRateInsights(finalRates);
          setInsight(data);
      } else {
          setInsight({ marketTrend: "High Interest Environment", topPick: "ON Dijital (52%)" });
      }
      
      setLoading(false);
    };

    initData();
  }, []);

  const avgRate = rates.length > 0 ? (rates.reduce((acc, curr) => acc + curr.interestRate, 0) / rates.length).toFixed(1) : '0';
  const maxRate = rates.length > 0 ? Math.max(...rates.map(r => r.interestRate)) : '0';

  return (
    <div className="min-h-screen pb-12">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* API Key Warning */}
        {!process.env.API_KEY && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            Gemini API Key is missing. AI features will use simulated responses.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Data Source Warning */}
        {usingMockData && !loading && (
             <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md flex justify-between items-center">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Database className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>Viewing Demo Data.</strong> To connect your real Google Sheet, ensure it is "Published to Web" as CSV.
                        </p>
                    </div>
                </div>
                <a 
                  href="https://docs.google.com/spreadsheets/d/1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY/edit" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                    Open Sheet <ExternalLink size={12}/>
                </a>
            </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Rate</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{avgRate}%</h3>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                <TrendingUp size={16} className="mr-1" />
                <span>Active Market Analysis</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
             <div>
              <p className="text-sm font-medium text-gray-500">Highest Available</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{maxRate}%</h3>
            </div>
             <div className="mt-4 text-sm text-gray-600">
                Top Pick: <span className="font-semibold text-accent">{insight.topPick || (loading ? 'Analyzing...' : 'N/A')}</span>
            </div>
          </div>

           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
             <div>
              <p className="text-sm font-medium text-gray-500">Active Banks Scraped</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{rates.length}</h3>
            </div>
             <div className="mt-4 flex items-center text-sm text-gray-500">
                <Database size={16} className="mr-1" />
                <span>{usingMockData ? 'Mock Database' : 'Live Google Sheet'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Rate Comparison</h2>
            <div className="flex-1 min-h-[300px]">
               {loading ? (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">Loading data...</div>
               ) : (
                 <RateChart data={rates} />
               )}
            </div>
          </div>

          {/* AI Advisor Section */}
          <div className="lg:col-span-1 h-[500px]">
            <AIAdvisor rates={rates} />
          </div>
        </div>

        {/* Bottom Section: Table & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Detailed Bank Rates</h2>
                    <a href="https://docs.google.com/spreadsheets/d/1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY/edit" target="_blank" className="text-sm text-accent hover:underline flex items-center gap-1">
                        View Source <ExternalLink size={12}/>
                    </a>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading table data...</div>
                ) : (
                    <RateTable rates={rates} />
                )}
            </div>

            <div className="lg:col-span-1">
                <ScraperLogs logs={logs} />
            </div>
        </div>
      </main>
    </div>
  );
}