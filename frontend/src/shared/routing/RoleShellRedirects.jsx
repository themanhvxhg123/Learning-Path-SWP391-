import { Navigate } from 'react-router-dom';
import {
  getRoleDefaultPath,
  getUser,
  isAdmin,
  isAuthenticatedUser,
  isMentor,
  isStudent,
  ROLE_DEFAULT_PATHS,
} from '@/features/auth/utils/authUtils';

/**
 * Component hỗ trợ dùng chung để thực hiện chuyển hướng URL ngay lập tức (giữ lịch sử sạch bằng replace).
 */
function ShellIndexRedirect({ path }) {
  return <Navigate to={path} replace />;
}

/**
 * Tự động chuyển hướng Admin về trang quản trị mặc định (/admin/accounts).
 */
export function AdminShellIndexRedirect() {
  return <ShellIndexRedirect path={ROLE_DEFAULT_PATHS.Admin} />;
}

/**
 * Tự động chuyển hướng Mentor về trang quản lý khóa học mặc định (/mentor/courses).
 */
export function MentorShellIndexRedirect() {
  return <ShellIndexRedirect path={ROLE_DEFAULT_PATHS.Mentor} />;
}

/**
 * Tự động chuyển hướng Học viên (Student) về trang chủ học tập mặc định (/home).
 */
export function StudentShellIndexRedirect() {
  return <ShellIndexRedirect path={ROLE_DEFAULT_PATHS.Student} />;
}

/**
 * Hàm điều hướng dự phòng (fallback) cho Admin khi gặp URL không tồn tại trong khu vực Admin.
 */
export function AdminShellFallbackRedirect() {
  return <AdminShellIndexRedirect />;
}

/**
 * Hàm điều hướng dự phòng (fallback) cho Mentor khi gặp URL không tồn tại trong khu vực Mentor.
 */
export function MentorShellFallbackRedirect() {
  return <MentorShellIndexRedirect />;
}

/**
 * Lớp bảo vệ bảo mật (Guard) cho giao diện Admin.
 * Nếu phát hiện Mentor hoặc Student cố tình vào link Admin, chuyển về trang 403.
 */
export function AdminLayoutGuard({ children }) {
  const user = getUser();
  if (isMentor(user)) return <Navigate to="/unauthorized" replace />;
  if (isStudent(user)) return <Navigate to="/unauthorized" replace />;
  return children;
}

/**
 * Lớp bảo vệ bảo mật (Guard) cho giao diện Mentor.
 * Nếu phát hiện Admin hoặc Student cố tình vào link Mentor, chuyển về trang 403.
 */
export function MentorLayoutGuard({ children }) {
  const user = getUser();
  if (isAdmin(user)) return <Navigate to="/unauthorized" replace />;
  if (isStudent(user)) return <Navigate to="/unauthorized" replace />;
  return children;
}

/**
 * Kiểm tra xem có nên chặn người dùng này khỏi giao diện học tập của học viên hay không.
 * (Cụ thể: Mentor sẽ bị chặn không cho xem trang giao diện chính của học viên).
 */
export function shouldBlockStudentShell(user = getUser()) {
  return isAuthenticatedUser(user) && isMentor(user);
}

/**
 * Kiểm tra xem người dùng có cần tự động rời khỏi trang chủ của học viên không (dành cho Admin và Mentor).
 */
export function shouldLeaveStudentHome(user = getUser()) {
  return isAuthenticatedUser(user) && !isStudent(user);
}
