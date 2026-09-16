import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { parseJobDescriptionWithAI } from '../../lib/aiServices';
import { RequiredSkill, JobType } from '../../types/database';
import {
  Sparkles,
  Plus,
  Trash2,
  Send,
  Eye,
  Briefcase,
  Layers,
  MapPin,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Globe,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

export const PostJob: React.FC = () => {
  const { createJob } = useData();
  const { user } = useAuth();
  const [rawJd, setRawJd] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'INTERNSHIP' as JobType,
    stipend: '',
    application_url: '',
    description: '',
    min_cgpa: 7.0,
    eligible_branches: ['Computer Science', 'Information Technology', 'Electrical Engineering'],
    eligible_degrees: ['B.Tech', 'M.Tech', 'BS', 'MS'],
    required_skills: [
      { skill: '', weight: 100, min_score: 70 },
    ] as RequiredSkill[],
  });

  const handleAiExtraction = async () => {
    if (!rawJd.trim()) {
      toast.error('Please paste a job description first');
      return;
    }
    try {
      setIsExtracting(true);
      toast.info('Extracting structured opportunity details using Gemini 2.5 Flash...');
      const extracted = await parseJobDescriptionWithAI(rawJd);

      // Check if URL or stipend is in raw text
      const urlMatch = rawJd.match(/https?:\/\/[^\s]+/i);
      const stipendMatch = rawJd.match(/(?:\$|₹|INR|USD)\s*[0-9,]+(?:\s*-\s*[0-9,]+)?(?:\s*\/\s*(?:hr|hour|mo|month|yr|year|week))?/i);

      setFormData((prev) => ({
        ...prev,
        title: extracted.title || prev.title,
        type: extracted.type || prev.type,
        min_cgpa: extracted.min_cgpa || prev.min_cgpa,
        stipend: stipendMatch ? stipendMatch[0] : prev.stipend,
        application_url: urlMatch ? urlMatch[0] : prev.application_url,
        eligible_branches: extracted.eligible_branches?.length
          ? extracted.eligible_branches
          : prev.eligible_branches,
        eligible_degrees: extracted.eligible_degrees?.length
          ? extracted.eligible_degrees
          : prev.eligible_degrees,
        required_skills: extracted.required_skills?.length
          ? extracted.required_skills
          : prev.required_skills,
        description: extracted.description_summary || prev.description,
      }));
      toast.success('Successfully parsed opportunity details and criteria!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const addSkill = () => {
    setFormData((prev) => ({
      ...prev,
      required_skills: [...prev.required_skills, { skill: '', weight: 10, min_score: 60 }],
    }));
  };

  const removeSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((_, idx) => idx !== index),
    }));
  };

  const normalizeWeights = () => {
    const total = formData.required_skills.reduce((acc, s) => acc + (s.weight || 0), 0);
    if (total === 0) return;
    const normalized = formData.required_skills.map((s) => ({
      ...s,
      weight: Math.round((s.weight / total) * 100),
    }));
    setFormData({ ...formData, required_skills: normalized });
    toast.success('Weights normalized to sum to 100%');
  };

  const totalWeight = formData.required_skills.reduce((acc, s) => acc + (s.weight || 0), 0);

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.title.trim()) {
      toast.error('Role title is required');
      return;
    }
    if (!formData.company.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Location or work mode is required');
      return;
    }
    if (!formData.application_url.trim() || !formData.application_url.startsWith('http')) {
      toast.error('Please enter a valid official application URL starting with http:// or https://');
      return;
    }
    const validSkills = formData.required_skills.filter((s) => s.skill.trim());
    if (validSkills.length === 0) {
      toast.error('At least one required skill benchmark is needed');
      return;
    }

    try {
      await createJob({
        admin_id: user.id,
        title: formData.title.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        type: formData.type,
        stipend: formData.stipend.trim(),
        application_url: formData.application_url.trim(),
        description: formData.description.trim(),
        required_skills: validSkills,
        min_cgpa: formData.min_cgpa,
        eligible_branches: formData.eligible_branches,
        eligible_degrees: formData.eligible_degrees,
        status: 'OPEN',
      });
      toast.success('Real opportunity published for students!');
      setRawJd('');
      setFormData({
        title: '',
        company: '',
        location: '',
        type: 'INTERNSHIP',
        stipend: '',
        application_url: '',
        description: '',
        min_cgpa: 7.0,
        eligible_branches: ['Computer Science', 'Information Technology', 'Electrical Engineering'],
        eligible_degrees: ['B.Tech', 'M.Tech', 'BS', 'MS'],
        required_skills: [{ skill: '', weight: 100, min_score: 70 }],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post opportunity');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Post Verified Opportunity</h1>
          <p className="text-xs text-slate-400">
            Publish real tech internships and jobs with verified company career links and deterministic qualification cutoffs.
          </p>
        </div>
        <span className="rounded-full bg-brandIndigo/10 px-3 py-1 text-xs font-bold text-brandIndigo flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin Portal
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Form & JD Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unstructured JD Parsing Box */}
          <div className="rounded-2xl border border-borderSubtle bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brandAmber" /> Auto-Extract from Job Posting
              </label>
              <span className="text-[10px] text-slate-400">Powered by Gemini 2.5 Flash</span>
            </div>

            <textarea
              rows={4}
              className="w-full rounded-xl border border-borderSubtle bg-obsidian p-3 font-mono text-xs text-slate-200 focus:border-brandIndigo focus:outline-none"
              placeholder="Paste raw JD or career page text with requirements, cutoffs, and official application link..."
              value={rawJd}
              onChange={(e) => setRawJd(e.target.value)}
            />

            <button
              disabled={isExtracting}
              onClick={handleAiExtraction}
              className="flex items-center gap-2 rounded-xl bg-brandIndigo/20 border border-brandIndigo/40 px-4 py-2 text-xs font-bold text-brandIndigo hover:bg-brandIndigo/30 transition"
            >
              <Sparkles className="h-4 w-4" />
              {isExtracting ? 'Extracting details with Gemini...' : 'Auto-Extract Opportunity Details'}
            </button>
          </div>

          {/* Interactive Form Controls */}
          <div className="rounded-2xl border border-borderSubtle bg-card p-6 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-brandIndigo" /> Opportunity Details & Cutoffs
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Opportunity Title</label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Company Name</label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Location / Work Mode</label>
                <input
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Opportunity Type</label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as JobType })}
                >
                  <option value="INTERNSHIP">INTERNSHIP</option>
                  <option value="FULL_TIME">FULL_TIME</option>
                  <option value="PPO">PPO</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brandEmerald" /> Stipend / Compensation
                </label>
                <input
                  type="text"
                  placeholder="e.g. $55 - $75 / hr or ₹60,000 / mo"
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.stipend}
                  onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-brandIndigo" /> Official Application URL
                </label>
                <input
                  type="url"
                  placeholder="https://company.com/careers/role"
                  className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
                  value={formData.application_url}
                  onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Minimum CGPA Cutoff:{' '}
                  <strong className="text-brandEmerald text-sm">
                    {formData.min_cgpa.toFixed(1)}
                  </strong>
                </label>
                <span className="text-[10px] text-slate-500">Deterministic Hard Gate Filter</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                className="mt-2 w-full accent-brandIndigo"
                value={formData.min_cgpa}
                onChange={(e) =>
                  setFormData({ ...formData, min_cgpa: parseFloat(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Job Description & Scope
              </label>
              <textarea
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian p-3 text-xs text-white focus:border-brandIndigo focus:outline-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Required Skill Benchmarks */}
            <div className="space-y-3 border-t border-borderSubtle pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white">
                    Required Benchmark Weights & Thresholds
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Total Weight:{' '}
                    <strong
                      className={
                        totalWeight === 100 ? 'text-brandEmerald' : 'text-brandAmber'
                      }
                    >
                      {totalWeight}%
                    </strong>{' '}
                    (Must equal 100%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={normalizeWeights}
                    className="text-[11px] font-semibold text-brandIndigo hover:underline"
                  >
                    Auto-Normalize
                  </button>
                  <button
                    onClick={addSkill}
                    className="flex items-center gap-1 rounded-lg bg-brandIndigo/20 px-2.5 py-1 text-xs font-bold text-brandIndigo hover:bg-brandIndigo/30"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Skill
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {formData.required_skills.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-borderSubtle bg-obsidian p-3"
                  >
                    <input
                      type="text"
                      placeholder="Skill Category (e.g. React)"
                      className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                      value={req.skill}
                      onChange={(e) => {
                        const updated = [...formData.required_skills];
                        updated[idx].skill = e.target.value;
                        setFormData({ ...formData, required_skills: updated });
                      }}
                    />

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Min Score:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-14 rounded-lg bg-card px-2 py-1 text-xs text-white text-center"
                        value={req.min_score}
                        onChange={(e) => {
                          const updated = [...formData.required_skills];
                          updated[idx].min_score = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, required_skills: updated });
                        }}
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Weight:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-14 rounded-lg bg-card px-2 py-1 text-xs text-white text-center"
                        value={req.weight}
                        onChange={(e) => {
                          const updated = [...formData.required_skills];
                          updated[idx].weight = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, required_skills: updated });
                        }}
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>

                    <button
                      onClick={() => removeSkill(idx)}
                      className="text-slate-500 hover:text-brandRose transition p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brandIndigo py-3 text-xs font-bold text-white transition hover:bg-indigo-600 shadow-lg shadow-brandIndigo/20"
            >
              <Send className="h-4 w-4" /> Publish Verified Opportunity
            </button>
          </div>
        </div>

        {/* Right Column: Live Candidate View Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Eye className="h-4 w-4 text-brandEmerald" /> Student Live Card Preview
          </div>

          <div className="rounded-2xl border border-brandIndigo/30 bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg bg-brandIndigo/15 px-2.5 py-0.5 text-[10px] font-bold text-brandIndigo">
                  {formData.type}
                </span>
                {formData.stipend && (
                  <span className="rounded-lg border border-brandEmerald/30 bg-brandEmerald/10 px-2 py-0.5 text-[10px] font-bold text-brandEmerald">
                    {formData.stipend}
                  </span>
                )}
              </div>
              <span className="rounded-full border border-brandEmerald/30 bg-brandEmerald/10 px-2.5 py-0.5 text-[10px] font-bold text-brandEmerald">
                Live Preview
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{formData.title || 'Role Title'}</h3>
              <p className="text-xs text-slate-300 font-medium">{formData.company || 'Company'}</p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-brandIndigo" />
                <span>{formData.location || 'Location'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 line-clamp-3">
              {formData.description || 'Job description summary...'}
            </p>

            <div className="space-y-1.5 border-t border-borderSubtle pt-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Benchmark Criteria
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formData.required_skills.map((req, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-borderSubtle bg-obsidian px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {req.skill || 'Skill'} ({req.weight}% wt • min: {req.min_score}%)
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-borderSubtle pt-3 text-[11px] text-slate-400 space-y-2">
              <div className="flex justify-between items-center">
                <span>
                  Min CGPA: <strong className="text-white">{formData.min_cgpa.toFixed(2)}</strong>
                </span>
                <span className="text-brandIndigo font-semibold flex items-center gap-1">
                  External Apply <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>

              <div className="rounded-xl bg-obsidian p-2.5 text-[10px] text-slate-400 truncate">
                <span className="text-slate-500">Official Link: </span>
                <span className="text-brandIndigo">{formData.application_url}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

