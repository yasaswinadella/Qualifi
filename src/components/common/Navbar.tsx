import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isGeminiConfigured } from '../../lib/aiServices';
import { StudentAuthModal } from '../auth/StudentAuthModal';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Sparkles,
  ChevronDown,
  Database,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, switchRole, signOut, isAdminAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleAdminPortalClick = () => {
    if (isAdminAuthenticated) {
      switchRole('ADMIN');
      navigate('/admin/pipeline');
    } else {
      navigate('/admin/login');
    }
  };

  const handleStudentViewClick = () => {
    switchRole('STUDENT');
    navigate('/student/jobs');
  };

  const openStudentLogin = () => {
    setAuthModalTab('LOGIN');
    setIsAuthModalOpen(true);
  };

  const openStudentRegister = () => {
    setAuthModalTab('REGISTER');
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-borderSubtle bg-obsidian/90 px-4 md:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brandIndigo to-brandPurple text-white shadow-lg shadow-brandIndigo/20 group-hover:scale-105 transition">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-brandIndigo transition">Qualifi</span>
              <span className="rounded-full border border-brandIndigo/30 bg-brandIndigo/10 px-2 py-0.5 text-[10px] font-semibold text-brandIndigo">
                VERIFIED PLATFORM
              </span>
            </div>
          </button>

          {/* Engine status indicators */}
          <div className="hidden items-center gap-2 border-l border-borderSubtle pl-4 lg:flex">
            <div className="flex items-center gap-1.5 rounded-lg border border-borderSubtle bg-card/60 px-2.5 py-1 text-[11px] text-slate-300">
              <Database
                className={`h-3 w-3 ${
                  isSupabaseConfigured ? 'text-brandEmerald' : 'text-brandCyan'
                }`}
              />
              <span>{isSupabaseConfigured ? 'Supabase Live' : 'Deterministic Engine'}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-borderSubtle bg-card/60 px-2.5 py-1 text-[11px] text-slate-300">
              <Sparkles
                className={`h-3 w-3 ${
                  isGeminiConfigured ? 'text-brandAmber animate-pulse' : 'text-slate-400'
                }`}
              />
              <span>{isGeminiConfigured ? 'Gemini 2.5 Flash' : 'AI Services Ready'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Role Switcher */}
          <div className="flex items-center rounded-xl border border-borderSubtle bg-card p-1">
            <button
              onClick={handleStudentViewClick}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 md:px-3 py-1.5 text-xs font-semibold transition ${
                role === 'STUDENT'
                  ? 'bg-brandIndigo text-white shadow-md shadow-brandIndigo/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Student View</span>
            </button>
            <button
              onClick={handleAdminPortalClick}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 md:px-3 py-1.5 text-xs font-semibold transition ${
                role === 'ADMIN'
                  ? 'bg-gradient-to-r from-brandIndigo to-brandPurple text-white shadow-md shadow-brandIndigo/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isAdminAuthenticated ? 'Admin Portal' : 'Admin Login'}</span>
            </button>
          </div>

          {/* Student Auth Trigger or User Dropdown */}
          <div className="relative border-l border-borderSubtle pl-2 md:pl-3">
            {role === 'STUDENT' && (!user || user.id === 'mock-student-id') ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openStudentLogin}
                  className="flex items-center gap-1.5 rounded-xl border border-borderSubtle bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-brandIndigo" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
                <button
                  onClick={openStudentRegister}
                  className="flex items-center gap-1.5 rounded-xl bg-brandIndigo hover:bg-brandIndigo/90 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-800/60 transition"
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-semibold text-white">{user?.full_name || 'Active User'}</p>
                    <p className="text-[11px] text-slate-400">
                      {role === 'STUDENT'
                        ? `${user?.degree || 'B.Tech'} • ${user?.cgpa || 0} CGPA`
                        : 'Yashu Admin • Platform Control'}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brandIndigo to-brandEmerald text-xs font-bold text-white shadow">
                    {user?.full_name ? user.full_name.charAt(0) : 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-borderSubtle bg-card p-2 shadow-2xl z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-borderSubtle">
                      <p className="text-xs font-bold text-white">{user?.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 rounded bg-brandIndigo/20 px-2 py-0.5 text-[10px] font-semibold text-brandIndigo">
                        {role}
                      </span>
                    </div>

                    <div className="py-1">
                      {role === 'STUDENT' && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigate('/student/profile');
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                        >
                          <UserCheck className="w-4 h-4 text-brandIndigo" />
                          <span>Student Profile</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Student Auth Modal */}
      <StudentAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />
    </>
  );
};
