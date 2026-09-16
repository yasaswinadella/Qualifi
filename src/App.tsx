import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Toaster } from 'sonner';

// Auth Pages
import { AdminLoginPage } from './pages/auth/AdminLoginPage';

// Student Pages
import { StudentProfile } from './pages/student/StudentProfile';
import { SkillSelection } from './pages/student/SkillSelection';
import { TakeAssessment } from './pages/student/TakeAssessment';
import { SkillDiagnostics } from './pages/student/SkillDiagnostics';
import { JobPortal } from './pages/student/JobPortal';
import { ApplicationsTracker } from './pages/student/ApplicationsTracker';
import { AiAdvisorChat } from './pages/student/AiAdvisorChat';

// Admin Pages
import { PostJob } from './pages/admin/PostJob';
import { AssessmentBuilder } from './pages/admin/AssessmentBuilder';
import { CandidatePipeline } from './pages/admin/CandidatePipeline';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-obsidian text-slate-100 antialiased">
    <Navbar />
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  </div>
);

const RoleRouter: React.FC = () => {
  const { role, user } = useAuth();
  if (role === 'ADMIN' && user?.id === 'yashu-admin-1') {
    return <Navigate to="/admin/pipeline" replace />;
  }
  return <Navigate to="/student/jobs" replace />;
};

const StudentProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role === 'ADMIN') {
    return <Navigate to="/admin/pipeline" replace />;
  }
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user } = useAuth();
  // Strictly require authenticated Admin ID yashu-admin-1
  if (role !== 'ADMIN' || user?.id !== 'yashu-admin-1') {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Toaster position="bottom-right" richColors theme="dark" />
          <Routes>
            {/* Dedicated Admin Login Route */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Main Application Layout Routes */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    {/* Student Routes */}
                    <Route
                      path="/student/profile"
                      element={
                        <StudentProtectedRoute>
                          <StudentProfile />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/skills"
                      element={
                        <StudentProtectedRoute>
                          <SkillSelection />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/assessments"
                      element={
                        <StudentProtectedRoute>
                          <TakeAssessment />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/diagnostics"
                      element={
                        <StudentProtectedRoute>
                          <SkillDiagnostics />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/jobs"
                      element={
                        <StudentProtectedRoute>
                          <JobPortal />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/applications"
                      element={
                        <StudentProtectedRoute>
                          <ApplicationsTracker />
                        </StudentProtectedRoute>
                      }
                    />
                    <Route
                      path="/student/assistant"
                      element={
                        <StudentProtectedRoute>
                          <AiAdvisorChat />
                        </StudentProtectedRoute>
                      }
                    />

                    {/* Admin Routes */}
                    <Route
                      path="/admin/post-job"
                      element={
                        <AdminProtectedRoute>
                          <PostJob />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/assessments"
                      element={
                        <AdminProtectedRoute>
                          <AssessmentBuilder />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/pipeline"
                      element={
                        <AdminProtectedRoute>
                          <CandidatePipeline />
                        </AdminProtectedRoute>
                      }
                    />

                    {/* Catch-all & Default Routing */}
                    <Route path="/" element={<RoleRouter />} />
                    <Route path="*" element={<RoleRouter />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
