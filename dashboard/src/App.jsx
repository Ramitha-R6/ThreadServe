import React, { useState, useEffect } from 'react';
import { Activity, Terminal, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ApiTester from './components/ApiTester';
import LogsViewer from './components/LogsViewer';
import SecurityLogs from './components/SecurityLogs';
import Login from './components/Login';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  // Lock UI permanently in dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogin = (jwt) => {
    localStorage.setItem('adminToken', jwt);
    setToken(jwt);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
      <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
        
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-xl z-20 transition-colors duration-300">
          <div className="p-6 pb-2 border-b border-slate-200 dark:border-slate-700/50">
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-6 h-6" />
              Server Monitor
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-2 ml-8 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span> App Secured
            </p>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Analytics Display
            </button>
            <button 
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'api' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Activity className="w-5 h-5" /> Network Toolkit
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Terminal className="w-5 h-5" /> Process Traffic Logs
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400'}`}
            >
              <Shield className="w-5 h-5" /> Threat Telemetry
            </button>
          </nav>

          <div className="p-4 mt-auto border-t border-slate-700/50">
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm font-semibold"
             >
               <LogOut className="w-4 h-4" /> Sign Out Environment
             </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 transition-colors duration-300">
          <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 shrink-0 shadow-sm relative z-20">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-inner">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Bound to Multi-Core C++ Engine
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto h-full relative z-10">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'api' && <ApiTester />}
              {activeTab === 'logs' && <LogsViewer />}
              {activeTab === 'security' && <SecurityLogs />}
            </div>
          </main>
        </div>
      </div>
  );
}

export default App;
