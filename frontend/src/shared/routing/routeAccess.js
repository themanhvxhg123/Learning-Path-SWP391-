import { ROLE_DEFAULT_PATHS } from '@/features/auth/utils/authUtils';

/** Redirect khi role không được phép vào shell học viên (my-courses, ...). */
export const STUDENT_SHELL_BLOCK_REDIRECTS = {
  Mentor: ROLE_DEFAULT_PATHS.Mentor,
  Admin: ROLE_DEFAULT_PATHS.Admin,
};

/** Redirect khi role không được phép vào shell Mentor. */
export const MENTOR_SHELL_BLOCK_REDIRECTS = {
  Student: ROLE_DEFAULT_PATHS.StudentBrowse,
  Admin: ROLE_DEFAULT_PATHS.Admin,
};

/** Redirect khi role không được phép vào shell Admin. */
export const ADMIN_SHELL_BLOCK_REDIRECTS = {
  Mentor: ROLE_DEFAULT_PATHS.Mentor,
  Student: ROLE_DEFAULT_PATHS.StudentBrowse,
};

/** Shell học viên: courses (Admin được xem), profile (Student). */
export const STUDENT_SHARED_ROUTE_REDIRECTS = {
  ...STUDENT_SHELL_BLOCK_REDIRECTS,
};
