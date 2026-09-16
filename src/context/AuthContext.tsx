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
  studentRegister: (params: StudentRegisterParams) => Promise<boolean>;
  studentGoogleAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  switchRole: (newRole: Role) => void;
  switchStudentUser: (userId: string) => void;
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

  // Initialize session from Supabase or localStorage
  useEffect(() => {
    async function initSession() {
      setIsLoading(true);

      // Check if admin is logged in from localStorage
      const savedAuthUser = localStorage.getItem('QUALIFI_ACTIVE_AUTH_USER');
      if (savedAuthUser) {
        try {
          const parsed = JSON.parse(savedAuthUser) as Profile;
          if (parsed.id === ADMIN_CONFIG.ID && parsed.role === 'ADMIN') {
            setUser(ADMIN_PROFILE);
            setRole('ADMIN');
            setIsLoading(false);
            return;
          }
          if (parsed && parsed.role === 'STUDENT') {
            setUser(parsed);
            setRole('STUDENT');
            setIsLoading(false);
            return;
          }
        } catch {
          // parse error, continue
        }
      }

      if (isSupabaseConfigured) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile && !error) {
              const loadedProfile = profile as Profile;
              setUser(loadedProfile);
              setRole(loadedProfile.role);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Supabase auth check fallback:', err);
        }
      }

      // Default to student persona from fallback store
      const defaultStudent =
        fallbackStore.profiles.get('mock-student-id') ||
        Array.from(fallbackStore.profiles.values()).find((p) => p.role === 'STUDENT') ||
        null;

      if (defaultStudent) {
        setUser(defaultStudent);
        setRole('STUDENT');
      }
      setIsLoading(false);
    }

    initSession();
  }, []);

  const isAdminAuthenticated = Boolean(user?.id === ADMIN_CONFIG.ID && role === 'ADMIN');

  const adminLogin = async (email: string, pass: string): Promise<boolean> => {
    // Strictly validate administrator credentials
    if (email === ADMIN_CONFIG.EMAIL && pass === ADMIN_CONFIG.PASSWORD) {
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
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            const loaded = profile as Profile;
            setUser(loaded);
            setRole('STUDENT');
            localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(loaded));
            return true;
          }
        }
      } catch (err: any) {
        console.warn('Supabase student login error, falling back:', err);
      }
    }

    // Local fallback match
    let matched: Profile | undefined;
    for (const p of fallbackStore.profiles.values()) {
      if (p.email.toLowerCase() === email.toLowerCase() && p.role === 'STUDENT') {
        matched = p;
        break;
      }
    }

    if (!matched) {
      // Auto-create local student profile if first time
      matched = {
        id: `student-${Date.now()}`,
        role: 'STUDENT',
        full_name: email.split('@')[0],
        email: email,
        cgpa: 8.85,
        branch: 'Computer Science',
        degree: 'B.Tech',
        college: 'Massachusetts Institute of Technology',
        parsed_resume: {
          skills: ['React', 'Python', 'DSA', 'SQL'],
          education: [{ institution: 'MIT', degree: 'B.Tech', year: 2026, cgpa: 8.85 }],
          projects: [],
          certifications: [],
        },
      };
      fallbackStore.profiles.set(matched.id, matched);
      persistFallbackStore();
    }

    setUser(matched);
    setRole('STUDENT');
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(matched));
    return true;
  };

  const studentRegister = async (params: StudentRegisterParams): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              college: params.college,
              degree: params.degree,
              branch: params.branch,
              cgpa: params.cgpa,
              role: 'STUDENT',
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            role: 'STUDENT',
            full_name: params.fullName,
            email: params.email,
            cgpa: params.cgpa,
            branch: params.branch,
            degree: params.degree,
            college: params.college,
            parsed_resume: {
              skills: ['React', 'Python', 'DSA', 'SQL'],
              education: [
                {
                  institution: params.college,
                  degree: params.degree,
                  year: 2026,
                  cgpa: params.cgpa,
                },
              ],
              projects: [],
              certifications: [],
            },
          };
          setUser(newProfile);
          setRole('STUDENT');
          localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(newProfile));
          return true;
        }
      } catch (err) {
        console.warn('Supabase registration error, falling back locally:', err);
      }
    }

    const newProfile: Profile = {
      id: `student-${Date.now()}`,
      role: 'STUDENT',
      full_name: params.fullName,
      email: params.email,
      cgpa: params.cgpa,
      branch: params.branch,
      degree: params.degree,
      college: params.college,
      parsed_resume: {
        skills: ['React', 'Python', 'DSA', 'SQL'],
        education: [
          {
            institution: params.college,
            degree: params.degree,
            year: 2026,
            cgpa: params.cgpa,
          },
        ],
        projects: [],
        certifications: [],
      },
    };

    fallbackStore.profiles.set(newProfile.id, newProfile);
    persistFallbackStore();
    setUser(newProfile);
    setRole('STUDENT');
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(newProfile));
    return true;
  };

  const studentGoogleAuth = async () => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/student/jobs',
          },
        });
        if (error) throw error;
        return;
      } catch (err) {
        console.warn('Google OAuth error, falling back to simulated Google Persona:', err);
      }
    }

    // Fallback simulated Google authentication
    const googleStudent: Profile = {
      id: 'google-student-alex',
      role: 'STUDENT',
      full_name: 'Alex Vance (Google Account)',
      email: 'alex.vance@gmail.com',
      cgpa: 8.85,
      branch: 'Computer Science',
      degree: 'B.Tech',
      college: 'Massachusetts Institute of Technology',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      parsed_resume: {
        skills: ['React', 'Python', 'DSA', 'Cloud & DevOps', 'TypeScript', 'Docker', 'PostgreSQL'],
        education: [{ institution: 'MIT', degree: 'B.Tech in Computer Science', year: 2026, cgpa: 8.85 }],
        projects: [
          {
            title: 'Distributed Routing System',
            description: 'High-throughput graph routing system using A* and dynamic recalculation.',
            techStack: ['C++', 'Python', 'Docker'],
          },
        ],
        certifications: ['AWS Certified Developer Associate'],
      },
    };

    fallbackStore.profiles.set(googleStudent.id, googleStudent);
    persistFallbackStore();
    setUser(googleStudent);
    setRole('STUDENT');
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(googleStudent));
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/student/profile',
        });
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn('Supabase password reset warning:', err);
      }
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
      if (user?.id === ADMIN_CONFIG.ID) {
        const student =
          fallbackStore.profiles.get('mock-student-id') ||
          Array.from(fallbackStore.profiles.values()).find((p) => p.role === 'STUDENT');
        if (student) {
          setUser(student);
          localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(student));
        }
      }
    }
  };

  const switchStudentUser = (userId: string) => {
    const student = fallbackStore.profiles.get(userId);
    if (student) {
      setUser(student);
      setRole('STUDENT');
      localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(student));
      toast.info(`Switched to persona: ${student.full_name}`);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updated: Profile = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setUser(updated);
    localStorage.setItem('QUALIFI_ACTIVE_AUTH_USER', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase profile update warning:', err);
      }
    } else {
      fallbackStore.profiles.set(user.id, updated);
      persistFallbackStore();
    }
  };

  const signOut = async () => {
    localStorage.removeItem('QUALIFI_ACTIVE_AUTH_USER');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('SignOut error:', err);
      }
    }
    // Set to default student persona
    const defaultStudent = fallbackStore.profiles.get('mock-student-id') || null;
    setUser(defaultStudent);
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
        switchStudentUser,
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
