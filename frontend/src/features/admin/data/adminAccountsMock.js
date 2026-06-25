/**
 * Admin account constants — used by toolbar filters and form dialogs.
 * Actual data is fetched from the backend API.
 */

export const ADMIN_ACCOUNT_ROLE_OPTIONS = [
  { value: 'all', label: 'Tất cả vai trò' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Mentor', label: 'Mentor' },
  { value: 'Student', label: 'Student' },
];

export const ADMIN_ACCOUNT_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
];

export const ADMIN_ACCOUNT_SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'role', label: 'Vai trò' },
];

export const ADMIN_ACCOUNT_FORM_ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Mentor', label: 'Mentor' },
  { value: 'Student', label: 'Student' },
];

export const ADMIN_ACCOUNT_FORM_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
];
