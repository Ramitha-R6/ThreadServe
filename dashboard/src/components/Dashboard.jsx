import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Users, Activity, Clock, RefreshCw, Zap, ShieldAlert, Cpu, List, AlertTriangle, Layers, Maximize, Minimize } from 'lucide-react';

export default function Dashboard() {
  const isDarkMode = true; // Always dark
  const [compactMode, setCompactMode] = useState(false);
  const [metrics, setMetrics] = useState({
    total_requests: 0, active_connections: 0, max_active_connections: 0,
    avg_latency_ms: 0, p95_latency: 0, p99_latency: 0, requests_per_sec: 0, 
    error_rate: 0, slow_requests: 0,
    thread_pool: { total_threads: 5, busy_threads: 0, queue_size: 0, states: [0,0,0,0,0] },
    endpoints_traffic: {},
    status: 'Unknown'
  });
  
  const [history, setHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    if (!autoRefresh) return;
    try {
      const res = await fetch('http://localhost:8080/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics({ ...data, status: 'Running' });
        
        const now = new Date();
        setHistory(prev => {
          const newEntries = [...prev, {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            latency: data.avg_latency_ms,
            rps: data.requests_per_sec
          }];
          return newEntries.slice(-15);
        });
      }
    } catch (e) {
      setMetrics(prev => ({ ...prev, status: 'Stopped', active_connections: 0, requests_per_sec: 0, thread_pool: {...prev.thread_pool, states: [0,0,0,0,0]} }));
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000); 
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Transform Endpoint Map to Recharts Array
  const rawEndpoints = Object.entries(metrics.endpoints_traffic).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  const pieColors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
  const primaryTextColor = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const formatPercentile = (val) => val > 0 ? val.toFixed(1) : "0.0";

  return (
    <div className="space-y-6 transition-colors duration-300">
      
      {/* Interactive Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm gap-4 transition-colors">
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${autoRefresh ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 border border-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
            {autoRefresh ? 'POLLING LIVE' : 'PAUSED'}
          </button>
          
          <button
            onClick={() => setCompactMode(!compactMode)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {compactMode ? <><Maximize className="w-4 h-4"/> Expanded</> : <><Minimize className="w-4 h-4"/> Compact Focus</>}
          </button>
        </div>
        
        {/* Thread Pool Global Activity Heatmap */}
        <div className="flex flex-col items-end">
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${secondaryTextColor}`}>Server Core Concurrency Heatmap</span>
            <div className="flex gap-1.5">
               {metrics.thread_pool.states.map((state, i) => (
                  <div key={i} className="group relative">
                     <div className={`w-6 h-6 rounded-md border shadow-sm transition-all duration-300 ${state === 1 ? 'bg-indigo-500 border-indigo-600 shadow-indigo-500/50 animate-pulse' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}></div>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none text-xs bg-slate-800 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                        Worker {i}: {state === 1 ? 'PROCESSING' : 'IDLE'}
                     </div>
                  </div>
               ))}
            </div>
        </div>
      </div>

      {!compactMode ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="System Status" value={metrics.status} icon={Server} color={metrics.status === 'Running' ? 'emerald' : 'red'} isDark={isDarkMode} />
            <MetricCard label="RPS Flow" value={metrics.requests_per_sec} icon={Zap} color="yellow" isDark={isDarkMode} />
            <MetricCard label="Avg Output" value={`${metrics.avg_latency_ms.toFixed(1)}ms`} icon={Clock} color="indigo" isDark={isDarkMode} />
            <MetricCard label="P95 Drag" value={`${formatPercentile(metrics.p95_latency)}ms`} icon={Layers} color="orange" isDark={isDarkMode} />
            <MetricCard label="P99 Drag" value={`${formatPercentile(metrics.p99_latency)}ms`} icon={Layers} color="red" isDark={isDarkMode} />
            <MetricCard label="Socket Q" value={metrics.thread_pool.queue_size} icon={List} color="slate" isDark={isDarkMode} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Active Clients" value={`${metrics.active_connections} (Peak: ${metrics.max_active_connections})`} icon={Users} color="blue" isDark={isDarkMode} wide />
            <MetricCard label="Total Requests" value={metrics.total_requests} icon={Activity} color="purple" isDark={isDarkMode} wide />
            <MetricCard label="Error Volume" value={`${(metrics.error_rate * 100).toFixed(2)}% Rate`} icon={AlertTriangle} color={metrics.error_rate > 0.05 ? 'red' : 'emerald'} isDark={isDarkMode} wide />
            <MetricCard label="Slow Hits (>100ms)" value={metrics.slow_requests} icon={ShieldAlert} color="orange" isDark={isDarkMode} wide />
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/10 border border-slate-200 dark:border-slate-700/50 flex flex-wrap gap-8 items-center justify-around transition-colors">
            <CompactStat label="RPS" val={metrics.requests_per_sec} isDark={isDarkMode}/>
            <CompactStat label="AVG" val={`${metrics.avg_latency_ms.toFixed(1)}ms`} isDark={isDarkMode}/>
            <CompactStat label="P99" val={`${formatPercentile(metrics.p99_latency)}ms`} isDark={isDarkMode} highlight={metrics.p99_latency > 150} />
            <CompactStat label="ERR" val={`${(metrics.error_rate * 100).toFixed(1)}%`} isDark={isDarkMode} highlight={metrics.error_rate > 0.02} />
            <CompactStat label="Conns" val={`${metrics.active_connections} / ${metrics.max_active_connections}`} isDark={isDarkMode} />
        </div>
      )}

      {/* Advanced Charting Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Latency Plot */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/10 border border-slate-200 dark:border-slate-700/50 transition-colors">
          <h3 className={`text-md font-bold mb-6 flex items-center gap-2 ${primaryTextColor}`}>
            <Clock className="w-5 h-5 text-indigo-500" /> Analytical Latency Vectors
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={isDarkMode ? 0.4 : 0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="time" stroke={secondaryTextColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={secondaryTextColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '12px' }} />
                <Area type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorLat)" activeDot={{r: 6, strokeWidth: 0}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Breakdown Pie */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/10 border border-slate-200 dark:border-slate-700/50 transition-colors flex flex-col">
          <h3 className={`text-md font-bold mb-6 flex items-center gap-2 ${primaryTextColor}`}>
            <Activity className="w-5 h-5 text-teal-500" /> Traffic Density Distribution
          </h3>
          
          {rawEndpoints.length > 0 ? (
             <div className="flex-1 flex flex-col justify-center">
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={rawEndpoints} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {rawEndpoints.map((entry, index) => <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} /> )}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', border: 'none', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 space-y-2 px-2 max-h-24 overflow-y-auto custom-scrollbar">
                   {rawEndpoints.map((ep, i) => (
                      <div key={ep.name} className="flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }}></span>
                            <span className={`font-medium ${secondaryTextColor} truncate max-w-[120px]`} title={ep.name}>{ep.name}</span>
                         </div>
                         <span className={`font-bold ${primaryTextColor}`}>{ep.value}</span>
                      </div>
                   ))}
                </div>
             </div>
          ) : (
             <div className={`flex-1 flex flex-col items-center justify-center text-center italic ${secondaryTextColor}`}>
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                No sufficient routed endpoints tracked internally.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Cards tailored heavily towards dynamic tailwind UI bridges seamlessly locally!
function MetricCard({ label, value, icon: Icon, color, isDark, wide=false }) {
  const bgClasses = {
    'emerald': isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    'red': isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600',
    'yellow': isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600',
    'indigo': isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
    'purple': isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
    'blue': isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
    'orange': isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
    'slate': isDark ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-600',
  };
  
  return (
    <div className={`bg-white dark:bg-slate-800/80 backdrop-blur p-5 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/10 border border-slate-200 dark:border-slate-700/50 flex flex-col transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-${color}-500/30 duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">{label}</h3>
        <div className={`p-2 rounded-xl transition-colors ${bgClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-2xl font-black ${isDark ? 'text-slate-50' : 'text-slate-800'} group-hover:scale-105 transition-transform origin-left ${wide ? 'truncate' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function CompactStat({ label, val, isDark, highlight=false }) {
  return (
      <div className="flex flex-col items-center">
         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
         <span className={`text-xl font-black ${highlight ? 'text-red-500' : (isDark ? 'text-slate-100' : 'text-slate-800')}`}>{val}</span>
      </div>
  )
}
