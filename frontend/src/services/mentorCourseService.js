//import { mentorCoursesMock } from '../data/mentorCoursesMock';
import { mentorCourseDetailById } from '../data/mentorCourseDetailMock';
import { mentorCourseStudentsByCourseId } from '../data/mentorCourseStudentsMock';
import { normalizeMentorCourse } from '../utils/mentorCourseUtils';
import { normalizeMentorCourseDetail } from '../utils/mentorCourseDetailUtils';
import {
  computeCourseStudentStats,
  normalizeCourseStudent,
} from '../utils/mentorCourseStudentsUtils';
import { buildCreateCourseStep1Payload } from '../utils/mentorCourseFormUtils';
import { saveCreateCourseStep1ToStorage, saveCreateCourseContentToStorage } from '../utils/mentorCourseCreateStorage';
import { buildCourseContentPayload, buildFullCreateCoursePayload } from '../utils/mentorCourseContentUtils';

const API_BASE = 'http://localhost:5000/api';

/**
 * Fetch courses managed by the current mentor.
 * TODO: replace mock with real API call
 *   fetchMentorCourses({ q, status, category, level, sort, page, pageSize })
 */
export async function fetchMentorCourses(query = {}) {
  const user = JSON.parse(sessionStorage.getItem('user'));

  const getData = async () => {
    try {
      const res = await fetch(`${API_BASE}/courses/my-courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          roleName: "mentor",
        })
      });

      const data = await res.json();
      return data.data || data;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  };

  const courses = await getData();

  void query;
  await delay(300);

  return {
    ok: true,
    courses: courses.map(normalizeMentorCourse),
  };
}

/**
 * Fetch course categories for create form.
 */
export async function fetchCourseCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return { ok: false, categories: [], message: data.message };
    }

    return {
      ok: true,
      categories: (data.categories ?? []).map((item) => ({
        value: item.categoryId,
        label: item.displayName,
      })),
    };
  } catch {
    return { ok: false, categories: [], message: 'Không thể kết nối máy chủ.' };
  }
}

/**
 * Fetch course levels for create form.
 */
export async function fetchCourseLevels() {
  try {
    const response = await fetch(`${API_BASE}/levels`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return { ok: false, levels: [], message: data.message };
    }

    return {
      ok: true,
      levels: (data.levels ?? []).map((item) => ({
        value: item.levelId,
        label: item.displayName,
      })),
    };
  } catch {
    return { ok: false, levels: [], message: 'Không thể kết nối máy chủ.' };
  }
}

/**
 * Persist Step 1 draft locally and prepare for Step 2.
 * TODO: replace with API call when backend is ready — createCourseDraft(payload)
 */
export async function saveCreateCourseStep1(form, instructorId) {
  const payload = buildCreateCourseStep1Payload(form, instructorId);

  // TODO: replace with API call when backend is ready
  // const response = await fetch('http://localhost:5000/api/mentor/courses/draft', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-user-id': String(instructorId),
  //   },
  //   body: JSON.stringify(payload),
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };

  await delay(200);
  saveCreateCourseStep1ToStorage(form, instructorId);
  return { ok: true, payload };
}

/**
 * Persist Step 2 content draft locally.
 * TODO: replace with API call — createCourseContent(courseId, payload)
 */
export async function saveCreateCourseContent(course, paths, meta) {
  const contentPayload = buildCourseContentPayload(paths);

  // TODO: replace with API call
  // await createCourseContent(courseId, contentPayload);

  await delay(200);
  saveCreateCourseContentToStorage(course, paths, meta);
  return { ok: true, payload: contentPayload };
}

/**
 * Full create course + content payload (API-ready).
 * TODO: replace with API call — createCourseWithContent(payload)
 */
export async function createCourseWithContent(course, paths) {
  const payload = buildFullCreateCoursePayload(course, paths);

  // TODO: replace with API call
  // const response = await fetch(`${API_BASE}/mentor/courses`, { method: 'POST', body: JSON.stringify(payload) });

  void payload;
  await delay(600);
  return { ok: true, courseId: Date.now() };
}

/**
 * Fetch a single mentor course with content tree.
 * TODO: replace mock with real API call
 *   fetchMentorCourseDetail(courseId) → GET /api/mentor/courses/:courseId
 */
export async function fetchMentorCourseDetail(courseId) {
  // const user = getUser();
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}`, {
  //   headers: { 'x-user-id': String(user.userId) },
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };
  // return { ok: true, course: normalizeMentorCourseDetail(data.course) };

  await delay(350);
  const id = Number(courseId);
  const raw = mentorCourseDetailById[id];

  if (!raw) {
    return { ok: false, message: 'Không tìm thấy khóa học.' };
  }

  return { ok: true, course: normalizeMentorCourseDetail(raw) };
}

/**
 * Toggle publish status for a mentor course.
 * TODO: replace mock with real API call
 *   updateCoursePublishStatus(courseId, isPublished) → PATCH /api/mentor/courses/:courseId/publish
 */
export async function updateCoursePublishStatus(courseId, isPublished) {
  // const user = getUser();
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/publish`, {
  //   method: 'PATCH',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-user-id': String(user.userId),
  //   },
  //   body: JSON.stringify({ isPublished }),
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };
  // return { ok: true, course: normalizeMentorCourseDetail(data.course) };

  await delay(400);
  const id = Number(courseId);
  const raw = mentorCourseDetailById[id];

  if (!raw) {
    return { ok: false, message: 'Không tìm thấy khóa học.' };
  }

  const updated = {
    ...raw,
    IsPublished: Boolean(isPublished),
  };

  mentorCourseDetailById[id] = updated;

  return { ok: true, course: normalizeMentorCourseDetail(updated) };
}

/**
 * Fetch students enrolled in a course with optional filters.
 * TODO: replace mock with real API call
 *   fetchCourseStudents(courseId, filters) → GET /api/mentor/courses/:courseId/students
 */
export async function fetchCourseStudents(courseId, filters = {}) {
  // TODO: fetch learner progress by courseId from API
  // const params = new URLSearchParams(filters);
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/students?${params}`);
  // return { ok: true, students: data.students.map(normalizeCourseStudent) };

  void filters;
  await delay(300);
  const id = Number(courseId);
  const rawStudents = mentorCourseStudentsByCourseId[id] ?? [];

  return { ok: true, students: rawStudents.map(normalizeCourseStudent) };
}

/**
 * Fetch aggregate student stats for a course.
 * TODO: replace mock with real API call
 *   fetchCourseStudentStats(courseId) → GET /api/mentor/courses/:courseId/students/stats
 */
export async function fetchCourseStudentStats(courseId) {
  await delay(200);
  const id = Number(courseId);
  const rawStudents = mentorCourseStudentsByCourseId[id] ?? [];
  const students = rawStudents.map(normalizeCourseStudent);

  return { ok: true, stats: computeCourseStudentStats(students) };
}

/**
 * Update basic info of an existing mentor course.
 * TODO: replace with real API call — updateCourseBasicInfo(courseId, payload)
 *   PATCH /api/mentor/courses/:courseId
 */
export async function updateCourseBasicInfo(courseId, payload) {
  // TODO: replace with API call
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}`, {
  //   method: 'PATCH',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-user-id': String(getUser()?.userId),
  //   },
  //   body: JSON.stringify(payload),
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };
  // return { ok: true, courseId };

  void courseId; void payload;
  await delay(400);
  return { ok: true, courseId };
}

/**
 * Update content (paths / nodes / materials) of an existing mentor course.
 * TODO: replace with real API call — updateCourseContent(courseId, paths)
 *   PUT /api/mentor/courses/:courseId/content
 */
export async function updateCourseContent(courseId, paths) {
  // TODO: replace with API call
  // const payload = buildCourseContentPayload(paths);
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/content`, {
  //   method: 'PUT',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-user-id': String(getUser()?.userId),
  //   },
  //   body: JSON.stringify(payload),
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };
  // return { ok: true };

  void courseId; void paths;
  await delay(400);
  return { ok: true };
}

/**
 * Create a new mentor course (draft or published).
 * TODO: replace with createCourse API
 *   createCourse(payload) → POST /api/mentor/courses
 */
export async function createCourse(payload) {
  // const user = getUser();
  // const response = await fetch('http://localhost:5000/api/mentor/courses', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-user-id': String(user.userId),
  //   },
  //   body: JSON.stringify(payload),
  // });
  // const data = await response.json();
  // return { ok: response.ok, courseId: data.courseId, message: data.message };

  void payload;
  await delay(600);
  return { ok: true, courseId: Date.now() };
}

function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
