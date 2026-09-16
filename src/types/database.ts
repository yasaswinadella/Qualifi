export type Role = 'STUDENT' | 'ADMIN';
export type JobType = 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME' | 'PPO';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type JobSource = 'ADZUNA' | 'GREENHOUSE' | 'LEVER' | 'MANUAL';
export type QuestionType = 'MCQ' | 'CODING' | 'DESCRIPTIVE';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
export type ApplicationStatus =
  | 'APPLIED_EXTERNALLY'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export type SkillCategory =
  | 'Programming'
  | 'Programming & Software Development'
  | 'Database'
  | 'CS Fundamentals'
  | 'Cloud & DevOps'
  | 'AI/Data'
  | 'AI / Data'
  | 'Cybersecurity'
  | 'Testing'
  | 'Testing / QA'
  | 'Communication'
  | 'Interpersonal'
  | 'Problem Solving'
  | 'Professional'
  | 'Professional Skills'
  | 'Business'
  | 'Business Skills'
  | 'Marketing'
  | 'Finance'
  | 'HR'
  | 'Sales'
  | 'Design'
  | 'Content';

export interface SkillCategoryRecord {
  id: string;
  name: SkillCategory;
  icon: string;
  order_index: number;
}

export interface SkillRecord {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  category?: SkillCategoryRecord;
}

export interface SkillCatalogItem {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  difficulty_tier: 'Fundamental' | 'Intermediate' | 'Advanced';
  tags: string[];
  icon_name?: string;
  estimated_duration_minutes: number;
}

export interface StudentSelectedSkill {
  id: string;
  student_id: string;
  skill_id: string;
  skill_name: string;
  category: SkillCategory;
  verified_score?: number | null;
  last_tested_at?: string | null;
  next_eligible_at?: string | null; // 7-day cooldown (once a week per skill)
  created_at?: string;
  selected_at?: string;
  skill?: SkillRecord;
}

export interface SkillCooldownStatus {
  can_attempt: boolean;
  canAttempt?: boolean;
  days_remaining: number;
  hours_remaining: number;
  last_tested_at?: string;
  next_eligible_at?: string;
  remainingMs?: number;
  remainingDays?: number;
  remainingHours?: number;
  nextEligibleDate?: string;
}

export interface QuestionBankItem {
  id: string;
  skill_id: string;
  type: QuestionType;
  question_text: string;
  options?: string[]; // Array of 4 options (for MCQs)
  correct_answer?: string; // Kept secure server-side
  difficulty: QuestionDifficulty;
  starter_code?: string;
  test_cases?: { input: string; expected_output: string }[];
  rubric?: Record<string, number>;
  points: number;
  is_active: boolean;
}

export interface FrozenQuestionMeta {
  question_id: string;
  type: QuestionType;
  question_text: string;
  options?: string[]; // User-specific shuffled options
  original_option_map?: Record<number, number>; // Maps shuffled index -> original index (server only)
  starter_code?: string;
  test_cases?: { input: string; expected_output: string }[];
  points: number;
  difficulty: QuestionDifficulty;
}

export interface SkillAssessmentAttempt {
  id: string;
  student_id: string;
  skill_id: string;
  question_set: FrozenQuestionMeta[];
  started_at: string;
  submitted_at?: string;
  duration_seconds: number;
  mcq_score: number;
  coding_score: number;
  total_score: number;
  answers: Record<string, string>;
  ai_feedback: AiFeedback;
  violations_count?: number;
  status: AttemptStatus;
  created_at?: string;
  skill?: SkillRecord;
  student?: Profile;
}

export interface StudentSkillBenchmark {
  id: string;
  student_id: string;
  skill_category: string;
  skill_id?: string;
  score: number;
  assessment_id?: string;
  last_attempt_id?: string;
  verified_at: string;
}

export interface ParsedResumeEducation {
  institution: string;
  degree: string;
  year?: number;
  cgpa?: number;
}

export interface ParsedResumeProject {
  title: string;
  description: string;
  techStack?: string[];
  tech_stack?: string[];
}

export interface ParsedResume {
  skills: string[];
  education: ParsedResumeEducation[];
  projects: ParsedResumeProject[];
  experienceYears?: number;
  certifications: string[];
  summary?: string;
}

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  cgpa: number;
  branch: string;
  degree: string;
  college: string;
  company_name?: string;
  parsed_resume: ParsedResume;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Assessment {
  id: string;
  title: string;
  skill_category: string;
  description: string;
  duration_minutes: number;
  created_by?: string;
  is_active: boolean;
  created_at?: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  type: QuestionType;
  question_text: string;
  options?: string[];
  correct_answer?: string;
  starter_code?: string;
  test_cases?: { input: string; expected_output: string }[];
  rubric?: Record<string, number>;
  points: number;
  order_index: number;
}

export interface AiFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  round1Breakdown?: {
    totalQuestions: number;
    correctQuestions: number;
    earnedScore: number;
  };
  round2Breakdown?: {
    totalQuestions: number;
    earnedScore: number;
    questionReviews: {
      questionId: string;
      questionTitle: string;
      score: number;
      feedback: string;
    }[];
  };
}

export interface AssessmentAttempt {
  id: string;
  student_id: string;
  assessment_id: string;
  started_at: string;
  submitted_at: string;
  score: number;
  round1_score: number;
  round2_score: number;
  answers: Record<string, string>;
  ai_feedback: AiFeedback;
  violations_count?: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
}

export interface RequiredSkill {
  skill: string;
  weight: number;
  min_score: number;
}

export interface Job {
  id: string;
  admin_id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  job_type?: JobType;
  work_mode?: WorkMode;
  source?: JobSource;
  external_id?: string;
  stipend?: string;
  min_stipend?: number;
  application_url: string;
  description: string;
  required_skills: RequiredSkill[];
  min_cgpa: number;
  eligible_branches: string[];
  eligible_degrees: string[];
  status: 'OPEN' | 'CLOSED' | 'ACTIVE' | 'INACTIVE';
  last_seen_at?: string;
  created_at: string;
}

export interface TrackedCompany {
  id: string;
  company_name: string;
  board_type: 'GREENHOUSE' | 'LEVER';
  board_slug: string;
  is_active: boolean;
  created_at: string;
}

export interface JobIngestionLog {
  id: string;
  run_at: string;
  source: string;
  jobs_added: number;
  jobs_updated: number;
  jobs_deactivated: number;
  error?: string;
}

export interface Application {
  id: string;
  job_id: string;
  student_id: string;
  status: ApplicationStatus;
  skill_match_score: number;
  hard_criteria_passed: boolean;
  company_application_url?: string;
  interview_time?: string;
  interview_link?: string;
  notes?: string;
  last_updated_by_student?: string;
  applied_at: string;
  updated_at: string;
  job?: Job;
  student?: Profile;
}

export interface EligibilityResult {
  isEligible: boolean;
  hardCriteriaPassed: boolean;
  hardCriteriaReasons: string[];
  matchScore: number;
  breakdown: {
    skill: string;
    userScore: number;
    minScore: number;
    weight: number;
    passed: boolean;
    pointsEarned: number;
  }[];
}

export interface SkillGapItem {
  skill: string;
  userScore: number;
  targetScore: number;
  gap: number;
  isQualified: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
}
