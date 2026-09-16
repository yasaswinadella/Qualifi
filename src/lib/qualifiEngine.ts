import {
  Profile,
  Job,
  StudentSkillBenchmark,
  EligibilityResult,
  RequiredSkill,
  SkillGapItem,
  Application,
} from '../types/database';

/**
 * Validates hard eligibility cutoffs (CGPA, Branch, Degree).
 * Pure deterministic logic without side effects.
 */
export function checkHardEligibility(
  student: Profile,
  job: Job
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. CGPA Check
  if (student.cgpa < job.min_cgpa) {
    reasons.push(
      `Student CGPA (${student.cgpa.toFixed(2)}) is below the minimum threshold (${job.min_cgpa.toFixed(2)})`
    );
  }

  // 2. Branch Check
  if (job.eligible_branches && job.eligible_branches.length > 0) {
    const studentBranchClean = (student.branch || '').trim().toLowerCase();
    const branchMatch = job.eligible_branches.some((b) => {
      const cleanB = b.trim().toLowerCase();
      if (cleanB === 'all' || cleanB === studentBranchClean) return true;
      // Handle standard abbreviations
      if (
        (cleanB.includes('computer') || cleanB.includes('cse') || cleanB.includes('cs')) &&
        (studentBranchClean.includes('computer') || studentBranchClean.includes('cs') || studentBranchClean.includes('it') || studentBranchClean.includes('information'))
      ) {
        return true;
      }
      return false;
    });

    if (!branchMatch) {
      if (studentBranchClean) {
        reasons.push(
          `Branch '${student.branch}' is not in eligible branches: [${job.eligible_branches.join(', ')}]`
        );
      } else {
        reasons.push('Branch is not specified in student profile.');
      }
    }
  }

  // 3. Degree Check
  if (job.eligible_degrees && job.eligible_degrees.length > 0) {
    const studentDegreeClean = (student.degree || '').trim().toLowerCase();
    const degreeMatch = job.eligible_degrees.some((d) => {
      const cleanD = d.trim().toLowerCase();
      if (cleanD === 'all' || cleanD === studentDegreeClean) return true;
      if (
        (cleanD.includes('b.tech') || cleanD.includes('btech') || cleanD.includes('b.e') || cleanD.includes('be')) &&
        (studentDegreeClean.includes('b.tech') || studentDegreeClean.includes('btech') || studentDegreeClean.includes('b.e') || studentDegreeClean.includes('be'))
      ) {
        return true;
      }
      return false;
    });

    if (!degreeMatch) {
      if (studentDegreeClean) {
        reasons.push(
          `Degree '${student.degree}' is not in eligible degrees: [${job.eligible_degrees.join(', ')}]`
        );
      } else {
        reasons.push('Degree is not specified in student profile.');
      }
    }
  }

  return { passed: reasons.length === 0, reasons };
}

/**
 * Calculates weighted match score based on verified student benchmarks.
 * Formula: Match % = Sum(UserScore * Weight) / Sum(Weights)
 */
export function calculateWeightedMatchScore(
  benchmarks: StudentSkillBenchmark[],
  requiredSkills: RequiredSkill[]
): number {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  const benchmarkMap = new Map<string, number>();
  benchmarks.forEach((b) => benchmarkMap.set(b.skill_category.toLowerCase(), b.score));

  let totalWeight = 0;
  let earnedScoreSum = 0;

  for (const req of requiredSkills) {
    const normalizedSkill = req.skill.trim().toLowerCase();
    const studentScore = benchmarkMap.get(normalizedSkill) || 0;
    earnedScoreSum += (studentScore / 100) * req.weight;
    totalWeight += req.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedScoreSum / totalWeight) * 100);
}

/**
 * Complete mathematical breakdown of match math for auditability & transparency.
 */
export function getEligibilityBreakdown(
  student: Profile,
  job: Job,
  benchmarks: StudentSkillBenchmark[]
): EligibilityResult {
  const hardCheck = checkHardEligibility(student, job);
  const benchmarkMap = new Map<string, number>();
  benchmarks.forEach((b) => benchmarkMap.set(b.skill_category.toLowerCase(), b.score));

  let totalWeight = 0;
  let earnedPointsTotal = 0;
  let allMinScoresSatisfied = true;

  const breakdown = (job.required_skills || []).map((req) => {
    const userScore = benchmarkMap.get(req.skill.trim().toLowerCase()) || 0;
    const passed = userScore >= req.min_score;
    if (!passed) allMinScoresSatisfied = false;
    const pointsEarned = (userScore / 100) * req.weight;
    earnedPointsTotal += pointsEarned;
    totalWeight += req.weight;

    return {
      skill: req.skill,
      userScore,
      minScore: req.min_score,
      weight: req.weight,
      passed,
      pointsEarned: Number(pointsEarned.toFixed(2)),
    };
  });

  const matchScore = totalWeight > 0 ? Math.round((earnedPointsTotal / totalWeight) * 100) : 0;
  const isEligible = hardCheck.passed && allMinScoresSatisfied;

  return {
    isEligible,
    hardCriteriaPassed: hardCheck.passed,
    hardCriteriaReasons: hardCheck.reasons,
    matchScore,
    breakdown,
  };
}

/**
 * Performs deep gap analysis comparing student's verified skills against target benchmarks.
 */
export function analyzeSkillGaps(
  benchmarks: StudentSkillBenchmark[],
  targets: { skill: string; min_score: number }[]
): SkillGapItem[] {
  const benchmarkMap = new Map<string, number>();
  benchmarks.forEach((b) => benchmarkMap.set(b.skill_category.toLowerCase(), b.score));

  return targets.map((t) => {
    const userScore = benchmarkMap.get(t.skill.toLowerCase()) || 0;
    const gap = Math.max(0, t.min_score - userScore);
    return {
      skill: t.skill,
      userScore,
      targetScore: t.min_score,
      gap,
      isQualified: userScore >= t.min_score,
    };
  });
}

/**
 * Deterministically ranks candidates for a job based on:
 * 1. Hard criteria pass status (passed candidates first)
 * 2. Verified skill match score (descending)
 * 3. CGPA tie-breaker (descending)
 */
export function rankCandidates(applications: Application[]): Application[] {
  return [...applications].sort((a, b) => {
    // 1. Hard criteria pass priority
    if (a.hard_criteria_passed && !b.hard_criteria_passed) return -1;
    if (!a.hard_criteria_passed && b.hard_criteria_passed) return 1;

    // 2. Skill match score descending
    if (b.skill_match_score !== a.skill_match_score) {
      return b.skill_match_score - a.skill_match_score;
    }

    // 3. Student CGPA tie-breaker
    const cgpaA = a.student?.cgpa || 0;
    const cgpaB = b.student?.cgpa || 0;
    return cgpaB - cgpaA;
  });
}
