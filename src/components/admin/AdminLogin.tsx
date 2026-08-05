import { useState } from "react";
import { Lock, Mail, User } from "lucide-react";

const ADMIN_USER = "adel111";
const ADMIN_EMAIL = "adel111@gmail.com";
const ADMIN_PASS = "adel111";
const SESSION_KEY = "gators-admin-session";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    setTimeout(() => {
      const id = username.trim().toLowerCase();
      if ((id === ADMIN_USER || id === ADMIN_EMAIL) && password === ADMIN_PASS) {
        localStorage.setItem(SESSION_KEY, "1");
        onSuccess();
      } else {
        setError(true);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-brand rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand/20 rotate-3">
               <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
            <p className="text-slate-500 font-medium mt-2">Sign in to manage MaxSkills Learning</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Identifier</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition" />
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-bold text-slate-900 placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-bold text-slate-900 placeholder:text-slate-300"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 animate-in shake duration-300">
                <p className="text-sm text-rose-600 font-bold text-center">Invalid admin credentials provided.</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-brand text-white rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 disabled:scale-100 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Unlock Dashboard"}
            </button>
          </form>

          <p className="text-center mt-8 text-xs font-bold text-slate-400">
            SECURED ACCESS ONLY • MAXSKILLS 2026
          </p>
        </div>
      </div>
    </div>
  );
}
