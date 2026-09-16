import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  User,
  GraduationCap,
  Building,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'LOGIN',
}) => {
  const { studentLogin, studentRegister, studentGoogleAuth, forgotPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCollege, setRegCollege] = useState('Massachusetts Institute of Technology');
  const [regDegree, setRegDegree] = useState('B.Tech');
  const [regBranch, setRegBranch] = useState('Computer Science');
  const [regCgpa, setRegCgpa] = useState('8.85');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await studentGoogleAuth();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await studentLogin(loginEmail.trim(), loginPassword);
      toast.success('Signed in successfully!');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
      toast.error(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await studentRegister({
        email: regEmail.trim(),
        password: regPassword,
        fullName: regFullName.trim(),
        college: regCollege.trim(),
        degree: regDegree.trim(),
        branch: regBranch.trim(),
        cgpa: parseFloat(regCgpa) || 8.5,
      });

      if (res.needsEmailConfirmation) {
        setSuccessMessage(`Registration successful! A confirmation email has been sent to ${regEmail}. Please verify your email before signing in.`);
        toast.success('Registration successful! Please check your email inbox.');
      } else {
        toast.success('Student account registered and profile created in Supabase!');
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your credentials.');
      toast.error(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await forgotPassword(forgotEmail.trim());
      setSuccessMessage(`Password recovery instructions sent to ${forgotEmail}. Please check your email inbox.`);
      toast.success('Password reset link transmitted.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not process password recovery.');
      toast.error(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-borderSubtle bg-card p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brandIndigo/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-lg bg-brandIndigo/20 p-2 text-brandIndigo">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-brandIndigo">
              Student Career & Verification Portal
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            {activeTab === 'LOGIN' && 'Sign In to Your Student Account'}
            {activeTab === 'REGISTER' && 'Create Your Verified Student Profile'}
            {activeTab === 'FORGOT_PASSWORD' && 'Recover Your Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'LOGIN' && 'Access verified benchmarks, proctored assessments, and tracked job applications.'}
            {activeTab === 'REGISTER' && 'Register to verify technical skills and match with tier-1 company opportunities.'}
            {activeTab === 'FORGOT_PASSWORD' && 'Enter your registered email address to receive secure reset instructions.'}
          </p>
        </div>

        {/* Tab Switcher */}
        {activeTab !== 'FORGOT_PASSWORD' && (
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-borderSubtle mb-5">
            <button
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === 'LOGIN'
                  ? 'bg-brandIndigo text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                activeTab === 'REGISTER'
                  ? 'bg-brandIndigo text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Google OAuth Button */}
        {activeTab !== 'FORGOT_PASSWORD' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800/80 py-2.5 px-4 text-xs font-semibold text-slate-200 transition shadow-sm cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.6 7C.6 9 0 10.4 0 12.3s.6 3.3 1.6 5.3l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16.4C3.5 20.2 7.4 23.5 12 23.5z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-3 text-slate-500 font-medium">Or continue with email</span>
              </div>
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('FORGOT_PASSWORD');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-brandIndigo hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brandIndigo py-2.5 text-xs font-bold text-white shadow-lg shadow-brandIndigo/25 hover:bg-brandIndigo/90 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Alex Vance"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="alex@mit.edu"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  College / Institute
                </label>
                <input
                  type="text"
                  required
                  value={regCollege}
                  onChange={(e) => setRegCollege(e.target.value)}
                  placeholder="MIT / Stanford / IIT"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Branch / Major
                </label>
                <input
                  type="text"
                  required
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Degree
                </label>
                <select
                  value={regDegree}
                  onChange={(e) => setRegDegree(e.target.value)}
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                >
                  <option value="B.Tech">B.Tech</option>
                  <option value="B.E.">B.E.</option>
                  <option value="B.S.">B.S.</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="M.S.">M.S.</option>
                  <option value="BBA">BBA</option>
                  <option value="MBA">MBA</option>
                  <option value="B.Com">B.Com</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  CGPA / Grade (0-10)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  required
                  value={regCgpa}
                  onChange={(e) => setRegCgpa(e.target.value)}
                  placeholder="8.85"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brandIndigo to-brandPurple py-2.5 text-xs font-bold text-white shadow-lg shadow-brandIndigo/25 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Student Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full rounded-xl border border-borderSubtle bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brandIndigo focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brandIndigo py-2.5 text-xs font-bold text-white shadow-lg shadow-brandIndigo/25 hover:bg-brandIndigo/90 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
