// frontend/src/components/common/AdminRoute.jsx
import { Navigate } from 'react-router-dom';

/**
 * Chỉ cho vào nếu đã login VÀ có role Admin.
 * Ngược lại redirect về /login.
 */
export default function AdminRoute({ children }) {
  const raw  = sessionStorage.getItem('user');
  if (!raw) return <Navigate to="/login" replace />;

  const user = JSON.parse(raw);
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('Admin');
  if (!isAdmin) return <Navigate to="/home" replace />;

  return children;
}