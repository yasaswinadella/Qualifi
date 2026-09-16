import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { generateAssessmentWithAI } from '../../lib/aiServices';
import { AssessmentQuestion } from '../../types/database';
import {
  Sparkles,
  Save,
  CheckCircle2,
  FileCode,
  Layers,
  Trash2,
  Plus,
  Terminal,
  Clock,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export const AssessmentBuilder: React.FC = () => {
  const { addAssessmentWithQuestions } = useData();

  const [skill, setSkill] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [duration, setDuration] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);

  const [mcqList, setMcqList] = useState<
    Omit<AssessmentQuestion, 'assessment_id' | 'id' | 'order_index'>[]
  >([]);
  const [descList, setDescList] = useState<
    Omit<AssessmentQuestion, 'assessment_id' | 'id' | 'order_index'>[]
  >([]);

  const handleGenerate = async () => {
    if (!skill.trim()) {
      toast.error('Please specify a target skill domain');
      return;
    }
    try {
      setIsGenerating(true);
      toast.info('Synthesizing 10 MCQs and 5 Coding/System challenges with Gemini 2.5 Flash...');
      const res = await generateAssessmentWithAI(skill, difficulty);

      setMcqList(res.mcqs || []);
      setDescList(res.descriptive || []);
      toast.success(
        `Generated ${res.mcqs.length} MCQs and ${res.descriptive.length} Technical Challenges!`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!title.trim() || !skill.trim()) {
      toast.error('Title and Skill category are required');
      return;
    }
    if (mcqList.length === 0 && descList.length === 0) {
      toast.error('Generate or add questions before committing');
      return;
    }

    try {
      const combinedQuestions = [...mcqList, ...descList];
      await addAssessmentWithQuestions(
        {
          title,
          skill_category: skill,
          description: description || `${difficulty} placement evaluation for ${skill}.`,
          duration_minutes: duration,
          is_active: true,
        },
        combinedQuestions
      );

      setMcqList([]);
      setDescList([]);
      toast.success(
        'Committed assessment to live catalogue! Candidates can now take this benchmark.'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to commit assessment');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI Assessment Question Studio
          </h1>
          <p className="text-xs text-slate-400">
            Synthesize 2-round technical placement benchmarks with Gemini 2.5 Flash and commit directly to the verified catalog.
          </p>
        </div>
        <span className="rounded-full bg-brandIndigo/10 px-3 py-1 text-xs font-bold text-brandIndigo flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin Assessment Ops
        </span>
      </div>

      {/* Generation Config Card */}
      <div className="rounded-2xl border border-borderSubtle bg-card p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brandAmber" /> Benchmark Synthesis Controls
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Skill Domain Category</label>
            <input
              type="text"
              placeholder="e.g. Distributed SQL, Golang, PyTorch, React"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Assessment Title</label>
            <input
              type="text"
              placeholder="e.g. Production Concurrency Benchmark"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Difficulty Tier</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Fundamental">Fundamental</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Senior Architecture">Senior Architecture</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Time Limit (Minutes)</label>
            <input
              type="number"
              min="15"
              max="120"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 45)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-300">Overview Description</label>
            <input
              type="text"
              placeholder="Summary of topics evaluated..."
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <button
          disabled={isGenerating}
          onClick={handleGenerate}
          className="flex items-center gap-2 rounded-xl bg-brandIndigo px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-600 transition shadow-lg shadow-brandIndigo/20 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? 'Synthesizing with Gemini 2.5 Flash...' : 'Generate 2-Round Assessment'}
        </button>
      </div>

      {/* Generated Questions Review Studio */}
      {(mcqList.length > 0 || descList.length > 0) && (
        <div className="rounded-2xl border border-borderSubtle bg-card p-6 space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-borderSubtle pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Generated Question Bank Review</h3>
              <p className="text-xs text-slate-400">
                {mcqList.length} Round 1 MCQs • {descList.length} Round 2 Coding/Descriptive Challenges
              </p>
            </div>

            <button
              onClick={handleCommit}
              className="flex items-center gap-2 rounded-xl bg-brandEmerald px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-600 transition shadow-lg shadow-brandEmerald/20"
            >
              <Save className="h-4 w-4" /> Commit to Active Catalog
            </button>
          </div>

          {/* Round 1 MCQs List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-brandIndigo uppercase tracking-wider">
              Round 1: Deterministic MCQs ({mcqList.length} Items)
            </h4>
            <div className="space-y-3">
              {mcqList.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-borderSubtle bg-obsidian p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-xs text-white">
                      Q{idx + 1}. {q.question_text}
                    </p>
                    <button
                      onClick={() => setMcqList(mcqList.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-brandRose"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`rounded-lg px-3 py-1.5 text-[11px] border ${
                            q.correct_answer === String(oIdx)
                              ? 'border-brandEmerald/40 bg-brandEmerald/10 text-brandEmerald font-bold'
                              : 'border-borderSubtle bg-card text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Round 2 Coding & Descriptive List */}
          <div className="space-y-3 border-t border-borderSubtle pt-4">
            <h4 className="text-xs font-bold text-brandPurple uppercase tracking-wider">
              Round 2: Coding & Architecture ({descList.length} Items)
            </h4>
            <div className="space-y-3">
              {descList.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-borderSubtle bg-obsidian p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brandPurple/15 px-2 py-0.5 text-[10px] font-bold text-brandPurple">
                        {q.type}
                      </span>
                      <p className="font-semibold text-xs text-white">
                        Challenge {idx + 1}: {q.question_text}
                      </p>
                    </div>
                    <button
                      onClick={() => setDescList(descList.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-brandRose"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {q.starter_code && (
                    <div className="rounded-lg bg-black/60 p-2.5 font-mono text-[10px] text-emerald-400 whitespace-pre-wrap">
                      {q.starter_code}
                    </div>
                  )}

                  {q.rubric && (
                    <p className="text-[10px] text-slate-400">
                      Rubric:{' '}
                      {Object.entries(q.rubric)
                        .map(([k, v]) => `${k} (${v} pts)`)
                        .join(' • ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
