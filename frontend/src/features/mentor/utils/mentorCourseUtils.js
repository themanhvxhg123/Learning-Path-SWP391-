/**
 * Normalize raw course records from API (PascalCase) or mock (camelCase).
 */
import {
  countMaterialsInPath,
  getCoursePaths,
  isPathActive,
} from './mentorCourseContentUtils';

function pickNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

export function normalizeMentorCourse(raw = {}) {
  const isPublished = raw.isPublished ?? raw.IsPublished;
  let status = raw.status;
  if (!status) {
    status = isPublished === true || isPublished === 1 ? 'published' : 'draft';
  }

  const courseId = raw.courseId ?? raw.CourseId;
  const courseName = pickNonEmpty(raw.courseName, raw.CourseName);
  const description = pickNonEmpty(raw.description, raw.Description);
  const thumbnail = raw.thumbnail ?? raw.Thumbnail ?? null;
  const categoryId = raw.categoryId ?? raw.CategoryId ?? null;
  const categoryName = pickNonEmpty(
    raw.categoryName,
    raw.CategoryName,
    raw.CategoryDisplayName,
    raw.category,
  );
  const categoryDisplayName = pickNonEmpty(
    raw.CategoryDisplayName,
    raw.categoryName,
    raw.CategoryName,
    raw.category,
  );
  const levelId = raw.levelId ?? raw.LevelId ?? null;
  const levelName = pickNonEmpty(raw.levelName, raw.LevelName, raw.LevelDisplayName, raw.level);
  const levelDisplayName = pickNonEmpty(
    raw.LevelDisplayName,
    raw.levelName,
    raw.LevelName,
    raw.level,
  );

  return {
    courseId,
    CourseId: courseId,
    courseName,
    CourseName: courseName,
    description,
    Description: description,
    thumbnail,
    Thumbnail: thumbnail,
    categoryId,
    CategoryId: categoryId,
    categoryName,
    CategoryName: categoryName,
    categoryDisplayName,
    CategoryDisplayName: categoryDisplayName,
    levelId,
    LevelId: levelId,
    levelName,
    LevelName: levelName,
    levelDisplayName,
    LevelDisplayName: levelDisplayName,
    instructorId: raw.instructorId ?? raw.InstructorId ?? null,
    InstructorId: raw.instructorId ?? raw.InstructorId ?? null,
    instructorName: pickNonEmpty(raw.instructorName, raw.InstructorName, raw.instructor),
    InstructorName: pickNonEmpty(raw.instructorName, raw.InstructorName, raw.instructor),
    rating: raw.rating ?? raw.Rating ?? null,
    Rating: raw.rating ?? raw.Rating ?? null,
    totalLessons: raw.totalLessons ?? raw.TotalLessons ?? 0,
    TotalLessons: raw.totalLessons ?? raw.TotalLessons ?? 0,
    totalNodes: raw.totalNodes ?? raw.TotalNodes ?? 0,
    totalMaterials: raw.totalMaterials ?? raw.TotalMaterials ?? 0,
    TotalMaterials: raw.totalMaterials ?? raw.TotalMaterials ?? 0,
    studentCount: Number(raw.studentCount ?? raw.StudentCount ?? 0) || 0,
    StudentCount: Number(raw.studentCount ?? raw.StudentCount ?? 0) || 0,
    status,
    isPublished: isPublished === true || isPublished === 1,
    IsPublished: isPublished === true || isPublished === 1,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
    CreatedAt: raw.createdAt ?? raw.CreatedAt ?? null,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? raw.createdAt ?? raw.CreatedAt ?? null,
    UpdatedAt: raw.updatedAt ?? raw.UpdatedAt ?? raw.createdAt ?? raw.CreatedAt ?? null,
    paths: raw.paths ?? raw.Paths ?? [],
    Paths: raw.paths ?? raw.Paths ?? [],
  };
}

function courseIsPublished(course) {
  if (course?.status === 'published') return true;
  if (course?.status === 'draft') return false;
  const value = course?.IsPublished ?? course?.isPublished;
  return value === true || value === 1;
}

function getCourseCategoryId(course) {
  return course?.CategoryId ?? course?.categoryId ?? null;
}

function getCourseLevelId(course) {
  return course?.LevelId ?? course?.levelId ?? null;
}

function getCourseName(course) {
  return course?.CourseName ?? course?.courseName ?? '';
}

function getCourseRating(course) {
  const value = course?.Rating ?? course?.rating;
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getCourseStudentCount(course) {
  return Number(course?.StudentCount ?? course?.studentCount ?? 0) || 0;
}

/** Số học viên đã đăng ký — hỗ trợ PascalCase/camelCase từ API. */
export function countCourseStudents(course = {}) {
  return getCourseStudentCount(course);
}

export function countCourseChapters(course = {}) {
  return (course.Paths ?? course.paths ?? []).length;
}

export function formatCourseRating(course = {}) {
  const rating = getCourseRating(course);
  return rating != null ? rating.toFixed(1) : '—';
}

export function isCoursePublished(course = {}) {
  return courseIsPublished(course);
}

/** Đếm chương đã xuất bản (IsActive = 1). */
export function countPublishedChapters(course = {}) {
  const paths = getCoursePaths(course);
  if (paths.length > 0) {
    return paths.filter(isPathActive).length;
  }

  const totalPaths = Number(course.TotalPaths ?? course.totalPaths ?? 0);
  return Number.isFinite(totalPaths) && totalPaths > 0 ? totalPaths : 0;
}

export function courseCanPublish(course = {}) {
  return countPublishedChapters(course) > 0;
}

export function getCoursePublishBlockReason(course = {}) {
  if (courseCanPublish(course)) return null;
  return 'Khóa học cần ít nhất 1 chương được xuất bản trước khi xuất bản.';
}

function getCourseTimestamp(course, kind = 'updated') {
  const raw =
    kind === 'created'
      ? course?.CreatedAt ?? course?.createdAt
      : course?.UpdatedAt ?? course?.updatedAt ?? course?.CreatedAt ?? course?.createdAt;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function matchesCourseNameSearch(course, keyword) {
  if (!keyword) return true;
  const haystack = normalizeSearchText(getCourseName(course));
  return haystack.includes(normalizeSearchText(keyword));
}

/** Đếm bài học (nodes) từ cây Paths — hỗ trợ PascalCase/camelCase từ API. */
export function countCourseLessons(course = {}) {
  const paths = course.Paths ?? course.paths ?? [];
  const fromPaths = paths.reduce(
    (sum, path) => sum + (path.Nodes ?? path.nodes ?? []).length,
    0
  );
  if (fromPaths > 0) return fromPaths;

  const fromDb = Number(course.TotalLessons ?? course.totalLessons ?? 0);
  return Number.isFinite(fromDb) ? fromDb : 0;
}

/** Đếm học liệu (VIDEO/TEXT/DOC) từ cây Paths — hỗ trợ PascalCase/camelCase từ API. */
export function countCourseMaterials(course = {}) {
  const paths = course.Paths ?? course.paths ?? [];
  const fromPaths = paths.reduce(
    (sum, path) => sum + countMaterialsInPath(path),
    0
  );
  if (fromPaths > 0) return fromPaths;

  const fromDb = Number(course.TotalMaterials ?? course.totalMaterials ?? 0);
  return Number.isFinite(fromDb) ? fromDb : 0;
}

export function isMentorCoursePublished(course) {
  if (!course) return false;
  return normalizeMentorCourse(course).status === 'published';
}

export function computeCourseStats(courses = []) {
  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const draftCount = courses.filter((c) => c.status === 'draft').length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.studentCount ?? 0), 0);

  return {
    totalCourses: courses.length,
    publishedCount,
    draftCount,
    totalStudents,
  };
}

export function filterAndSortMentorCourses(courses, query = {}) {
  const {
    q = '',
    status = 'all',
    category = 'all',
    level = 'all',
    sort = 'updated_desc',
  } = query;
  const keyword = q.trim().toLowerCase();

  let result = (courses ?? []).filter((course) => {
    if (status === 'published' && !courseIsPublished(course)) return false;
    if (status === 'draft' && courseIsPublished(course)) return false;

    if (category !== 'all') {
      const categoryId = getCourseCategoryId(course);
      const categoryMatch =
        String(categoryId) === String(category) ||
        course?.CategoryName === category ||
        course?.CategoryDisplayName === category ||
        course?.categoryName === category;
      if (!categoryMatch) return false;
    }

    if (level !== 'all') {
      const levelId = getCourseLevelId(course);
      const levelMatch =
        String(levelId) === String(level) ||
        course?.levelName === level ||
        course?.LevelDisplayName === level ||
        course?.LevelName === level;
      if (!levelMatch) return false;
    }

    if (keyword && !matchesCourseNameSearch(course, keyword)) {
      return false;
    }

    return true;
  });

  result = [...result].sort((a, b) => {
    if (sort === 'created_desc') {
      return getCourseTimestamp(b, 'created') - getCourseTimestamp(a, 'created');
    }
    if (sort === 'students_desc') {
      return getCourseStudentCount(b) - getCourseStudentCount(a);
    }
    if (sort === 'rating_desc') {
      const ratingA = getCourseRating(a);
      const ratingB = getCourseRating(b);
      if (ratingA == null && ratingB == null) return 0;
      if (ratingA == null) return 1;
      if (ratingB == null) return -1;
      return ratingB - ratingA;
    }
    if (sort === 'name_asc') {
      return getCourseName(a).localeCompare(getCourseName(b), 'vi', { sensitivity: 'base' });
    }
    return getCourseTimestamp(b, 'updated') - getCourseTimestamp(a, 'updated');
  });

  return result;
}

export function paginateMentorCourses(courses, page, pageSize) {
  const totalItems = courses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = courses.slice(start, start + pageSize);

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

/** Thứ tự chương (1-based) trong outline khóa học. */
export function getChapterOrder(chapters = [], chapterId) {
  const index = chapters.findIndex(
    (chapter) => String(chapter.chapterId ?? chapter.PathId) === String(chapterId),
  );
  if (index < 0) return null;
  return chapters[index]?.order ?? chapters[index]?.Order ?? index + 1;
}

/** Hiển thị chương dạng "Chương 1: Tên chương". */
export function formatChapterDisplayLabel({ order, title = '', pathId } = {}) {
  const trimmedTitle = String(title ?? '').trim();
  if (/^Chương\s+\d+/i.test(trimmedTitle)) return trimmedTitle;

  const orderLabel =
    order != null && order > 0
      ? `Chương ${order}`
      : pathId != null
        ? `Chương #${pathId}`
        : null;

  if (!orderLabel) return trimmedTitle || 'Chương';
  if (!trimmedTitle) return orderLabel;
  return `${orderLabel}: ${trimmedTitle}`;
}

export function resolveChapterDisplayLabel(chapters = [], chapterId, title = '') {
  return formatChapterDisplayLabel({
    order: getChapterOrder(chapters, chapterId),
    title,
    pathId: chapterId,
  });
}

export function formatMentorCourseDate(value) {
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

export function truncateText(text, maxLength = 120) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}
