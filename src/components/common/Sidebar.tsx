import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  Radar,
  Briefcase,
  Layers,
  Bot,
  PlusCircle,
  Users,
  FileCode,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const studentNav = [
    { label: 'Profile & Resume', path: '/student/profile', icon: FileText },
    { label: 'Skill Catalog', path: '/student/skills', icon: Sparkles },
    { label: 'Take Assessment', path: '/student/assessments', icon: CheckCircle2 },
    { label: 'Skill Diagnostics', path: '/student/diagnostics', icon: Radar },
    { label: 'Internships & Jobs', path: '/student/jobs', icon: Briefcase },
    { label: 'Application Tracker', path: '/student/applications', icon: Layers },
    { label: 'AI Career Mentor', path: '/student/assistant', icon: Bot },
  ];

  const adminNav = [
    { label: 'Cohort Applications', path: '/admin/pipeline', icon: Users },
    { label: 'Post Opportunity', path: '/admin/post-job', icon: PlusCircle },
    { label: 'Assessment Studio', path: '/admin/assessments', icon: FileCode },
  ];

  const activeLinks = role === 'STUDENT' ? studentNav : adminNav;

  return (
    <aside className="flex h-[calc(100vh-4rem)] w-64 flex-col justify-between border-r border-borderSubtle bg-obsidian p-4">
      <div className="space-y-1">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {role === 'STUDENT' ? 'Student Workspace' : 'Administration Suite'}
        </p>
        {activeLinks.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-brandIndigo/10 text-brandIndigo border border-brandIndigo/20'
                  : 'text-slate-400 hover:bg-card hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="rounded-xl border border-borderSubtle bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300">Verified Intelligence</span>
          <span className="h-2 w-2 rounded-full bg-brandEmerald animate-pulse" />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          Deterministic scoring active. Verified against institutional benchmarks.
        </p>
      </div>
    </aside>
  );
};

