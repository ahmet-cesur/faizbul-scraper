import React from 'react';
import { X, Rocket, Github, Globe } from 'lucide-react';

interface DeploymentGuideProps {
  onClose: () => void;
}

export const DeploymentGuide: React.FC<DeploymentGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Rocket className="text-accent" />
            <h2 className="text-xl font-bold text-gray-900">How to Publish Your Website</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
            <strong>Tip:</strong> This dashboard is currently running in a local-like environment. To make it accessible to everyone on the internet (e.g., <code>faizbul.com</code>), follow these steps.
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Github size={16} /> Push to GitHub
              </h3>
              <p className="text-gray-600 text-sm">
                Create a new repository on GitHub and upload these files.
              </p>
              <div className="bg-gray-900 text-gray-300 p-3 rounded-md text-xs font-mono">
                git init<br/>
                git add .<br/>
                git commit -m "Initial commit"<br/>
                git branch -M main<br/>
                git remote add origin https://github.com/YOUR_USERNAME/faizbul-dashboard.git<br/>
                git push -u origin main
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe size={16} /> Deploy on Vercel (Free)
              </h3>
              <p className="text-gray-600 text-sm">
                Vercel is the easiest way to host React apps.
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-1">
                <li>Go to <a href="https://vercel.com/new" target="_blank" className="text-accent hover:underline">vercel.com/new</a>.</li>
                <li>Import your <strong>faizbul-dashboard</strong> repository.</li>
                <li>In the "Environment Variables" section, add your Gemini API Key:
                  <div className="mt-1 pl-4 border-l-2 border-gray-200">
                    <code>API_KEY</code> = <code>your_gemini_api_key_here</code>
                  </div>
                </li>
                <li>Click <strong>Deploy</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Connect Google Sheets</h3>
              <p className="text-gray-600 text-sm">
                To ensure this dashboard reads your live data without a backend server:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-1">
                <li>Open your Google Sheet.</li>
                <li>Go to <strong>File &gt; Share &gt; Publish to web</strong>.</li>
                <li>Choose <strong>Entire Document</strong> and <strong>Comma-separated values (.csv)</strong>.</li>
                <li>Click <strong>Publish</strong>.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2">
                This allows the dashboard to fetch the latest rates every time a user visits the site.
              </p>
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};