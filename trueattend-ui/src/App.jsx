import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/shared/Sidebar';
import { AlertToasts } from './components/shared/UI';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminReports from './pages/admin/AdminReports';
import AdminFeeds from './pages/admin/AdminFeeds';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import MarkAttendance from './pages/professor/MarkAttendance';
import StudentDashboard from './pages/student/StudentDashboard';
import RegisterFace from './pages/student/RegisterFace';
import LeaveRequests from './pages/student/LeaveRequests';

// Simple placeholder for pages not yet fully implemented
const Placeholder = ({ title }) => (
  <div className="page-content">
    <motion.div className="card" style={{ padding: '60px 32px', textAlign: 'center', maxWidth: 500 }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>{title}</div>
      <div style={{ color: 'var(--text-3)' }}>This section is ready — connect to your backend API to populate it.</div>
    </motion.div>
  </div>
);

function ProtectedLayout({ requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-3)' }}>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to={`/${user.role}`} replace />;

  return (
    <SocketProvider user={user}>
      <div className="app-layout">
        <div className="bg-mesh" />
        <Sidebar />
        <main className="main-content">
          <AlertToasts />
          <Routes>
            {requiredRole === 'admin' && (
              <>
                <Route index element={<AdminDashboard />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="professors" element={<Placeholder title="Professors" />} />
                <Route path="courses" element={<Placeholder title="Courses" />} />
                <Route path="feeds" element={<AdminFeeds />} />
                <Route path="alerts" element={<Placeholder title="Alerts" />} />
                <Route path="reports" element={<AdminReports />} />
              </>
            )}
            {requiredRole === 'professor' && (
              <>
                <Route index element={<ProfessorDashboard />} />
                <Route path="courses" element={<ProfessorDashboard />} />
                <Route path="mark" element={<MarkAttendance />} />
                <Route path="history" element={<Placeholder title="Session History" />} />
                <Route path="alerts" element={<Placeholder title="Alerts" />} />
              </>
            )}
            {requiredRole === 'student' && (
              <>
                <Route index element={<StudentDashboard />} />
                <Route path="attendance" element={<StudentDashboard />} />
                <Route path="register-face" element={<RegisterFace />} />
                <Route path="leave" element={<LeaveRequests />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </SocketProvider>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-2)',
            color: 'var(--text)',
            border: '1px solid var(--border-2)',
            borderRadius: 12,
            fontSize: '0.85rem',
            fontFamily: 'var(--font-body)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-2)' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--bg-2)' } },
        }}
      />
      <Routes>
        <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <LoginPage />} />
        <Route path="/admin/*" element={<ProtectedLayout requiredRole="admin" />} />
        <Route path="/professor/*" element={<ProtectedLayout requiredRole="professor" />} />
        <Route path="/student/*" element={<ProtectedLayout requiredRole="student" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
