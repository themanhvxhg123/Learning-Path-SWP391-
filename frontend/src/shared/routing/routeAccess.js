/** Redirect khi role không được phép vào shell — tất cả đều về /unauthorized. */
const UNAUTHORIZED = '/unauthorized';

/** Redirect khi role không được phép vào shell Student. */
export const STUDENT_SHELL_BLOCK_REDIRECTS = {
  Mentor: UNAUTHORIZED,
  Admin: UNAUTHORIZED,
};

/** Redirect khi role không được phép vào shell Mentor. */
export const MENTOR_SHELL_BLOCK_REDIRECTS = {
  Student: UNAUTHORIZED,
  Admin: UNAUTHORIZED,
};

/** Redirect khi role không được phép vào shell Admin. */
export const ADMIN_SHELL_BLOCK_REDIRECTS = {
  Mentor: UNAUTHORIZED,
  Student: UNAUTHORIZED,
};

/** Shell học viên: courses (Admin được xem), profile (Student). */
export const STUDENT_SHARED_ROUTE_REDIRECTS = {
  ...STUDENT_SHELL_BLOCK_REDIRECTS,
};
