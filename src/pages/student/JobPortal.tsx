import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getEligibilityBreakdown } from '../../lib/qualifiEngine';
import { Job, EligibilityResult } from '../../types/database';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Info,
  Search,
  Briefcase,
  GraduationCap,
  ExternalLink,
  DollarSign,
  Check,
  Building2,
  ArrowUpRight,
  Filter,
  Globe,
  SlidersHorizontal,
  X,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export const JobPortal: React.FC = () => {
  const { jobs, benchmarks, applyForJob, applications } = useData();
  const { user } = useAuth();

  const [inspectModal, setInspectModal] = useState<{ job: Job; result: EligibilityResult } | null>(null);
  const [detailModal, setDetailModal] = useState<{ job: Job; result: EligibilityResult } | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterWorkMode, setFilterWorkMode] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [minStipendFilter, setMinStipendFilter] = useState<number>(0);
  const [onlyEligible, setOnlyEligible] = useState<boolean>(false);
  const [locationQuery, setLocationQuery] = useState<string>('');

  if (!user) return null;

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const eligibility = getEligibilityBreakdown(user, job, benchmarks);

      // Filter by eligibility
      if (onlyEligible && !eligibility.isEligible) return false;

      // Filter by type
      if (filterType !== 'ALL' && job.type !== filterType) return false;

      // Filter by work mode
      if (filterWorkMode !== 'ALL' && job.work_mode !== filterWorkMode) return false;

      // Filter by source
      if (filterSource !== 'ALL') {
        const jobSource = job.source || 'MANUAL';
        if (jobSource.toUpperCase() !== filterSource.toUpperCase()) return false;
      }

      // Filter by min stipend
      if (minStipendFilter > 0 && (job.min_stipend || 0) < minStipendFilter) return false;

      // Filter by location query
      if (locationQuery.trim()) {
        const locQ = locationQuery.toLowerCase();
        if (!job.location?.toLowerCase().includes(locQ)) return false;
      }

      // Search query (title, company, required skill names)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(q);
        const matchCompany = job.company.toLowerCase().includes(q);
        const matchSkill = job.required_skills?.some((s) => s.skill.toLowerCase().includes(q));
        if (!matchTitle && !matchCompany && !matchSkill) return false;
      }

      return true;
    });
  }, [jobs, user, benchmarks, onlyEligible, filterType, filterWorkMode, filterSource, minStipendFilter, locationQuery, searchTerm]);

  const handleApplyClick = async (job: Job, eligibility: EligibilityResult) => {
    try {
      await applyForJob(job, eligibility.matchScore, eligibility.hardCriteriaPassed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log application');
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source?.toUpperCase()) {
      case 'ADZUNA':
        return { label: 'Adzuna Ingested', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' };
      case 'GREENHOUSE':
        return { label: 'Greenhouse API', color: 'border-teal-500/30 bg-teal-500/10 text-teal-400' };
      case 'LEVER':
        return { label: 'Lever ATS', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' };
      default:
        return { label: 'Verified Direct', color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/60 border border-indigo-500/20 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Direct Company Application Tracker
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Verified Internships & Career Openings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Real institutional positions from top tech companies and ATS feeds. Clicking Apply opens the official corporate portal and tracks your progress deterministically.
            </p>
          </div>

          {/* Student Profile Quick Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs text-slate-300 shadow-lg backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{user.full_name}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                CGPA: <strong className="text-emerald-400">{user.cgpa?.toFixed(2) || '8.80'}</strong> &bull; Verified Skills:{' '}
                <strong className="text-cyan-400">{benchmarks.length}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md space-y-4">
        {/* Row 1: Search and Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by role, company name, or required technical skills..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter location (e.g. Remote, Bangalore, SF)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Select Filters & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Job Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="INTERNSHIP">Internships</option>
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="PPO">PPO</option>
              </select>
            </div>

            {/* Work Mode Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Mode:</span>
              <select
                value={filterWorkMode}
                onChange={(e) => setFilterWorkMode(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>

            {/* Ingestion Source Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Source:</span>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="ADZUNA">Adzuna Ingestion</option>
                <option value="GREENHOUSE">Greenhouse ATS</option>
                <option value="LEVER">Lever ATS</option>
                <option value="MANUAL">Direct Postings</option>
              </select>
            </div>

            {/* Min Stipend Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Min Pay:</span>
              <select
                value={minStipendFilter}
                onChange={(e) => setMinStipendFilter(Number(e.target.value))}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value={0}>Any Pay / Stipend</option>
                <option value={15000}>&ge; ₹15,000/mo</option>
                <option value={25000}>&ge; ₹25,000/mo</option>
                <option value={50000}>&ge; ₹50,000/mo</option>
              </select>
            </div>
          </div>

          {/* Qualified for me toggle */}
          <button
            onClick={() => setOnlyEligible(!onlyEligible)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              onlyEligible
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Show Qualified For Me Only</span>
            {onlyEligible && <Check className="w-3 h-3 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Opportunities Count & Results */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-400">
          Showing <span className="text-white font-bold">{filteredJobs.length}</span> verified opportunities
        </p>
      </div>

      {/* Opportunities Grid */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-400 space-y-3">
          <Briefcase className="h-10 w-10 mx-auto text-slate-600" />
          <p className="font-bold text-slate-300 text-sm">
            {jobs.length === 0
              ? 'No verified opportunities posted yet'
              : 'No matching opportunities found'}
          </p>
          <p className="max-w-md mx-auto text-slate-400 leading-relaxed">
            {jobs.length === 0
              ? 'The platform begins clean with zero fake jobs. When administrators post positions or the automated ATS pipeline runs, real career openings will appear here.'
              : 'Try clearing some of your filters or search keywords to explore more roles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const eligibility = getEligibilityBreakdown(user, job, benchmarks);
            const existingApp = applications.find((a) => a.job_id === job.id && a.student_id === user.id);
            const hasApplied = Boolean(existingApp);
            const srcBadge = getSourceBadge(job.source);

            return (
              <div
                key={job.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-slate-700 hover:shadow-xl shadow-md backdrop-blur-sm group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                        {job.type}
                      </span>
                      {job.work_mode && (
                        <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {job.work_mode}
                        </span>
                      )}
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${srcBadge.color}`}>
                        {srcBadge.label}
                      </span>
                    </div>

                    <button
                      onClick={() => setInspectModal({ job, result: eligibility })}
                      title="Inspect eligibility diagnostic math"
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition hover:scale-105 shrink-0 ${
                        eligibility.isEligible
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <span>{eligibility.matchScore}% Fit</span>
                      <Info className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Company & Title Header */}
                  <div className="mt-3.5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 font-black text-base shadow-inner group-hover:border-indigo-500/40 transition">
                      {job.company.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white leading-snug truncate group-hover:text-indigo-300 transition">
                        {job.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{job.company}</p>
                    </div>
                  </div>

                  {/* Location & Compensation */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    {job.stipend && (
                      <div className="flex items-center gap-1 text-emerald-400 font-medium">
                        <DollarSign className="h-3 w-3" />
                        <span>{job.stipend}</span>
                      </div>
                    )}
                  </div>

                  {/* Description preview */}
                  <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Required Skill Weights */}
                  {job.required_skills && job.required_skills.length > 0 && (
                    <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Required Benchmarks
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.map((req) => {
                          const userScore = benchmarks.find(
                            (b) => b.skill_category.toLowerCase() === req.skill.toLowerCase()
                          )?.score || 0;
                          const satisfies = userScore >= req.min_score;

                          return (
                            <span
                              key={req.skill}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                                satisfies
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-slate-800 bg-slate-950 text-slate-400'
                              }`}
                            >
                              {req.skill} (req: {req.min_score}%)
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hard Criteria Gate */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <span>Min CGPA: <strong className="text-white">{job.min_cgpa?.toFixed(2) || '7.00'}</strong></span>
                    <span className={eligibility.hardCriteriaPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {eligibility.hardCriteriaPassed ? 'Gate: Passed' : 'Gate: Below Cutoff'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 border-t border-slate-800/80 pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetailModal({ job, result: eligibility })}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                    >
                      View Details
                    </button>

                    <button
                      disabled={!eligibility.isEligible}
                      onClick={() => handleApplyClick(job, eligibility)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition shadow-lg ${
                        !eligibility.isEligible
                          ? 'cursor-not-allowed bg-slate-800/40 border border-slate-800 text-slate-600'
                          : hasApplied
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/20'
                      }`}
                    >
                      {hasApplied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Re-apply
                          <ExternalLink className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span>Apply</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {hasApplied && (
                    <p className="text-center text-[10px] text-slate-400">
                      Tracked in your applications &bull; Status: <strong className="text-indigo-400 font-semibold">{existingApp?.status.replace(/_/g, ' ')}</strong>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL JOB DETAIL MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 font-black text-xl shadow-inner">
                  {detailModal.job.company.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{detailModal.job.title}</h2>
                  <p className="text-xs font-semibold text-slate-300">{detailModal.job.company}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                      {detailModal.job.type}
                    </span>
                    {detailModal.job.work_mode && (
                      <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {detailModal.job.work_mode}
                      </span>
                    )}
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      {detailModal.job.location}
                    </span>
                    {detailModal.job.stipend && (
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {detailModal.job.stipend}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetailModal(null)}
                className="rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white p-1.5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ingestion Source Info */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Job Ingestion Source: <strong className="text-white">{detailModal.job.source || 'Direct Verified Posting'}</strong></span>
              </div>
              {detailModal.job.external_id && (
                <span className="text-[11px] text-slate-500 font-mono">ID: {detailModal.job.external_id}</span>
              )}
            </div>

            {/* Role Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Role Description</h3>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {detailModal.job.description}
              </div>
            </div>

            {/* Required Skills & Benchmark Weighting */}
            {detailModal.job.required_skills && detailModal.job.required_skills.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Required Competencies & Matching
                  </h3>
                  <span className="text-xs font-bold text-indigo-400">
                    Your Match Fit: {detailModal.result.matchScore}%
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {detailModal.job.required_skills.map((req) => {
                    const userScore = benchmarks.find(
                      (b) => b.skill_category.toLowerCase() === req.skill.toLowerCase()
                    )?.score || 0;
                    const passes = userScore >= req.min_score;

                    return (
                      <div key={req.skill} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">
                            {req.skill} <span className="text-slate-500 font-normal">({req.weight}% weight)</span>
                          </span>
                          <span className={passes ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            Your Score: {userScore}% / Req: {req.min_score}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${passes ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(userScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setDetailModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Close
              </button>

              <button
                disabled={!detailModal.result.isEligible}
                onClick={() => {
                  handleApplyClick(detailModal.job, detailModal.result);
                  setDetailModal(null);
                }}
                className={`flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-bold transition shadow-lg ${
                  !detailModal.result.isEligible
                    ? 'cursor-not-allowed bg-slate-800 border border-slate-800 text-slate-500'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/25'
                }`}
              >
                <span>Apply on Official Company Portal</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT MATH DIAGNOSTIC MODAL */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Eligibility Criteria Breakdown</h3>
                <p className="text-xs text-slate-400">{inspectModal.job.title} &bull; {inspectModal.job.company}</p>
              </div>
              <button
                onClick={() => setInspectModal(null)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Hard Gate Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-1.5">
              <p className="font-bold text-slate-300">Deterministic Hard Gate Audit</p>
              {inspectModal.result.hardCriteriaPassed ? (
                <p className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Passed CGPA, Branch, and Degree criteria
                </p>
              ) : (
                <div className="text-rose-400 space-y-1">
                  {inspectModal.result.hardCriteriaReasons.map((r, i) => (
                    <p key={i} className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 shrink-0" /> {r}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Weighted Skills Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300">Weighted Skill Benchmarks</p>
                <span className="text-xs font-bold text-indigo-400">
                  Final Match: {inspectModal.result.matchScore}%
                </span>
              </div>

              {inspectModal.result.breakdown.map((item) => (
                <div key={item.skill} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{item.skill} ({item.weight}% weight)</span>
                    <span className={item.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      Your Score: {item.userScore}% / Req: {item.minScore}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${item.passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(item.userScore, 100)}%` }}
                    />
                  </div>

                  <p className="mt-1 text-[10px] text-slate-500 text-right">
                    Contribution: +{item.pointsEarned} pts towards match score
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setInspectModal(null)}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
            >
              Close Diagnostic Audit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
