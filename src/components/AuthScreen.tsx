import React, { useState } from 'react';
import { Lock, User, ShieldAlert, ArrowRight, Music, Sparkles } from 'lucide-react';
import { loadAdmins } from '../utils/storage';
import { AdminUser } from '../types';

interface AuthScreenProps {
  onUnlock: (user: AdminUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onUnlock }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have the absolute latest admins from the server before authenticating
    try {
      const res = await fetch(`/api/db?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.admins)) {
          localStorage.setItem('lounge_admins_v2', JSON.stringify(json.data.admins));
        }
      }
    } catch (err) {
      console.warn('Could not fetch latest admins for login validation:', err);
    }

    const admins = loadAdmins();
    const foundAdmin = admins.find(a => a.username === username && a.password === password);
    
    if (foundAdmin) {
      setError(false);
      localStorage.setItem('lounge_admin_session_v1', 'true');
      localStorage.setItem('lounge_admin_current_user', JSON.stringify(foundAdmin));
      onUnlock(foundAdmin);
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0e17] text-slate-100 flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#161b2b] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-[0_0_20px_rgba(147,51,234,0.3)] mb-2">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-[10px] font-bold uppercase tracking-widest text-purple-300">
            Glee Angels Music Lounge
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">
            Admin Portal
          </h1>
          <p className="text-xs text-slate-400">
            Please log in with your administrator credentials.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(false);
                }}
                placeholder="Username"
                className={`w-full bg-[#0b0e17] border ${
                  error ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-purple-500'
                } rounded-xl px-12 py-3.5 text-sm font-medium text-white focus:outline-none transition-all placeholder:text-slate-600`}
                autoFocus
              />
              <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Password"
                className={`w-full bg-[#0b0e17] border ${
                  error ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-slate-800 focus:border-purple-500'
                } rounded-xl px-12 py-3.5 text-sm font-medium text-white focus:outline-none transition-all placeholder:text-slate-600`}
              />
              <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs justify-center font-medium">
                <ShieldAlert className="w-4 h-4" />
                <span>Invalid credentials. Please try again.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_15px_rgba(168,85,247,0.3)]"
          >
            <span>SECURE LOGIN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

