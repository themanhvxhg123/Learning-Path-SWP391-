import { Navigate } from 'react-router-dom';
import {
  getRoleDefaultPath,
  getUser,
  getUserRoles,
  isAuthenticatedUser,
  resolveRoleRedirectPath,
} from '@/features/auth/utils/authUtils';

/**
 * ProtectedRoute - Lớp bảo vệ phân quyền (Role-Based Access Control)
 * 
 * Nếu user không có role phù hợp:
 *  - Nếu có roleRedirects (dùng cho shell-level), ưu tiên redirect theo roleRedirects
 *  - Nếu không có roleRedirects, redirect về /unauthorized
 */
export default function ProtectedRoute({ allowedRoles, roleRedirects, children }) {
  const user = getUser();

  // Nếu chưa đăng nhập -> Đuổi ra cổng /login
  if (!isAuthenticatedUser(user)) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra xem phòng này có yêu cầu allowedRoles không
  if (allowedRoles?.length > 0) {
    const userRoles = getUserRoles(user).map((role) => role.toLowerCase());
    
    // Dò xem role của user có nằm trong allowedRoles không
    const hasAccess = allowedRoles.some((role) => userRoles.includes(role.toLowerCase()));

    // Không có quyền truy cập
    if (!hasAccess) {
      // Nếu có roleRedirects (shell-level block), ưu tiên redirect theo roleRedirects
      if (roleRedirects && Object.keys(roleRedirects).length > 0) {
        const redirectTo = resolveRoleRedirectPath(user, roleRedirects) ?? getRoleDefaultPath(user);
        return <Navigate to={redirectTo} replace />;
      }
      // Không có roleRedirects -> route-level access denied -> redirect /unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // CÓ TÊN ROLE HỢP LỆ -> Cho phép truy cập vào children
  return children;
}
