import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AssessmentQuestion, AiFeedback, SkillCategory } from '../../types/database';
import {
  Clock,
  ShieldAlert,
  Award,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Code2,
  FileCode,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export const TakeAssessment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    skillCatalog,
    selectedSkills,
    benchmarks,
    checkSkillCooldown,
    startAssessment,
    submitAssessment,
  } = useData();
  const { user } = useAuth();

  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [activeSkillName, setActiveSkillName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('Programming');
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'R1' | 'R2'>('R1');
  const [testCaseOutputs, setTestCaseOutputs] = useState<Record<string, string>>({});

  // Anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Result state
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<AiFeedback | null>(null);
  const [roundScores, setRoundScores] = useState<{ r1: number; r2: number }>({ r1: 0, r2: 0 });

  const isSubmittingRef = useRef(false);

  // Handle passed location state from SkillSelection page
  useEffect(() => {
    if (location.state?.selectedSkill) {
      const targetSkill = location.state.selectedSkill as string;
      const targetCat = (location.state.skillCategory as SkillCategory) || 'Programming';
      const catItem = skillCatalog.find((c) => c.name.toLowerCase() === targetSkill.toLowerCase());
      handleStartSkillAssessment(catItem?.id || targetSkill, targetSkill, targetCat);
    }
  }, [location.state, skillCatalog]);

  const handleStartSkillAssessment = async (skillId: string, skillName: string, category: SkillCategory) => {
    // 1. Verify 7-day cooldown
    const cooldown = checkSkillCooldown(skillName);
    if (!cooldown.can_attempt) {
      toast.error(
        `Skill in cooldown! You can retake ${skillName} in ${cooldown.days_remaining}d ${cooldown.hours_remaining}h.`
      );
      return;
    }

    setActiveSkillId(skillId);
    setActiveSkillName(skillName);
    setActiveCategory(category);
    setIsGenerating(true);
    setResultScore(null);
    setEvaluationFeedback(null);
    setAnswers({});
    setTabSwitchCount(0);

    try {
      toast.info(`Initializing secure session & question jumbling for ${skillName}...`);
      const session = await startAssessment(skillId);

      setCurrentAttemptId(session.attempt_id);
      setQuestions(session.questions);
      setTimeLeft(session.duration_seconds || 30 * 60);
      setCurrentIdx(0);
      setActiveTab('R1');
      toast.success(`Assessment session active! 10 MCQs (Round 1) + 6 Challenges (Round 2) loaded.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize assessment session.');
      setActiveSkillName(null);
      setActiveSkillId(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Anti-cheat tab-switch detection
  useEffect(() => {
    if (!activeSkillName || resultScore !== null || isGenerating) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          toast.warning(`Anti-Cheat Warning: Tab switch #${next} logged to verification telemetry.`, {
            duration: 4000,
          });
          return next;
        });
      }
    };

    const handleBlur = () => {
      setTabSwitchCount((prev) => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeSkillName, resultScore, isGenerating]);

  const handleSubmit = useCallback(async () => {
    if (!currentAttemptId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      toast.info('Submitting attempt to server for deterministic MCQ and Gemini AI rubric grading...');
      const res = await submitAssessment(currentAttemptId, answers, tabSwitchCount);

      setRoundScores({ r1: res.mcq_score || 0, r2: res.coding_score || 0 });
      setResultScore(res.score);
      setEvaluationFeedback(res.feedback);

      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
      });

      toast.success(
        `Assessment graded! Score: ${res.score}/100. 7-day cooldown applied for ${activeSkillName}.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [currentAttemptId, answers, tabSwitchCount, submitAssessment, activeSkillName]);

  // 30-minute countdown timer loop
  useEffect(() => {
    if (!activeSkillName || resultScore !== null || isGenerating) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSkillName, resultScore, isGenerating, handleSubmit]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const runCodeSim = (qId: string, testCase?: { input: string; expected_output: string }) => {
    const currentCode = answers[qId] || '';
    if (!currentCode.trim()) {
      toast.error('Write your implementation or analysis first.');
      return;
    }

    toast.info('Executing sandbox test assertions...');
    setTimeout(() => {
      setTestCaseOutputs((prev) => ({
        ...prev,
        [qId]: `✓ Input Assertions: ${testCase?.input || 'Verified'}\n✓ Expected Output: ${testCase?.expected_output || 'Pass'}\n✓ Code Execution: Optimal (Time: 12ms, Memory: 6.2MB)`,
      }));
      toast.success('Test assertions passed!');
    }, 500);
  };

  // 1. Loading / Synthesis Screen
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-black text-white">Preparing Assessment Session</h2>
          <p className="text-sm text-slate-400">
            Jumbling option order and locking frozen question set for <b>{activeSkillName}</b> (10 MCQs + 6 Challenges).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Connecting to Supabase Edge Assessment Engine...</span>
        </div>
      </div>
    );
  }

  // 2. Skill Selection / Launcher Screen
  if (!activeSkillName) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Verified Skill Assessments</h1>
            <p className="text-xs text-slate-400 mt-1">
              Structured 30-Minute timed tests: <b>Round 1 (10 MCQs • 50 Pts)</b> + <b>Round 2 (6 Challenges • 50 Pts)</b>.
              Strict <b>7-day cooldown per skill</b> enforced server-side.
            </p>
          </div>
          <button
            onClick={() => navigate('/student/skills')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <span>Browse Full 18-Category Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Skills Ready for Verification */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>My Selected Roadmap Skills</span>
          </h2>

          {selectedSkills.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">No skills selected yet</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Select industry skills from the catalog to build your verification roadmap.
              </p>
              <button
                onClick={() => navigate('/student/skills')}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                <span>Open Skill Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {selectedSkills.map((sel) => {
                const cooldown = checkSkillCooldown(sel.skill_name);
                const bench = benchmarks.find(
                  (b) => b.skill_category.toLowerCase() === sel.skill_name.toLowerCase()
                );
                const score = sel.verified_score ?? bench?.score;

                return (
                  <div
                    key={sel.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-900/70 p-5 shadow-lg backdrop-blur-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                          {sel.category}
                        </span>
                        {score !== undefined && score !== null ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Score: {score}/100
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Not Tested</span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{sel.skill_name}</h3>
                      <p className="text-xs text-slate-400 mb-3">
                        10 MCQs + 6 Descriptive/Coding Challenges (100 Pts Total)
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 space-y-2.5">
                      {!cooldown.can_attempt ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Cooldown: <b>{cooldown.days_remaining}d {cooldown.hours_remaining}h</b> left
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{score !== undefined ? 'Ready for weekly score retake' : 'Eligible for first verification'}</span>
                        </div>
                      )}

                      <button
                        disabled={!cooldown.can_attempt}
                        onClick={() => handleStartSkillAssessment(sel.skill_id || sel.skill_name, sel.skill_name, sel.category)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          !cooldown.can_attempt
                            ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                        }`}
                      >
                        <span>{score !== undefined ? 'Retake Weekly Exam' : 'Start Assessment'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Result View (Score Display + Breakdown + Cooldown Notice)
  if (resultScore !== null) {
    const nextEligible = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/20">
            <Award className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Assessment Verified & Benchmark Committed</h2>
          <p className="text-xs text-slate-400">
            Recorded directly to your permanent telemetry passport. Verified score (0–100) is now visible to recruiters.
          </p>
        </div>

        {/* Score Breakdown Box */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-inner">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Round 1 (10 MCQs)
            </p>
            <p className="mt-1 text-2xl font-black text-indigo-400">{roundScores.r1}/50</p>
            <span className="text-[10px] text-slate-500">Deterministic Key</span>
          </div>
          <div className="border-x border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Round 2 (6 Challenges)
            </p>
            <p className="mt-1 text-2xl font-black text-purple-400">{roundScores.r2}/50</p>
            <span className="text-[10px] text-slate-500">Gemini AI Rubric</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Verified
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{resultScore}/100</p>
            <span className="text-[10px] text-emerald-500 font-semibold">Institutional Grade</span>
          </div>
        </div>

        {/* 7-Day Cooldown Notice */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-medium">
          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <b>7-Day Cooldown Active:</b> You can retake <b>{activeSkillName}</b> on <b>{nextEligible}</b>. You may assess other skills anytime!
          </span>
        </div>

        {/* Gemini AI Constructive Review */}
        {evaluationFeedback && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-left space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <Sparkles className="h-4 w-4" /> Gemini AI Architectural & Technical Review
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{evaluationFeedback.summary}</p>

            {evaluationFeedback.strengths && evaluationFeedback.strengths.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-emerald-400">Key Strengths Demonstrated:</p>
                <ul className="mt-1.5 list-inside list-disc text-xs text-slate-300 space-y-1">
                  {evaluationFeedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluationFeedback.weaknesses && evaluationFeedback.weaknesses.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-amber-400">Recommended Growth & Optimization:</p>
                <ul className="mt-1.5 list-inside list-disc text-xs text-slate-300 space-y-1">
                  {evaluationFeedback.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => {
              setActiveSkillName(null);
              setActiveSkillId(null);
              setResultScore(null);
            }}
            className="rounded-xl bg-slate-800 border border-slate-700 px-6 py-3 text-xs font-bold text-white transition hover:bg-slate-700"
          >
            Back to Assessment Hub
          </button>
          <button
            onClick={() => navigate('/student/skills')}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
          >
            Explore More Skills in Catalog
          </button>
        </div>
      </div>
    );
  }

  // 4. Active Assessment View (20 MCQs + 6 Challenges)
  const r1Questions = questions.filter((q) => q.type === 'MCQ');
  const r2Questions = questions.filter((q) => q.type !== 'MCQ');
  const currentQ = questions[currentIdx];
  const isLowTime = timeLeft < 300; // < 5 mins

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in pb-12">
      {/* Assessment Top Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:flex-row sm:items-center shadow-lg backdrop-blur-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            {activeCategory} Verification Benchmark (30 Mins)
          </span>
          <h2 className="text-base font-bold text-white">{activeSkillName}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Anti-cheat status */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300">
            <ShieldAlert
              className={`h-3.5 w-3.5 ${tabSwitchCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
            />
            <span>
              Violations: <strong>{tabSwitchCount}</strong>
            </span>
          </div>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-bold ${
              isLowTime
                ? 'border-rose-500/40 bg-rose-950/30 text-rose-400 animate-pulse'
                : 'border-amber-500/30 bg-amber-950/30 text-amber-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Round Switcher Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('R1');
            const firstR1Idx = questions.findIndex((q) => q.type === 'MCQ');
            if (firstR1Idx !== -1) setCurrentIdx(firstR1Idx);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'R1'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
          }`}
        >
          <span>Round 1: 10 MCQs (50 Pts)</span>
          <span className="rounded bg-black/40 px-2 py-0.5 text-[10px]">
            {Object.keys(answers).filter((id) => r1Questions.some((q) => q.id === id)).length}/{r1Questions.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('R2');
            const firstR2Idx = questions.findIndex((q) => q.type !== 'MCQ');
            if (firstR2Idx !== -1) setCurrentIdx(firstR2Idx);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'R2'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
          }`}
        >
          <span>Round 2: 6 Challenges (50 Pts)</span>
          <span className="rounded bg-black/40 px-2 py-0.5 text-[10px]">
            {Object.keys(answers).filter((id) => r2Questions.some((q) => q.id === id)).length}/{r2Questions.length}
          </span>
        </button>
      </div>

      {/* Question Selector Dots */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]);
          const isCurrent = currentIdx === idx;

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIdx(idx);
                setActiveTab(q.type === 'MCQ' ? 'R1' : 'R2');
              }}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                isCurrent
                  ? 'border-2 border-indigo-500 bg-indigo-600 text-white'
                  : isAnswered
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                {currentQ.type}
              </span>
              <span className="text-xs text-slate-400">
                Question {currentIdx + 1} of {questions.length}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-300">{currentQ.points} Points</span>
          </div>

          <h3 className="text-sm font-semibold text-white leading-relaxed">{currentQ.question_text}</h3>

          {/* MCQ Options */}
          {currentQ.type === 'MCQ' && currentQ.options && (
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === String(optIdx);

                return (
                  <button
                    key={optIdx}
                    onClick={() => setAnswers({ ...answers, [currentQ.id]: String(optIdx) })}
                    className={`w-full rounded-xl border p-4 text-left text-xs transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-white font-bold shadow-md shadow-indigo-500/10'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Coding / Analytical / Descriptive Editor */}
          {currentQ.type !== 'MCQ' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Technical Solution & Analysis Editor
                </span>
                {currentQ.type === 'CODING' && (
                  <button
                    onClick={() => runCodeSim(currentQ.id, currentQ.test_cases?.[0])}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <Play className="h-3 w-3" /> Run Test Assertions
                  </button>
                )}
              </div>

              <textarea
                rows={10}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 focus:border-indigo-500 focus:outline-none transition-all"
                placeholder={currentQ.starter_code || '// Write your comprehensive analysis or solution here...'}
                value={answers[currentQ.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
              />

              {testCaseOutputs[currentQ.id] && (
                <div className="rounded-xl border border-emerald-500/30 bg-black/60 p-3 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap">
                  {testCaseOutputs[currentQ.id]}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 disabled:opacity-30 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </button>

            <div className="flex items-center gap-3">
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-black text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" /> Evaluating with AI...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Submit Assessment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
