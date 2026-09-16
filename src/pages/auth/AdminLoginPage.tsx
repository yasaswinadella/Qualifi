import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin, user, role } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated as admin, redirect to admin pipeline
  React.useEffect(() => {
    if (user?.id === 'yashu-admin-1' && role === 'ADMIN') {
      navigate('/admin/pipeline', { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const success = await adminLogin(email.trim(), password);
      if (success) {
        toast.success('Admin authentication verified. Access granted to Qualifi Platform Control.');
        navigate('/admin/pipeline', { replace: true });
      } else {
        setErrorMessage('Access Denied: Invalid administrator credentials.');
        toast.error('Authentication failed. Unauthorized access is strictly logged.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brandIndigo/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-brandPurple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <button
            onClick={() => navigate('/student/jobs')}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition mb-6 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Student Portal
          </button>

          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brandIndigo to-brandPurple flex items-center justify-center shadow-xl shadow-brandIndigo/30 mb-4 border border-indigo-400/20">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Qualifi Admin Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional Placement & Verification Control System
          </p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Restricted Access &bull; Administrator Credentials Only
          </div>
        </div>

        <div className="rounded-2xl border border-borderSubtle bg-card/90 backdrop-blur-xl p-7 shadow-2xl space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@qualifi.io"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none focus:ring-1 focus:ring-brandIndigo transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Security Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none focus:ring-1 focus:ring-brandIndigo transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brandIndigo to-brandPurple py-3 text-xs font-bold text-white shadow-lg shadow-brandIndigo/25 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Explicit note: No forgot password or register available for admin */}
          <div className="pt-3 border-t border-borderSubtle/60 text-center">
            <p className="text-[11px] text-slate-500">
              Admin accounts are provisioned exclusively by platform security policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
