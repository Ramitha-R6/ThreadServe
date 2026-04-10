import React, { useState } from 'react';
import { Shield, Lock, User, LogIn, Activity } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate frontend delay for smooth auth feeling
      await new Promise(r => setTimeout(r, 600)); 
      
      const res = await fetch('http://localhost:8080/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        onLogin(data.token);
      } else {
        setError('Invalid admin credentials.');
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0f1c] text-white">
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
       
       <div className="w-full max-w-md relative z-10 px-6">
          <div className="flex flex-col items-center mb-8">
             <div className="bg-indigo-600/20 p-4 rounded-full border border-indigo-500/30 mb-4 shadow-lg shadow-indigo-500/20">
               <Shield className="w-8 h-8 text-indigo-400" />
             </div>
             <h1 className="text-3xl font-bold tracking-tight">Security Gateway</h1>
             <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Establishing strict C++ tunnel
             </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-slate-700/50">
             
             {error && (
               <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center font-medium">
                 {error}
               </div>
             )}

             <div className="space-y-5">
               <div>
                 <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Username</label>
                 <div className="relative">
                   <User className="absolute inset-y-0 left-0 pl-3 pt-3.5 w-8 h-8 text-slate-500 pointer-events-none" />
                   <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 outline-none transition-colors"
                      placeholder="e.g. admin"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access PIN / Password</label>
                 <div className="relative">
                   <Lock className="absolute inset-y-0 left-0 pl-3 pt-3.5 w-8 h-8 text-slate-500 pointer-events-none" />
                   <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 outline-none transition-colors"
                      placeholder="••••••••"
                   />
                 </div>
               </div>
             </div>

             <button 
               type="submit" 
               disabled={loading || !username || !password}
               className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:hover:bg-indigo-600 font-semibold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 outline-none focus:ring-4 ring-indigo-500/30"
             >
               {loading ? (
                 <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
               ) : (
                 <>Authenticate Session <LogIn className="w-5 h-5" /></>
               )}
             </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-8 font-mono">
             Server running on port 8080 : Winsock2 Architecture
          </p>
       </div>
    </div>
  );
}
