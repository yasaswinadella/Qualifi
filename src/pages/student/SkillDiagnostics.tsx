import React from 'react';
import { useData } from '../../context/DataContext';
import { RadarChart } from '../../components/common/RadarChart';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  Clock,
  Layers,
  Award,
  ArrowRight,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

export const SkillDiagnostics: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSkills, benchmarks, checkSkillCooldown } = useData();

  // Combine selected skills with verified benchmarks
  const skillList = selectedSkills.map((sel) => {
    const bench = benchmarks.find(
      (b) => b.skill_category.toLowerCase() === sel.skill_name.toLowerCase()
    );
    const score = sel.verified_score ?? bench?.score ?? null;
    const verifiedAt = sel.last_tested_at ?? bench?.verified_at ?? null;
    const cooldown = checkSkillCooldown(sel.skill_name);
    return {
      id: sel.id,
      name: sel.skill_name,
      category: sel.category,
      score,
      verifiedAt,
      cooldown,
    };
  });

  // Also include any benchmarks that might not have been in selectedSkills
  benchmarks.forEach((bench) => {
    if (!skillList.some((s) => s.name.toLowerCase() === bench.skill_category.toLowerCase())) {
      const cooldown = checkSkillCooldown(bench.skill_category);
      skillList.push({
        id: bench.id,
        name: bench.skill_category,
        category: 'Programming',
        score: bench.score,
        verifiedAt: bench.verified_at,
        cooldown,
      });
    }
  });

  const verifiedSkills = skillList.filter((s) => s.score !== null);
  const avgScore =
    verifiedSkills.length > 0
      ? Math.round(
          verifiedSkills.reduce((acc, s) => acc + (s.score || 0), 0) / verifiedSkills.length
        )
      : 0;

  const qualifiedCount = verifiedSkills.filter((s) => (s.score || 0) >= 70).length;

  // Radar chart data based on student verified skills or top selected skills
  const chartData = (verifiedSkills.length >= 3 ? verifiedSkills : skillList.slice(0, 5)).map(
    (s) => ({
      skill: s.name,
      score: s.score || 0,
    })
  );

  const targetBenchmarks = chartData.map((d) => ({
    skill: d.skill,
    score: 75,
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Verified Skill Telemetry Diagnostics
          </h1>
          <p className="text-xs text-slate-400">
            Institutional verification passport showing tamper-proof scores and candidate readiness metrics.
          </p>
        </div>

        {/* Readiness Index Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-3 shadow-lg backdrop-blur-md">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Verified Average</span>
            <p className="text-lg font-black text-emerald-400">{avgScore}% Aggregate</p>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold uppercase text-slate-400">Qualified (&ge;70%)</span>
            <p className="text-lg font-black text-indigo-400">
              {qualifiedCount} / {skillList.length}
            </p>
          </div>
        </div>
      </div>

      {skillList.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-4">
          <Layers className="w-12 h-12 text-indigo-400 mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-white">No Selected Skills Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Choose skills from the 18-domain catalog to build your verification roadmap and take 45-minute timed assessments.
          </p>
          <button
            onClick={() => navigate('/student/skills')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <span>Browse 18-Category Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Radar Visualizer Card */}
          <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md shadow-lg">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" /> Skill Competency Polygon
              </h2>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                Ground Truth Telemetry
              </span>
            </div>

            <div className="my-2 flex justify-center">
              <RadarChart
                studentScores={chartData.length > 0 ? chartData : [{ skill: 'Skills', score: 0 }]}
                targetScores={
                  targetBenchmarks.length > 0
                    ? targetBenchmarks
                    : [{ skill: 'Skills', score: 75 }]
                }
                size={340}
              />
            </div>

            <div className="flex items-center gap-6 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500 shadow-sm" />
                <span className="text-slate-300 font-medium">Your Verified Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-dashed border-amber-400 bg-amber-400/20" />
                <span className="text-slate-400">Benchmark Baseline (75%)</span>
              </div>
            </div>
          </div>

          {/* Detailed Skill Breakdown List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Verified Competency Passport
              </h2>
              <NavLink
                to="/student/skills"
                className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Add / Manage Skills</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>

            {skillList.map((skill) => {
              const isTested = skill.score !== null;
              const isQualified = (skill.score || 0) >= 70;

              return (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700 shadow-sm"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{skill.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {skill.category}
                      </span>
                      {isTested ? (
                        isQualified ? (
                          <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Qualified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            <AlertTriangle className="h-3 w-3" /> Retake Recommended
                          </span>
                        )
                      ) : (
                        <span className="rounded bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          Pending Assessment
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5 h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          !isTested
                            ? 'bg-slate-700 w-0'
                            : isQualified
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(isTested ? 8 : 0, skill.score || 0))}%`,
                        }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {skill.verifiedAt
                          ? `Verified on ${new Date(skill.verifiedAt).toLocaleDateString()}`
                          : '45-Min Assessment (20 MCQs + 6 Challenges)'}
                      </span>

                      {!skill.cooldown.can_attempt && (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Retake in {skill.cooldown.days_remaining}d{' '}
                          {skill.cooldown.hours_remaining}h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xl font-black ${
                        !isTested
                          ? 'text-slate-500'
                          : isQualified
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {isTested ? `${skill.score}/100` : '--'}
                    </span>

                    <button
                      disabled={!skill.cooldown.can_attempt}
                      onClick={() =>
                        navigate('/student/assessments', {
                          state: { selectedSkill: skill.name, skillCategory: skill.category },
                        })
                      }
                      className={`mt-1 flex items-center justify-end gap-1 text-[11px] font-bold ${
                        !skill.cooldown.can_attempt
                          ? 'text-slate-500 cursor-not-allowed'
                          : 'text-indigo-400 hover:underline'
                      }`}
                    >
                      <span>{isTested ? 'Retake' : 'Test'}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
