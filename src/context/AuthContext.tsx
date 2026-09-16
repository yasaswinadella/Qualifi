import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, Role } from '../types/database';
import { supabase, isSupabaseConfigured, fallbackStore, persistFallbackStore } from '../lib/supabase';
import { toast } from 'sonner';

export const ADMIN_CONFIG = {
  EMAIL: 'yasaswinadella.1800@gmail.com',
  PASSWORD: 'qualifiiii',
  ID: 'yashu-admin-1',
};

interface StudentRegisterParams {
  email: string;
  password: string;
  fullName: string;
  college: string;
  degree: string;
  branch: string;
  cgpa: number;
}

interface AuthContextType {
  user: Profile | null;
  role: Role;
  isLoading: boolean;
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, pass: string) => Promise<boolean>;
  studentLogin: (email: string, pass: string) => Promise<boolean>;
  studentRegister: (params: StudentRegisterParams) => Promise<{ needsEmailConfirmation?: boolean }>;
  studentGoogleAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  switchRole: (newRole: Role) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PROFILE: Profile = {
  id: ADMIN_CONFIG.ID,
  role: 'ADMIN',
  full_name: 'Yasaswi Nadella (Platform Admin)',
  email: ADMIN_CONFIG.EMAIL,
  cgpa: 0,
  branch: '',
  degree: '',
  college: '',
  company_name: 'Qualifi Platform Control',
  parsed_resume: {
    skills: [],
    education: [],
    projects: [],
    certifications: [],
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>('STUDENT');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync real authenticated Supabase user with database profile
  const syncSupabaseProfile = async (authUser: any) => {
    try {
      // 1. Check if user is the designated platform administrator
      if (authUser.email === ADMIN_CONFIG.EMAIL) {
        setUser(ADMIN_PROFILE);
        setRole('ADMIN');
        localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(ADMIN_PROFILE));
        fallbackStore.profiles.set(ADMIN_CONFIG.ID, ADMIN_PROFILE);
        persistFallbackStore();
        return;
      }

      // 2. Fetch real database profile from Supabase
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile && !fetchErr) {
        const loaded = profile as Profile;
        setUser(loaded);
        setRole(loaded.role || 'STUDENT');
        localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(loaded));
        fallbackStore.profiles.set(loaded.id, loaded);
        persistFallbackStore();
        return;
      }

      // 3. If profile row does not exist (e.g. fresh Google OAuth sign-in)
      const meta = authUser.user_metadata || {};
      const fullName =
        meta.full_name ||
        meta.name ||
        meta.user_name ||
        authUser.email?.split('@')[0] ||
        'Verified Student Candidate';
      const avatarUrl =
        meta.avatar_url ||
        meta.picture ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.id)}`;
      const college = meta.college || 'Global Institute of Technology';
      const degree = meta.degree || 'B.Tech';
      const branch = meta.branch || 'Computer Science';
      const cgpa = typeof meta.cgpa === 'number' ? meta.cgpa : 8.85;

      const newStudentProfile: Profile = {
        id: authUser.id,
        role: 'STUDENT',
        full_name: fullName,
        email: authUser.email || '',
        avatar_url: avatarUrl,
        college: college,
        degree: degree,
        branch: branch,
        cgpa: cgpa,
        company_name: '',
        parsed_resume: {
          skills: ['React', 'Python', 'DSA', 'SQL', 'TypeScript', 'Cloud & DevOps'],
          education: [
            {
              institution: college,
              degree: `${degree} in ${branch}`,
              year: 2026,
              cgpa: cgpa,
            },
          ],
          projects: [
            {
              title: 'Automated Skill Verification Pipeline',
              description: 'Standardized assessment engine with Gemini AI automated scoring and proctoring telemetry.',
              techStack: ['React', 'TypeScript', 'Supabase', 'PostgreSQL'],
            },
          ],
          certifications: ['Verified Early-Career Technical Candidate'],
          summary: `Candidate profile registered with verified identity: ${authUser.email}.`,
        },
      };

      // Save into Supabase profiles table
      const { error: insertErr } = await supabase.from('profiles').upsert(newStudentProfile);
      if (insertErr) {
        console.error('Error creating profile in Supabase database:', insertErr);
      }

      setUser(newStudentProfile);
      setRole('STUDENT');
      localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(newStudentProfile));
      fallbackStore.profiles.set(newStudentProfile.id, newStudentProfile);
      persistFallbackStore();
      toast.success(`Welcome to Qualifi, ${fullName}!`);
    } catch (err) {
      console.error('Error during Supabase profile sync:', err);
    }
  };

  // Live session initialization and auth state listener
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);

      // Check if admin is currently active in localStorage
      const savedAuthUser = localStorage.getItem('QUALIFI_ACTIVE_AUTH_USER');
      if (savedAuthUser) {
        try {
          const parsed = JSON.parse(savedAuthUser) as Profile;
          if (parsed.id === ADMIN_CONFIG.ID && parsed.role === 'ADMIN') {
            if (isMounted) {
              setUser(ADMIN_PROFILE);
              setRole('ADMIN');
              setIsLoading(false);
            }
            return;
          }
        } catch {
          // parse error
        }
      }

      // Query real Supabase Auth session
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          await syncSupabaseProfile(session.user);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Supabase session initialization error:', err);
      }

      if (isMounted) {
        setUser(null);
        setRole('STUDENT');
        setIsLoading(false);
      }
    }

    initSession();

    // Subscribe to live auth changes (Google redirects, login, logout, password recovery)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncSupabaseProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('QUALIFI_ACTIVE_AUTH_USER');
        setUser(null);
        setRole('STUDENT');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const isAdminAuthenticated = Boolean(user?.id === ADMIN_CONFIG.ID && role === 'ADMIN');

  const adminLogin = async (email: string, pass: string): Promise<boolean> => {
    // Strictly validate administrator credentials
    if (email.trim() === ADMIN_CONFIG.EMAIL && pass === ADMIN_CONFIG.PASSWORD) {
      setUser(ADMIN_PROFILE);
      setRole('ADMIN');
      localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(ADMIN_PROFILE));
      fallbackStore.profiles.set(ADMIN_CONFIG.ID, ADMIN_PROFILE);
      persistFallbackStore();
      return true;
    }
    return false;
  };

  const studentLogin = async (email: string, pass: string): Promise<boolean> => {
    // Call Real Supabase signInWithPassword
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      console.error('Supabase student login failed:', error);
      throw new Error(error.message || 'Invalid student login credentials.');
    }

    if (!data.user) {
      throw new Error('Authentication succeeded but user record could not be retrieved.');
    }

    await syncSupabaseProfile(data.user);
    return true;
  };

  const studentRegister = async (params: StudentRegisterParams): Promise<{ needsEmailConfirmation?: boolean }> => {
    // Call Real Supabase signUp
    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        data: {
          full_name: params.fullName.trim(),
          college: params.college.trim(),
          degree: params.degree.trim(),
          branch: params.branch.trim(),
          cgpa: params.cgpa,
          role: 'STUDENT',
        },
      },
    });

    if (error) {
      console.error('Supabase student registration error:', error);
      throw new Error(error.message || 'Registration failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('Failed to create user in Supabase Authentication.');
    }

    const newProfile: Profile = {
      id: data.user.id,
      role: 'STUDENT',
      full_name: params.fullName.trim(),
      email: params.email.trim(),
      cgpa: params.cgpa,
      branch: params.branch.trim(),
      degree: params.degree.trim(),
      college: params.college.trim(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.user.id)}`,
      parsed_resume: {
        skills: ['React', 'Python', 'DSA', 'SQL'],
        education: [
          {
            institution: params.college.trim(),
            degree: `${params.degree} in ${params.branch}`,
            year: 2026,
            cgpa: params.cgpa,
          },
        ],
        projects: [],
        certifications: [],
        summary: `Student candidate at ${params.college.trim()}.`,
      },
    };

    // Insert real profile into Supabase PostgreSQL profiles table
    const { error: profileErr } = await supabase.from('profiles').upsert(newProfile);
    if (profileErr) {
      console.warn('Note on Supabase profile creation:', profileErr);
    }

    // Check if Supabase requires email verification
    if (!data.session) {
      return { needsEmailConfirmation: true };
    }

    setUser(newProfile);
    setRole('STUDENT');
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(newProfile));
    fallbackStore.profiles.set(newProfile.id, newProfile);
    persistFallbackStore();
    return { needsEmailConfirmation: false };
  };

  const studentGoogleAuth = async () => {
    toast.info('Connecting to Google OAuth via Supabase...');
    const redirectUrl = `${window.location.origin}/student/jobs`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('Supabase Google OAuth error:', error);
      toast.error(`Google Sign-In Error: ${error.message}`);
      throw new Error(error.message || 'Google authentication failed.');
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    // Call Real Supabase resetPasswordForEmail
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      throw new Error(error.message || 'Could not send password reset email.');
    }

    return true;
  };

  const switchRole = (newRole: Role) => {
    if (newRole === 'ADMIN') {
      if (user?.id !== ADMIN_CONFIG.ID) {
        toast.info('Admin access requires secure credentials verification.');
        return;
      }
      setRole('ADMIN');
    } else {
      setRole('STUDENT');
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No authenticated user session found.');

    const updated: Profile = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update real Supabase profiles table
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Supabase profile update failed:', error);
      throw new Error(error.message || 'Failed to update profile credentials in database.');
    }

    setUser(updated);
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(updated));
    fallbackStore.profiles.set(user.id, updated);
    persistFallbackStore();
  };

  const signOut = async () => {
    localStorage.removeItem('QUALIFI_ACTIVE_AUTH_USER');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    }
    setUser(null);
    setRole('STUDENT');
    toast.info('Signed out successfully.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAdminAuthenticated,
        adminLogin,
        studentLogin,
        studentRegister,
        studentGoogleAuth,
        forgotPassword,
        switchRole,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

