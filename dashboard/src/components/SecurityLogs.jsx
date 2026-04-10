import React, { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, MapPin, Search } from 'lucide-react';

export default function SecurityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:8080/security');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
      
      <div className="bg-red-50 dark:bg-slate-900/60 border-b border-red-100 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300">
        <div>
           <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
             <ShieldAlert className="w-6 h-6" /> Threat Detection Feed
           </h3>
           <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-8">Monitoring Authentication Brute-Forcing & Anti-DDoS Layer blocks</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Trace host IP..." className="bg-transparent text-sm outline-none text-slate-600 dark:text-slate-200 w-full" />
        </div>
      </div>

      <div className="flex-1 bg-slate-50 dark:bg-[#090b10] p-6 overflow-auto font-mono text-sm leading-relaxed space-y-3 transition-colors duration-300">
        {logs.length === 0 && !loading && (
          <div className="text-slate-500 italic h-full flex flex-col items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <p>Zero security breaches recorded internally on current host session.</p>
          </div>
        )}
        
        {logs.map((log, index) => {
          const isRateLimit = log.event === 'RATE_LIMIT_BLOCK';
          return (
            <div key={index} className={`flex flex-col md:flex-row md:items-start gap-4 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${isRateLimit ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
               <div className="flex flex-col gap-1 w-48 shrink-0">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-sans tracking-wide">TIMESTAMP TRACE</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{log.time}</span>
               </div>
               
               <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-sans tracking-wide">INTERNAL EVENT SIGNATURE</span>
                  <span className={`font-bold uppercase tracking-wider ${isRateLimit ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                    {log.event.replace('_', ' ')}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 mt-1">{log.details}</span>
               </div>

               <div className="flex flex-col gap-1 w-48 shrink-0 md:items-end">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-sans tracking-wide">HOST FLAG ORIGIN</span>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
                    <MapPin className={`w-3.5 h-3.5 ${isRateLimit ? 'text-orange-500' : 'text-red-500'}`} />
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{log.ip}</span>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
