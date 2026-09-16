import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Job,
  StudentSkillBenchmark,
  Application,
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  SkillCatalogItem,
  StudentSelectedSkill,
  SkillCooldownStatus,
  TrackedCompany,
  JobIngestionLog,
  Profile,
} from '../types/database';
import {
  supabase,
  isSupabaseConfigured,
  fallbackStore,
  persistFallbackStore,
  checkSkillCooldownRpc,
  startSkillAssessmentSession,
  submitSkillAssessmentSession,
  triggerJobIngestionPipeline,
} from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface DataContextType {
  jobs: Job[];
  benchmarks: StudentSkillBenchmark[];
  applications: Application[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  skillCatalog: SkillCatalogItem[];
  selectedSkills: StudentSelectedSkill[];
  allStudentsSelectedSkills: StudentSelectedSkill[];
  allStudentBenchmarks: StudentSkillBenchmark[];
  allStudentsProfiles: Profile[];
  trackedCompanies: TrackedCompany[];
  ingestionLogs: JobIngestionLog[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  getQuestionsForAssessment: (assessmentId: string) => AssessmentQuestion[];
  createJob: (job: Omit<Job, 'created_at' | 'id'>) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  applyForJob: (job: Job, matchScore: number, hardPassed: boolean) => Promise<boolean>;
  updateApplicationStatus: (
    appId: string,
    status: Application['status'],
    interviewTime?: string,
    link?: string,
    notes?: string
  ) => Promise<void>;
  selectSkill: (item: SkillCatalogItem) => Promise<boolean>;
  removeSelectedSkill: (skillId: string) => Promise<boolean>;
  checkSkillCooldown: (skillName: string) => SkillCooldownStatus;
  startAssessment: (skillId: string) => Promise<any>;
  submitAssessment: (attemptId: string, answers: Record<string, string>, violationsCount?: number) => Promise<any>;
  triggerIngestion: () => Promise<any>;
  saveBenchmarkScore: (skill: string, score: number, assessmentId?: string) => Promise<void>;
  recordAssessmentAttempt: (attempt: Omit<AssessmentAttempt, 'id'>) => Promise<void>;
  addAssessmentWithQuestions: (
    assessment: Omit<Assessment, 'id' | 'created_at'>,
    questions: Omit<AssessmentQuestion, 'id' | 'assessment_id' | 'order_index'>[]
  ) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [benchmarks, setBenchmarks] = useState<StudentSkillBenchmark[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<StudentSelectedSkill[]>([]);
  const [allStudentsSelectedSkills, setAllStudentsSelectedSkills] = useState<StudentSelectedSkill[]>([]);
  const [allStudentBenchmarks, setAllStudentBenchmarks] = useState<StudentSkillBenchmark[]>([]);
  const [allStudentsProfiles, setAllStudentsProfiles] = useState<Profile[]>([]);
  const [trackedCompanies, setTrackedCompanies] = useState<TrackedCompany[]>([]);
  const [ingestionLogs, setIngestionLogs] = useState<JobIngestionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    if (isSupabaseConfigured) {
      try {
        const [
          jobsRes,
          benchRes,
          appsRes,
          assessRes,
          attemptsRes,
          catRes,
          selRes,
          trackedRes,
          logsRes,
        ] = await Promise.all([
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
          user
            ? supabase.from('student_skill_benchmarks').select('*').eq('student_id', user.id)
            : { data: [] },
          role === 'ADMIN'
            ? supabase
                .from('applications')
                .select('*, job:jobs(*), student:profiles(*)')
                .order('applied_at', { ascending: false })
            : user
            ? supabase
                .from('applications')
                .select('*, job:jobs(*), student:profiles(*)')
                .eq('student_id', user.id)
                .order('applied_at', { ascending: false })
            : { data: [] },
          supabase.from('assessments').select('*').eq('is_active', true),
          user
            ? supabase
                .from('skill_assessment_attempts')
                .select('*')
                .eq('student_id', user.id)
                .order('started_at', { ascending: false })
            : { data: [] },
          supabase.from('skills').select('*, category:skill_categories(*)').order('name', { ascending: true }),
          user
            ? supabase.from('student_selected_skills').select('*, skill:skills(*)').eq('student_id', user.id)
            : { data: [] },
          supabase.from('tracked_companies').select('*'),
          supabase.from('job_ingestion_log').select('*').order('run_at', { ascending: false }).limit(20),
        ]);

        if (jobsRes.data) setJobs(jobsRes.data as Job[]);
        if (benchRes.data) setBenchmarks(benchRes.data as StudentSkillBenchmark[]);
        if (appsRes.data) setApplications(appsRes.data as Application[]);
        if (assessRes.data) setAssessments(assessRes.data as Assessment[]);
        if (attemptsRes.data) setAttempts(attemptsRes.data as AssessmentAttempt[]);
        if (trackedRes.data) setTrackedCompanies(trackedRes.data as TrackedCompany[]);
        if (logsRes.data) setIngestionLogs(logsRes.data as JobIngestionLog[]);

        if (catRes.data && (catRes.data as any[]).length > 0) {
          const mapped: SkillCatalogItem[] = (catRes.data as any[]).map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category?.name || 'Programming',
            description: s.name + ' proficiency and verification.',
            difficulty_tier: 'Intermediate',
            tags: [s.category?.name || 'Technical'],
            estimated_duration_minutes: 30,
          }));
          setSkillCatalog(mapped);
        } else {
          setSkillCatalog(Array.from(fallbackStore.skillCatalog.values()));
        }

        if (selRes.data) {
          const selMapped: StudentSelectedSkill[] = (selRes.data as any[]).map((s) => ({
            id: s.id,
            student_id: s.student_id,
            skill_id: s.skill_id,
            skill_name: s.skill?.name || 'Skill',
            category: s.skill?.category?.name || 'Programming',
            selected_at: s.selected_at,
          }));
          setSelectedSkills(selMapped);
        }

        if (role === 'ADMIN') {
          const [allSelRes, allBenchRes, allProfRes] = await Promise.all([
            supabase.from('student_selected_skills').select('*, skill:skills(*), student:profiles(*)'),
            supabase.from('student_skill_benchmarks').select('*'),
            supabase.from('profiles').select('*').eq('role', 'STUDENT'),
          ]);

          if (allSelRes.data) {
            const allSelMapped: StudentSelectedSkill[] = (allSelRes.data as any[]).map((s) => ({
              id: s.id,
              student_id: s.student_id,
              skill_id: s.skill_id,
              skill_name: s.skill?.name || 'Skill',
              category: s.skill?.category?.name || 'Programming',
              selected_at: s.selected_at,
            }));
            setAllStudentsSelectedSkills(allSelMapped);
          }
          if (allBenchRes.data) setAllStudentBenchmarks(allBenchRes.data as StudentSkillBenchmark[]);
          if (allProfRes.data) setAllStudentsProfiles(allProfRes.data as Profile[]);
        }
      } catch (err) {
        console.warn('Supabase fetch error, fallback to memory store:', err);
      }
    } else {
      // Local fallback hydration
      setJobs(Array.from(fallbackStore.jobs.values()));
      setAssessments(Array.from(fallbackStore.assessments.values()));
      setSkillCatalog(Array.from(fallbackStore.skillCatalog.values()));
      setTrackedCompanies(Array.from(fallbackStore.trackedCompanies.values()));
      setIngestionLogs(fallbackStore.ingestionLogs);

      if (user) {
        if (role === 'ADMIN') {
          const allApps = Array.from(fallbackStore.applications.values()).map((app) => ({
            ...app,
            job: app.job || fallbackStore.jobs.get(app.job_id),
            student: app.student || fallbackStore.profiles.get(app.student_id),
          }));
          setApplications(allApps);

          const allBenches = Array.from(fallbackStore.benchmarks.values()).flat();
          setAllStudentBenchmarks(allBenches);
          setBenchmarks([]);

          const allSel = Array.from(fallbackStore.selectedSkills.values()).flat();
          setAllStudentsSelectedSkills(allSel);
          setSelectedSkills([]);

          const studentProfs = Array.from(fallbackStore.profiles.values()).filter(
            (p) => p.role === 'STUDENT'
          );
          setAllStudentsProfiles(studentProfs);
        } else {
          const userBenchmarks = fallbackStore.benchmarks.get(user.id) || [];
          setBenchmarks(userBenchmarks);

          const userApps = Array.from(fallbackStore.applications.values())
            .filter((a) => a.student_id === user.id)
            .map((app) => ({
              ...app,
              job: app.job || fallbackStore.jobs.get(app.job_id),
              student: app.student || fallbackStore.profiles.get(app.student_id),
            }));
          setApplications(userApps);

          const userAttempts = Array.from(fallbackStore.attempts.values())
            .flat()
            .filter((att) => att.student_id === user.id);
          setAttempts(userAttempts);

          const userSelected = fallbackStore.selectedSkills.get(user.id) || [];
          setSelectedSkills(userSelected);
        }
      }
    }
    setIsLoading(false);
  }, [user, role]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Realtime Subscriptions for live Admin and Student updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('qualifi:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'skill_assessment_attempts' },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_skill_benchmarks' },
        () => refreshData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const checkSkillCooldown = (skillName: string): SkillCooldownStatus => {
    if (!user) return { can_attempt: true, days_remaining: 0, hours_remaining: 0 };
    return checkSkillCooldownRpc(user.id, skillName) as any;
  };

  const startAssessment = async (skillId: string) => {
    if (!user) {
      toast.error('Please sign in to take assessments');
      throw new Error('Not authenticated');
    }
    return startSkillAssessmentSession(skillId, user.id);
  };

  const submitAssessment = async (
    attemptId: string,
    answers: Record<string, string>,
    violationsCount: number = 0
  ) => {
    if (!user) throw new Error('Not authenticated');
    const res = await submitSkillAssessmentSession(attemptId, answers, user.id, violationsCount);
    await refreshData();
    return res;
  };

  const triggerIngestion = async () => {
    const res = await triggerJobIngestionPipeline();
    await refreshData();
    toast.success('Job ingestion pipeline completed.');
    return res;
  };

  const selectSkill = async (item: SkillCatalogItem): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to select skills');
      return false;
    }
    const existing = selectedSkills.find(
      (s) => s.skill_name.toLowerCase() === item.name.toLowerCase()
    );
    if (existing) {
      toast.info(`"${item.name}" is already in your selected roadmap`);
      return true;
    }

    const newSelected: StudentSelectedSkill = {
      id: isSupabaseConfigured ? (undefined as unknown as string) : `sel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      student_id: user.id,
      skill_id: item.id,
      skill_name: item.name,
      category: item.category,
      selected_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('student_selected_skills').insert({
        student_id: user.id,
        skill_id: item.id,
      });
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else {
      const current = fallbackStore.selectedSkills.get(user.id) || [];
      fallbackStore.selectedSkills.set(user.id, [...current, newSelected]);
      persistFallbackStore();
    }

    await refreshData();
    toast.success(`Added "${item.name}" to your roadmap!`);
    return true;
  };

  const removeSelectedSkill = async (skillId: string): Promise<boolean> => {
    if (!user) return false;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('student_selected_skills')
        .delete()
        .eq('skill_id', skillId)
        .eq('student_id', user.id);
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else {
      const current = fallbackStore.selectedSkills.get(user.id) || [];
      fallbackStore.selectedSkills.set(
        user.id,
        current.filter((s) => s.id !== skillId && s.skill_id !== skillId)
      );
      persistFallbackStore();
    }
    await refreshData();
    toast.info('Skill removed from your roadmap');
    return true;
  };

  const getQuestionsForAssessment = (assessmentId: string): AssessmentQuestion[] => {
    const list = fallbackStore.questions.get(assessmentId);
    if (list && list.length > 0) return list;
    return [
      {
        id: `q-${assessmentId}-1`,
        assessment_id: assessmentId,
        type: 'MCQ',
        question_text: 'Which architectural design pattern provides the strongest decoupling for event-driven telemetry?',
        options: ['Publisher-Subscriber Broker', 'Direct Synchronous Call', 'Shared Global Memory', 'Single-threaded Poller'],
        correct_answer: '0',
        points: 2.5,
        order_index: 1,
      },
    ];
  };

  const createJob = async (newJob: Omit<Job, 'created_at' | 'id'>) => {
    const jobRecord: Job = {
      ...newJob,
      id: isSupabaseConfigured ? (undefined as unknown as string) : `job-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('jobs').insert(jobRecord);
      if (error) throw error;
    } else {
      fallbackStore.jobs.set(jobRecord.id, jobRecord);
      persistFallbackStore();
    }
    await refreshData();
    toast.success('Opportunity posted and criteria committed to verified portal');
  };

  const deleteJob = async (jobId: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('jobs').delete().eq('id', jobId);
    } else {
      fallbackStore.jobs.delete(jobId);
      persistFallbackStore();
    }
    await refreshData();
    toast.success('Opportunity closed successfully');
  };

  const applyForJob = async (
    job: Job,
    matchScore: number,
    hardPassed: boolean
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to track applications');
      return false;
    }

    const externalUrl =
      job.application_url ||
      `https://www.google.com/search?q=${encodeURIComponent(job.company + ' ' + job.title + ' careers')}`;
    window.open(externalUrl, '_blank', 'noopener,noreferrer');

    const existing = applications.find(
      (a) => a.job_id === job.id && a.student_id === user.id
    );

    if (existing) {
      toast.info(`Opened ${job.company} portal. Application record refreshed.`);
      return true;
    }

    const applicationRecord: Application = {
      id: isSupabaseConfigured ? (undefined as unknown as string) : `app-${Date.now()}`,
      job_id: job.id,
      student_id: user.id,
      status: 'APPLIED_EXTERNALLY',
      skill_match_score: matchScore,
      hard_criteria_passed: hardPassed,
      company_application_url: externalUrl,
      notes: `Applied on official ${job.company} portal.`,
      last_updated_by_student: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      job,
      student: user,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('applications').insert(applicationRecord);
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else {
      fallbackStore.applications.set(applicationRecord.id, applicationRecord);
      persistFallbackStore();
    }

    await refreshData();
    toast.success(
      `Redirected to ${job.company}! Added to your Personal Tracker as 'APPLIED_EXTERNALLY'.`
    );
    return true;
  };

  const updateApplicationStatus = async (
    appId: string,
    status: Application['status'],
    interviewTime?: string,
    link?: string,
    notes?: string
  ) => {
    const payload: Partial<Application> = {
      status,
      updated_at: new Date().toISOString(),
      last_updated_by_student: new Date().toISOString(),
      ...(interviewTime !== undefined && { interview_time: interviewTime }),
      ...(link !== undefined && { interview_link: link }),
      ...(notes !== undefined && { notes }),
    };

    if (isSupabaseConfigured) {
      await supabase.from('applications').update(payload).eq('id', appId);
    } else {
      const existing = fallbackStore.applications.get(appId);
      if (existing) {
        fallbackStore.applications.set(appId, { ...existing, ...payload });
        persistFallbackStore();
      }
    }
    await refreshData();
    toast.success(`Application updated to ${status.replace(/_/g, ' ')}`);
  };

  const saveBenchmarkScore = async (skill: string, score: number, assessmentId?: string) => {
    if (!user) return;
    const nowIso = new Date().toISOString();

    const newBenchmark: StudentSkillBenchmark = {
      id: `bench-${Date.now()}`,
      student_id: user.id,
      skill_category: skill,
      score,
      assessment_id: assessmentId,
      verified_at: nowIso,
    };

    if (isSupabaseConfigured) {
      await supabase.from('student_skill_benchmarks').upsert(
        {
          student_id: user.id,
          skill_category: skill,
          score,
          assessment_id: assessmentId,
          verified_at: nowIso,
        },
        { onConflict: 'student_id,skill_category' }
      );
    } else {
      const userBenches = fallbackStore.benchmarks.get(user.id) || [];
      const filtered = userBenches.filter(
        (b) => b.skill_category.toLowerCase() !== skill.toLowerCase()
      );
      fallbackStore.benchmarks.set(user.id, [...filtered, newBenchmark]);
      persistFallbackStore();
    }
    await refreshData();
  };

  const recordAssessmentAttempt = async (attemptData: Omit<AssessmentAttempt, 'id'>) => {
    const record: AssessmentAttempt = {
      ...attemptData,
      id: isSupabaseConfigured ? (undefined as unknown as string) : `attempt-${Date.now()}`,
    };

    if (isSupabaseConfigured) {
      await supabase.from('skill_assessment_attempts').insert(record);
    } else {
      const currentAttempts = fallbackStore.attempts.get(attemptData.student_id) || [];
      fallbackStore.attempts.set(attemptData.student_id, [record, ...currentAttempts]);
      persistFallbackStore();
    }
    await refreshData();
  };

  const addAssessmentWithQuestions = async (
    assessmentData: Omit<Assessment, 'id' | 'created_at'>,
    questionsData: Omit<AssessmentQuestion, 'id' | 'assessment_id' | 'order_index'>[]
  ) => {
    const assessmentId = `assess-${Date.now()}`;
    const assessmentRecord: Assessment = {
      ...assessmentData,
      id: assessmentId,
      created_at: new Date().toISOString(),
    };

    const questionsRecords: AssessmentQuestion[] = questionsData.map((q, idx) => ({
      ...q,
      id: `q-${assessmentId}-${idx + 1}`,
      assessment_id: assessmentId,
      order_index: idx + 1,
    }));

    if (isSupabaseConfigured) {
      const { error: aErr } = await supabase.from('assessments').insert(assessmentRecord);
      if (aErr) throw aErr;
      const { error: qErr } = await supabase
        .from('assessment_questions')
        .insert(questionsRecords);
      if (qErr) throw qErr;
    } else {
      fallbackStore.assessments.set(assessmentId, assessmentRecord);
      fallbackStore.questions.set(assessmentId, questionsRecords);
      persistFallbackStore();
    }

    await refreshData();
    toast.success(
      `Assessment "${assessmentRecord.title}" committed with ${questionsRecords.length} questions!`
    );
  };

  return (
    <DataContext.Provider
      value={{
        jobs,
        benchmarks,
        applications,
        assessments,
        attempts,
        skillCatalog,
        selectedSkills,
        allStudentsSelectedSkills,
        allStudentBenchmarks,
        allStudentsProfiles,
        trackedCompanies,
        ingestionLogs,
        isLoading,
        refreshData,
        getQuestionsForAssessment,
        createJob,
        deleteJob,
        applyForJob,
        updateApplicationStatus,
        selectSkill,
        removeSelectedSkill,
        checkSkillCooldown,
        startAssessment,
        submitAssessment,
        triggerIngestion,
        saveBenchmarkScore,
        recordAssessmentAttempt,
        addAssessmentWithQuestions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
