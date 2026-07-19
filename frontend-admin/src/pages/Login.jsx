import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';
import { useAdminStore } from '../store/adminStore';

export const Login = () => {
  const navigate = useNavigate();
  const { setAdminAuth } = useAdminStore();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    if (!auth) {
      toast.error('Firebase Auth is not initialized. Please verify environment configuration.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg('');
    const toastId = toast.loading('Verifying administrator identity...');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();

      const res = await api.post('/admin/auth/login', { firebaseToken });

      if (res.data.success) {
        setAdminAuth(res.data.admin, res.data.token);
        toast.success(`Welcome back, ${res.data.admin.displayName}!`, { id: toastId });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[Admin Login Error]', err);
      const message = err.response?.data?.message || err.message || 'Authentication failed.';
      setErrorMsg(message);
      toast.error(message, { id: toastId });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -top-48 -left-48 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl -bottom-32 -right-32 pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 mx-auto shadow-xl shadow-blue-600/10">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">DDS Admin Portal</h1>
          <p className="text-xs text-slate-400 font-medium">Platform Administration & Governance Console</p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">Administrator Sign In</h2>
            <p className="text-xs text-slate-400">
              Only authorized platform administrators with <code className="text-blue-400 bg-blue-950 px-1 py-0.5 rounded font-mono">Role = ADMIN</code> are granted access.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            {isAuthenticating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Admin Google Account</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center text-[10px] text-slate-400">
          DDS Distributed Authentication Platform &copy; 2026
        </div>
      </div>
    </div>
  );
};

export default Login;
