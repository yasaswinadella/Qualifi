import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { rankCandidates } from '../../lib/qualifiEngine';
import { Application, ApplicationStatus, SkillCategory, Profile, TrackedCompany, JobIngestionLog } from '../../types/database';
import { fallbackStore } from '../../lib/supabase';
import {
  Users,
  CheckCircle2,
  Calendar,
  Video,
  XCircle,
  LayoutGrid,
  List,
  Filter,
  Eye,
  Award,
  ArrowRight,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Briefcase,
  FileText,
  ShieldCheck,
  Search,
  Globe,
  DollarSign,
  TrendingUp,
  Layers,
  Clock,
  Check,
  RefreshCw,
  Server,
  Activity,
  ChevronRight,
  X,
  AlertTriangle,
  Mail,
  Building,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_PILLS: Record<ApplicationStatus, { label: string; color: string }> = {
  APPLIED_EXTERNALLY: {
    label: 'Applied Externally',
    color: 'border-slate-700 bg-slate-800/60 text-slate-300',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Interview Scheduled',
    color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
  },
  OFFER: {
    label: 'Offer Received',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  },
  REJECTED: {
    label: 'Not Selected',
    color: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'border-slate-800 bg-slate-900 text-slate-500',
  },
};

export const CandidatePipeline: React.FC = () => {
  const {
    applications,
    jobs,
    allStudentsSelectedSkills,
    allStudentBenchmarks,
    allStudentsProfiles,
    skillCatalog,
    trackedCompanies,
    ingestionLogs,
    triggerIngestion,
  } = useData();

  const [activeTab, setActiveTab] = useState<'SKILLS_MATRIX' | 'APPLICATIONS' | 'INGESTION_HEALTH'>('SKILLS_MATRIX');
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  // Selected Student for Read-Only Slide-Over Drawer
  const [selectedStudentDrawerId, setSelectedStudentDrawerId] = useState<string | null>(null);

  // Combine student profiles from context / fallbackStore to get all student records
  const studentProfilesMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; college: string; degree: string; branch: string; cgpa: number }>();

    // From context profiles
    allStudentsProfiles.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.full_name || 'Student Candidate',
        email: p.email,
        college: p.college || 'Institute of Technology',
        degree: p.degree || 'B.Tech',
        branch: p.branch || 'Computer Science',
        cgpa: p.cgpa || 8.8,
      });
    });

    // Fallback store
    fallbackStore.profiles.forEach((p, id) => {
      if (p.role === 'STUDENT' && !map.has(id)) {
        map.set(id, {
          id,
          name: p.full_name || 'Student Candidate',
          email: p.email,
          college: p.college || 'Institute of Technology',
          degree: p.degree || 'B.Tech',
          branch: p.branch || 'Computer Science',
          cgpa: p.cgpa || 8.8,
        });
      }
    });

    // From applications
    applications.forEach((app) => {
      if (app.student && !map.has(app.student_id)) {
        map.set(app.student_id, {
          id: app.student_id,
          name: app.student.full_name || 'Student Candidate',
          email: app.student.email,
          college: app.student.college || 'Institute of Technology',
          degree: app.student.degree || 'B.Tech',
          branch: app.student.branch || 'Computer Science',
          cgpa: app.student.cgpa || 8.8,
        });
      }
    });

    return map;
  }, [allStudentsProfiles, applications]);

  // Build the complete student skills matrix records
  const studentSkillRows = useMemo(() => {
    const rows: Array<{
      studentId: string;
      studentName: string;
      studentCollege: string;
      studentCgpa: number;
      skillName: string;
      category: string;
      score: number | null;
      testDate: string | null;
      cooldownUntil: string | null;
    }> = [];

    // Map each selected skill
    allStudentsSelectedSkills.forEach((sel) => {
      const student = studentProfilesMap.get(sel.student_id);
      const bench = allStudentBenchmarks.find(
        (b) =>
          b.student_id === sel.student_id &&
          b.skill_category.toLowerCase() === sel.skill_name.toLowerCase()
      );

      const score = sel.verified_score ?? bench?.score ?? null;
      const testDate = sel.last_tested_at ?? bench?.verified_at ?? null;

      rows.push({
        studentId: sel.student_id,
        studentName: student?.name || 'Registered Student',
        studentCollege: student?.college || 'Engineering Institute',
        studentCgpa: student?.cgpa || 8.8,
        skillName: sel.skill_name,
        category: sel.category,
        score,
        testDate,
        cooldownUntil: sel.next_eligible_at ?? (testDate ? new Date(new Date(testDate).getTime() + 7 * 86400000).toISOString() : null),
      });
    });

    // Map any benchmarks that weren't in selected skills
    allStudentBenchmarks.forEach((bench) => {
      const alreadyListed = rows.some(
        (r) =>
          r.studentId === bench.student_id &&
          r.skillName.toLowerCase() === bench.skill_category.toLowerCase()
      );
      if (!alreadyListed) {
        const student = studentProfilesMap.get(bench.student_id);
        const catItem = skillCatalog.find((c) => c.name.toLowerCase() === bench.skill_category.toLowerCase());
        rows.push({
          studentId: bench.student_id,
          studentName: student?.name || 'Registered Student',
          studentCollege: student?.college || 'Engineering Institute',
          studentCgpa: student?.cgpa || 8.8,
          skillName: bench.skill_category,
          category: catItem?.category || 'Programming & Software Development',
          score: bench.score,
          testDate: bench.verified_at,
          cooldownUntil: new Date(new Date(bench.verified_at).getTime() + 7 * 86400000).toISOString(),
        });
      }
    });

    // Also include from fallbackStore directly to guarantee immediate local reflection
    fallbackStore.benchmarks.forEach((benches, studentId) => {
      benches.forEach((bench) => {
        const alreadyListed = rows.some(
          (r) =>
            r.studentId === studentId &&
            r.skillName.toLowerCase() === bench.skill_category.toLowerCase()
        );
        if (!alreadyListed) {
          const student = studentProfilesMap.get(studentId) || fallbackStore.profiles.get(studentId);
          const catItem = skillCatalog.find((c) => c.name.toLowerCase() === bench.skill_category.toLowerCase());
          rows.push({
            studentId,
            studentName: (student as any)?.full_name || (student as any)?.name || 'Verified Candidate',
            studentCollege: student?.college || 'Institution',
            studentCgpa: student?.cgpa || 0,
            skillName: bench.skill_category,
            category: catItem?.category || 'Programming & Software Development',
            score: bench.score,
            testDate: bench.verified_at,
            cooldownUntil: new Date(new Date(bench.verified_at).getTime() + 7 * 86400000).toISOString(),
          });
        }
      });
    });

    return rows;
  }, [allStudentsSelectedSkills, allStudentBenchmarks, studentProfilesMap, skillCatalog]);

  // Filter skills matrix rows
  const filteredSkillRows = useMemo(() => {
    return studentSkillRows.filter((row) => {
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = row.studentName.toLowerCase().includes(q);
        const matchSkill = row.skillName.toLowerCase().includes(q);
        const matchCollege = row.studentCollege.toLowerCase().includes(q);
        const matchCat = row.category.toLowerCase().includes(q);
        if (!matchName && !matchSkill && !matchCollege && !matchCat) return false;
      }
      return true;
    });
  }, [studentSkillRows, selectedCategory, searchTerm]);

  // Filter applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (selectedJobId !== 'ALL' && app.job_id !== selectedJobId) return false;
      if (selectedStatus !== 'ALL' && app.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = app.student?.full_name?.toLowerCase().includes(q);
        const matchCompany = app.job?.company?.toLowerCase().includes(q);
        const matchRole = app.job?.title?.toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchRole) return false;
      }
      return true;
    });
  }, [applications, selectedJobId, selectedStatus, searchTerm]);

  const rankedApps = rankCandidates(filteredApps);

  // Selected Student Drawer Data
  const drawerStudent = useMemo(() => {
    if (!selectedStudentDrawerId) return null;
    const profile = studentProfilesMap.get(selectedStudentDrawerId);

    // Get all verified benchmarks for this student, sorted from highest score to lowest
    const studentBenches = allStudentBenchmarks
      .filter((b) => b.student_id === selectedStudentDrawerId)
      .sort((a, b) => b.score - a.score);

    // Get all selected skills
    const studentSelected = allStudentsSelectedSkills.filter(
      (s) => s.student_id === selectedStudentDrawerId
    );

    // Get all applications by this student
    const studentApps = applications.filter((a) => a.student_id === selectedStudentDrawerId);

    return {
      profile,
      benchmarks: studentBenches,
      selectedSkills: studentSelected,
      applications: studentApps,
    };
  }, [selectedStudentDrawerId, studentProfilesMap, allStudentBenchmarks, allStudentsSelectedSkills, applications]);

  // Trigger manual ingestion
  const handleTriggerIngestion = async () => {
    setIsIngesting(true);
    try {
      await triggerIngestion();
    } catch (err) {
      toast.error('Failed to trigger ingestion pipeline');
    } finally {
      setIsIngesting(false);
    }
  };

  // Analytics Metrics
  const totalTrackedSkills = studentSkillRows.length;
  const verifiedTestsCount = studentSkillRows.filter((r) => r.score !== null).length;
  const avgVerifiedScore =
    verifiedTestsCount > 0
      ? Math.round(
          studentSkillRows
            .filter((r) => r.score !== null)
            .reduce((acc, r) => acc + (r.score || 0), 0) / verifiedTestsCount
        )
      : 0;

  const totalApps = applications.length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admin Skill Verification & Cohort Intelligence
          </h1>
          <p className="text-xs text-slate-400">
            Monitor all student selected skills, verified 0–100 test scores, test timestamps, ATS ingestion health, and external applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-400 flex items-center gap-1.5 border border-indigo-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Institutional Ground Truth Active
          </span>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('SKILLS_MATRIX')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SKILLS_MATRIX'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Student Skill Matrix</span>
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px]">
            {studentSkillRows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'APPLICATIONS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Tracked Applications</span>
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px]">
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INGESTION_HEALTH')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'INGESTION_HEALTH'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Job Ingestion Feeds & ATS</span>
          <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
            Live Feeds
          </span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Selected Skills
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{totalTrackedSkills}</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Verified Assessments Taken
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{verifiedTestsCount}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Cohort Average Score
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400">{avgVerifiedScore}%</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active Applications
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-400">{totalApps}</span>
            <Briefcase className="h-4 w-4 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar (Only for Matrix & Applications tabs) */}
      {activeTab !== 'INGESTION_HEALTH' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 lg:flex-row lg:items-center lg:justify-between shadow-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'SKILLS_MATRIX'
                  ? 'Search student name, skill, category, or college...'
                  : 'Search student name, company, or role...'
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {activeTab === 'SKILLS_MATRIX' ? (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-400 shrink-0" />
              <select
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {Array.from(new Set(skillCatalog.map((s) => s.category))).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-400 shrink-0" />
                <select
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="ALL">All Opportunities ({jobs.length})</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.company} - {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">All Application Stages</option>
                  <option value="APPLIED_EXTERNALLY">Applied Externally</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                  <option value="OFFER">Offer Received</option>
                  <option value="REJECTED">Not Selected</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: STUDENT SKILL MATRIX & SCORES */}
      {activeTab === 'SKILLS_MATRIX' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl backdrop-blur-md">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Student & Institute</th>
                <th className="p-4">Selected Skill</th>
                <th className="p-4">Category</th>
                <th className="p-4">Verified Test Score</th>
                <th className="p-4">Verification Date</th>
                <th className="p-4">7-Day Cooldown Status</th>
                <th className="p-4 text-right">Student Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSkillRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-slate-400">
                    {studentSkillRows.length === 0
                      ? 'No student skills selected yet. When students select skills and complete assessments, their verified scores (0-100) will appear here in realtime.'
                      : 'No student skill records match your filter query.'}
                  </td>
                </tr>
              ) : (
                filteredSkillRows.map((row, idx) => {
                  const isTested = row.score !== null;
                  const isQualified = (row.score || 0) >= 70;
                  const testDateFormatted = row.testDate
                    ? new Date(row.testDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '--';

                  const cooldownActive =
                    row.cooldownUntil &&
                    new Date(row.cooldownUntil).getTime() > Date.now();

                  return (
                    <tr key={`${row.studentId}-${row.skillName}-${idx}`} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div
                          onClick={() => setSelectedStudentDrawerId(row.studentId)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-emerald-500 text-xs font-bold text-white shadow-sm">
                            {row.studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-indigo-400 transition">
                              {row.studentName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {row.studentCollege} &bull; CGPA:{' '}
                              <strong className="text-emerald-400">
                                {row.studentCgpa.toFixed(2)}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-white">
                        <span>{row.skillName}</span>
                      </td>

                      <td className="p-4">
                        <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-indigo-400 border border-slate-700">
                          {row.category}
                        </span>
                      </td>

                      <td className="p-4">
                        {isTested ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black ${
                                isQualified ? 'text-emerald-400' : 'text-amber-300'
                              }`}
                            >
                              {row.score}/100
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isQualified
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                            >
                              {isQualified ? 'VERIFIED' : 'GAP'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium">Pending Test</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-300">
                        {row.testDate ? (
                          <span className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            {testDateFormatted}
                          </span>
                        ) : (
                          <span className="text-slate-500">Not Attempted</span>
                        )}
                      </td>

                      <td className="p-4">
                        {cooldownActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>
                              Cooldown until{' '}
                              {new Date(row.cooldownUntil!).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                        ) : isTested ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Eligible for Weekly Retake</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ready to Take</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedStudentDrawerId(row.studentId)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: COHORT INTERNSHIP APPLICATIONS */}
      {activeTab === 'APPLICATIONS' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl backdrop-blur-md">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Student & College</th>
                <th className="p-4">Applied Opportunity</th>
                <th className="p-4">Verified Fit</th>
                <th className="p-4">Gate Status</th>
                <th className="p-4">Self-Reported Stage</th>
                <th className="p-4">Student Notes / Telemetry</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rankedApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-slate-400">
                    {applications.length === 0
                      ? 'No cohort applications tracked yet. When students click Apply on company opportunities, their external application tracking records and verified skill match scores will appear here.'
                      : 'No cohort applications match the selected filters.'}
                  </td>
                </tr>
              ) : (
                rankedApps.map((app) => {
                  const statusMeta = STATUS_PILLS[app.status] || STATUS_PILLS.APPLIED_EXTERNALLY;

                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div
                          onClick={() => setSelectedStudentDrawerId(app.student_id)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-emerald-500 text-xs font-bold text-white shadow-sm">
                            {app.student?.full_name ? app.student.full_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-indigo-400 transition">
                              {app.student?.full_name || 'Student Candidate'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {app.student?.college || 'Institute'} &bull; CGPA:{' '}
                              <strong className="text-emerald-400">
                                {app.student?.cgpa?.toFixed(2) || '8.85'}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-300">
                        <p className="font-semibold text-white">{app.job?.company}</p>
                        <p className="text-[11px] text-slate-400">{app.job?.title}</p>
                        {app.company_application_url && (
                          <a
                            href={app.company_application_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline"
                          >
                            <Globe className="h-2.5 w-2.5" /> Company Portal{' '}
                            <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="font-black text-sm text-emerald-400">
                          {app.skill_match_score}%
                        </span>
                      </td>

                      <td className="p-4">
                        {app.hard_criteria_passed ? (
                          <span className="flex w-fit items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> PASS
                          </span>
                        ) : (
                          <span className="flex w-fit items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> BELOW CUTOFF
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </td>

                      <td className="p-4 text-slate-300 max-w-[200px]">
                        {app.interview_time && (
                          <p className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 mb-0.5">
                            <Calendar className="h-3 w-3" />{' '}
                            {new Date(app.interview_time).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 truncate italic">
                          {app.notes || 'No custom notes logged'}
                        </p>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedStudentDrawerId(app.student_id)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition"
                        >
                          <Eye className="h-3.5 w-3.5 inline mr-1 text-indigo-400" /> View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: JOB INGESTION FEEDS & ATS PIPELINE */}
      {activeTab === 'INGESTION_HEALTH' && (
        <div className="space-y-6">
          {/* Top Bar with Manual Sync Trigger */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                Automated Ingestion Feeds & ATS Connector
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Aggregates verified openings from Adzuna API, Greenhouse ATS, and Lever public job boards. Runs every 6 hours via edge functions.
              </p>
            </div>

            <button
              onClick={handleTriggerIngestion}
              disabled={isIngesting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
              <span>{isIngesting ? 'Ingesting Feeds...' : 'Trigger Ingestion Pipeline'}</span>
            </button>
          </div>

          {/* Tracked ATS Companies Grid */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              Tracked ATS Feeds ({trackedCompanies.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trackedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{company.company_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        company.is_active
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {company.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <p>
                      ATS Platform: <strong className="text-slate-200">{company.board_type}</strong>
                    </p>
                    <p>
                      Board Slug: <strong className="text-slate-200 font-mono text-[11px]">{company.board_slug}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Tracking Since: {new Date(company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingestion Execution Logs */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl backdrop-blur-md">
            <div className="p-4 border-b border-slate-800 bg-slate-950/80">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Ingestion Run History & Telemetry
              </h3>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">Run Timestamp</th>
                  <th className="p-4">Source Provider</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Jobs Ingested</th>
                  <th className="p-4">Jobs Updated</th>
                  <th className="p-4">Details / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ingestionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                      No ingestion runs recorded yet. Click "Trigger Ingestion Pipeline" to test live crawling.
                    </td>
                  </tr>
                ) : (
                  ingestionLogs.map((log) => {
                    const isSuccess = !log.error;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 text-slate-300">
                          {new Date(log.run_at).toLocaleString()}
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {log.source}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                              isSuccess
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {isSuccess ? 'SUCCESS' : 'ERROR'}
                          </span>
                        </td>
                        <td className="p-4 text-emerald-400 font-bold">
                          +{log.jobs_added}
                        </td>
                        <td className="p-4 text-cyan-400 font-bold">
                          {log.jobs_updated}
                        </td>
                        <td className="p-4 text-slate-400 max-w-xs truncate text-[11px]">
                          {log.error || 'Pipeline executed cleanly'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* READ-ONLY STUDENT DETAIL SLIDE-OVER DRAWER */}
      {drawerStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-500 text-lg font-black text-white shadow-md">
                    {drawerStudent.profile?.name.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{drawerStudent.profile?.name}</h2>
                      <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        Candidate
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {drawerStudent.profile?.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentDrawerId(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Academic Overview Grid */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Verified CGPA</span>
                  <p className="mt-1 text-lg font-black text-emerald-400">
                    {drawerStudent.profile?.cgpa.toFixed(2)}
                  </p>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Degree & Branch</span>
                  <p className="mt-1 text-xs font-bold text-white truncate px-1">
                    {drawerStudent.profile?.degree} ({drawerStudent.profile?.branch})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Verified Skills</span>
                  <p className="mt-1 text-lg font-black text-cyan-400">
                    {drawerStudent.benchmarks.length}
                  </p>
                </div>
              </div>

              {/* SORTED VERIFIED SKILLS (Strongest to Weakest with Deterministic Badges) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    Verified Skill Benchmark Scores
                  </h3>
                  <span className="text-[11px] text-slate-500">Sorted Highest to Lowest</span>
                </div>

                {drawerStudent.benchmarks.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-500">
                    No verified skill test scores recorded for this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drawerStudent.benchmarks.map((bench) => {
                      // Deterministic Badging: >= 75 Strong, < 50 Needs Work, else Proficient
                      const isStrong = bench.score >= 75;
                      const isNeedsWork = bench.score < 50;

                      return (
                        <div
                          key={bench.id}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-xs">{bench.skill_category}</span>
                              <span className="text-[10px] text-slate-500 ml-2">
                                Verified {new Date(bench.verified_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isStrong ? (
                                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-emerald-400" /> Strong at
                                </span>
                              ) : isNeedsWork ? (
                                <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                  Needs work
                                </span>
                              ) : (
                                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                                  Proficient
                                </span>
                              )}

                              <span
                                className={`text-sm font-black ${
                                  isStrong
                                    ? 'text-emerald-400'
                                    : isNeedsWork
                                    ? 'text-rose-400'
                                    : 'text-indigo-300'
                                }`}
                              >
                                {bench.score}/100
                              </span>
                            </div>
                          </div>

                          {/* Score Progress Meter */}
                          <div className="h-1.5 w-full rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                isStrong
                                  ? 'bg-emerald-400'
                                  : isNeedsWork
                                  ? 'bg-rose-400'
                                  : 'bg-indigo-400'
                              }`}
                              style={{ width: `${Math.min(bench.score, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CANDIDATE'S TRACKED OPPORTUNITIES */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  Candidate Application Records ({drawerStudent.applications.length})
                </h3>

                {drawerStudent.applications.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-500">
                    No external company applications logged by this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drawerStudent.applications.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-white text-xs">{app.job?.title || 'Tech Role'}</p>
                            <p className="text-[11px] text-slate-400 font-semibold">{app.job?.company}</p>
                          </div>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                            {app.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <span>
                            Applied:{' '}
                            <strong className="text-slate-300">
                              {new Date(app.applied_at).toLocaleDateString()}
                            </strong>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            Fit: {app.skill_match_score}%
                          </span>
                        </div>

                        {app.company_application_url && (
                          <a
                            href={app.company_application_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            View Company Application Page
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Read-Only Notice Footer */}
            <div className="border-t border-slate-800 pt-4 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Read-only candidate telemetry. Scores and applications reflect ground truth.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
