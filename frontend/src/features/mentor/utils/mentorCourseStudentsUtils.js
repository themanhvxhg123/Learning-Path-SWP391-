export const STUDENT_STATUS_LABELS = {
  not_started: 'Chưa bắt đầu',
  learning: 'Đang học',
  completed: 'Hoàn thành',
};

export const STUDENT_STATUS_CHIP_SX = {
  not_started: {
    bgcolor: 'rgba(100,116,139,0.10)',
    color: '#64748B',
    border: '1px solid rgba(100,116,139,0.18)',
  },
  learning: {
    bgcolor: 'rgba(8,145,178,0.10)',
    color: '#0891B2',
    border: '1px solid rgba(8,145,178,0.22)',
  },
  completed: {
    bgcolor: 'rgba(4,120,87,0.12)',
    color: '#047857',
    border: '1px solid rgba(4,120,87,0.24)',
  },
};

export const STUDENT_PROGRESS_COLORS = {
  not_started: '#94A3B8',
  learning: '#0891B2',
  completed: '#047857',
};

export function getStudentProgressColor(percentage = 0) {
  const value = Math.min(100, Math.max(0, Number(percentage) || 0));
  if (value >= 100) return STUDENT_PROGRESS_COLORS.completed;
  if (value > 0) return STUDENT_PROGRESS_COLORS.learning;
  return STUDENT_PROGRESS_COLORS.not_started;
}

import { resolveAvatarUrl } from '@/features/profile/utils/profileAvatarUtils';

export function normalizeCourseStudent(raw = {}) {
  const progressPercentage = Number(
    raw.progressPercentage ?? raw.ProgressPercentage ?? 0
  );

  let status = 'not_started';

  if (progressPercentage === 100) {
    status = 'completed';
  } else if (progressPercentage > 0) {
    status = 'learning';
  }

  return {
    userId: raw.userId ?? raw.UserId,
    fullName: raw.fullName ?? raw.FullName ?? '',
    email: raw.email ?? raw.Email ?? '',
    avatarUrl: resolveAvatarUrl(raw.avatarUrl ?? raw.AvatarUrl ?? null),
    enrollmentDate: raw.enrollmentDate ?? raw.EnrollmentDate ?? null,

    status,
    progressPercentage,

    currentLessonName: raw.currentLessonName ?? raw.CurrentLessonName ?? null,
    currentChapterName: raw.currentChapterName ?? raw.CurrentChapterName ?? null,
    lastAccessedAt: raw.lastAccessedAt ?? raw.LastAccessedAt ?? null,
    completedAt: raw.completedAt ?? raw.CompletedAt ?? null,
  };
}

export function getStudentInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function formatStudentDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatStudentDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function computeCourseStudentStats(students = []) {
  const totalStudents = students.length;
  const learningCount = students.filter((s) => s.status === 'learning').length;
  const completedCount = students.filter((s) => s.status === 'completed').length;
  const averageProgress =
    totalStudents === 0
      ? 0
      : Math.round(
        students.reduce((sum, s) => sum + (s.progressPercentage ?? 0), 0) / totalStudents
      );

  return { totalStudents, learningCount, completedCount, averageProgress };
}

export function filterAndSortCourseStudents(students = [], query = {}) {
  const {
    q = '',
    status = 'all',
    sort = 'progress_desc',
  } = query;

  const keyword = q.trim().toLowerCase();

  let result = students.filter((student) => {
    if (status !== 'all' && student.status !== status) return false;

    if (keyword) {
      const haystack = [student.fullName, student.email].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });

  result = [...result].sort((a, b) => {
    if (sort === 'progress_asc') {
      return (a.progressPercentage ?? 0) - (b.progressPercentage ?? 0);
    }
    if (sort === 'last_access_desc') {
      return (
        new Date(b.lastAccessedAt ?? 0).getTime() - new Date(a.lastAccessedAt ?? 0).getTime()
      );
    }
    if (sort === 'enrolled_desc') {
      return (
        new Date(b.enrollmentDate ?? 0).getTime() - new Date(a.enrollmentDate ?? 0).getTime()
      );
    }
    return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
  });

  return result;
}

export function hasActiveCourseStudentFilters(query = {}) {
  return Boolean(
    (query.q && query.q.trim()) ||
    (query.status && query.status !== 'all') ||
    (query.sort && query.sort !== 'progress_desc')
  );
}

export const STUDENT_TABLE_GRID_COLUMNS =
  'minmax(200px, 1.4fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) minmax(110px, 0.6fr)';

export const STUDENT_TABLE_HEADERS = [
  'Học viên',
  'Trạng thái',
  'Tiến độ',
  'Bài học hiện tại',
  'Lần học gần nhất',
  'Ngày đăng ký',
];

export const COURSE_STUDENTS_PAGE_SIZE = 10;

export function paginateCourseStudents(students = [], page = 1, pageSize = COURSE_STUDENTS_PAGE_SIZE) {
  const totalItems = students.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = students.slice(start, start + pageSize);

  return {
    items,
    totalItems,
    totalPages,
    page: safePage,
    pageSize,
    rangeStart: totalItems === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, totalItems),
  };
}
