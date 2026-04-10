import React, { useState } from 'react';
import { Send, Zap, Clock, ShieldAlert } from 'lucide-react';

export default function ApiTester() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/metrics');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setMetrics(null);
    const start = performance.now();
    
    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method,
      });
      const end = performance.now();
      
      const payload = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch (err) {
        parsed = payload;
      }

      setResponse(parsed);
      setMetrics({
        status: res.status,
        latency: Math.round(end - start),
      });

    } catch (err) {
      setResponse("Network Error: Could not connect to localhost:8080");
      setMetrics({ status: 'ERROR', latency: 0 });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      {/* Request Form */}
      <div className="w-full lg:w-1/3 bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl border border-slate-700/50 p-6 flex flex-col">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-indigo-400" /> API Playground
        </h3>
        
        <form onSubmit={handleSend} className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">HTTP Method</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option>GET</option>
              <option>POST</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Endpoint Route</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-mono text-sm pointer-events-none">
                /
              </span>
              <input
                type="text"
                value={endpoint.replace(/^\//, '')}
                onChange={e => setEndpoint(`/${e.target.value}`)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono focus:border-transparent transition-shadow placeholder-slate-600"
                placeholder="status"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 italic mt-2">
             Base URL: <span className="font-mono text-indigo-400">http://localhost:8080</span>
          </p>

          <div className="pt-4 mt-auto">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex justify-center items-center gap-2 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95"
            >
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><Send className="w-5 h-5" /> Execute Call</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Response Panel */}
      <div className="w-full lg:w-2/3 bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="bg-slate-900/50 border-b border-slate-700/50 p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Response Payload</h3>
          
          {metrics && (
             <div className="flex gap-4">
               <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono flex items-center gap-1 ${metrics.status === 200 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                 {metrics.status === 'ERROR' ? <ShieldAlert className="w-3 h-3"/> : 'HTTP'} {metrics.status}
               </span>
               <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-md text-xs font-mono flex items-center gap-1">
                 <Clock className="w-3 h-3 text-slate-400"/> {metrics.latency} ms
               </span>
             </div>
          )}
        </div>

        {/* Panel Body */}
        <div className="flex-1 bg-[#0d1117] relative p-6 overflow-auto">
           {!response && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Send className="w-12 h-12 mb-4 opacity-20" />
                <p>Awaiting incoming payloads...</p>
             </div>
           )}

           {loading && (
             <div className="h-full flex flex-col items-center justify-center text-indigo-500/50">
               <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-20"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
             </div>
           )}

           {response && !loading && (
              <pre className="font-mono text-sm leading-relaxed text-emerald-300 overflow-auto whitespace-pre-wrap">
                {typeof response === 'object' ? JSON.stringify(response, null, 2) : response}
              </pre>
           )}
        </div>
      </div>
    </div>
  );
}
