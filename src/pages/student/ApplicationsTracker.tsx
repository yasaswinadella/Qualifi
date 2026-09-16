import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ApplicationStatus, Application } from '../../types/database';
import {
  Calendar,
  Video,
  CheckCircle2,
  Award,
  Layers,
  ArrowRight,
  ExternalLink,
  Briefcase,
  AlertCircle,
  Building2,
  Edit3,
  Save,
  Plus,
  Clock,
  ChevronDown,
  XCircle,
  Check,
  Globe,
  Sparkles,
  FileText,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  APPLIED_EXTERNALLY: {
    label: 'Applied Externally',
    color: 'text-slate-300',
    border: 'border-slate-700',
    bg: 'bg-slate-800/60',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    color: 'text-brandAmber',
    border: 'border-brandAmber/40',
    bg: 'bg-brandAmber/10',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Interview Scheduled',
    color: 'text-brandIndigo',
    border: 'border-brandIndigo/40',
    bg: 'bg-brandIndigo/10',
  },
  OFFER: {
    label: 'Offer Received',
    color: 'text-brandEmerald',
    border: 'border-brandEmerald/40',
    bg: 'bg-brandEmerald/10',
  },
  REJECTED: {
    label: 'Not Selected',
    color: 'text-brandRose',
    border: 'border-brandRose/40',
    bg: 'bg-brandRose/10',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'text-slate-500',
    border: 'border-slate-800',
    bg: 'bg-slate-900',
  },
};

const STATUS_OPTIONS: ApplicationStatus[] = [
  'APPLIED_EXTERNALLY',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

export const ApplicationsTracker: React.FC = () => {
  const { applications, updateApplicationStatus } = useData();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INTERVIEW' | 'OFFER' | 'CONCLUDED'>('ALL');

  // Inline notes editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  // Interview coordinator editing modal
  const [editingInterviewApp, setEditingInterviewApp] = useState<Application | null>(null);
  const [interviewTimeInput, setInterviewTimeInput] = useState('');
  const [interviewLinkInput, setInterviewLinkInput] = useState('');

  const filteredApps = applications.filter((app) => {
    if (filter === 'INTERVIEW') return app.status === 'INTERVIEW_SCHEDULED';
    if (filter === 'OFFER') return app.status === 'OFFER';
    if (filter === 'ACTIVE') return app.status !== 'REJECTED' && app.status !== 'WITHDRAWN';
    if (filter === 'CONCLUDED') return app.status === 'REJECTED' || app.status === 'WITHDRAWN';
    return true;
  });

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      toast.success(`Application status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async (app: Application) => {
    try {
      await updateApplicationStatus(app.id, app.status, app.interview_time, app.interview_link, notesDraft);
      setEditingNotesId(null);
      toast.success('Application notes saved');
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const handleSaveInterviewDetails = async () => {
    if (!editingInterviewApp) return;
    try {
      await updateApplicationStatus(
        editingInterviewApp.id,
        'INTERVIEW_SCHEDULED',
        interviewTimeInput || editingInterviewApp.interview_time,
        interviewLinkInput || editingInterviewApp.interview_link,
        editingInterviewApp.notes
      );
      setEditingInterviewApp(null);
      toast.success('Interview coordinates updated');
    } catch (err) {
      toast.error('Failed to save interview details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Personal Application Tracker</h1>
          <p className="text-xs text-slate-400">
            Monitor and manually update the status of your external internship applications, log recruiter notes, and organize upcoming interviews.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-borderSubtle bg-card p-1">
          {[
            { id: 'ALL', label: `All (${applications.length})` },
            { id: 'ACTIVE', label: 'In Progress' },
            { id: 'INTERVIEW', label: 'Interviews' },
            { id: 'OFFER', label: 'Offers' },
            { id: 'CONCLUDED', label: 'Concluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? 'bg-brandIndigo text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-borderSubtle bg-card p-12 text-center text-xs text-slate-400 space-y-3">
          <Layers className="h-8 w-8 mx-auto text-slate-500" />
          <p className="font-bold text-slate-300">No applications found in this filter view.</p>
          <NavLink
            to="/student/jobs"
            className="inline-flex items-center gap-1 text-xs font-bold text-brandIndigo hover:underline"
          >
            <span>Explore Verified Opportunities & Apply</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </NavLink>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED_EXTERNALLY;
            const isOffer = app.status === 'OFFER';
            const isInterview = app.status === 'INTERVIEW_SCHEDULED';
            const isEditingThisNote = editingNotesId === app.id;

            return (
              <div
                key={app.id}
                className={`rounded-2xl border bg-card p-6 space-y-5 transition shadow-sm ${
                  isOffer
                    ? 'border-brandEmerald/50 bg-gradient-to-br from-brandEmerald/[0.03] to-card'
                    : isInterview
                    ? 'border-brandIndigo/50 bg-gradient-to-br from-brandIndigo/[0.03] to-card'
                    : 'border-borderSubtle'
                }`}
              >
                {/* Top Row: Title, Company, Applied Date & Status Selector */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start border-b border-borderSubtle pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{app.job?.title || 'Engineering Role'}</h3>
                      <span className="rounded-md bg-brandIndigo/15 px-2.5 py-0.5 text-[10px] font-bold text-brandIndigo">
                        {app.job?.type || 'INTERNSHIP'}
                      </span>
                      {app.job?.stipend && (
                        <span className="rounded-md border border-brandEmerald/30 bg-brandEmerald/10 px-2 py-0.5 text-[10px] font-bold text-brandEmerald">
                          {app.job.stipend}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-300 font-semibold">{app.job?.company || 'Company'}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>
                        Verified Fit: <strong className="text-brandEmerald">{app.skill_match_score}%</strong>
                      </span>
                      {app.company_application_url && (
                        <>
                          <span>•</span>
                          <a
                            href={app.company_application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-brandIndigo font-semibold hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            Official Career Portal
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive Status Selector Dropdown */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Your Current Status</label>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none transition cursor-pointer ${statusConfig.border} ${statusConfig.bg} ${statusConfig.color}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-obsidian text-slate-200">
                          {STATUS_CONFIG[opt]?.label || opt}
                        </option>
                      ))}
                    </select>
                    {app.last_updated_by_student && (
                      <span className="text-[9px] text-slate-500">
                        Updated {new Date(app.last_updated_by_student).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Interview Information Card */}
                {isInterview && (
                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-brandIndigo/40 bg-brandIndigo/10 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brandIndigo/20 text-brandIndigo shrink-0">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Interview Scheduled</p>
                        <p className="text-[11px] text-slate-300">
                          {app.interview_time
                            ? `Scheduled: ${new Date(app.interview_time).toLocaleString()}`
                            : 'No date logged yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingInterviewApp(app);
                          setInterviewTimeInput(app.interview_time || '');
                          setInterviewLinkInput(app.interview_link || '');
                        }}
                        className="rounded-xl border border-brandIndigo/40 bg-card px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                      >
                        {app.interview_time || app.interview_link ? 'Edit Schedule Details' : '+ Add Schedule Details'}
                      </button>

                      {app.interview_link && (
                        <a
                          href={app.interview_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-xl bg-brandIndigo px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600 transition"
                        >
                          <Video className="h-3.5 w-3.5" /> Open Meeting Link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Offer Banner */}
                {isOffer && (
                  <div className="flex items-center gap-3 rounded-xl border border-brandEmerald/40 bg-brandEmerald/10 p-4">
                    <Award className="h-6 w-6 text-brandEmerald shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brandEmerald">Offer Received! 🎉</p>
                      <p className="text-[11px] text-slate-300">
                        You recorded an offer from {app.job?.company}. You can log offer details or start date in your personal notes below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Student Personal Notes Section */}
                <div className="rounded-xl border border-borderSubtle bg-obsidian/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-brandIndigo" /> Personal Notes & Interview Prep
                    </span>

                    {!isEditingThisNote ? (
                      <button
                        onClick={() => {
                          setEditingNotesId(app.id);
                          setNotesDraft(app.notes || '');
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brandIndigo hover:underline"
                      >
                        <Edit3 className="h-3 w-3" /> Edit Notes
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNotes(app)}
                          className="flex items-center gap-1 rounded-lg bg-brandIndigo px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-600"
                        >
                          <Save className="h-3 w-3" /> Save
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingThisNote ? (
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-borderSubtle bg-card p-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                      placeholder="e.g., Recruiter contact info, referral name, round 1 technical topics, take-home repository URL..."
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      {app.notes || 'No notes added yet. Click Edit Notes to track interview rounds, recruiter contacts, or preparation links.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Interview Details Modal */}
      {editingInterviewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Update Interview Details</h3>
                <p className="text-xs text-slate-400">
                  {editingInterviewApp.job?.company} • {editingInterviewApp.job?.title}
                </p>
              </div>
              <button
                onClick={() => setEditingInterviewApp(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Interview Date & Time</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-borderSubtle bg-obsidian p-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={interviewTimeInput}
                  onChange={(e) => setInterviewTimeInput(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Video Call Link (Google Meet, Zoom, etc.)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  className="mt-1 w-full rounded-xl border border-borderSubtle bg-obsidian p-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={interviewLinkInput}
                  onChange={(e) => setInterviewLinkInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-borderSubtle pt-4">
              <button
                onClick={() => setEditingInterviewApp(null)}
                className="rounded-xl border border-borderSubtle px-4 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInterviewDetails}
                className="flex items-center gap-1.5 rounded-xl bg-brandIndigo px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600 transition"
              >
                <Check className="h-3.5 w-3.5" /> Save Coordinates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

