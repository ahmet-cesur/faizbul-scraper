import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Bot } from 'lucide-react';
import { BankRate } from '../types';
import { analyzeRates } from '../services/geminiService';

interface AIAdvisorProps {
  rates: BankRate[];
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ rates }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    
    try {
      const result = await analyzeRates(rates, query);
      setResponse(result);
    } catch (e) {
      setResponse("An error occurred while fetching the analysis.");
    } finally {
      setLoading(false);
    }
  };

  const predefinedQuestions = [
    "Which bank gives the highest return for 100,000 TL?",
    "Is 32 days the best maturity option right now?",
    "Compare Garanti and Akbank rates"
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-2">
        <Sparkles className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-800">FaizBul AI Advisor</h3>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!response && !loading && (
          <div className="text-center py-8">
            <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot className="text-indigo-600" size={24} />
            </div>
            <p className="text-gray-500 text-sm mb-4">Ask me anything about current interest rates.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {predefinedQuestions.map((q, i) => (
                <button 
                  key={i}
                  onClick={() => setQuery(q)}
                  className="text-xs bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <span className="text-sm">Analyzing rates with Gemini...</span>
          </div>
        )}

        {response && (
          <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 text-gray-800 text-sm leading-relaxed">
             <div className="prose prose-sm max-w-none">
                 {/* Basic rendering of markdown-like text */}
                 {response.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                 ))}
             </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about rates..."
            className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <button 
            onClick={handleAsk}
            disabled={loading || !query}
            className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};