import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OtpPage from './pages/OtpPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SurveyPage from './pages/SurveyPage';
import TestPage from './pages/Test';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseLearningPage from './pages/CourseLearningPage';
import MyCoursesListPage from './pages/MyCoursesListPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import MentorCoursesPage from './pages/mentor/MentorCoursesPage';
import MentorNewsPage from './pages/mentor/MentorNewsPage';
import MentorStudentProgressPage from './pages/mentor/MentorStudentProgressPage';
import MentorCoursePlaceholder from './components/mentor/MentorCoursePlaceholder';

import MainLayout from './components/layout/MainLayout';
import AdminRoute from './components/common/AdminRoute';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminMentorsPage from './pages/AdminMentorsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminReportPage from './pages/AdminReportPage';

function ProtectedRoute({ children }) {
  const user = sessionStorage.getItem('user');
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/test-component" element={<TestPage />} />

        <Route
          path="/survey"
          element={
            <ProtectedRoute allowedRoles={['Student', 'Admin', 'Mentor']}>
              <SurveyPage />
            </ProtectedRoute>
          }
        />

        {/* Student app shell */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />

          <Route
            path="courses"
            element={
              <ProtectedRoute
                allowedRoles={['Student', 'Admin']}
                roleRedirects={MENTOR_BLOCK_REDIRECTS}
              >
                <CourseListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/:id"
            element={
              <ProtectedRoute
                allowedRoles={['Student', 'Admin']}
                roleRedirects={MENTOR_BLOCK_REDIRECTS}
              >
                <CourseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-courses"
            element={
              <ProtectedRoute
                allowedRoles={['Student']}
                roleRedirects={MENTOR_BLOCK_REDIRECTS}
              >
                <MyCoursesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-courses/:courseId/learn"
            element={
              <ProtectedRoute
                allowedRoles={['Student']}
                roleRedirects={MENTOR_BLOCK_REDIRECTS}
              >
                <CourseLearningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute
                allowedRoles={['Student', 'Admin']}
                roleRedirects={MENTOR_BLOCK_REDIRECTS}
              >
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Navigate to="/" replace />
            </ProtectedRoute>
          }
        />
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />

        {/* Mentor routes */}
        <Route
          path="/mentor"
          element={
            <ProtectedRoute
              allowedRoles={['Mentor']}
              roleRedirects={STUDENT_MENTOR_ROUTE_REDIRECTS}
            >
              <MentorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home"                       element={<HomePage />} />
          <Route path="courses"                    element={<CourseListPage />} />
          <Route path="courses/:id"                element={<CourseDetailPage />} />
          <Route path="my-courses"                 element={<MyCoursesListPage />} />
          <Route path="my-courses/:courseId/learn" element={<CourseLearningPage />} />
          <Route path="profile"                    element={<ProfilePage />} />
        </Route>

        {/* Admin — cần login + role Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="mentors" element={<AdminMentorsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="report" element={<AdminReportPage />} />
        </Route>

        {/* Student-specific routes placeholder */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={['Student']}>
              <Navigate to="/" replace />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}