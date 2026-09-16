import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { SkillCategory, SkillCatalogItem } from '../../types/database';
import {
  Code,
  Database,
  Cpu,
  Cloud,
  Brain,
  Shield,
  CheckCircle2,
  MessageSquare,
  Users,
  Lightbulb,
  Briefcase,
  TrendingUp,
  BarChart3,
  DollarSign,
  UserCheck,
  Target,
  Palette,
  FileText,
  Search,
  Check,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  Zap,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Programming: Code,
  'Programming & Software Development': Code,
  Database: Database,
  'CS Fundamentals': Cpu,
  'Cloud & DevOps': Cloud,
  'AI/Data': Brain,
  'AI / Data': Brain,
  Cybersecurity: Shield,
  Testing: CheckCircle2,
  'Testing / QA': CheckCircle2,
  Communication: MessageSquare,
  Interpersonal: Users,
  'Problem Solving': Lightbulb,
  Professional: Briefcase,
  'Professional Skills': Briefcase,
  Business: TrendingUp,
  'Business Skills': TrendingUp,
  Marketing: BarChart3,
  Finance: DollarSign,
  HR: UserCheck,
  Sales: Target,
  Design: Palette,
  Content: FileText,
};

const DOMAIN_GROUPS = [
  {
    id: 'ALL',
    label: 'All Categories',
    categories: [],
  },
  {
    id: 'TECHNICAL',
    label: '1. Technical Skills',
    categories: [
      'Programming & Software Development',
      'Database',
      'CS Fundamentals',
      'Cloud & DevOps',
      'AI / Data',
      'Cybersecurity',
      'Testing / QA',
    ],
  },
  {
    id: 'NON_TECHNICAL',
    label: '2. Non-Technical Skills',
    categories: [
      'Communication',
      'Interpersonal',
      'Problem Solving',
      'Professional Skills',
      'Business Skills',
    ],
  },
  {
    id: 'CAREER_SPECIFIC',
    label: '3. Career-Specific Skills',
    categories: [
      'Marketing',
      'Finance',
      'HR',
      'Sales',
      'Design',
      'Content',
    ],
  },
];

export const SkillSelection: React.FC = () => {
  const navigate = useNavigate();
  const {
    skillCatalog,
    selectedSkills,
    benchmarks,
    selectSkill,
    removeSelectedSkill,
    checkSkillCooldown,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainGroup, setSelectedDomainGroup] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Filter skills based on domain group, category, and search query
  const filteredCatalog = useMemo(() => {
    return skillCatalog.filter((item) => {
      // Filter by domain group
      if (selectedDomainGroup !== 'ALL') {
        const group = DOMAIN_GROUPS.find((g) => g.id === selectedDomainGroup);
        if (group && group.categories.length > 0) {
          const inGroup = group.categories.some(
            (c) =>
              item.category.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(item.category.toLowerCase())
          );
          if (!inGroup) return false;
        }
      }

      // Filter by specific category
      if (selectedCategory !== 'ALL') {
        const matchesCat =
          item.category.toLowerCase() === selectedCategory.toLowerCase() ||
          item.category.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!matchesCat) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [skillCatalog, selectedDomainGroup, selectedCategory, searchQuery]);

  // Map of selected skills by skill_name lowercased for quick lookup
  const selectedMap = useMemo(() => {
    const map = new Map<string, (typeof selectedSkills)[0]>();
    selectedSkills.forEach((s) => map.set(s.skill_name.toLowerCase(), s));
    return map;
  }, [selectedSkills]);

  // Verified scores map from benchmarks & selected skills
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    benchmarks.forEach((b) => map.set(b.skill_category.toLowerCase(), b.score));
    selectedSkills.forEach((s) => {
      if (s.verified_score !== null && s.verified_score !== undefined) {
        map.set(s.skill_name.toLowerCase(), s.verified_score);
      }
    });
    return map;
  }, [benchmarks, selectedSkills]);

  const handleToggleSelect = async (item: SkillCatalogItem) => {
    const existing = selectedMap.get(item.name.toLowerCase());
    if (existing) {
      await removeSelectedSkill(existing.id);
    } else {
      await selectSkill(item);
    }
  };

  const handleStartAssessment = (item: SkillCatalogItem) => {
    const cooldown = checkSkillCooldown(item.name);
    if (!cooldown.can_attempt) {
      toast.error(
        `Skill in cooldown! You can retake ${item.name} in ${cooldown.days_remaining}d ${cooldown.hours_remaining}h.`
      );
      return;
    }

    if (!selectedMap.has(item.name.toLowerCase())) {
      selectSkill(item);
    }

    navigate('/student/assessments', {
      state: { selectedSkill: item.name, skillCategory: item.category },
    });
  };

  const verifiedCount = selectedSkills.filter((s) => scoreMap.has(s.skill_name.toLowerCase())).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/60 border border-indigo-500/20 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              18-Domain Standardized Skill Verification Matrix
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Skill Catalog & Verification Hub
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Explore competencies across Technical, Non-Technical, and Career-Specific disciplines. Take standardized proctored assessments (10 MCQs + 6 Challenges) to verify your baseline.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full md:w-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex-1 md:w-36 text-center shadow-lg">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                My Skills
              </span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {selectedSkills.length}
              </span>
              <span className="text-[11px] text-indigo-400 block mt-0.5">Selected</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex-1 md:w-36 text-center shadow-lg">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Verified
              </span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                {verifiedCount}
              </span>
              <span className="text-[11px] text-emerald-500/80 block mt-0.5">Tested</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex-1 md:w-36 text-center shadow-lg">
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Cooldown Rule
              </span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">7 Days</span>
              <span className="text-[11px] text-amber-500/80 block mt-0.5">Once a Week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Group Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {DOMAIN_GROUPS.map((grp) => (
          <button
            key={grp.id}
            onClick={() => {
              setSelectedDomainGroup(grp.id);
              setSelectedCategory('ALL');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedDomainGroup === grp.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {grp.label}
          </button>
        ))}
      </div>

      {/* Search & Sub-category Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skill (e.g. C++, Java, React, SQL, AWS, Figma, SEO)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 self-end md:self-center">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Click "Add to Roadmap" to track or "Take Test" to verify.</span>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      {filteredCatalog.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No skills found</h3>
          <p className="text-sm text-slate-400">
            No matching skills for "{searchQuery}". Try a different keyword or reset filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatalog.map((skill) => {
            const isSelected = selectedMap.has(skill.name.toLowerCase());
            const score = scoreMap.get(skill.name.toLowerCase());
            const cooldown = checkSkillCooldown(skill.name);
            const Icon = CATEGORY_ICONS[skill.category] || Code;

            return (
              <div
                key={skill.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-300 p-6 backdrop-blur-sm ${
                  isSelected
                    ? 'bg-slate-900/90 border-indigo-500/40 shadow-xl shadow-indigo-950/30 ring-1 ring-indigo-500/20'
                    : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80 shadow-md'
                }`}
              >
                <div>
                  {/* Category Pill & Selection Status */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-indigo-400 text-xs font-medium">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{skill.category}</span>
                    </div>

                    {/* Verified Score or Selected Status */}
                    {score !== undefined ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Score: {score}/100</span>
                      </div>
                    ) : isSelected ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                        <Check className="w-3 h-3" /> Selected
                      </div>
                    ) : null}
                  </div>

                  {/* Skill Title & Description */}
                  <h3 className="text-lg font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                    {skill.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {skill.description}
                  </p>
                </div>

                {/* Bottom Actions & Cooldown State */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  {/* Cooldown notice if not eligible */}
                  {!cooldown.can_attempt ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Cooldown active: <b>{cooldown.days_remaining}d {cooldown.hours_remaining}h</b> left
                      </span>
                    </div>
                  ) : score !== undefined ? (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400/90">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Ready for weekly score retake</span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {/* Select / Remove Button */}
                    <button
                      onClick={() => handleToggleSelect(skill)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 ${
                        isSelected
                          ? 'bg-slate-800 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700'
                          : 'bg-slate-800/80 text-white hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Tracked</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Roadmap</span>
                        </>
                      )}
                    </button>

                    {/* Take Assessment Button */}
                    <button
                      onClick={() => handleStartAssessment(skill)}
                      disabled={!cooldown.can_attempt}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-1 ${
                        !cooldown.can_attempt
                          ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                      }`}
                    >
                      <span>Take Test</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
