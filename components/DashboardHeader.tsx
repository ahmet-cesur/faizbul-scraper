import React, { useState } from 'react';
import { RefreshCw, CheckCircle, CloudLightning, Rocket } from 'lucide-react';
import { DeploymentGuide } from './DeploymentGuide';

export const DashboardHeader: React.FC = () => {
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-lg text-accent">
            <CloudLightning size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FaizBul Dashboard</h1>
            <p className="text-xs text-gray-500">Scraper Status Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          
          <button 
            onClick={() => setShowDeployGuide(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Rocket size={14} />
            <span>Deploy</span>
          </button>

          <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

          <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                  <CheckCircle size={14} />
                  <span>System Active</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                  <RefreshCw size={14} />
                  <span>Next Run: 2h 14m</span>
              </div>
          </div>
        </div>
      </div>
      
      {showDeployGuide && <DeploymentGuide onClose={() => setShowDeployGuide(false)} />}
    </>
  );
};