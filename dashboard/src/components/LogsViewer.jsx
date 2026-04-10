import React, { useState, useEffect } from 'react';
import { Terminal, Filter, CheckCircle2, ShieldAlert, Wifi } from 'lucide-react';

export default function LogsViewer() {
  const [filter, setFilter] = useState('All');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Polls the C++ backend for the specific global log history
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:8080/logs');
        if (res.ok) {
          const data = await res.json();
          // C++ server parses an array backwards from newest via push_front
          setLogs(data);
        }
      } catch (err) {
        // Backend inaccessible
      }
      setLoading(false);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1500); // Poll frequently
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
      if (filter === 'All') return true;
      if (filter === 'Success') return log.status === 200 || log.status === 204;
      if (filter === 'Error') return log.status !== 200 && log.status !== 204;
      return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-slate-900/60 border-b border-slate-700/50 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" /> C++ Network Logs
          {loading && <Wifi className="w-4 h-4 text-emerald-400 animate-pulse ml-2" />}
        </h3>
        
        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button 
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'All' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Traffic
          </button>
          <button 
            onClick={() => setFilter('Success')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'Success' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            200 OK
          </button>
          <button 
            onClick={() => setFilter('Error')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'Error' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 bg-[#090b10] p-6 overflow-auto font-mono text-sm leading-relaxed space-y-3">
        {logs.length === 0 && !loading && (
          <div className="text-slate-500 italic h-full flex items-center justify-center">
            Awaiting socket transactions...
          </div>
        )}
        
        {filteredLogs.map((log, index) => {
          const isSuccess = log.status === 200 || log.status === 204;
          return (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors rounded px-2">
              <div className="flex items-center gap-3 w-40 shrink-0">
                 {isSuccess ? 
                   <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : 
                   <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                 }
                 <span className="text-slate-500 text-xs">{log.time}</span>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                 <span className="text-indigo-400 font-bold">{log.method}</span>
                 <span className="text-slate-300 truncate">{log.endpoint}</span>
              </div>

              <div className="flex items-center gap-2 justify-end w-24 shrink-0">
                 <span className="text-slate-600">→</span>
                 <span className={`font-bold ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                   {log.status}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
