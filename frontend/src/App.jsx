import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import OtpPage from '@/features/auth/pages/OtpPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import SurveyPage from '@/features/auth/pages/SurveyPage';
import TestPage from '@/features/dev/Test';
import CourseListPage from '@/features/courses/pages/CourseListPage';
import CourseDetailPage from '@/features/courses/pages/CourseDetailPage';
import CourseLearningPage from '@/features/learning/pages/CourseLearningPage';
import CourseTestPage from '@/features/learning/pages/CourseTestPage';
import MyCoursesListPage from '@/features/learning/pages/MyCoursesListPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import UnauthorizedPage from '@/features/auth/pages/UnauthorizedPage';
import MentorCoursesPage from '@/features/mentor/pages/MentorCoursesPage';
import MentorNewsPage from '@/features/mentor/pages/MentorNewsPage';
import MentorStudentProgressPage from '@/features/mentor/pages/MentorStudentProgressPage';
import MentorCreateCoursePage from '@/features/mentor/pages/MentorCreateCoursePage';
import MentorCreateCourseContentPage from '@/features/mentor/pages/MentorCreateCourseContentPage';
import MentorCreateCourseReviewPage from '@/features/mentor/pages/MentorCreateCourseReviewPage';
import MentorEditCoursePage from '@/features/mentor/pages/MentorEditCoursePage';
import MentorEditCourseContentPage from '@/features/mentor/pages/MentorEditCourseContentPage';
import MentorEditCourseReviewPage from '@/features/mentor/pages/MentorEditCourseReviewPage';
import MentorCourseDetailPage from '@/features/mentor/pages/MentorCourseDetailPage';
import MentorQuestionBankListPage from '@/features/mentor/pages/MentorQuestionBankListPage';
import MentorQuestionBankCreatePage from '@/features/mentor/pages/MentorQuestionBankCreatePage';
import MentorQuestionBankDetailPage from '@/features/mentor/pages/MentorQuestionBankDetailPage';
import MentorCourseQuestionsPage from '@/features/mentor/pages/MentorCourseQuestionsPage';
import AdminAccountManagementPage from '@/features/admin/pages/AdminAccountManagementPage';
import AdminCategoryManagementPage from '@/features/admin/pages/AdminCategoryManagementPage';
import AdminLevelManagementPage from '@/features/admin/pages/AdminLevelManagementPage';
import AdminNewsManagementPage from '@/features/admin/pages/AdminNewsManagementPage';
import AdminNewsCreatePage from '@/features/admin/pages/AdminNewsCreatePage';
import AdminNewsCreateContentPage from '@/features/admin/pages/AdminNewsCreateContentPage';
import AdminNewsEditPage from '@/features/admin/pages/AdminNewsEditPage';
import AdminNewsEditContentPage from '@/features/admin/pages/AdminNewsEditContentPage';
import NewsListPage from '@/features/news/pages/NewsListPage';
import NewsDetailPage from '@/features/news/pages/NewsDetailPage';

import MainLayout from '@/shared/layout/MainLayout';
import MentorLayout from '@/shared/layout/MentorLayout';
import AdminLayout from '@/shared/layout/AdminLayout';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import RoleAwareHome, { AppRootRedirect } from '@/shared/routing/RoleAwareHome';
import { useAutoLogout } from '@/hooks/useAutoLogout';

import {
  AdminShellFallbackRedirect,
  AdminShellIndexRedirect,
  MentorShellFallbackRedirect,
  MentorShellIndexRedirect,
  StudentShellIndexRedirect,
} from '@/shared/routing/RoleShellRedirects';
import {
  ADMIN_SHELL_BLOCK_REDIRECTS,
  MENTOR_SHELL_BLOCK_REDIRECTS,
  STUDENT_SHELL_BLOCK_REDIRECTS,
  STUDENT_SHARED_ROUTE_REDIRECTS,
} from '@/shared/routing/routeAccess';

export default function App() {
  console.log("App.jsx: App component is rendering");
  useAutoLogout();

  return (
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
          <ProtectedRoute allowedRoles={['Student']}>
            <SurveyPage />
          </ProtectedRoute>
        }
      />

      {/* Student app shell */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<RoleAwareHome />} />
        <Route path="home" element={<RoleAwareHome />} />

        <Route
          path="courses"
          element={
            <ProtectedRoute
              allowedRoles={['Student', 'Admin']}
              roleRedirects={STUDENT_SHARED_ROUTE_REDIRECTS}
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
              roleRedirects={STUDENT_SHARED_ROUTE_REDIRECTS}
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
              roleRedirects={STUDENT_SHELL_BLOCK_REDIRECTS}
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
              roleRedirects={STUDENT_SHELL_BLOCK_REDIRECTS}
            >
              <CourseLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-courses/:courseId/test/:scope/:chapterId?"
          element={
            <ProtectedRoute
              allowedRoles={['Student']}
              roleRedirects={STUDENT_SHELL_BLOCK_REDIRECTS}
            >
              <CourseTestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="news"
          element={
            <ProtectedRoute
              allowedRoles={['Student', 'Admin']}
              roleRedirects={STUDENT_SHARED_ROUTE_REDIRECTS}
            >
              <NewsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="news/:id"
          element={
            <ProtectedRoute
              allowedRoles={['Student', 'Admin']}
              roleRedirects={STUDENT_SHARED_ROUTE_REDIRECTS}
            >
              <NewsDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute
              allowedRoles={['Student']}
              roleRedirects={{
                ...STUDENT_SHELL_BLOCK_REDIRECTS,
                Admin: '/admin/profile',
              }}
            >
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']} roleRedirects={ADMIN_SHELL_BLOCK_REDIRECTS}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminShellIndexRedirect />} />
        <Route path="accounts" element={<AdminAccountManagementPage />} />
        <Route path="categories" element={<AdminCategoryManagementPage />} />
        <Route path="levels" element={<AdminLevelManagementPage />} />
        <Route path="news/create/content" element={<AdminNewsCreateContentPage />} />
        <Route path="news/create" element={<AdminNewsCreatePage />} />
        <Route path="news/:newsId/edit/content" element={<AdminNewsEditContentPage />} />
        <Route path="news/:newsId/edit" element={<AdminNewsEditPage />} />
        <Route path="news" element={<AdminNewsManagementPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<AdminShellFallbackRedirect />} />
      </Route>

      {/* Mentor routes */}
      <Route
        path="/mentor"
        element={
          <ProtectedRoute allowedRoles={['Mentor']} roleRedirects={MENTOR_SHELL_BLOCK_REDIRECTS}>
            <MentorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MentorShellIndexRedirect />} />
        <Route path="courses/create/review" element={<MentorCreateCourseReviewPage />} />
        <Route path="courses/create/content" element={<MentorCreateCourseContentPage />} />
        <Route path="courses/create" element={<MentorCreateCoursePage />} />
        <Route path="courses/:courseId/review" element={<MentorEditCourseReviewPage />} />
        <Route path="courses/:courseId/content/edit" element={<MentorEditCourseContentPage />} />
        <Route path="courses/:courseId/content" element={<MentorEditCourseContentPage />} />
        <Route path="courses/:courseId/edit" element={<MentorEditCoursePage />} />
        <Route path="courses/:courseId/questions" element={<MentorCourseQuestionsPage />} />
        <Route path="courses/:courseId" element={<MentorCourseDetailPage />} />
        <Route path="courses" element={<MentorCoursesPage />} />
        <Route path="question-banks/create" element={<MentorQuestionBankCreatePage />} />
        <Route path="question-banks/:questionBankId" element={<MentorQuestionBankDetailPage />} />
        <Route path="question-banks" element={<MentorQuestionBankListPage />} />
        <Route path="news" element={<MentorNewsPage />} />
        <Route path="student-progress" element={<MentorStudentProgressPage />} />
        <Route path="paths" element={<MentorShellFallbackRedirect />} />
        <Route path="*" element={<MentorShellFallbackRedirect />} />
      </Route>

      <Route
        path="/student/*"
        element={
          <ProtectedRoute
            allowedRoles={['Student']}
            roleRedirects={STUDENT_SHELL_BLOCK_REDIRECTS}
          >
            <StudentShellIndexRedirect />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<AppRootRedirect />} />
    </Routes>
  );
}
