-- =========================================================
-- QUALIFI COMPLETE PRODUCTION DATABASE SCHEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('STUDENT', 'ADMIN')) NOT NULL DEFAULT 'STUDENT',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cgpa NUMERIC(3, 2) DEFAULT 0.00,
  branch TEXT DEFAULT '',
  degree TEXT DEFAULT '',
  college TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  parsed_resume JSONB DEFAULT '{}'::jsonb,
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SKILL CATEGORIES (18 Domains)
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0
);

-- 3. SKILLS
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.skill_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- 4. STUDENT SELECTED SKILLS & ROADMAP
CREATE TABLE IF NOT EXISTS public.student_selected_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_id)
);

-- 5. QUESTION BANK (Server-Protected Real Questions)
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('MCQ', 'CODING', 'DESCRIPTIVE')) NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB, -- Array of 4 options (for MCQs)
  correct_answer TEXT, -- Index ('0','1','2','3') or model solution (NEVER exposed to students)
  difficulty TEXT CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')) DEFAULT 'MEDIUM',
  starter_code TEXT,
  test_cases JSONB, -- Array of {input: string, expected_output: string}
  rubric JSONB, -- Evaluation criteria (NEVER exposed to students)
  points NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. SKILL ASSESSMENT ATTEMPTS (Frozen Question Sets & Telemetry)
CREATE TABLE IF NOT EXISTS public.skill_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  question_set JSONB NOT NULL, -- Frozen question IDs + user-specific shuffled option maps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  duration_seconds INT NOT NULL DEFAULT 1800, -- 30 mins
  mcq_score NUMERIC(5, 2) DEFAULT 0.00,
  coding_score NUMERIC(5, 2) DEFAULT 0.00,
  total_score NUMERIC(5, 2) DEFAULT 0.00,
  answers JSONB DEFAULT '{}'::jsonb,
  ai_feedback JSONB DEFAULT '{}'::jsonb,
  violations_count INT DEFAULT 0,
  status TEXT CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED')) DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STUDENT SKILL BENCHMARKS (Verified Ground Truth)
CREATE TABLE IF NOT EXISTS public.student_skill_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  last_attempt_id UUID REFERENCES public.skill_assessment_attempts(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_id)
);

-- 8. TRACKED COMPANIES (For Greenhouse / Lever Public Job Ingestion)
CREATE TABLE IF NOT EXISTS public.tracked_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  board_type TEXT CHECK (board_type IN ('GREENHOUSE', 'LEVER')) NOT NULL,
  board_slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. JOB INGESTION LOG (Ingestion Pipeline Telemetry)
CREATE TABLE IF NOT EXISTS public.job_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  jobs_added INT DEFAULT 0,
  jobs_updated INT DEFAULT 0,
  jobs_deactivated INT DEFAULT 0,
  error TEXT
);

-- 10. JOBS & INTERNSHIPS (Real External Listings)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'PPO')) NOT NULL DEFAULT 'INTERNSHIP',
  job_type TEXT CHECK (job_type IN ('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'PPO')) DEFAULT 'INTERNSHIP',
  work_mode TEXT CHECK (work_mode IN ('REMOTE', 'HYBRID', 'ONSITE')) DEFAULT 'HYBRID',
  source TEXT CHECK (source IN ('ADZUNA', 'GREENHOUSE', 'LEVER', 'MANUAL')) DEFAULT 'MANUAL',
  external_id TEXT,
  stipend TEXT DEFAULT '',
  min_stipend NUMERIC(10, 2) DEFAULT 0,
  application_url TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  eligible_branches TEXT[] NOT NULL DEFAULT '{}',
  eligible_degrees TEXT[] NOT NULL DEFAULT '{}',
  status TEXT CHECK (status IN ('OPEN', 'CLOSED', 'ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STUDENT APPLICATIONS (Personal Real External Application Tracker)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('APPLIED_EXTERNALLY', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFER', 'REJECTED', 'WITHDRAWN')) DEFAULT 'APPLIED_EXTERNALLY',
  skill_match_score INT NOT NULL DEFAULT 0,
  hard_criteria_passed BOOLEAN NOT NULL DEFAULT FALSE,
  company_application_url TEXT DEFAULT '',
  interview_time TIMESTAMPTZ,
  interview_link TEXT,
  notes TEXT DEFAULT '',
  last_updated_by_student TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- =========================================================
-- INDEXES FOR PERFORMANCE & INTEGRITY
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category_id);
CREATE INDEX IF NOT EXISTS idx_selected_skills_student ON public.student_selected_skills(student_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON public.question_bank(skill_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_skill ON public.skill_assessment_attempts(student_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_student ON public.student_skill_benchmarks(student_id);
CREATE INDEX IF NOT EXISTS idx_jobs_source_ext ON public.jobs(source, external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_student ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);

-- =========================================================
-- POSTGRES SERVER-SIDE FUNCTIONS
-- =========================================================

-- 1. Server-side 7-Day Cooldown Check Function
CREATE OR REPLACE FUNCTION public.can_attempt_skill(p_student_id UUID, p_skill_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_submitted TIMESTAMPTZ;
BEGIN
  SELECT MAX(submitted_at) INTO v_last_submitted
  FROM public.skill_assessment_attempts
  WHERE student_id = p_student_id
    AND skill_id = p_skill_id
    AND status IN ('SUBMITTED', 'GRADED');

  IF v_last_submitted IS NULL THEN
    RETURN TRUE;
  END IF;

  IF v_last_submitted <= NOW() - INTERVAL '7 days' THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Detailed Cooldown Information RPC
CREATE OR REPLACE FUNCTION public.get_skill_cooldown_info(p_student_id UUID, p_skill_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_submitted TIMESTAMPTZ;
  v_next_eligible TIMESTAMPTZ;
  v_diff_seconds INT;
  v_days INT;
  v_hours INT;
BEGIN
  SELECT MAX(submitted_at) INTO v_last_submitted
  FROM public.skill_assessment_attempts
  WHERE student_id = p_student_id
    AND skill_id = p_skill_id
    AND status IN ('SUBMITTED', 'GRADED');

  IF v_last_submitted IS NULL THEN
    RETURN jsonb_build_object(
      'can_attempt', TRUE,
      'days_remaining', 0,
      'hours_remaining', 0,
      'last_tested_at', NULL,
      'next_eligible_at', NULL
    );
  END IF;

  v_next_eligible := v_last_submitted + INTERVAL '7 days';
  
  IF v_next_eligible <= NOW() THEN
    RETURN jsonb_build_object(
      'can_attempt', TRUE,
      'days_remaining', 0,
      'hours_remaining', 0,
      'last_tested_at', v_last_submitted,
      'next_eligible_at', v_next_eligible
    );
  ELSE
    v_diff_seconds := EXTRACT(EPOCH FROM (v_next_eligible - NOW()))::INT;
    v_days := v_diff_seconds / 86400;
    v_hours := (v_diff_seconds % 86400) / 3600;
    RETURN jsonb_build_object(
      'can_attempt', FALSE,
      'days_remaining', v_days,
      'hours_remaining', v_hours,
      'last_tested_at', v_last_submitted,
      'next_eligible_at', v_next_eligible
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_selected_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skill_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles readable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Categories & Skills Policies
CREATE POLICY "Categories viewable by all" ON public.skill_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Skills viewable by all" ON public.skills FOR SELECT TO authenticated USING (true);

-- Student Selected Skills Policies
CREATE POLICY "Students manage own selected skills" ON public.student_selected_skills FOR ALL TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins view all student selected skills" ON public.student_selected_skills FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Question Bank Policies (CRITICAL: Correct Answer & Rubric HIDDEN from student direct queries)
CREATE POLICY "Admins full access to question bank" ON public.question_bank FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
-- Students CANNOT select question_bank directly; access is handled via SECURITY DEFINER Edge Functions

-- Assessment Attempts Policies
CREATE POLICY "Students manage own attempts" ON public.skill_assessment_attempts FOR ALL TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins view all attempts" ON public.skill_assessment_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Benchmarks Policies
CREATE POLICY "Students read own benchmarks" ON public.student_skill_benchmarks FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Students insert/update own benchmarks" ON public.student_skill_benchmarks FOR ALL TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins view all benchmarks" ON public.student_skill_benchmarks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Tracked Companies & Ingestion Logs
CREATE POLICY "Admins manage tracked companies" ON public.tracked_companies FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins view job ingestion logs" ON public.job_ingestion_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Jobs Policies
CREATE POLICY "Jobs viewable by everyone" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage jobs" ON public.jobs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Applications Policies
CREATE POLICY "Students manage own applications" ON public.applications FOR ALL TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins view all applications" ON public.applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Qualifi Student'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =========================================================
-- SEED DATA: 18 STANDARDIZED SKILL CATEGORIES
-- =========================================================
INSERT INTO public.skill_categories (id, name, icon, order_index) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Programming', 'Code', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Database', 'Database', 2),
  ('a0000000-0000-0000-0000-000000000003', 'CS Fundamentals', 'Cpu', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Cloud & DevOps', 'Cloud', 4),
  ('a0000000-0000-0000-0000-000000000005', 'AI/Data', 'Brain', 5),
  ('a0000000-0000-0000-0000-000000000006', 'Cybersecurity', 'Shield', 6),
  ('a0000000-0000-0000-0000-000000000007', 'Testing', 'CheckCircle2', 7),
  ('a0000000-0000-0000-0000-000000000008', 'Communication', 'MessageSquare', 8),
  ('a0000000-0000-0000-0000-000000000009', 'Interpersonal', 'Users', 9),
  ('a0000000-0000-0000-0000-000000000010', 'Problem Solving', 'Lightbulb', 10),
  ('a0000000-0000-0000-0000-000000000011', 'Professional', 'Briefcase', 11),
  ('a0000000-0000-0000-0000-000000000012', 'Business', 'TrendingUp', 12),
  ('a0000000-0000-0000-0000-000000000013', 'Marketing', 'BarChart3', 13),
  ('a0000000-0000-0000-0000-000000000014', 'Finance', 'DollarSign', 14),
  ('a0000000-0000-0000-0000-000000000015', 'HR', 'UserCheck', 15),
  ('a0000000-0000-0000-0000-000000000016', 'Sales', 'Target', 16),
  ('a0000000-0000-0000-0000-000000000017', 'Design', 'Palette', 17),
  ('a0000000-0000-0000-0000-000000000018', 'Content', 'FileText', 18)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- SEED DATA: CORE SKILLS
-- =========================================================
INSERT INTO public.skills (id, category_id, name, slug) VALUES
  -- Programming
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'JavaScript', 'javascript'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Python', 'python'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'React', 'react'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'TypeScript', 'typescript'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Java', 'java'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'C++', 'cpp'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Golang', 'golang'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Rust', 'rust'),

  -- Database
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'SQL', 'sql'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'PostgreSQL', 'postgresql'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'MongoDB', 'mongodb'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'Redis', 'redis'),

  -- CS Fundamentals
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003', 'Data Structures', 'data-structures'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000003', 'Algorithms & Complexity', 'algorithms-complexity'),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 'Operating Systems', 'operating-systems'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000003', 'Computer Networks', 'computer-networks'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000003', 'System Design', 'system-design'),

  -- Cloud & DevOps
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000004', 'AWS Cloud Architecture', 'aws-cloud-architecture'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000004', 'Docker & Containers', 'docker-containers'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000004', 'Kubernetes Orchestration', 'kubernetes-orchestration'),
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000004', 'CI/CD Pipelines', 'cicd-pipelines'),

  -- AI/Data
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000005', 'Machine Learning', 'machine-learning'),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000005', 'Deep Learning', 'deep-learning'),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000005', 'NLP & LLMs', 'nlp-llms'),
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000005', 'Data Analytics', 'data-analytics'),

  -- Cybersecurity
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000006', 'Web App Penetration Testing', 'web-app-penetration-testing'),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000006', 'Network Security', 'network-security'),

  -- Testing
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000007', 'Unit & Integration Testing', 'unit-integration-testing'),
  ('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000007', 'Automation & E2E Testing', 'automation-e2e-testing'),

  -- Communication
  ('b0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000008', 'Communication', 'communication'),
  ('b0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000008', 'Technical Writing', 'technical-writing'),

  -- Interpersonal
  ('b0000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000009', 'Teamwork & Collaboration', 'teamwork-collaboration'),
  ('b0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000009', 'Cross-functional Leadership', 'cross-functional-leadership'),

  -- Problem Solving
  ('b0000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000010', 'Problem Solving', 'problem-solving'),
  ('b0000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000010', 'Root Cause Analysis', 'root-cause-analysis'),

  -- Professional
  ('b0000000-0000-0000-0000-000000000036', 'a0000000-0000-0000-0000-000000000011', 'Agile & Scrum', 'agile-scrum'),
  ('b0000000-0000-0000-0000-000000000037', 'a0000000-0000-0000-0000-000000000011', 'Priority Management', 'priority-management'),

  -- Business, Marketing, Finance, HR, Sales, Design, Content
  ('b0000000-0000-0000-0000-000000000038', 'a0000000-0000-0000-0000-000000000012', 'Product Management', 'product-management'),
  ('b0000000-0000-0000-0000-000000000039', 'a0000000-0000-0000-0000-000000000013', 'Growth Marketing & SEO', 'growth-marketing-seo'),
  ('b0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000014', 'Financial Modeling', 'financial-modeling'),
  ('b0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000015', 'Talent Acquisition & HR', 'talent-acquisition-hr'),
  ('b0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000016', 'B2B Enterprise Sales', 'b2b-enterprise-sales'),
  ('b0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000017', 'UI/UX Design Systems', 'ui-ux-design-systems'),
  ('b0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000018', 'Content Strategy & Copywriting', 'content-strategy-copywriting')
ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- SEED DATA: TRACKED COMPANIES FOR REAL INGESTION
-- =========================================================
INSERT INTO public.tracked_companies (company_name, board_type, board_slug) VALUES
  ('Stripe', 'GREENHOUSE', 'stripe'),
  ('Airbnb', 'GREENHOUSE', 'airbnb'),
  ('Figma', 'GREENHOUSE', 'figma'),
  ('Coinbase', 'GREENHOUSE', 'coinbase'),
  ('Datadog', 'GREENHOUSE', 'datadog'),
  ('Notion', 'LEVER', 'notion')
ON CONFLICT DO NOTHING;
