import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StudentAuthModal } from '../../components/auth/StudentAuthModal';
import {
  ShieldCheck,
  Lock,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Award,
  CheckCircle2,
  Building2,
  Users,
  KeyRound,
  FileCode,
  Zap,
} from 'lucide-react';

export const PortalSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAdminAuthenticated } = useAuth();
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState(false);
  const [studentAuthTab, setStudentAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const handleAdminChoice = () => {
    if (isAdminAuthenticated) {
      navigate('/admin/pipeline');
    } else {
      navigate('/admin/login');
    }
  };

  const handleStudentChoice = () => {
    navigate('/student/jobs');
  };

  const handleStudentLoginModal = () => {
    setStudentAuthTab('LOGIN');
    setIsStudentAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-obsidian text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-brandIndigo selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brandIndigo/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-brandPurple/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brandIndigo to-brandPurple text-white shadow-xl shadow-brandIndigo/30 border border-indigo-400/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">Qualifi</span>
            <span className="ml-2 rounded-full border border-brandIndigo/30 bg-brandIndigo/10 px-2.5 py-0.5 text-[10px] font-bold text-brandIndigo uppercase tracking-wider">
              Verification Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleAdminChoice}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Lock className="w-3.5 h-3.5 text-brandIndigo" />
            <span>Admin Gateway</span>
          </button>
        </div>
      </header>

      {/* Main Hero & Portal Selection */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col justify-center items-center text-center">
        {/* Main Headline */}
        <div className="max-w-3xl space-y-4 mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 shadow-xl backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-brandIndigo animate-pulse" />
            <span>Standardized Technical & Non-Technical Skill Verification</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Select Your Portal to{' '}
            <span className="bg-gradient-to-r from-brandIndigo via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Continue
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Welcome to Qualifi. Choose your access portal below to sign in and access verified candidate pipelines or student skill benchmarking.
          </p>
        </div>

        {/* 2 Big Interactive Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl text-left">
          {/* OPTION 1: ADMIN LOGIN */}
          <div className="group relative rounded-3xl border border-borderSubtle bg-card/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brandIndigo/60 hover:shadow-brandIndigo/20 hover:scale-[1.01] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brandIndigo/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brandIndigo/20 transition" />

            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brandIndigo to-brandPurple text-white shadow-xl shadow-brandIndigo/30 border border-indigo-400/20">
                  <Lock className="h-7 w-7" />
                </div>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                  Admin Access Only
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-brandIndigo transition">
                Administrator Portal
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Institutional control system for placement directors and platform administrators. Review student skill radar telemetry, manage candidate pipelines, and publish opportunities.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-borderSubtle/60 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brandIndigo shrink-0" />
                  <span>Strict credential validation (ID: <code>yashu-admin-1</code>)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brandIndigo shrink-0" />
                  <span>Live 18-domain candidate skill matrix & proctoring logs</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brandIndigo shrink-0" />
                  <span>Job criteria builder & applicant rank tracking</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleAdminChoice}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-brandIndigo to-brandPurple py-3.5 px-6 text-sm font-bold text-white shadow-xl shadow-brandIndigo/25 hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Sign In as Admin</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* OPTION 2: STUDENT LOGIN & PORTAL */}
          <div className="group relative rounded-3xl border border-borderSubtle bg-card/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brandEmerald/60 hover:shadow-brandEmerald/20 hover:scale-[1.01] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brandEmerald/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brandEmerald/20 transition" />

            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brandEmerald to-brandCyan text-white shadow-xl shadow-brandEmerald/30 border border-emerald-400/20">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Students & Candidates
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition">
                Student Career Portal
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                Take timed proctored assessments across 18 specialized skill categories, verify benchmark scores (0–100), view company match eligibility, and apply to top tech positions.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-borderSubtle/60 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Google OAuth, Email/Password sign in & registration</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>10 MCQ + 6 Challenge exams with Gemini AI evaluation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified job eligibility match (Stripe, Airbnb, Coinbase, Figma)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleStudentChoice}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 px-6 text-sm font-bold text-white shadow-xl shadow-emerald-600/25 hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
              >
                <span>Enter Student Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleStudentLoginModal}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Sign In with Google / Email
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-borderSubtle/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>&copy; 2026 Qualifi Verification Engine. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span>7-Day Cooldown Protection Active</span>
          <span>&bull;</span>
          <span>Gemini AI Grading Integration</span>
        </div>
      </footer>

      {/* Student Auth Modal */}
      <StudentAuthModal
        isOpen={isStudentAuthOpen}
        onClose={() => setIsStudentAuthOpen(false)}
        initialTab={studentAuthTab}
      />
    </div>
  );
};
