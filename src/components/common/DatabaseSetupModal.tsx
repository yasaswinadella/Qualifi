import React, { useState } from 'react';
import { Database, Key, CheckCircle, Copy, X, Sparkles, Server } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { isGeminiConfigured } from '../../lib/aiServices';
import { toast } from 'sonner';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_MIGRATION_SNIPPET = `-- QUALIFI POSTGRESQL SCHEMA & RLS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('STUDENT', 'ADMIN')) NOT NULL DEFAULT 'STUDENT',
  avatar_url TEXT,
  cgpa NUMERIC(3, 2),
  branch TEXT,
  degree TEXT,
  graduation_year INT,
  resume_url TEXT,
  raw_resume_text TEXT,
  parsed_resume_json JSONB,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_category TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  round_type TEXT CHECK (round_type IN ('ROUND_1_MCQ', 'ROUND_2_CODING_DESCRIPTIVE')) NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_option_index INT,
  test_cases JSONB,
  rubric_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_skill_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  verified_score INT NOT NULL CHECK (verified_score BETWEEN 0 AND 100),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  job_type TEXT CHECK (job_type IN ('INTERNSHIP', 'FULL_TIME', 'PPO')) NOT NULL,
  location TEXT NOT NULL,
  stipend TEXT,
  application_url TEXT NOT NULL,
  raw_description TEXT NOT NULL,
  min_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
  eligible_branches TEXT[] NOT NULL DEFAULT '{}',
  eligible_degrees TEXT[] NOT NULL DEFAULT '{}',
  required_skills JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_eligible_hard_criteria BOOLEAN NOT NULL,
  calculated_skill_match_score INT NOT NULL,
  status TEXT CHECK (status IN ('APPLIED_EXTERNALLY', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFER', 'REJECTED', 'WITHDRAWN')) DEFAULT 'APPLIED_EXTERNALLY',
  company_application_url TEXT,
  notes TEXT,
  interview_time TIMESTAMPTZ,
  interview_meeting_link TEXT,
  last_updated_by_student TIMESTAMPTZ,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);`;

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    setCopied(true);
    toast.success('SQL Migration copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl glass-card rounded-2xl border border-obsidian-border bg-obsidian-card p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-obsidian-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-indigo/15 border border-brand-indigo/30 text-brand-indigo">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Architecture & Integrations</h2>
              <p className="text-xs text-slate-400">Supabase PostgreSQL Schema, RLS, and Gemini API Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-obsidian-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Integration Status Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          <div className="p-3.5 rounded-xl bg-obsidian-surface/80 border border-obsidian-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-brand-indigo" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Supabase PostgreSQL & Auth</div>
                <div className="text-[11px] text-slate-400">
                  {isSupabaseConfigured ? 'Connected to live cloud DB' : 'Operating in Intelligent Local Store'}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {isSupabaseConfigured ? 'LIVE SYNC' : 'ACTIVE STORE'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-obsidian-surface/80 border border-obsidian-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-amber" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Google Gemini Flash AI</div>
                <div className="text-[11px] text-slate-400">
                  {isGeminiConfigured ? 'Gemini 1.5 Flash API active' : 'Deterministic Rubric Evaluator active'}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                isGeminiConfigured
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {isGeminiConfigured ? 'GEMINI READY' : 'BUILT-IN AI READY'}
            </span>
          </div>
        </div>

        {/* SQL Script Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              Supabase SQL Migration (<code className="text-brand-indigo">schema.sql</code>)
            </span>
            <button
              onClick={copySql}
              className="flex items-center gap-1.5 px-3 py-1 bg-brand-indigo/20 hover:bg-brand-indigo/30 text-brand-indigo border border-brand-indigo/30 rounded-lg text-xs font-medium transition-all"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-brand-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy SQL Script'}
            </button>
          </div>
          <pre className="flex-1 overflow-y-auto p-4 bg-obsidian-bg/90 border border-obsidian-border rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed select-all">
            {SQL_MIGRATION_SNIPPET}
          </pre>
        </div>

        {/* Environment setup instructions */}
        <div className="mt-4 pt-3 border-t border-obsidian-border flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-brand-amber" />
            <span>To connect your custom keys, create <code className="text-slate-200">.env</code> with <code className="text-slate-200">VITE_SUPABASE_URL</code> & <code className="text-slate-200">VITE_GEMINI_API_KEY</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-obsidian-surface hover:bg-obsidian-elevated text-slate-200 rounded-lg font-medium border border-obsidian-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
